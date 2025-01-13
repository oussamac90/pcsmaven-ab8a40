import os
import enum
from typing import Dict, List, Optional
from pydantic import BaseSettings, validator

class DocumentType(enum.Enum):
    """Supported document types in the Port Community System"""
    CARGO_MANIFEST = "CARGO_MANIFEST"
    CUSTOMS_DECLARATION = "CUSTOMS_DECLARATION"
    BILL_OF_LADING = "BILL_OF_LADING"
    DANGEROUS_GOODS_DECLARATION = "DANGEROUS_GOODS_DECLARATION"
    SHIPPING_INSTRUCTIONS = "SHIPPING_INSTRUCTIONS"
    ARRIVAL_NOTICE = "ARRIVAL_NOTICE"

class EdifactMessageType(enum.Enum):
    """Supported EDIFACT message types with validation rules"""
    IFTSTA = "IFTSTA"  # International Forwarding and Transport Status
    IFTMBC = "IFTMBC"  # International Forwarding and Transport Message Booking Confirmation
    COARRI = "COARRI"  # Container Discharge/Loading Report
    COPARN = "COPARN"  # Container Announcement
    COREOR = "COREOR"  # Container Release Order
    CODECO = "CODECO"  # Container Gate In/Out Report

class Settings(BaseSettings):
    """Main configuration settings for the document service"""
    
    # Application Settings
    APP_NAME: str = "pcs-document-service"
    APP_VERSION: str = "1.0.0"
    ENV: str = "development"
    
    # MongoDB Configuration
    MONGODB_URI: str
    MONGODB_MAX_POOL_SIZE: int = 100
    MONGODB_MIN_POOL_SIZE: int = 10
    MONGODB_TIMEOUT_MS: int = 5000
    
    # Message Queue Configuration
    RABBITMQ_URI: str
    
    # Cache Configuration
    REDIS_URI: str
    REDIS_POOL_SIZE: int = 50
    
    # API Rate Limiting
    API_RATE_LIMIT: int = 100
    API_RATE_LIMIT_PERIOD: int = 60  # seconds
    
    # Document Processing Settings
    MAX_DOCUMENT_SIZE_MB: int = 10
    ALLOWED_MIME_TYPES: List[str] = [
        "application/pdf",
        "application/xml",
        "text/plain",
        "application/edifact"
    ]
    DOCUMENT_STORAGE_PATH: str = "/opt/pcs/documents"
    PROCESSING_TIMEOUT_SECONDS: int = 300
    
    # EDIFACT Configuration
    ENABLE_EDIFACT_VALIDATION: bool = True
    EDIFACT_SEGMENT_DEFINITIONS: Dict[str, str] = {
        "UNH": "Message Header",
        "BGM": "Beginning of Message",
        "DTM": "Date/Time/Period",
        "LOC": "Place/Location Identification",
        "RFF": "Reference",
        "TDT": "Transport Information",
        "NAD": "Name and Address",
        "GID": "Goods Item Details",
        "MEA": "Measurements",
        "UNT": "Message Trailer"
    }
    
    # Logging Configuration
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    ENABLE_AUDIT_LOGGING: bool = True
    AUDIT_LOG_PATH: str = "/var/log/pcs/audit.log"
    
    # Document Types Configuration
    ALLOWED_DOCUMENT_TYPES: List[DocumentType] = [
        DocumentType.CARGO_MANIFEST,
        DocumentType.CUSTOMS_DECLARATION,
        DocumentType.BILL_OF_LADING
    ]
    
    # EDIFACT Message Types Configuration
    ALLOWED_EDIFACT_TYPES: List[EdifactMessageType] = [
        EdifactMessageType.IFTSTA,
        EdifactMessageType.IFTMBC,
        EdifactMessageType.COARRI
    ]
    
    # Security Settings
    ENCRYPTION_KEY_PATH: str = "/opt/pcs/keys/document.key"
    ENABLE_SSL: bool = True
    SSL_CERT_PATH: str = "/opt/pcs/certs/service.crt"
    
    # Retention and Backup Settings
    DOCUMENT_RETENTION_DAYS: int = 90
    ENABLE_COMPRESSION: bool = True
    BACKUP_STORAGE_PATH: str = "/opt/pcs/backups"
    
    # Retry Configuration
    MAX_RETRY_ATTEMPTS: int = 3
    RETRY_DELAY_SECONDS: int = 5

    @validator("MONGODB_URI")
    def validate_mongodb_uri(cls, v):
        """Validate MongoDB URI format"""
        if not v.startswith(("mongodb://", "mongodb+srv://")):
            raise ValueError("Invalid MongoDB URI format")
        return v

    @validator("ENCRYPTION_KEY_PATH", "SSL_CERT_PATH")
    def validate_file_paths(cls, v):
        """Validate that required security files exist"""
        if not os.path.exists(v):
            raise ValueError(f"Required security file not found: {v}")
        return v

    def get_mongodb_settings(self) -> Dict:
        """Returns optimized MongoDB connection settings"""
        return {
            "uri": self.MONGODB_URI,
            "maxPoolSize": self.MONGODB_MAX_POOL_SIZE,
            "minPoolSize": self.MONGODB_MIN_POOL_SIZE,
            "connectTimeoutMS": self.MONGODB_TIMEOUT_MS,
            "ssl": self.ENABLE_SSL,
            "retryWrites": True,
            "retryReads": True,
            "w": "majority",
            "readPreference": "primaryPreferred",
            "maxConnecting": 2,
            "serverSelectionTimeoutMS": 5000,
            "heartbeatFrequencyMS": 10000
        }

    def get_edifact_settings(self) -> Dict:
        """Returns comprehensive EDIFACT processing configuration"""
        return {
            "validation_enabled": self.ENABLE_EDIFACT_VALIDATION,
            "segment_definitions": self.EDIFACT_SEGMENT_DEFINITIONS,
            "allowed_message_types": [t.value for t in self.ALLOWED_EDIFACT_TYPES],
            "processing_timeout": self.PROCESSING_TIMEOUT_SECONDS,
            "max_segment_size": 1024,
            "character_encoding": "UNOA",
            "syntax_version": "4",
            "service_string_advice": "UNA:+.? '",
            "segment_terminator": "'",
            "data_element_separator": "+",
            "component_data_separator": ":",
            "decimal_notation": ".",
            "release_character": "?"
        }

    class Config:
        """Pydantic configuration"""
        env_file = ".env"
        case_sensitive = True
        validate_assignment = True

# Initialize global settings instance
settings = Settings()