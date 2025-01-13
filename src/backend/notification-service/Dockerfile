# Build stage
FROM node:18-alpine as builder

# Set working directory
WORKDIR /usr/src/app

# Add package files with hash verification
COPY package*.json yarn.lock ./
COPY --chown=node:node . .

# Install dependencies with yarn for deterministic builds
RUN apk add --no-cache --virtual .build-deps python3 make g++ \
    && yarn install --frozen-lockfile \
    && yarn cache clean \
    && apk del .build-deps

# Build TypeScript code with optimizations
RUN yarn build \
    && yarn install --production --ignore-scripts --prefer-offline \
    && yarn cache clean

# Production stage
FROM node:18-alpine

# Add labels for container metadata
LABEL maintainer="PCS DevOps Team" \
      version="1.0.0" \
      description="Port Community System Notification Service" \
      security.scan-date="2023-01-01" \
      k8s.description="Notification service for real-time updates"

# Create non-root user
RUN addgroup -g 1001 nodejs && \
    adduser -u 1001 -G nodejs -s /bin/sh -D nodejs

# Set working directory
WORKDIR /usr/src/app

# Set production environment
ENV NODE_ENV=production \
    PORT=3003 \
    HOST=0.0.0.0 \
    NODE_OPTIONS="--max-old-space-size=2048" \
    TZ=UTC

# Copy package files and install production dependencies
COPY --chown=nodejs:nodejs package*.json yarn.lock ./
RUN yarn install --production --frozen-lockfile --ignore-scripts \
    && yarn cache clean

# Copy built files from builder stage
COPY --chown=nodejs:nodejs --from=builder /usr/src/app/dist ./dist

# Security hardening
RUN chmod -R 550 /usr/src/app \
    && chmod -R 550 /usr/src/app/dist \
    && chown -R nodejs:nodejs /usr/src/app

# Switch to non-root user
USER nodejs

# Health check configuration
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT}/health || exit 1

# Expose service port
EXPOSE ${PORT}

# Start notification service with proper signal handling
CMD ["node", "dist/app.js"]