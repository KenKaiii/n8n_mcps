FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files from web-scraper-mcp directory
COPY web-scraper-mcp/package*.json ./

# Install all dependencies (including dev dependencies for building)
RUN npm ci

# Copy source files
COPY web-scraper-mcp/tsconfig.json ./
COPY web-scraper-mcp/src ./src

# Build the TypeScript project
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files from web-scraper-mcp directory
COPY web-scraper-mcp/package*.json ./
RUN npm ci --only=production

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist
COPY web-scraper-mcp/start-server.sh ./

# Create .env file from environment variables
RUN touch .env

# Install supergateway globally
RUN npm install -g supergateway

# Make start script executable
RUN chmod +x start-server.sh

# Expose port - Railway will override this
EXPOSE 8081

# Set GITHUB_TOKEN from environment
ENV GITHUB_TOKEN=${GITHUB_TOKEN}

# Start with supergateway - Railway provides PORT env var
# Redirect stderr to stdout to see logs in Railway
CMD ["sh", "-c", "supergateway --port ${PORT:-8081} --stdio 'node dist/index.js 2>&1'"]