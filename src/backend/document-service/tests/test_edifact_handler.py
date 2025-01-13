import pytest
import pytest_asyncio
from unittest.mock import Mock, patch
from datetime import datetime
from prometheus_client import Counter, Histogram

from ..src.handlers.edifact_handler import EdifactRequestHandler
from ..src.models.edifact import EdifactMessage, EdifactMessageType
from ..src.utils.validators import validate_edifact_syntax

# Test message samples based on ISO 9735 standard
SAMPLE_IFTSTA = """UNA:+.? '
UNB+UNOC:3+SENDER+RECEIVER+20230615:1200+12345'
UNH+1+IFTSTA:D:96A:UN:CTL001'
BGM+23+12345+9'
DTM+137:202306151200:203'
LOC+9+USNYC:139:6'
STS+1+OK'
UNT+6+1'
UNZ+1+12345'"""

SAMPLE_IFTMBC = """UNA:+.? '
UNB+UNOC:3+SENDER+RECEIVER+20230615:1200+12346'
UNH+1+IFTMBC:D:96A:UN:CTL001'
BGM+335+67890+9'
RFF+BN:12345'
TDT+20+123+1++CARRIER:172:87'
UNT+5+1'
UNZ+1+12346'"""

SAMPLE_COARRI = """UNA:+.? '
UNB+UNOC:3+SENDER+RECEIVER+20230615:1200+12347'
UNH+1+COARRI:D:96A:UN:CTL001'
BGM+34+89012+9'
EQD+CN+CONT123456+42G1:102:5++2+5'
LOC+9+USNYC:139:6'
UNT+5+1'
UNZ+1+12347'"""

INVALID_MESSAGE = """UNA:+.? '
UNB+INVALID FORMAT
BGM+WRONG+FORMAT'"""

# Performance thresholds
PERFORMANCE_THRESHOLD_MS = 100

# Security context for testing
SECURITY_CONTEXT = {
    "sender_id": "SENDER",
    "receiver_id": "RECEIVER",
    "security_level": "AUTHENTICATED"
}

@pytest.fixture
def mock_cache_client():
    return Mock(
        get=Mock(return_value=None),
        set=Mock(return_value=True)
    )

@pytest.fixture
def mock_rate_limiter():
    return Mock(
        check_limit=Mock(return_value=True)
    )

@pytest.fixture
async def edifact_handler(mock_cache_client, mock_rate_limiter):
    return EdifactRequestHandler(
        cache_client=mock_cache_client,
        rate_limiter=mock_rate_limiter
    )

