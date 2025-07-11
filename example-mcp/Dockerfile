# Self-contained Dockerfile for example-mcp
# This demonstrates how each MCP service has its own Dockerfile

FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files - note: paths are relative to this directory
COPY package*.json ./

# Install all dependencies for building
RUN npm ci

# Copy source files
COPY tsconfig.json ./
COPY src ./src

# Build the TypeScript project
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Create start script inline (no separate file needed)
RUN echo '#!/bin/sh\nif [ -f .env ]; then\n    export $(grep -v "^#" .env | xargs)\nfi\nexec node dist/index.js' > start-server.sh
RUN chmod +x start-server.sh

# Install supergateway
RUN npm install -g supergateway

# Create .env file from environment
RUN touch .env

EXPOSE 8081

# Environment variables will be provided by Railway
ENV NODE_ENV=production

# Start with supergateway
CMD ["sh", "-c", "supergateway --port ${PORT:-8081} --stdio 'node dist/index.js 2>&1'"]