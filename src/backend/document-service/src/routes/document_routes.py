from datetime import datetime
from typing import Dict, Optional
from fastapi import APIRouter, File, UploadFile, Request, HTTPException, status, Depends
from fastapi.security import OAuth2PasswordBearer
from prometheus_fastapi_instrumentator import Instrumentator
from python_multipart import parse_options_header
import logging
from functools import wraps

from ..services.document_service import DocumentService
from ..models.document import Document, DocumentType, DocumentStatus

# Initialize router with prefix and tags
router = APIRouter(prefix='/api/v1/documents', tags=['documents'])

# Initialize services and security
document_service = DocumentService()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# Constants
ALLOWED_EXTENSIONS = ['.pdf', '.xml', '.edi', '.json']
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

# Configure logging
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# Initialize metrics
instrumentator = Instrumentator().instrument(router)

def validate_request(func):
    """Decorator for request validation and error handling"""
    @wraps(func)
    async def wrapper(*args, **kwargs):
        try:
            return await func(*args, **kwargs)
        except HTTPException as he:
            logger.error(f"HTTP Exception in {func.__name__}: {str(he)}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error in {func.__name__}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Internal server error"
            )
    return wrapper

def monitor_performance(func):
    """Decorator for performance monitoring"""
    @wraps(func)
    async def wrapper(*args, **kwargs):
        start_time = datetime.utcnow()
        result = await func(*args, **kwargs)
        duration = (datetime.utcnow() - start_time).total_seconds()
        
        # Record metrics
        instrumentator.add_metrics_data(
            endpoint=func.__name__,
            duration=duration,
            status_code=200
        )
        return result
    return wrapper

async def validate_file(file: UploadFile) -> None:
    """Validates uploaded file size and type"""
    # Validate file size
    file_size = 0
    chunk_size = 8192
    
    while True:
        chunk = await file.read(chunk_size)
        if not chunk:
            break
        file_size += len(chunk)
        if file_size > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File size exceeds maximum allowed size of {MAX_FILE_SIZE} bytes"
            )
    
    await file.seek(0)
    
    # Validate file extension
    content_type = parse_options_header(file.content_type)[0].decode()
    file_ext = f".{file.filename.split('.')[-1].lower()}"
    
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported file type. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"
        )

@router.post('/upload', status_code=status.HTTP_201_CREATED)
@validate_request
@monitor_performance
async def upload_document(
    file: UploadFile = File(...),
    document_type: DocumentType = None,
    request: Request = None,
    token: str = Depends(oauth2_scheme)
) -> Dict:
    """
    Handles secure document upload with comprehensive validation
    
    Args:
        file: Uploaded file
        document_type: Type of document being uploaded
        request: FastAPI request object
        token: Authentication token
    
    Returns:
        Dict containing document creation response with status and tracking ID
    """
    # Validate file
    await validate_file(file)
    
    # Read file content
    content = await file.read()
    content_str = content.decode('utf-8')
    
    # Prepare document data
    document_data = {
        'document_type': document_type or DocumentType.EDIFACT,
        'content': content_str,
        'sender': request.client.host,
        'receiver': 'PCS',
        'metadata': {
            'original_filename': file.filename,
            'content_type': file.content_type,
            'upload_timestamp': datetime.utcnow().isoformat(),
            'file_size': len(content)
        }
    }
    
    # Create and validate document
    document = await document_service.create_document(document_data)
    
    # Return response
    return {
        'status': 'success',
        'message': 'Document uploaded successfully',
        'document_id': document.id,
        'reference_number': document.reference_number,
        'tracking_url': f"/api/v1/documents/{document.id}/status"
    }

@router.post('/{document_id}/process')
@validate_request
@monitor_performance
async def process_document(
    document_id: str,
    request: Request,
    token: str = Depends(oauth2_scheme)
) -> Dict:
    """
    Processes document with enhanced validation and monitoring
    
    Args:
        document_id: ID of document to process
        request: FastAPI request object
        token: Authentication token
    
    Returns:
        Dict containing processing results with detailed status
    """
    try:
        # Retrieve document
        document = await document_service.get_document(document_id)
        if not document:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Document not found: {document_id}"
            )
        
        # Process document
        processing_result = await document_service.process_document(document)
        
        # Return response
        return {
            'status': 'success',
            'message': 'Document processed successfully',
            'document_id': document.id,
            'reference_number': document.reference_number,
            'processing_status': document.status.value,
            'processing_result': processing_result,
            'processed_at': datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error processing document {document_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing document: {str(e)}"
        )

@router.get('/{document_id}/status')
@validate_request
@monitor_performance
async def get_document_status(
    document_id: str,
    request: Request,
    token: str = Depends(oauth2_scheme)
) -> Dict:
    """
    Retrieves document status with security validation
    
    Args:
        document_id: ID of document to check
        request: FastAPI request object
        token: Authentication token
    
    Returns:
        Dict containing current document status and metadata
    """
    document = await document_service.get_document(document_id)
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document not found: {document_id}"
        )
    
    return {
        'document_id': document.id,
        'reference_number': document.reference_number,
        'status': document.status.value,
        'created_at': document.created_at.isoformat(),
        'updated_at': document.updated_at.isoformat(),
        'metadata': document.metadata
    }

@router.delete('/{document_id}')
@validate_request
@monitor_performance
async def delete_document(
    document_id: str,
    request: Request,
    token: str = Depends(oauth2_scheme)
) -> Dict:
    """
    Securely deletes document with access validation
    
    Args:
        document_id: ID of document to delete
        request: FastAPI request object
        token: Authentication token
    
    Returns:
        Dict containing deletion confirmation
    """
    result = await document_service.delete_document(document_id)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document not found: {document_id}"
        )
    
    return {
        'status': 'success',
        'message': 'Document deleted successfully',
        'document_id': document_id
    }