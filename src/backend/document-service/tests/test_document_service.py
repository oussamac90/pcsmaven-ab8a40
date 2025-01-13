import pytest
import pytest_asyncio
from unittest.mock import Mock, patch
from datetime import datetime, timedelta

from ..src.services.document_service import DocumentService
from ..src.models.document import Document, DocumentType, DocumentStatus
from ..src.models.edifact import EdifactMessage, EdifactMessageType

# Test data constants
TEST_DOCUMENT_DATA = {
    "document_type": DocumentType.EDIFACT,
    "reference_number": "DOC-20230801-12345678",
    "content": "UNA:+.? '\nUNB+UNOC:3+SENDER+RECEIVER+230801:1200+12345'\nUNH+1+IFTSTA:D:96A:UN'\nBGM+335+1234567890+9'\nDTM+137:202308011200:203'\nLOC+5+USNYC:139:6'\nSTS+1+OK'\nUNT+7+1'\nUNZ+1+12345'",
    "sender": "SENDER",
    "receiver": "RECEIVER",
    "metadata": {
        "edifact_type": "IFTSTA",
        "priority": "normal"
    }
}

TEST_EDIFACT_MESSAGE = "UNA:+.? '\nUNB+UNOC:3+SENDER+RECEIVER+230801:1200+12345'\nUNH+1+IFTSTA:D:96A:UN'\nBGM+335+1234567890+9'\nDTM+137:202308011200:203'\nLOC+5+USNYC:139:6'\nSTS+1+OK'\nUNT+7+1'\nUNZ+1+12345'"

PERFORMANCE_THRESHOLDS = {
    "document_creation_ms": 100,
    "document_processing_ms": 200,
    "edifact_validation_ms": 150
}

class TestDocumentService:
    """
    Comprehensive test suite for DocumentService class covering all aspects
    of document handling and processing.
    """
    
    @pytest.fixture(autouse=True)
    async def setup_method(self):
        """Setup method run before each test case"""
        self.document_service = DocumentService()
        self.test_document_data = TEST_DOCUMENT_DATA.copy()

    @pytest.mark.asyncio
    async def test_create_document_success(self):
        """Test successful document creation with valid data"""
        start_time = datetime.utcnow()
        document = await self.document_service.create_document(self.test_document_data)
        
        assert document.document_type == DocumentType.EDIFACT
        assert document.reference_number == self.test_document_data["reference_number"]
        assert document.sender == self.test_document_data["sender"]
        assert document.receiver == self.test_document_data["receiver"]
        assert document.status == DocumentStatus.PENDING
        assert document.metadata["edifact_type"] == "IFTSTA"
        
        # Performance check
        execution_time = (datetime.utcnow() - start_time).total_seconds() * 1000
        assert execution_time < PERFORMANCE_THRESHOLDS["document_creation_ms"]

    @pytest.mark.asyncio
    async def test_create_document_invalid_data(self):
        """Test document creation with invalid data"""
        invalid_data = self.test_document_data.copy()
        invalid_data["content"] = "Invalid EDIFACT content"
        
        with pytest.raises(Exception) as exc_info:
            await self.document_service.create_document(invalid_data)
        assert "Invalid or missing UNB segment" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_process_document_success(self):
        """Test successful document processing"""
        document = Document(self.test_document_data)
        start_time = datetime.utcnow()
        
        result = await self.document_service.process_document(document)
        
        assert document.status == DocumentStatus.COMPLETED
        assert "edifact_processing" in document.metadata
        assert result is not None
        
        # Performance check
        execution_time = (datetime.utcnow() - start_time).total_seconds() * 1000
        assert execution_time < PERFORMANCE_THRESHOLDS["document_processing_ms"]

    @pytest.mark.asyncio
    async def test_validate_document_edifact(self):
        """Test EDIFACT document validation"""
        document = Document(self.test_document_data)
        start_time = datetime.utcnow()
        
        is_valid, error_msg = await self.document_service.validate_document(document)
        
        assert is_valid is True
        assert error_msg == ""
        assert document.status == DocumentStatus.VALIDATED
        
        # Performance check
        execution_time = (datetime.utcnow() - start_time).total_seconds() * 1000
        assert execution_time < PERFORMANCE_THRESHOLDS["edifact_validation_ms"]

    @pytest.mark.asyncio
    async def test_handle_edifact_message_success(self):
        """Test successful EDIFACT message handling"""
        document = Document(self.test_document_data)
        result = await self.document_service.handle_edifact_message(document)
        
        assert result is not None
        assert "message_type" in result
        assert result["message_type"] == "IFTSTA"
        assert document.status == DocumentStatus.COMPLETED
        assert "edifact_processing" in document.metadata

    @pytest.mark.asyncio
    async def test_handle_edifact_message_invalid(self):
        """Test handling of invalid EDIFACT message"""
        invalid_data = self.test_document_data.copy()
        invalid_data["content"] = "Invalid EDIFACT content"
        document = Document(invalid_data)
        
        with pytest.raises(Exception) as exc_info:
            await self.document_service.handle_edifact_message(document)
        assert document.status == DocumentStatus.REJECTED

    @pytest.mark.asyncio
    async def test_document_status_transitions(self):
        """Test document status transitions during processing"""
        document = Document(self.test_document_data)
        
        # Initial status
        assert document.status == DocumentStatus.PENDING
        
        # Process document
        await self.document_service.process_document(document)
        
        # Verify status history
        status_history = document.metadata.get("status_history", [])
        assert len(status_history) >= 3  # At least PENDING -> PROCESSING -> COMPLETED
        assert status_history[-1]["status"] == DocumentStatus.COMPLETED.value

    @pytest.mark.asyncio
    async def test_concurrent_document_processing(self):
        """Test concurrent document processing capabilities"""
        num_documents = 5
        documents = [Document(self.test_document_data) for _ in range(num_documents)]
        
        # Process documents concurrently
        import asyncio
        start_time = datetime.utcnow()
        tasks = [self.document_service.process_document(doc) for doc in documents]
        results = await asyncio.gather(*tasks)
        
        # Verify results
        assert len(results) == num_documents
        assert all(doc.status == DocumentStatus.COMPLETED for doc in documents)
        
        # Performance check - should complete within reasonable time
        execution_time = (datetime.utcnow() - start_time).total_seconds() * 1000
        assert execution_time < PERFORMANCE_THRESHOLDS["document_processing_ms"] * 2

    @pytest.mark.asyncio
    async def test_document_error_handling(self):
        """Test error handling during document processing"""
        # Test with various error scenarios
        error_scenarios = [
            {"content": "", "expected_error": "Invalid or missing UNB segment"},
            {"content": "UNB+INVALID", "expected_error": "Invalid or missing UNB segment"},
            {"content": None, "expected_error": "Document content cannot be empty"}
        ]
        
        for scenario in error_scenarios:
            test_data = self.test_document_data.copy()
            test_data["content"] = scenario["content"]
            
            with pytest.raises(Exception) as exc_info:
                document = Document(test_data)
                await self.document_service.process_document(document)
            
            assert scenario["expected_error"] in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_document_metadata_handling(self):
        """Test document metadata handling and updates"""
        document = Document(self.test_document_data)
        
        # Process document
        await self.document_service.process_document(document)
        
        # Verify metadata updates
        assert "edifact_processing" in document.metadata
        assert "validation_context" in document.metadata
        assert "processed_at" in document.metadata
        assert "status_history" in document.metadata
        
        # Verify metadata content
        processing_result = document.metadata["edifact_processing"]
        assert processing_result["message_type"] == "IFTSTA"
        assert isinstance(processing_result["processed_at"], str)