FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for building)
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

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist

# Create .env file from environment variables
RUN touch .env

# Install supergateway globally
RUN npm install -g supergateway

# Expose port - Railway will override this
EXPOSE 8082

# Start with supergateway - Railway provides PORT env var
# Redirect stderr to stdout to see logs in Railway
CMD ["sh", "-c", "supergateway --port ${PORT:-8082} --stdio 'node dist/index.js 2>&1'"]