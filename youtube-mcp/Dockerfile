FROM node:20-slim AS builder

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
FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Create .env file from environment
RUN touch .env

# Install nginx, gettext-base for envsubst, and supergateway
RUN apt-get update && apt-get install -y \
    nginx \
    gettext-base \
    && rm -rf /var/lib/apt/lists/*

RUN npm install -g supergateway

# Copy nginx configuration and start script
COPY nginx.conf /etc/nginx/nginx.conf
COPY start.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 8080

# Set environment variables
ENV NODE_ENV=production
ENV YOUTUBE_API_KEY=${YOUTUBE_API_KEY}
ENV MCP_AUTH_TOKEN=${MCP_AUTH_TOKEN}

# Start nginx proxy + supergateway
CMD ["/start.sh"]