import logging
from typing import Dict, Tuple, Optional
from datetime import datetime
from ..models.edifact import EdifactMessage, EdifactMessageType
from ..utils.validators import validate_edifact_syntax

class EdifactService:
    """
    Service class for processing EDIFACT messages with ISO 9735 compliance,
    security measures, and performance optimizations.
    """

    def __init__(self):
        """Initialize EDIFACT service with logging, caching, and message handlers."""
        # Configure structured logging
        self._logger = logging.getLogger(__name__)
        self._logger.setLevel(logging.INFO)

        # Initialize message type specific handlers
        self._message_handlers = {
            EdifactMessageType.IFTSTA: self.process_iftsta,
            EdifactMessageType.IFTMBC: self.process_iftmbc,
            EdifactMessageType.COARRI: self.process_coarri
        }

        # Initialize validation cache for performance
        self._validation_cache: Dict[str, Tuple[bool, str, datetime]] = {}

    def parse_message(self, message_content: str, message_type: EdifactMessageType) -> EdifactMessage:
        """
        Parses and validates an EDIFACT message with security checks.

        Args:
            message_content: Raw EDIFACT message content
            message_type: Type of EDIFACT message

        Returns:
            EdifactMessage: Parsed and validated message object

        Raises:
            ValueError: If message validation fails
        """
        start_time = datetime.utcnow()
        
        try:
            # Log incoming message metadata
            self._logger.info(
                "Processing EDIFACT message",
                extra={
                    "message_type": message_type.value,
                    "content_length": len(message_content),
                    "timestamp": start_time.isoformat()
                }
            )

            # Create message instance
            message = EdifactMessage(
                message_type=message_type,
                message_reference=f"{message_type.value}_{start_time.timestamp()}",
                raw_content=message_content
            )

            # Parse message segments
            message.parse_message()

            # Validate message
            is_valid, error_msg, validation_context = message.validate()
            if not is_valid:
                self._logger.error(
                    "EDIFACT message validation failed",
                    extra={
                        "error": error_msg,
                        "context": validation_context
                    }
                )
                raise ValueError(f"Message validation failed: {error_msg}")

            # Extract structured data
            message.extract_data()

            # Log success metrics
            processing_time = (datetime.utcnow() - start_time).total_seconds()
            self._logger.info(
                "EDIFACT message processed successfully",
                extra={
                    "processing_time": processing_time,
                    "message_reference": message.message_reference
                }
            )

            return message

        except Exception as e:
            self._logger.error(
                "Error processing EDIFACT message",
                extra={
                    "error": str(e),
                    "message_type": message_type.value
                },
                exc_info=True
            )
            raise

    def validate_message(self, message: EdifactMessage) -> Tuple[bool, str]:
        """
        Performs comprehensive message validation with caching.

        Args:
            message: EDIFACT message to validate

        Returns:
            tuple[bool, str]: Validation result and error message
        """
        # Check validation cache
        cache_key = f"{message.message_reference}_{message.message_type.value}"
        if cache_key in self._validation_cache:
            result, error, timestamp = self._validation_cache[cache_key]
            # Cache results for 1 hour
            if (datetime.utcnow() - timestamp).total_seconds() < 3600:
                return result, error

        try:
            # Validate message syntax
            syntax_valid, syntax_error = validate_edifact_syntax(
                message.raw_content,
                message.message_type
            )
            if not syntax_valid:
                return False, syntax_error

            # Validate message structure and content
            is_valid, error_msg, _ = message.validate()

            # Cache validation result
            self._validation_cache[cache_key] = (is_valid, error_msg, datetime.utcnow())

            return is_valid, error_msg

        except Exception as e:
            self._logger.error(
                "Validation error",
                extra={"error": str(e), "message_ref": message.message_reference},
                exc_info=True
            )
            return False, str(e)

    def process_iftsta(self, message: EdifactMessage) -> Dict:
        """
        Processes IFTSTA status messages with transaction support.

        Args:
            message: Validated IFTSTA message

        Returns:
            dict: Processed status data
        """
        try:
            # Extract status data
            data = message.extract_data()
            status_data = {
                "reference": message.message_reference,
                "status_details": [],
                "locations": [],
                "timestamps": []
            }

            # Process segments
            segments = data.get("segments", {})
            
            # Process status segments (STS)
            if "STS" in segments:
                for sts in segments["STS"]:
                    status_data["status_details"].append({
                        "code": sts.get("content", "").split("+")[1],
                        "description": sts.get("content", "").split("+")[2] if len(sts.get("content", "").split("+")) > 2 else None
                    })

            # Process location segments (LOC)
            if "LOC" in segments:
                for loc in segments["LOC"]:
                    status_data["locations"].append({
                        "code": loc.get("content", "").split("+")[1],
                        "function": loc.get("content", "").split("+")[2] if len(loc.get("content", "").split("+")) > 2 else None
                    })

            # Process date/time segments (DTM)
            if "DTM" in segments:
                for dtm in segments["DTM"]:
                    status_data["timestamps"].append({
                        "type": dtm.get("content", "").split("+")[1],
                        "value": dtm.get("content", "").split("+")[2] if len(dtm.get("content", "").split("+")) > 2 else None
                    })

            return status_data

        except Exception as e:
            self._logger.error(
                "Error processing IFTSTA message",
                extra={"error": str(e), "message_ref": message.message_reference},
                exc_info=True
            )
            raise

    def process_iftmbc(self, message: EdifactMessage) -> Dict:
        """
        Processes IFTMBC booking messages securely.

        Args:
            message: Validated IFTMBC message

        Returns:
            dict: Processed booking data
        """
        try:
            # Extract booking data
            data = message.extract_data()
            booking_data = {
                "reference": message.message_reference,
                "booking_details": {},
                "transport_details": [],
                "references": []
            }

            # Process segments
            segments = data.get("segments", {})

            # Process booking segments (BGM)
            if "BGM" in segments:
                bgm = segments["BGM"][0]
                booking_data["booking_details"] = {
                    "type": bgm.get("content", "").split("+")[1],
                    "number": bgm.get("content", "").split("+")[2] if len(bgm.get("content", "").split("+")) > 2 else None
                }

            # Process transport segments (TDT)
            if "TDT" in segments:
                for tdt in segments["TDT"]:
                    transport_detail = {
                        "mode": tdt.get("content", "").split("+")[1],
                        "means": tdt.get("content", "").split("+")[2] if len(tdt.get("content", "").split("+")) > 2 else None,
                        "carrier": tdt.get("content", "").split("+")[3] if len(tdt.get("content", "").split("+")) > 3 else None
                    }
                    booking_data["transport_details"].append(transport_detail)

            # Process reference segments (RFF)
            if "RFF" in segments:
                for rff in segments["RFF"]:
                    reference = {
                        "type": rff.get("content", "").split("+")[1],
                        "number": rff.get("content", "").split("+")[2] if len(rff.get("content", "").split("+")) > 2 else None
                    }
                    booking_data["references"].append(reference)

            return booking_data

        except Exception as e:
            self._logger.error(
                "Error processing IFTMBC message",
                extra={"error": str(e), "message_ref": message.message_reference},
                exc_info=True
            )
            raise

    def process_coarri(self, message: EdifactMessage) -> Dict:
        """
        Processes COARRI container messages with optimizations.

        Args:
            message: Validated COARRI message

        Returns:
            dict: Processed container operations data
        """
        try:
            # Extract container data
            data = message.extract_data()
            container_data = {
                "reference": message.message_reference,
                "equipment_details": [],
                "locations": [],
                "damages": []
            }

            # Process segments
            segments = data.get("segments", {})

            # Process equipment segments (EQD)
            if "EQD" in segments:
                for eqd in segments["EQD"]:
                    equipment = {
                        "type": eqd.get("content", "").split("+")[1],
                        "number": eqd.get("content", "").split("+")[2] if len(eqd.get("content", "").split("+")) > 2 else None,
                        "size_type": eqd.get("content", "").split("+")[3] if len(eqd.get("content", "").split("+")) > 3 else None,
                        "status": eqd.get("content", "").split("+")[4] if len(eqd.get("content", "").split("+")) > 4 else None
                    }
                    container_data["equipment_details"].append(equipment)

            # Process location segments (LOC)
            if "LOC" in segments:
                for loc in segments["LOC"]:
                    location = {
                        "function": loc.get("content", "").split("+")[1],
                        "location": loc.get("content", "").split("+")[2] if len(loc.get("content", "").split("+")) > 2 else None,
                        "sublocation": loc.get("content", "").split("+")[3] if len(loc.get("content", "").split("+")) > 3 else None
                    }
                    container_data["locations"].append(location)

            # Process damage segments (DAM) if present
            if "DAM" in segments:
                for dam in segments["DAM"]:
                    damage = {
                        "type": dam.get("content", "").split("+")[1],
                        "description": dam.get("content", "").split("+")[2] if len(dam.get("content", "").split("+")) > 2 else None
                    }
                    container_data["damages"].append(damage)

            return container_data

        except Exception as e:
            self._logger.error(
                "Error processing COARRI message",
                extra={"error": str(e), "message_ref": message.message_reference},
                exc_info=True
            )
            raise