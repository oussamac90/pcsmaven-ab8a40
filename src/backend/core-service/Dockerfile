# Build stage
FROM maven:3.9.9-eclipse-temurin-17-alpine AS builder

WORKDIR /build

# Copy pom.xml for dependency resolution
COPY pom.xml .

# Download dependencies and verify checksums
RUN mvn dependency:go-offline -B \
    && mvn verify --fail-never

# Copy source code
COPY src ./src

# Run security scan and build
RUN mvn clean package -P prod,security-scan -DskipTests \
    && java -Djarmode=layertools -jar target/*.jar extract

# Runtime stage
FROM eclipse-temurin:17-jre-alpine

# Install additional security packages
RUN apk add --no-cache \
    tini \
    tzdata \
    dumb-init \
    && rm -rf /var/cache/apk/*

# Create non-root user/group
RUN addgroup -g 1000 appgroup && \
    adduser -u 1000 -G appgroup -s /sbin/nologin -D appuser

# Set working directory
WORKDIR /app

# Copy application layers from builder
COPY --from=builder /build/dependencies/ ./
COPY --from=builder /build/spring-boot-loader/ ./
COPY --from=builder /build/snapshot-dependencies/ ./
COPY --from=builder /build/application/ ./

# Set ownership and permissions
RUN chown -R appuser:appgroup /app \
    && chmod -R 755 /app \
    && chmod 444 /app/BOOT-INF/classes/application.yml

# Configure security options
RUN mkdir -p /tmp/pcs \
    && chown -R appuser:appgroup /tmp/pcs \
    && chmod 1777 /tmp/pcs

# Set environment variables
ENV TZ=UTC \
    SPRING_PROFILES_ACTIVE=prod \
    JAVA_OPTS="-Xms512m -Xmx2g -XX:+UseG1GC -XX:+HeapDumpOnOutOfMemoryError -XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0 -Djava.security.egd=file:/dev/./urandom"

# Expose application port
EXPOSE 8080

# Set up health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=60s \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/actuator/health || exit 1

# Set resource limits
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75.0 -XX:InitialRAMPercentage=50.0"

# Add container metadata
LABEL maintainer="PCS Development Team" \
      vendor="Port Community System" \
      version="${project.version}" \
      build-date="${build.date}" \
      description="Port Community System Core Service" \
      security.scanner="trivy"

# Switch to non-root user
USER appuser

# Use tini as init process
ENTRYPOINT ["/sbin/tini", "--"]

# Define the command with optimized JVM options
CMD ["java", "-server", \
     "-Djava.security.egd=file:/dev/./urandom", \
     "-Djava.awt.headless=true", \
     "-Dfile.encoding=UTF-8", \
     "-Dspring.profiles.active=${SPRING_PROFILES_ACTIVE}", \
     "-XX:+UseContainerSupport", \
     "-XX:+OptimizeStringConcat", \
     "-XX:+UseStringDeduplication", \
     "-XX:+ExitOnOutOfMemoryError", \
     "-XX:+HeapDumpOnOutOfMemoryError", \
     "-XX:HeapDumpPath=/tmp/pcs/heapdump.hprof", \
     "-XX:+UseG1GC", \
     "-XX:MaxGCPauseMillis=200", \
     "-XX:+ParallelRefProcEnabled", \
     "-XX:+UseNUMA", \
     "-Xms512m", \
     "-Xmx2g", \
     "org.springframework.boot.loader.JarLauncher"]