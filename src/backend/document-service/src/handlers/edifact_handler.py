import structlog
from typing import Dict, Optional
from fastapi import HTTPException
from prometheus_client import Counter, Histogram
from pydantic import BaseModel, Field

from ..models.edifact import EdifactMessage, EdifactMessageType
from ..services.edifact_service import EdifactService
from ..utils.validators import validate_edifact_syntax

# Metrics collectors
EDIFACT_REQUESTS = Counter(
    'edifact_requests_total',
    'Total EDIFACT messages processed',
    ['message_type', 'status']
)
PROCESSING_TIME = Histogram(
    'edifact_processing_seconds',
    'Time spent processing EDIFACT messages',
    ['message_type']
)

class EdifactRequestHandler:
    """
    Handles incoming EDIFACT messages with comprehensive security, validation,
    and monitoring capabilities. Supports IFTSTA, IFTMBC, and COARRI message types.
    """

    def __init__(self, cache_client, rate_limiter):
        """
        Initialize the EDIFACT request handler with security and monitoring components.

        Args:
            cache_client: Cache service client for validation results
            rate_limiter: Rate limiting service for request throttling
        """
        self._edifact_service = EdifactService()
        self._logger = structlog.get_logger(__name__)
        self._validation_cache = cache_client
        self._rate_limiter = rate_limiter

        # Message type specific validation rules
        self._validation_rules = {
            EdifactMessageType.IFTSTA: {
                "required_segments": ["UNH", "BGM", "DTM", "LOC", "STS", "UNT"],
                "max_size": 50000  # 50KB limit for status messages
            },
            EdifactMessageType.IFTMBC: {
                "required_segments": ["UNH", "BGM", "RFF", "TDT", "UNT"],
                "max_size": 100000  # 100KB limit for booking messages
            },
            EdifactMessageType.COARRI: {
                "required_segments": ["UNH", "BGM", "EQD", "LOC", "UNT"],
                "max_size": 200000  # 200KB limit for container reports
            }
        }

    async def handle_edifact_message(
        self, 
        message_content: str, 
        message_type: EdifactMessageType,
        correlation_id: str
    ) -> Dict:
        """
        Main handler for processing EDIFACT messages with security controls.

        Args:
            message_content: Raw EDIFACT message content
            message_type: Type of EDIFACT message
            correlation_id: Request correlation ID for tracing

        Returns:
            dict: Processed message response with validation status

        Raises:
            HTTPException: For validation or processing errors
        """
        try:
            # Check rate limits
            if not await self._rate_limiter.check_limit(correlation_id):
                EDIFACT_REQUESTS.labels(
                    message_type=message_type.value, 
                    status="rate_limited"
                ).inc()
                raise HTTPException(
                    status_code=429,
                    detail="Rate limit exceeded"
                )

            # Validate message size
            content_size = len(message_content.encode('utf-8'))
            max_size = self._validation_rules[message_type]["max_size"]
            if content_size > max_size:
                EDIFACT_REQUESTS.labels(
                    message_type=message_type.value, 
                    status="size_exceeded"
                ).inc()
                raise HTTPException(
                    status_code=400,
                    detail=f"Message size ({content_size} bytes) exceeds limit ({max_size} bytes)"
                )

            # Check validation cache
            cache_key = f"edifact_validation:{message_type.value}:{hash(message_content)}"
            cached_result = await self._validation_cache.get(cache_key)
            if cached_result:
                EDIFACT_REQUESTS.labels(
                    message_type=message_type.value, 
                    status="cache_hit"
                ).inc()
                return cached_result

            with PROCESSING_TIME.labels(message_type=message_type.value).time():
                # Parse and validate message
                message = EdifactMessage(
                    message_type=message_type,
                    message_reference=correlation_id,
                    raw_content=message_content
                )

                # Validate syntax
                syntax_valid, syntax_error = validate_edifact_syntax(
                    message_content,
                    message_type
                )
                if not syntax_valid:
                    EDIFACT_REQUESTS.labels(
                        message_type=message_type.value, 
                        status="invalid_syntax"
                    ).inc()
                    raise HTTPException(
                        status_code=400,
                        detail=f"Syntax validation failed: {syntax_error}"
                    )

                # Parse message segments
                message.parse_message()

                # Validate message structure
                is_valid, error_msg, validation_context = message.validate()
                if not is_valid:
                    EDIFACT_REQUESTS.labels(
                        message_type=message_type.value, 
                        status="invalid_structure"
                    ).inc()
                    raise HTTPException(
                        status_code=400,
                        detail=f"Structure validation failed: {error_msg}"
                    )

                # Process message based on type
                if message_type == EdifactMessageType.IFTSTA:
                    result = await self.handle_iftsta(message, correlation_id)
                elif message_type == EdifactMessageType.IFTMBC:
                    result = await self.handle_iftmbc(message, correlation_id)
                elif message_type == EdifactMessageType.COARRI:
                    result = await self.handle_coarri(message, correlation_id)
                else:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Unsupported message type: {message_type.value}"
                    )

                # Cache successful validation result
                await self._validation_cache.set(
                    cache_key,
                    result,
                    expire=3600  # Cache for 1 hour
                )

                EDIFACT_REQUESTS.labels(
                    message_type=message_type.value, 
                    status="success"
                ).inc()

                return result

        except HTTPException:
            raise
        except Exception as e:
            self._logger.error(
                "Error processing EDIFACT message",
                error=str(e),
                message_type=message_type.value,
                correlation_id=correlation_id,
                exc_info=True
            )
            EDIFACT_REQUESTS.labels(
                message_type=message_type.value, 
                status="error"
            ).inc()
            raise HTTPException(
                status_code=500,
                detail=f"Internal processing error: {str(e)}"
            )

    async def handle_iftsta(
        self, 
        message: EdifactMessage, 
        correlation_id: str
    ) -> Dict:
        """
        Handles IFTSTA status messages with enhanced validation.

        Args:
            message: Validated IFTSTA message
            correlation_id: Request correlation ID

        Returns:
            dict: Processed status data with validation results
        """
        try:
            # Process status message
            status_data = self._edifact_service.process_iftsta(message)

            # Enhance response with metadata
            response = {
                "message_type": "IFTSTA",
                "correlation_id": correlation_id,
                "status": "processed",
                "data": status_data,
                "validation": {
                    "status": "valid",
                    "timestamp": message.created_at.isoformat()
                }
            }

            self._logger.info(
                "IFTSTA message processed successfully",
                correlation_id=correlation_id,
                message_ref=message.message_reference
            )

            return response

        except Exception as e:
            self._logger.error(
                "Error processing IFTSTA message",
                error=str(e),
                correlation_id=correlation_id,
                exc_info=True
            )
            raise

    async def handle_iftmbc(
        self, 
        message: EdifactMessage, 
        correlation_id: str
    ) -> Dict:
        """
        Handles IFTMBC booking messages with transaction support.

        Args:
            message: Validated IFTMBC message
            correlation_id: Request correlation ID

        Returns:
            dict: Processed booking data
        """
        try:
            # Process booking message
            booking_data = self._edifact_service.process_iftmbc(message)

            # Enhance response with metadata
            response = {
                "message_type": "IFTMBC",
                "correlation_id": correlation_id,
                "status": "processed",
                "data": booking_data,
                "validation": {
                    "status": "valid",
                    "timestamp": message.created_at.isoformat()
                }
            }

            self._logger.info(
                "IFTMBC message processed successfully",
                correlation_id=correlation_id,
                message_ref=message.message_reference
            )

            return response

        except Exception as e:
            self._logger.error(
                "Error processing IFTMBC message",
                error=str(e),
                correlation_id=correlation_id,
                exc_info=True
            )
            raise

    async def handle_coarri(
        self, 
        message: EdifactMessage, 
        correlation_id: str
    ) -> Dict:
        """
        Handles COARRI container messages with optimizations.

        Args:
            message: Validated COARRI message
            correlation_id: Request correlation ID

        Returns:
            dict: Processed container operations data
        """
        try:
            # Process container report message
            container_data = self._edifact_service.process_coarri(message)

            # Enhance response with metadata
            response = {
                "message_type": "COARRI",
                "correlation_id": correlation_id,
                "status": "processed",
                "data": container_data,
                "validation": {
                    "status": "valid",
                    "timestamp": message.created_at.isoformat()
                }
            }

            self._logger.info(
                "COARRI message processed successfully",
                correlation_id=correlation_id,
                message_ref=message.message_reference
            )

            return response

        except Exception as e:
            self._logger.error(
                "Error processing COARRI message",
                error=str(e),
                correlation_id=correlation_id,
                exc_info=True
            )
            raise