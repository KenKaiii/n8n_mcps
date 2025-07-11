FROM node:20-alpine

WORKDIR /app

# Copy package files from web-scraper-mcp directory
COPY web-scraper-mcp/package*.json ./
RUN npm ci --only=production

# Copy built files
COPY web-scraper-mcp/dist ./dist
COPY web-scraper-mcp/start-server.sh ./

# Create .env file from environment variables
RUN touch .env

# Install supergateway globally
RUN npm install -g supergateway

# Make start script executable
RUN chmod +x start-server.sh

# Expose port - Railway will override this
EXPOSE 8081

# Start with supergateway - Railway provides PORT env var
CMD ["sh", "-c", "supergateway --port ${PORT:-8081} --stdio ./start-server.sh"]