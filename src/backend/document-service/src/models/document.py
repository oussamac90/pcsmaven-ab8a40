from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional, Tuple
from pydantic import BaseModel, Field
import uuid

from .edifact import EdifactMessage
from ..utils.validators import validate_document_format

class DocumentType(Enum):
    """
    Enumeration of supported document types in the port system.
    """
    EDIFACT = "EDIFACT"
    CARGO_MANIFEST = "CARGO_MANIFEST"
    CUSTOMS_DECLARATION = "CUSTOMS_DECLARATION"
    BILL_OF_LADING = "BILL_OF_LADING"
    CERTIFICATE = "CERTIFICATE"
    INVOICE = "INVOICE"

class DocumentStatus(Enum):
    """
    Enumeration of possible document processing statuses.
    """
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    VALIDATED = "VALIDATED"
    REJECTED = "REJECTED"
    COMPLETED = "COMPLETED"

class Document(BaseModel):
    """
    Main document model class for handling port-related documents.
    Supports various document types including EDIFACT messages, cargo manifests,
    customs declarations and other port documents.
    """
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    document_type: DocumentType
    reference_number: str
    content: str
    sender: str
    receiver: str
    status: DocumentStatus = Field(default=DocumentStatus.PENDING)
    error_message: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    metadata: Dict = Field(default_factory=dict)
    _processing_cache: Dict = Field(default_factory=dict)

    def __init__(self, data: dict):
        """
        Initializes a new document instance with comprehensive validation.
        
        Args:
            data: Dictionary containing document data
        """
        # Generate reference number if not provided
        if 'reference_number' not in data:
            data['reference_number'] = f"DOC-{datetime.utcnow().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8]}"
        
        # Initialize metadata if not provided
        if 'metadata' not in data:
            data['metadata'] = {}
            
        # Set initial status
        if 'status' not in data:
            data['status'] = DocumentStatus.PENDING
            
        # Sanitize content if present
        if 'content' in data:
            data['content'] = data['content'].strip()
            
        super().__init__(**data)
        self._processing_cache = {}

    async def validate(self) -> Tuple[bool, str]:
        """
        Validates the document content based on its type with comprehensive error handling.
        
        Returns:
            tuple[bool, str]: Validation result and error message
        """
        try:
            # Check if validation result is cached
            cache_key = f"validation_{hash(self.content)}"
            if cache_key in self._processing_cache:
                return self._processing_cache[cache_key]

            # Validate basic document format
            is_valid, error_msg = validate_document_format(
                self.document_type.value,
                self.content
            )

            if not is_valid:
                self.update_status(DocumentStatus.REJECTED, error_msg)
                self._processing_cache[cache_key] = (False, error_msg)
                return False, error_msg

            # Additional validation for EDIFACT messages
            if self.document_type == DocumentType.EDIFACT:
                edifact_msg = EdifactMessage(
                    message_type=self.metadata.get('edifact_type'),
                    message_reference=self.reference_number,
                    raw_content=self.content
                )
                edifact_msg.parse_message()
                is_valid, error_msg, validation_context = edifact_msg.validate()
                
                # Update metadata with validation context
                self.metadata['validation_context'] = validation_context
                
                if not is_valid:
                    self.update_status(DocumentStatus.REJECTED, error_msg)
                    self._processing_cache[cache_key] = (False, error_msg)
                    return False, error_msg

            # Update status on successful validation
            self.update_status(DocumentStatus.VALIDATED)
            self._processing_cache[cache_key] = (True, "")
            return True, ""

        except Exception as e:
            error_msg = f"Validation error: {str(e)}"
            self.update_status(DocumentStatus.REJECTED, error_msg)
            return False, error_msg

    async def process(self) -> Dict:
        """
        Processes the document content based on its type with comprehensive error handling.
        
        Returns:
            dict: Processed document data
        """
        try:
            # Check processing cache
            cache_key = f"processing_{hash(self.content)}"
            if cache_key in self._processing_cache:
                return self._processing_cache[cache_key]

            self.update_status(DocumentStatus.PROCESSING)
            processed_data = {}

            # Process based on document type
            if self.document_type == DocumentType.EDIFACT:
                edifact_msg = EdifactMessage(
                    message_type=self.metadata.get('edifact_type'),
                    message_reference=self.reference_number,
                    raw_content=self.content
                )
                edifact_msg.parse_message()
                processed_data = edifact_msg.extract_data()
                
            else:
                # Generic document processing for other types
                processed_data = {
                    'document_type': self.document_type.value,
                    'reference': self.reference_number,
                    'content': self.content,
                    'metadata': self.metadata,
                    'processed_at': datetime.utcnow().isoformat()
                }

            # Update metadata with processing results
            self.metadata['processing_result'] = processed_data
            self.update_status(DocumentStatus.COMPLETED)
            
            # Cache processing results
            self._processing_cache[cache_key] = processed_data
            return processed_data

        except Exception as e:
            error_msg = f"Processing error: {str(e)}"
            self.update_status(DocumentStatus.REJECTED, error_msg)
            raise

    def update_status(self, new_status: DocumentStatus, message: Optional[str] = None) -> None:
        """
        Updates the document processing status with audit logging.
        
        Args:
            new_status: New status to set
            message: Optional status message
        """
        # Validate status transition
        valid_transitions = {
            DocumentStatus.PENDING: [DocumentStatus.PROCESSING, DocumentStatus.REJECTED],
            DocumentStatus.PROCESSING: [DocumentStatus.VALIDATED, DocumentStatus.REJECTED],
            DocumentStatus.VALIDATED: [DocumentStatus.PROCESSING, DocumentStatus.COMPLETED, DocumentStatus.REJECTED],
            DocumentStatus.REJECTED: [DocumentStatus.PENDING],
            DocumentStatus.COMPLETED: [DocumentStatus.PROCESSING]
        }

        if new_status not in valid_transitions.get(self.status, []):
            raise ValueError(f"Invalid status transition from {self.status} to {new_status}")

        # Update status and related fields
        self.status = new_status
        self.error_message = message if message else None
        self.updated_at = datetime.utcnow()

        # Clear processing cache on rejection
        if new_status == DocumentStatus.REJECTED:
            self._processing_cache.clear()

        # Update metadata with status history
        if 'status_history' not in self.metadata:
            self.metadata['status_history'] = []
            
        self.metadata['status_history'].append({
            'status': new_status.value,
            'timestamp': self.updated_at.isoformat(),
            'message': message
        })