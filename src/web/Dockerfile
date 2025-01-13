# Stage 1: Build environment
FROM node:18-alpine AS builder
LABEL maintainer="Port Community System"

# Install build essentials and security updates
RUN apk update && \
    apk add --no-cache \
    python3 \
    make \
    g++ \
    git \
    && rm -rf /var/cache/apk/*

# Set working directory with appropriate permissions
WORKDIR /app
RUN chown -R node:node /app

# Switch to non-root user
USER node

# Copy package files with strict ownership
COPY --chown=node:node package.json yarn.lock ./

# Install dependencies with yarn for better performance
RUN yarn install --frozen-lockfile --production=false

# Copy source code with integrity verification
COPY --chown=node:node . .

# Build application with production optimizations
ENV NODE_ENV=production
RUN yarn build

# Stage 2: Production environment
FROM nginx:1.24-alpine
LABEL maintainer="Port Community System"

# Install security updates
RUN apk update && \
    apk upgrade && \
    apk add --no-cache curl && \
    rm -rf /var/cache/apk/*

# Create nginx user and group
RUN addgroup -g 101 -S nginx && \
    adduser -S -D -H -u 101 -h /var/cache/nginx -s /sbin/nologin -G nginx -g nginx nginx

# Set up nginx directories with correct permissions
RUN mkdir -p /var/cache/nginx && \
    chown -R nginx:nginx /var/cache/nginx && \
    mkdir -p /var/log/nginx && \
    chown -R nginx:nginx /var/log/nginx

# Copy nginx configuration
COPY --chown=nginx:nginx nginx.conf /etc/nginx/nginx.conf

# Copy built assets from builder stage
COPY --from=builder --chown=nginx:nginx /app/dist /usr/share/nginx/html

# Set correct permissions for nginx directories
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html && \
    chown -R nginx:nginx /etc/nginx/conf.d

# Configure security settings
RUN rm -rf /usr/share/nginx/html/index.html.default && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid

# Set environment variables
ENV NGINX_WORKER_PROCESSES=auto
ENV NGINX_WORKER_CONNECTIONS=1024

# Expose port
EXPOSE 80

# Set up healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl --fail http://localhost:80/health || exit 1

# Switch to non-root user
USER nginx

# Start nginx
CMD ["nginx", "-g", "daemon off;"]