class TestEdifactHandler:
    """
    Comprehensive test suite for EDIFACT message handling with security,
    performance, and compliance validation.
    """

    @pytest.mark.asyncio
    async def test_handle_iftsta_message(self, edifact_handler, benchmark):
        """Test IFTSTA message processing with performance benchmarking"""
        correlation_id = "test-correlation-123"
        
        # Benchmark message processing
        async def process_message():
            return await edifact_handler.handle_edifact_message(
                message_content=SAMPLE_IFTSTA,
                message_type=EdifactMessageType.IFTSTA,
                correlation_id=correlation_id
            )
        
        result = await benchmark(process_message)
        
        # Verify response structure
        assert result["message_type"] == "IFTSTA"
        assert result["correlation_id"] == correlation_id
        assert result["status"] == "processed"
        assert "data" in result
        assert "validation" in result
        
        # Verify status data extraction
        status_data = result["data"]
        assert "status_details" in status_data
        assert len(status_data["status_details"]) > 0
        assert status_data["status_details"][0]["code"] == "OK"

    @pytest.mark.asyncio
    async def test_handle_iftmbc_message(self, edifact_handler):
        """Test IFTMBC booking message processing with validation"""
        correlation_id = "test-correlation-124"
        
        result = await edifact_handler.handle_edifact_message(
            message_content=SAMPLE_IFTMBC,
            message_type=EdifactMessageType.IFTMBC,
            correlation_id=correlation_id
        )
        
        # Verify booking data
        assert result["message_type"] == "IFTMBC"
        assert "data" in result
        booking_data = result["data"]
        assert booking_data["booking_details"]["type"] == "335"
        assert booking_data["booking_details"]["number"] == "67890"
        assert len(booking_data["transport_details"]) > 0

    @pytest.mark.asyncio
    async def test_handle_coarri_message(self, edifact_handler):
        """Test COARRI container message processing"""
        correlation_id = "test-correlation-125"
        
        result = await edifact_handler.handle_edifact_message(
            message_content=SAMPLE_COARRI,
            message_type=EdifactMessageType.COARRI,
            correlation_id=correlation_id
        )
        
        # Verify container data
        assert result["message_type"] == "COARRI"
        assert "data" in result
        container_data = result["data"]
        assert len(container_data["equipment_details"]) > 0
        assert container_data["equipment_details"][0]["number"] == "CONT123456"

    @pytest.mark.asyncio
    async def test_invalid_message_handling(self, edifact_handler):
        """Test handling of invalid EDIFACT messages"""
        correlation_id = "test-correlation-126"
        
        with pytest.raises(Exception) as exc_info:
            await edifact_handler.handle_edifact_message(
                message_content=INVALID_MESSAGE,
                message_type=EdifactMessageType.IFTSTA,
                correlation_id=correlation_id
            )
        assert "validation failed" in str(exc_info.value).lower()

    @pytest.mark.asyncio
    async def test_rate_limiting(self, edifact_handler, mock_rate_limiter):
        """Test rate limiting functionality"""
        correlation_id = "test-correlation-127"
        mock_rate_limiter.check_limit.return_value = False
        
        with pytest.raises(Exception) as exc_info:
            await edifact_handler.handle_edifact_message(
                message_content=SAMPLE_IFTSTA,
                message_type=EdifactMessageType.IFTSTA,
                correlation_id=correlation_id
            )
        assert "rate limit exceeded" in str(exc_info.value).lower()

    @pytest.mark.asyncio
    async def test_cache_handling(self, edifact_handler, mock_cache_client):
        """Test caching functionality"""
        correlation_id = "test-correlation-128"
        cached_response = {
            "message_type": "IFTSTA",
            "status": "processed",
            "data": {"cached": True}
        }
        mock_cache_client.get.return_value = cached_response
        
        result = await edifact_handler.handle_edifact_message(
            message_content=SAMPLE_IFTSTA,
            message_type=EdifactMessageType.IFTSTA,
            correlation_id=correlation_id
        )
        
        assert result == cached_response
        mock_cache_client.get.assert_called_once()

    @pytest.mark.asyncio
    async def test_message_size_validation(self, edifact_handler):
        """Test message size validation"""
        correlation_id = "test-correlation-129"
        large_message = SAMPLE_IFTSTA * 1000  # Create oversized message
        
        with pytest.raises(Exception) as exc_info:
            await edifact_handler.handle_edifact_message(
                message_content=large_message,
                message_type=EdifactMessageType.IFTSTA,
                correlation_id=correlation_id
            )
        assert "size exceeds limit" in str(exc_info.value).lower()

    @pytest.mark.asyncio
    async def test_metrics_collection(self, edifact_handler):
        """Test metrics collection during message processing"""
        correlation_id = "test-correlation-130"
        
        with patch('prometheus_client.Counter.inc') as mock_counter:
            await edifact_handler.handle_edifact_message(
                message_content=SAMPLE_IFTSTA,
                message_type=EdifactMessageType.IFTSTA,
                correlation_id=correlation_id
            )
            mock_counter.assert_called()

    @pytest.mark.asyncio
    async def test_security_validation(self, edifact_handler):
        """Test security validation of messages"""
        correlation_id = "test-correlation-131"
        malicious_content = SAMPLE_IFTSTA.replace(
            "UNB+UNOC:3+SENDER",
            "UNB+UNOC:3+MALICIOUS"
        )
        
        with pytest.raises(Exception) as exc_info:
            await edifact_handler.handle_edifact_message(
                message_content=malicious_content,
                message_type=EdifactMessageType.IFTSTA,
                correlation_id=correlation_id
            )
        assert "validation failed" in str(exc_info.value).lower()

    def test_performance_requirements(self, benchmark):
        """Test performance requirements for message processing"""
        def validate_message():
            return validate_edifact_syntax(SAMPLE_IFTSTA, EdifactMessageType.IFTSTA)
        
        result = benchmark(validate_message)
        assert benchmark.stats.stats.mean * 1000 < PERFORMANCE_THRESHOLD_MS