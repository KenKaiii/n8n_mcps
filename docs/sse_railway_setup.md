# SSE Railway Setup Guide

This guide documents the process and requirements for deploying an MCP SSE server to Railway.

## Overview

MCP (Model Context Protocol) servers communicate via stdio, but for remote access they need to be wrapped with SSE (Server-Sent Events). This setup uses `supergateway` to bridge stdio communication to SSE, making the MCP server accessible over HTTP.

## Key Components

1. **MCP Server**: A Node.js application using `@modelcontextprotocol/sdk`
2. **Supergateway**: Bridges stdio to SSE protocol
3. **Railway**: Cloud hosting platform with automatic deployments from GitHub
4. **Docker**: Multi-stage build for TypeScript compilation

## Setup Requirements

### 1. Project Structure
```
n8n_mcps/                    # Root repository
├── Dockerfile               # Multi-stage Docker build
├── railway.json            # Railway configuration
├── .dockerignore           # Optimized for subdirectory
└── web-scraper-mcp/        # MCP server subdirectory
    ├── package.json
    ├── tsconfig.json
    ├── src/
    │   └── index.ts        # MCP server entry point
    └── dist/               # Built JavaScript (created during Docker build)
```

### 2. Dockerfile (Multi-stage Build)
```dockerfile
# Build stage - compiles TypeScript
FROM node:20-alpine AS builder
WORKDIR /app
COPY web-scraper-mcp/package*.json ./
RUN npm ci
COPY web-scraper-mcp/tsconfig.json ./
COPY web-scraper-mcp/src ./src
RUN npm run build

# Production stage
FROM node:20-alpine
WORKDIR /app
COPY web-scraper-mcp/package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
COPY web-scraper-mcp/start-server.sh ./

# Install supergateway
RUN npm install -g supergateway
RUN chmod +x start-server.sh

EXPOSE 8081
ENV GITHUB_TOKEN=${GITHUB_TOKEN}

# Critical: Use stderr redirection for debugging
CMD ["sh", "-c", "supergateway --port ${PORT:-8081} --stdio 'node dist/index.js 2>&1'"]
```

### 3. Railway Configuration (railway.json)
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "Dockerfile"
  },
  "deploy": {
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  }
}
```

**Important**: Do NOT include health checks - SSE servers don't respond to regular HTTP GET requests.

### 4. .dockerignore Configuration
```
# Ignore everything except web-scraper-mcp
/*
!/web-scraper-mcp/

# Ignore development files
web-scraper-mcp/node_modules/
web-scraper-mcp/.env
web-scraper-mcp/test/
web-scraper-mcp/dist/

# Keep source files for building
!web-scraper-mcp/src/
!web-scraper-mcp/tsconfig.json
!web-scraper-mcp/package.json
!web-scraper-mcp/package-lock.json
!web-scraper-mcp/start-server.sh
```

### 5. Protocol Version Compatibility

n8n may request newer protocol versions than the MCP SDK supports. Add this workaround:

```typescript
// In src/index.ts
const server = new Server(...);

// Override protocol version to accept any version
(server as any).protocolVersion = '2025-03-26';
```

## Railway Deployment Steps

1. **Push to GitHub**
   ```bash
   git add Dockerfile railway.json .dockerignore
   git commit -m "Add Railway deployment configuration"
   git push
   ```

2. **Connect to Railway**
   - Go to [railway.app](https://railway.app)
   - Create new project → Deploy from GitHub repo
   - Select your repository

3. **Configure Environment Variables**
   - In Railway dashboard → Variables tab
   - Add: `GITHUB_TOKEN` = your GitHub personal access token
   - Railway automatically provides `PORT` environment variable

4. **Generate Public Domain**
   - Go to Settings → Networking
   - Click "Generate Domain"
   - When asked for port, enter: **8080** (supergateway's listening port)
   - Your URL will be: `https://[app-name].up.railway.app`

5. **Use in n8n**
   - MCP Client Tool URL: `https://[app-name].up.railway.app/sse`
   - No port number needed in the public URL

## Troubleshooting

### Common Issues

1. **"Child stderr: sh: {...}: not found"**
   - The JSON-RPC message is being interpreted as shell command
   - Solution: Ensure direct node execution without shell wrapper

2. **Health check failures**
   - SSE servers don't respond to GET /
   - Solution: Remove health checks from railway.json

3. **Timeout errors in n8n**
   - Server not responding to initialization
   - Check: Protocol version compatibility
   - Check: Environment variables are set
   - Check: stderr redirection for logs

4. **"Child non-JSON" messages**
   - Normal behavior - these are debug messages
   - Not an error, just supergateway noting non-JSON output

### Debugging Commands

```bash
# Test SSE endpoint
curl -N https://[app-name].up.railway.app/sse

# Check if server responds (should show SSE headers)
curl -i https://[app-name].up.railway.app/sse
```

## Key Learnings

1. **Multi-stage Docker builds** are essential when deploying TypeScript projects
2. **stderr redirection** (`2>&1`) is needed to see server logs in Railway
3. **No health checks** for SSE servers - they maintain open connections
4. **Protocol version flexibility** may be needed for client compatibility
5. **Port configuration**: Internal port doesn't matter, Railway handles routing

## Success Indicators

When working correctly, you'll see in Railway logs:
```
[supergateway] Listening on port 8080
[supergateway] Child non-JSON: Starting MCP server...
[supergateway] Child non-JSON: Connecting transport...
[supergateway] Child non-JSON: MCP server started and ready
```

And the SSE endpoint will return:
```
event: endpoint
data: /message?sessionId=[uuid]
```