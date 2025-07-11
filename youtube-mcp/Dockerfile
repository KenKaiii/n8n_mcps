FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
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

# Install express for SSE server
RUN npm install express

# Create .env file from environment
RUN touch .env

EXPOSE 8080

# Set environment variables
ENV NODE_ENV=production
ENV YOUTUBE_API_KEY=${YOUTUBE_API_KEY}

# Start the SSE server
CMD ["node", "dist/sse-server.js"]