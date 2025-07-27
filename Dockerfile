# Multi-stage Docker build for Chess Game Application
# Optimized for security, size, and layer caching using distroless base images

# Build stage for frontend
FROM node:20-bookworm-slim AS frontend-builder
WORKDIR /app/client

# Update packages and install only essential dependencies
RUN apt-get update && apt-get upgrade -y && \
    apt-get install -y --no-install-recommends ca-certificates && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Copy package files first for better layer caching
COPY client/package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy source code and build
COPY client/ ./
RUN npm run build

# Build stage for backend
FROM node:20-bookworm-slim AS backend-builder
WORKDIR /app

# Update packages for security
RUN apt-get update && apt-get upgrade -y && \
    apt-get install -y --no-install-recommends ca-certificates && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Copy package files first for better layer caching
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy source code and build
COPY . .
RUN npm run build

# Production stage - using Google's distroless image for maximum security
FROM gcr.io/distroless/nodejs20-debian12:nonroot AS production

# Copy built backend from builder stage
COPY --from=backend-builder --chown=nonroot:nonroot /app/dist /app/dist
COPY --from=backend-builder --chown=nonroot:nonroot /app/node_modules /app/node_modules
COPY --from=backend-builder --chown=nonroot:nonroot /app/package*.json /app/

# Copy built frontend from builder stage
COPY --from=frontend-builder --chown=nonroot:nonroot /app/client/build /app/client/build

# Copy configuration files
COPY --from=backend-builder --chown=nonroot:nonroot /app/nest-cli.json /app/
COPY --from=backend-builder --chown=nonroot:nonroot /app/tsconfig*.json /app/

WORKDIR /app

# Expose port
EXPOSE 3001

# Health check (distroless doesn't have shell, so we use node directly)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD ["node", "--version"]

# Run as non-root user (distroless default)
USER nonroot

# Start the application
CMD ["dist/main.js"]
