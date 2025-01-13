from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional, Any, Tuple
from pydantic import BaseModel, Field
from ..utils.validators import validate_edifact_syntax

class EdifactMessageType(Enum):
    """
    Enumeration of supported EDIFACT message types in the port system.
    Compliant with ISO 9735 standard.
    """
    IFTSTA = "IFTSTA"  # Status message
    IFTMBC = "IFTMBC"  # Booking confirmation
    COARRI = "COARRI"  # Container discharge/loading report

class EdifactSegment(BaseModel):
    """
    Model class for EDIFACT message segments with enhanced validation 
    and data transformation capabilities.
    """
    tag: str = Field(..., min_length=3, max_length=3)
    content: str = Field(..., min_length=1)
    data: Optional[dict] = Field(default=None)
    sequence_number: int = Field(default=1, gt=0)
    composite_elements: List[str] = Field(default_factory=list)
    validation_rules: Dict[str, Any] = Field(default_factory=dict)
    transformation_rules: Dict[str, Any] = Field(default_factory=dict)

    def validate_segment(self) -> Tuple[bool, str]:
        """
        Validates segment content against defined rules.
        
        Returns:
            tuple[bool, str]: Validation result and error message
        """
        # Check segment tag format
        if not self.tag.isalpha() or not self.tag.isupper():
            return False, f"Invalid segment tag format: {self.tag}"

        # Validate composite elements if present
        if self.composite_elements:
            for element in self.composite_elements:
                if not element.strip():
                    return False, "Empty composite element found"

        # Apply custom validation rules
        for rule_name, rule_func in self.validation_rules.items():
            try:
                if not rule_func(self.content):
                    return False, f"Failed validation rule: {rule_name}"
            except Exception as e:
                return False, f"Validation error in rule {rule_name}: {str(e)}"

        return True, ""

    def transform_data(self) -> dict:
        """
        Applies transformation rules to segment data.
        
        Returns:
            dict: Transformed segment data
        """
        transformed_data = {}

        # Apply data type conversions and transformations
        for field, transform_rule in self.transformation_rules.items():
            try:
                if callable(transform_rule):
                    transformed_data[field] = transform_rule(self.content)
                else:
                    transformed_data[field] = transform_rule

            except Exception as e:
                transformed_data[field] = None

        # Store original content reference
        transformed_data['original_content'] = self.content
        transformed_data['segment_tag'] = self.tag
        transformed_data['sequence_number'] = self.sequence_number

        return transformed_data

class EdifactMessage(BaseModel):
    """
    Main class for handling EDIFACT messages with comprehensive validation 
    and processing capabilities. Supports IFTSTA, IFTMBC, and COARRI message types.
    """
    message_type: EdifactMessageType
    message_reference: str = Field(..., min_length=1)
    raw_content: str = Field(..., min_length=1)
    segments: List[EdifactSegment] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    parsed_data: Optional[dict] = Field(default=None)
    message_version: str = Field(default="D.96A")
    metadata: Dict[str, Any] = Field(default_factory=dict)
    validation_history: Dict[str, Any] = Field(default_factory=dict)
    parent_message_ref: Optional[str] = Field(default=None)
    child_message_refs: List[str] = Field(default_factory=list)

    def parse_message(self) -> List[EdifactSegment]:
        """
        Parses the raw EDIFACT message content into segments with enhanced error handling.
        
        Returns:
            List[EdifactSegment]: List of parsed message segments
        """
        # Split message into segments
        segment_terminator = "'"
        segments_raw = self.raw_content.split(segment_terminator)
        segments_raw = [s.strip() for s in segments_raw if s.strip()]

        parsed_segments = []
        sequence_number = 1

        for segment_raw in segments_raw:
            try:
                # Split segment into tag and content
                if not segment_raw:
                    continue

                tag = segment_raw[:3]
                content = segment_raw[3:] if len(segment_raw) > 3 else ""

                # Create segment with composite elements
                composite_elements = content.split("+") if "+" in content else []
                
                segment = EdifactSegment(
                    tag=tag,
                    content=content,
                    sequence_number=sequence_number,
                    composite_elements=composite_elements
                )
                
                parsed_segments.append(segment)
                sequence_number += 1

            except Exception as e:
                self.validation_history[f"segment_{sequence_number}"] = str(e)
                continue

        self.segments = parsed_segments
        return parsed_segments

    def validate(self) -> Tuple[bool, str, Dict[str, Any]]:
        """
        Performs comprehensive message validation with detailed error reporting.
        
        Returns:
            tuple[bool, str, Dict[str, Any]]: Validation result, error message, and context
        """
        validation_context = {
            "message_type": self.message_type.value,
            "version": self.message_version,
            "timestamp": datetime.utcnow().isoformat()
        }

        # Validate message syntax
        syntax_valid, syntax_error = validate_edifact_syntax(
            self.raw_content, 
            self.message_type
        )
        
        if not syntax_valid:
            validation_context["error_type"] = "syntax"
            validation_context["error_details"] = syntax_error
            return False, syntax_error, validation_context

        # Validate segments
        for segment in self.segments:
            segment_valid, segment_error = segment.validate_segment()
            if not segment_valid:
                validation_context["error_type"] = "segment"
                validation_context["error_segment"] = segment.tag
                validation_context["error_details"] = segment_error
                return False, f"Segment {segment.tag} validation failed: {segment_error}", validation_context

        # Store validation result
        self.validation_history[datetime.utcnow().isoformat()] = {
            "result": True,
            "context": validation_context
        }

        return True, "", validation_context

    def extract_data(self) -> dict:
        """
        Extracts and transforms structured data from the EDIFACT message.
        
        Returns:
            dict: Extracted and transformed message data
        """
        extracted_data = {
            "message_type": self.message_type.value,
            "reference": self.message_reference,
            "version": self.message_version,
            "created_at": self.created_at.isoformat(),
            "segments": {}
        }

        # Transform each segment
        for segment in self.segments:
            transformed_segment = segment.transform_data()
            if segment.tag not in extracted_data["segments"]:
                extracted_data["segments"][segment.tag] = []
            extracted_data["segments"][segment.tag].append(transformed_segment)

        # Add metadata
        extracted_data["metadata"] = self.metadata
        
        # Add message relationships if present
        if self.parent_message_ref:
            extracted_data["parent_reference"] = self.parent_message_ref
        if self.child_message_refs:
            extracted_data["child_references"] = self.child_message_refs

        self.parsed_data = extracted_data
        return extracted_data