# Syntax version
# syntax=docker/dockerfile:1.4

# Build arguments
ARG NODE_VERSION=18
ARG JAVA_VERSION=17
ARG PYTHON_VERSION=3.9

# API Gateway build stage
FROM node:${NODE_VERSION}-alpine AS api-gateway-builder
WORKDIR /build/api-gateway
COPY api-gateway/package*.json api-gateway/tsconfig.json ./
RUN apk add --no-cache python3 make g++ \
    && npm ci \
    && npm cache clean --force
COPY api-gateway/src ./src
RUN npm run build

# Core Service build stage
FROM maven:3.9.9-eclipse-temurin-${JAVA_VERSION}-alpine AS core-service-builder
WORKDIR /build/core-service
COPY core-service/pom.xml ./
RUN mvn dependency:go-offline -B
COPY core-service/src ./src
RUN mvn clean package -P prod,security-scan -DskipTests \
    && java -Djarmode=layertools -jar target/*.jar extract

# Document Service build stage
FROM python:${PYTHON_VERSION}-slim AS document-service-builder
ENV POETRY_VERSION=1.5.0 \
    POETRY_HOME=/opt/poetry \
    POETRY_VIRTUALENVS_IN_PROJECT=true
WORKDIR /build/document-service
RUN apt-get update && apt-get install -y curl build-essential \
    && curl -sSL https://install.python-poetry.org | python3 -
COPY document-service/pyproject.toml document-service/poetry.lock ./
RUN $POETRY_HOME/bin/poetry install --no-dev --no-root
COPY document-service ./
RUN $POETRY_HOME/bin/poetry install --no-dev

# Notification Service build stage
FROM node:${NODE_VERSION}-alpine AS notification-service-builder
WORKDIR /build/notification-service
COPY notification-service/package*.json notification-service/yarn.lock ./
RUN apk add --no-cache python3 make g++ \
    && yarn install --frozen-lockfile
COPY notification-service ./
RUN yarn build

# Security scan stage
FROM aquasec/trivy:0.45.0 AS security-scanner
COPY --from=api-gateway-builder /build/api-gateway /scan/api-gateway
COPY --from=core-service-builder /build/core-service /scan/core-service
COPY --from=document-service-builder /build/document-service /scan/document-service
COPY --from=notification-service-builder /build/notification-service /scan/notification-service
RUN trivy filesystem --exit-code 1 --severity HIGH,CRITICAL /scan

# Final stage
FROM alpine:3.18
LABEL maintainer="Port Community System Team" \
      version="1.0.0" \
      description="Port Community System Backend Services" \
      security.features="non-root,minimal,hardened"

# Install runtime dependencies
RUN apk add --no-cache \
    openjdk17-jre-headless \
    python3 \
    nodejs \
    npm \
    tini \
    tzdata \
    curl \
    && addgroup -g 1000 pcs \
    && adduser -u 1000 -G pcs -s /sbin/nologin -D pcs

# Set environment variables
ENV TZ=UTC \
    NODE_ENV=production \
    SPRING_PROFILES_ACTIVE=prod \
    PYTHONUNBUFFERED=1

# Create service directories
RUN mkdir -p /app/{api-gateway,core-service,document-service,notification-service} \
    && chown -R pcs:pcs /app

# Copy built artifacts
COPY --from=api-gateway-builder --chown=pcs:pcs /build/api-gateway/dist /app/api-gateway
COPY --from=core-service-builder --chown=pcs:pcs /build/core-service/dependencies/ /app/core-service/
COPY --from=core-service-builder --chown=pcs:pcs /build/core-service/spring-boot-loader/ /app/core-service/
COPY --from=core-service-builder --chown=pcs:pcs /build/core-service/snapshot-dependencies/ /app/core-service/
COPY --from=core-service-builder --chown=pcs:pcs /build/core-service/application/ /app/core-service/
COPY --from=document-service-builder --chown=pcs:pcs /build/document-service /app/document-service
COPY --from=notification-service-builder --chown=pcs:pcs /build/notification-service/dist /app/notification-service

# Set secure permissions
RUN chmod -R 550 /app \
    && chmod -R 770 /app/*/logs /app/*/temp 2>/dev/null || true

# Expose service ports
EXPOSE 3000 8080 8000 3003

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8080/actuator/health || exit 1

# Set resource limits
ENV MEMORY_LIMIT=4G \
    CPU_LIMIT=2.0 \
    JAVA_OPTS="-Xms512m -Xmx2g -XX:+UseG1GC -XX:+UseContainerSupport" \
    NODE_OPTIONS="--max-old-space-size=2048"

# Use tini as init
ENTRYPOINT ["/sbin/tini", "--"]

# Start services using non-root user
USER pcs
CMD ["sh", "-c", "cd /app/api-gateway && node app.js & \
                  cd /app/core-service && java org.springframework.boot.loader.JarLauncher & \
                  cd /app/document-service && python3 -m uvicorn app:app --host 0.0.0.0 --port 8000 & \
                  cd /app/notification-service && node app.js"]