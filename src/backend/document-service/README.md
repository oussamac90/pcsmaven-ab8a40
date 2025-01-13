# Document Service

A high-performance, scalable service for processing and validating EDIFACT messages and port-related documents in the Port Community System.

## Overview

The Document Service is a critical component of the Port Community System that handles:
- EDIFACT message processing (IFTSTA, IFTMBC, COARRI)
- Document validation and transformation
- Real-time status tracking
- Secure document storage
- Audit logging and monitoring

## Features

### Document Processing
- Full EDIFACT message support with ISO 9735 compliance
- Comprehensive validation for cargo manifests, bills of lading, and customs declarations
- Real-time document status tracking
- Asynchronous processing with queue support
- Automated error handling and recovery

### Security
- TLS 1.3 encryption for data in transit
- Document encryption at rest
- Role-based access control
- Comprehensive audit logging
- API key authentication
- Request rate limiting

### Monitoring & Observability
- Prometheus metrics integration
- Detailed logging with structured JSON format
- Performance monitoring
- Real-time alerting
- Transaction tracing

## Prerequisites

- Python 3.9+
- MongoDB 6.0+
- Redis 7.0+
- RabbitMQ 3.11+
- Poetry 1.5.0+

## Dependencies

```toml
[tool.poetry.dependencies]
python = "^3.9"
fastapi = "^0.95.0"
pymongo = "^4.3.0"
redis = "^4.5.0"
pika = "^1.3.0"
prometheus-client = "^0.16.0"
edifact = "^2.0.0"
python-jose = "^3.3.0"
python-multipart = "^0.0.6"
```

## Configuration

### Environment Variables

```env
# MongoDB Configuration
MONGODB_URL=mongodb://localhost:27017/pcs
MONGODB_MAX_POOL_SIZE=100

# API Security
API_KEY=your-secure-api-key
ENABLE_SSL=true
SSL_CERT_PATH=/opt/pcs/certs/service.crt

# Logging
LOG_LEVEL=INFO
ENABLE_AUDIT_LOGGING=true
AUDIT_LOG_PATH=/var/log/pcs/audit.log

# Document Processing
MAX_DOCUMENT_SIZE=10485760
DOCUMENT_STORAGE_PATH=/opt/pcs/documents
PROCESSING_TIMEOUT_SECONDS=300
```

## API Endpoints

### Document Management

```
POST /api/v1/documents/upload
- Upload new documents with validation
- Supports multipart/form-data
- Returns document reference number

GET /api/v1/documents/{id}/status
- Retrieve document processing status
- Includes validation results and metadata

POST /api/v1/documents/{id}/process
- Trigger document processing
- Returns processing results
```

### EDIFACT Processing

```
POST /api/v1/edifact/messages
- Process EDIFACT messages
- Supports IFTSTA, IFTMBC, COARRI
- Returns validation results and transformed data
```

## Usage

### Starting the Service

```bash
# Development
poetry run uvicorn src.app:app --host 0.0.0.0 --port 8000 --reload

# Production
poetry run uvicorn src.app:app --host 0.0.0.0 --port 8000 --workers 4
```

### Running Tests

```bash
# Run test suite with coverage
poetry run pytest --cov=src tests/

# Run linting
poetry run flake8 src tests

# Security scan
poetry run bandit -r src/
```

## Docker Support

```dockerfile
FROM python:3.9-slim

WORKDIR /app
COPY pyproject.toml poetry.lock ./
RUN pip install poetry && poetry install --no-dev

COPY . .
EXPOSE 8000

CMD ["poetry", "run", "uvicorn", "src.app:app", "--host", "0.0.0.0", "--port", "8000"]
```

## Monitoring

### Prometheus Metrics

```
# Available metrics
document_processing_duration_seconds
document_validation_errors_total
edifact_messages_processed_total
api_requests_total
processing_queue_size
```

### Health Check

```
GET /health
Returns service health status and version
```

## Security Considerations

1. API Authentication
   - API key required for all requests
   - JWT token validation
   - Rate limiting per client

2. Data Security
   - TLS 1.3 for transport security
   - Document encryption at rest
   - Secure key management

3. Access Control
   - Role-based access control
   - Fine-grained permissions
   - Audit logging

## Error Handling

```json
{
  "error": "validation_failed",
  "detail": "Invalid EDIFACT message format",
  "reference": "DOC-20230615-12345",
  "timestamp": "2023-06-15T10:30:00Z"
}
```

## Contributing

1. Follow PEP 8 style guide
2. Add tests for new features
3. Update documentation
4. Run security scans before commits

## License

Copyright (c) 2023 Port Community System