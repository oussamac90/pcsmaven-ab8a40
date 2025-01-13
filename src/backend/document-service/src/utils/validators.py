import re
import json
import enum
from typing import List, Tuple, Dict, Optional

# Constants for document validation
SUPPORTED_DOCUMENT_TYPES = ['EDIFACT', 'CARGO_MANIFEST', 'BILL_OF_LADING', 'CUSTOMS_DECLARATION']
MAX_DOCUMENT_SIZE = 10 * 1024 * 1024  # 10MB maximum document size

# EDIFACT validation patterns according to ISO 9735
VALIDATION_PATTERNS = {
    "segment_pattern": r'^[A-Z]{3}\+',
    "element_separator": "+",
    "release_character": "?",
    "segment_terminator": "'",
    "decimal_separator": ".",
    "una_pattern": r'^UNA:[,.? \'$',
    "unb_pattern": r'^UNB\+[^\']+\'',
}

class EdifactMessageType(enum.Enum):
    """
    Enumeration of supported EDIFACT message types with their validation rules
    according to ISO 9735 standard.
    """
    IFTSTA = "IFTSTA"  # Status message
    IFTMBC = "IFTMBC"  # Booking confirmation
    COARRI = "COARRI"  # Container discharge/loading report

    def get_required_segments(self) -> List[str]:
        """
        Returns the list of required segments for each message type
        according to ISO 9735 standard.
        """
        segments_map = {
            EdifactMessageType.IFTSTA: [
                "UNH", "BGM", "DTM", "LOC", "STS", "UNT"
            ],
            EdifactMessageType.IFTMBC: [
                "UNH", "BGM", "RFF", "TDT", "UNT"
            ],
            EdifactMessageType.COARRI: [
                "UNH", "BGM", "EQD", "LOC", "UNT"
            ]
        }
        return segments_map.get(self, [])

def _validate_size(content: str) -> Tuple[bool, str]:
    """
    Validates document size against maximum allowed size.
    """
    content_size = len(content.encode('utf-8'))
    if content_size > MAX_DOCUMENT_SIZE:
        return False, f"Document size ({content_size} bytes) exceeds maximum allowed size ({MAX_DOCUMENT_SIZE} bytes)"
    return True, ""

def _sanitize_input(content: str) -> str:
    """
    Sanitizes input content by removing potentially harmful characters
    while preserving EDIFACT special characters.
    """
    # Remove control characters except allowed EDIFACT special characters
    sanitized = ''.join(char for char in content if char.isprintable() or 
                       char in VALIDATION_PATTERNS.values())
    return sanitized

def validate_edifact_syntax(message_content: str, message_type: EdifactMessageType) -> Tuple[bool, str]:
    """
    Validates EDIFACT message syntax according to ISO 9735 standard.
    
    Args:
        message_content: The EDIFACT message content to validate
        message_type: The type of EDIFACT message (IFTSTA, IFTMBC, COARRI)
    
    Returns:
        Tuple containing validation result (bool) and error message (str)
    """
    # Validate UNA segment if present
    if message_content.startswith('UNA'):
        if not re.match(VALIDATION_PATTERNS["una_pattern"], message_content):
            return False, "Invalid UNA segment format"
        message_content = message_content[9:]  # Skip UNA segment for further processing
    
    # Validate UNB segment
    if not re.match(VALIDATION_PATTERNS["unb_pattern"], message_content):
        return False, "Invalid or missing UNB segment"
    
    # Split into segments
    segments = message_content.split(VALIDATION_PATTERNS["segment_terminator"])
    segments = [s.strip() for s in segments if s.strip()]
    
    # Validate required segments
    required_segments = message_type.get_required_segments()
    found_segments = [seg[:3] for seg in segments if re.match(VALIDATION_PATTERNS["segment_pattern"], seg)]
    
    missing_segments = [seg for seg in required_segments if seg not in found_segments]
    if missing_segments:
        return False, f"Missing required segments: {', '.join(missing_segments)}"
    
    # Validate segment syntax
    for segment in segments:
        # Skip empty segments
        if not segment.strip():
            continue
            
        # Validate segment format
        if not re.match(VALIDATION_PATTERNS["segment_pattern"], segment):
            return False, f"Invalid segment format: {segment[:20]}..."
            
        # Validate element separators
        elements = segment.split(VALIDATION_PATTERNS["element_separator"])
        if not all(elements):
            return False, f"Empty element found in segment: {segment[:20]}..."
            
        # Check for proper use of release character
        if VALIDATION_PATTERNS["release_character"] in segment:
            release_positions = [i for i, char in enumerate(segment) 
                               if char == VALIDATION_PATTERNS["release_character"]]
            for pos in release_positions:
                if pos == len(segment) - 1 or segment[pos + 1] not in [
                    VALIDATION_PATTERNS["element_separator"],
                    VALIDATION_PATTERNS["segment_terminator"],
                    VALIDATION_PATTERNS["release_character"]
                ]:
                    return False, f"Invalid use of release character in segment: {segment[:20]}..."
    
    return True, ""

def validate_document_format(document_type: str, content: str) -> Tuple[bool, str]:
    """
    Main validation function for all document types with comprehensive error checking.
    
    Args:
        document_type: Type of document to validate
        content: Document content to validate
    
    Returns:
        Tuple containing validation result (bool) and error message (str)
    """
    # Validate document type
    if document_type not in SUPPORTED_DOCUMENT_TYPES:
        return False, f"Unsupported document type: {document_type}"
    
    # Validate document size
    size_valid, size_error = _validate_size(content)
    if not size_valid:
        return False, size_error
    
    # Sanitize input
    content = _sanitize_input(content)
    
    # Route to specific validator based on document type
    if document_type == 'EDIFACT':
        # Detect EDIFACT message type
        message_type = None
        for line in content.split(VALIDATION_PATTERNS["segment_terminator"]):
            if line.startswith('UNH+'):
                for edi_type in EdifactMessageType:
                    if edi_type.value in line:
                        message_type = edi_type
                        break
                break
        
        if not message_type:
            return False, "Unable to determine EDIFACT message type"
            
        return validate_edifact_syntax(content, message_type)
        
    elif document_type == 'CARGO_MANIFEST':
        try:
            manifest = json.loads(content)
            required_fields = ['vessel_id', 'cargo_items', 'total_weight']
            if not all(field in manifest for field in required_fields):
                return False, f"Missing required fields in cargo manifest: {required_fields}"
            return True, ""
        except json.JSONDecodeError:
            return False, "Invalid JSON format in cargo manifest"
            
    elif document_type == 'BILL_OF_LADING':
        # Basic structure validation for Bill of Lading
        required_patterns = [
            r'B/L No\.:\s*\w+',
            r'Shipper:\s*.+',
            r'Consignee:\s*.+',
            r'Vessel:\s*.+'
        ]
        
        for pattern in required_patterns:
            if not re.search(pattern, content):
                return False, f"Missing or invalid format for pattern: {pattern}"
        return True, ""
        
    elif document_type == 'CUSTOMS_DECLARATION':
        # Basic structure validation for Customs Declaration
        required_patterns = [
            r'Declaration No\.:\s*\w+',
            r'Declarant:\s*.+',
            r'Goods Description:\s*.+',
            r'Value:\s*[\d.,]+',
            r'Date:\s*\d{2}[-/]\d{2}[-/]\d{4}'
        ]
        
        for pattern in required_patterns:
            if not re.search(pattern, content):
                return False, f"Missing or invalid format for pattern: {pattern}"
        return True, ""
    
    return False, f"Validation not implemented for document type: {document_type}"