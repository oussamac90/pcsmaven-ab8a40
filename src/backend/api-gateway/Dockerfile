# Stage 1: Builder
FROM node:18-alpine AS builder

# Install build essentials
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    curl

# Set working directory
WORKDIR /app

# Copy package files for dependency installation
COPY package*.json ./
COPY tsconfig.json ./

# Install all dependencies including devDependencies
RUN npm ci

# Copy source code
COPY src/ ./src/

# Build TypeScript application
RUN npm run build

# Prune development dependencies
RUN npm prune --production

# Stage 2: Production
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Create non-root user with specific UID/GID
RUN addgroup -g 1001 nodeapp && \
    adduser -u 1001 -G nodeapp -s /bin/sh -D nodeapp

# Install production dependencies
RUN apk add --no-cache \
    curl \
    tzdata

# Set timezone
ENV TZ=UTC

# Set Node.js configuration
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=2048"
ENV PORT=3000

# Copy built application from builder stage
COPY --from=builder --chown=nodeapp:nodeapp /app/dist ./dist
COPY --from=builder --chown=nodeapp:nodeapp /app/node_modules ./node_modules
COPY --from=builder --chown=nodeapp:nodeapp /app/package*.json ./

# Set secure file permissions
RUN chmod -R 444 dist && \
    chmod -R 444 package*.json && \
    chmod -R 444 node_modules && \
    chmod 555 node_modules

# Create directory for temporary files with restricted permissions
RUN mkdir -p /tmp/nodeapp && \
    chown nodeapp:nodeapp /tmp/nodeapp && \
    chmod 755 /tmp/nodeapp

# Expose port
EXPOSE 3000

# Switch to non-root user
USER nodeapp

# Health check configuration
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl --fail http://localhost:3000/health || exit 1

# Set resource limits
ENV MEMORY_LIMIT=2048
ENV CPU_LIMIT=1000
ENV ULIMIT_NOFILE=1024
ENV ULIMIT_NPROC=512

# Set security headers
ENV SECURITY_HEADERS="true"
ENV ENABLE_CORS="false"
ENV TRUST_PROXY="true"

# Start application
ENTRYPOINT ["node", "dist/app.js"]

# Apply resource constraints
LABEL com.docker.container.memory="${MEMORY_LIMIT}m"
LABEL com.docker.container.cpu="${CPU_LIMIT}m"
LABEL com.docker.container.ulimit.nofile="${ULIMIT_NOFILE}"
LABEL com.docker.container.ulimit.nproc="${ULIMIT_NPROC}"

# Add metadata labels
LABEL maintainer="Port Community System Team"
LABEL description="API Gateway service for Port Community System"
LABEL version="1.0.0"
LABEL security.capabilities="NET_BIND_SERVICE"