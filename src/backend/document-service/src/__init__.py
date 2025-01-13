"""
Port Community System - Document Service Package Initializer
Provides core functionality for EDIFACT message processing and document management
with enhanced security, logging, and performance monitoring capabilities.

Version: 1.0.0
"""

import logging
import structlog
from prometheus_client import Counter, Histogram, Gauge
from typing import Dict, Optional

from .app import app
from .config.settings import Settings

# Initialize settings
settings = Settings()

# Initialize structured logger
logger = structlog.get_logger(__name__)

# Package version
__version__ = settings.APP_VERSION

# Initialize metrics collectors
document_processing_duration = Histogram(
    'document_processing_duration_seconds',
    'Time spent processing documents',
    ['document_type']
)

document_validation_errors = Counter(
    'document_validation_errors_total',
    'Total number of document validation errors',
    ['document_type', 'error_type']
)

active_documents = Gauge(
    'active_documents',
    'Number of documents currently being processed',
    ['document_type']
)

def configure_logging() -> None:
    """
    Configures enhanced structured logging for the document service package
    with performance monitoring capabilities.
    """
    # Configure structlog with JSON formatting
    structlog.configure(
        processors=[
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.JSONRenderer()
        ],
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(),
        wrapper_class=structlog.BoundLogger,
        cache_logger_on_first_use=True,
    )

    # Configure root logger
    logging.basicConfig(
        format=settings.LOG_FORMAT,
        level=settings.LOG_LEVEL,
        handlers=[
            logging.StreamHandler(),
            logging.FileHandler(settings.AUDIT_LOG_PATH)
        ]
    )

    logger.info(
        "Logging configured",
        log_level=settings.LOG_LEVEL,
        audit_enabled=settings.ENABLE_AUDIT_LOGGING
    )

def initialize_metrics() -> None:
    """
    Initializes Prometheus metrics collectors for performance monitoring.
    """
    # Register custom collectors
    document_processing_duration.labels(document_type="EDIFACT")
    document_processing_duration.labels(document_type="CARGO_MANIFEST")
    document_processing_duration.labels(document_type="CUSTOMS_DECLARATION")

    document_validation_errors.labels(document_type="EDIFACT", error_type="syntax")
    document_validation_errors.labels(document_type="EDIFACT", error_type="validation")
    document_validation_errors.labels(document_type="CARGO_MANIFEST", error_type="validation")

    active_documents.labels(document_type="EDIFACT")
    active_documents.labels(document_type="CARGO_MANIFEST")
    active_documents.labels(document_type="CUSTOMS_DECLARATION")

    logger.info("Metrics collectors initialized")

def validate_settings() -> bool:
    """
    Validates all required settings and configurations before service initialization.
    
    Returns:
        bool: True if all settings are valid
    
    Raises:
        ConfigurationError: If any required settings are invalid
    """
    required_settings = [
        'MONGODB_URI',
        'RABBITMQ_URI',
        'REDIS_URI',
        'DOCUMENT_STORAGE_PATH',
        'ENCRYPTION_KEY_PATH',
        'SSL_CERT_PATH'
    ]

    for setting in required_settings:
        if not getattr(settings, setting, None):
            raise ValueError(f"Missing required setting: {setting}")

    logger.info("Settings validated successfully")
    return True

# Initialize package components
try:
    validate_settings()
    configure_logging()
    initialize_metrics()
    logger.info(
        "Document service initialized",
        version=__version__,
        environment=settings.ENV
    )
except Exception as e:
    logger.error(
        "Failed to initialize document service",
        error=str(e),
        version=__version__
    )
    raise

# Export package components
__all__ = [
    "app",
    "settings",
    "__version__",
    "document_processing_duration",
    "document_validation_errors",
    "active_documents"
]