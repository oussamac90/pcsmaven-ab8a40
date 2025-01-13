import logging
from typing import Dict, Tuple, Optional
from datetime import datetime
from fastapi import HTTPException

from ..models.document import Document, DocumentType, DocumentStatus
from ..models.edifact import EdifactMessage, EdifactMessageType
from ..utils.validators import validate_document_format

class DocumentService:
    """
    Service class for handling document operations in the Port Community System.
    Provides high-level operations for document processing, validation, and management.
    """

    def __init__(self):
        """
        Initializes the document service with logging configuration.
        """
        self._logger = logging.getLogger(__name__)
        self._logger.setLevel(logging.INFO)

    async def create_document(self, document_data: Dict) -> Document:
        """
        Creates a new document in the system with comprehensive validation.

        Args:
            document_data: Dictionary containing document metadata and content

        Returns:
            Document: Created document instance

        Raises:
            HTTPException: If document creation fails
        """
        try:
            self._logger.info(f"Creating new document of type: {document_data.get('document_type')}")
            
            # Create document instance with validation
            document = Document(document_data)
            
            # Perform initial format validation
            is_valid, error_msg = await self.validate_document(document)
            if not is_valid:
                self._logger.error(f"Document validation failed: {error_msg}")
                raise HTTPException(status_code=400, detail=error_msg)
            
            self._logger.info(f"Document created successfully with reference: {document.reference_number}")
            return document
            
        except Exception as e:
            error_msg = f"Error creating document: {str(e)}"
            self._logger.error(error_msg)
            raise HTTPException(status_code=500, detail=error_msg)

    async def process_document(self, document: Document) -> Dict:
        """
        Processes a document based on its type with comprehensive error handling.

        Args:
            document: Document instance to process

        Returns:
            Dict: Processing results

        Raises:
            HTTPException: If document processing fails
        """
        try:
            self._logger.info(f"Processing document: {document.reference_number}")
            
            # Update status to processing
            document.update_status(DocumentStatus.PROCESSING)
            
            # Validate document format
            is_valid, error_msg = await self.validate_document(document)
            if not is_valid:
                raise HTTPException(status_code=400, detail=error_msg)
            
            # Process based on document type
            if document.document_type == DocumentType.EDIFACT:
                processing_result = await self.handle_edifact_message(document)
            else:
                # Process document using standard document processing
                processing_result = await document.process()
            
            self._logger.info(f"Document processed successfully: {document.reference_number}")
            return processing_result
            
        except Exception as e:
            error_msg = f"Error processing document: {str(e)}"
            self._logger.error(error_msg)
            document.update_status(DocumentStatus.REJECTED, error_msg)
            raise HTTPException(status_code=500, detail=error_msg)

    async def validate_document(self, document: Document) -> Tuple[bool, str]:
        """
        Validates a document's format and content with comprehensive error checking.

        Args:
            document: Document instance to validate

        Returns:
            Tuple[bool, str]: Validation result and message
        """
        try:
            self._logger.info(f"Validating document: {document.reference_number}")
            
            # Perform format validation
            is_valid, error_msg = validate_document_format(
                document.document_type.value,
                document.content
            )
            
            if not is_valid:
                self._logger.warning(f"Document format validation failed: {error_msg}")
                document.update_status(DocumentStatus.REJECTED, error_msg)
                return False, error_msg
            
            # Perform document-specific validation
            validation_result = await document.validate()
            
            if not validation_result[0]:
                self._logger.warning(f"Document content validation failed: {validation_result[1]}")
                return validation_result
            
            self._logger.info(f"Document validated successfully: {document.reference_number}")
            return True, ""
            
        except Exception as e:
            error_msg = f"Error validating document: {str(e)}"
            self._logger.error(error_msg)
            document.update_status(DocumentStatus.REJECTED, error_msg)
            return False, error_msg

    async def handle_edifact_message(self, document: Document) -> Dict:
        """
        Handles processing of EDIFACT messages with comprehensive validation.

        Args:
            document: Document instance containing EDIFACT message

        Returns:
            Dict: Processed EDIFACT data

        Raises:
            HTTPException: If EDIFACT processing fails
        """
        try:
            self._logger.info(f"Processing EDIFACT message: {document.reference_number}")
            
            # Create EDIFACT message instance
            edifact_msg = EdifactMessage(
                message_type=EdifactMessageType[document.metadata.get('edifact_type', 'IFTSTA')],
                message_reference=document.reference_number,
                raw_content=document.content
            )
            
            # Parse and validate message
            edifact_msg.parse_message()
            is_valid, error_msg, validation_context = edifact_msg.validate()
            
            if not is_valid:
                self._logger.error(f"EDIFACT validation failed: {error_msg}")
                document.update_status(DocumentStatus.REJECTED, error_msg)
                raise HTTPException(status_code=400, detail=error_msg)
            
            # Extract and process message data
            processed_data = edifact_msg.extract_data()
            
            # Update document metadata with processing results
            document.metadata.update({
                'edifact_processing': processed_data,
                'validation_context': validation_context,
                'processed_at': datetime.utcnow().isoformat()
            })
            
            self._logger.info(f"EDIFACT message processed successfully: {document.reference_number}")
            return processed_data
            
        except Exception as e:
            error_msg = f"Error processing EDIFACT message: {str(e)}"
            self._logger.error(error_msg)
            document.update_status(DocumentStatus.REJECTED, error_msg)
            raise HTTPException(status_code=500, detail=error_msg)