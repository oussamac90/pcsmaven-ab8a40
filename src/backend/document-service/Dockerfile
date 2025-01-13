# Builder stage
FROM python:3.9-slim AS builder

# Set build environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    POETRY_VERSION=1.5.0 \
    POETRY_HOME=/opt/poetry \
    POETRY_VIRTUALENVS_IN_PROJECT=true \
    POETRY_NO_INTERACTION=1 \
    PYTHONPATH=/app

# Install system dependencies and security updates
RUN apt-get update && apt-get upgrade -y \
    && apt-get install --no-install-recommends -y \
        curl \
        build-essential \
        libpq-dev \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install Poetry
RUN curl -sSL https://install.python-poetry.org | python3 -

# Set working directory
WORKDIR /app

# Copy project files
COPY pyproject.toml poetry.lock ./

# Install dependencies
RUN $POETRY_HOME/bin/poetry install --no-dev --no-root

# Copy application code
COPY . .

# Install application
RUN $POETRY_HOME/bin/poetry install --no-dev

# Final stage
FROM python:3.9-slim

# Set runtime environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    POETRY_VIRTUALENVS_IN_PROJECT=true \
    POETRY_NO_INTERACTION=1 \
    PYTHONPATH=/app \
    PORT=8000 \
    TZ=UTC

# Install system dependencies and Tini
RUN apt-get update && apt-get upgrade -y \
    && apt-get install --no-install-recommends -y \
        curl \
        tini \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* \
    # Create non-root user
    && useradd -r -s /bin/false appuser \
    # Create necessary directories
    && mkdir -p /app/data /app/logs \
    && chown -R appuser:appuser /app

# Set working directory
WORKDIR /app

# Copy dependencies and application from builder
COPY --from=builder --chown=appuser:appuser /app /app

# Set secure permissions
RUN chmod -R 550 /app \
    && chmod -R 770 /app/data /app/logs

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Resource limits
ENV MEMORY_LIMIT=512M \
    CPU_LIMIT=1.0

# Container metadata
LABEL maintainer="PCS Team" \
      version="1.0.0" \
      description="Document Service for EDIFACT Processing" \
      security.capabilities="drop=all"

# Set entrypoint using Tini for proper signal handling
ENTRYPOINT ["/usr/bin/tini", "--"]

# Start the application using Poetry
CMD ["poetry", "run", "start"]