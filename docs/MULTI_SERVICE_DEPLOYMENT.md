# Multi-Service MCP Deployment Guide

This guide explains how to deploy multiple MCP servers from a single repository to Railway, each with its own SSE endpoint.

## Repository Structure

```
n8n_mcps/
├── web-scraper-mcp/           # First MCP service
│   ├── Dockerfile             # Self-contained build
│   ├── railway.json          # Railway config
│   ├── .dockerignore         # Docker ignore rules
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       └── index.ts
├── example-mcp/              # Example second service
│   ├── Dockerfile
│   ├── railway.json
│   ├── .dockerignore
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       └── index.ts
└── youtube-analyzer-mcp/     # Another service (you can add)
    ├── Dockerfile
    ├── railway.json
    └── ...
```

## Key Principles

1. **Self-Contained Services**: Each MCP directory is completely self-contained
2. **No Parent References**: Dockerfiles don't reference parent directories
3. **Independent Deployment**: Each service can be deployed separately
4. **Shared Repository**: All services live in the same GitHub repo

## Setting Up a New MCP Service

### 1. Create Directory Structure
```bash
mkdir -p my-new-mcp/src
cd my-new-mcp
```

### 2. Create Dockerfile
Each service needs its own Dockerfile in its directory:

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app

# Copy files relative to this directory
COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Production stage
FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist

# Create start script inline
RUN echo '#!/bin/sh\nif [ -f .env ]; then\n    export $(grep -v "^#" .env | xargs)\nfi\nexec node dist/index.js' > start-server.sh
RUN chmod +x start-server.sh

RUN npm install -g supergateway
RUN touch .env

EXPOSE 8081
CMD ["sh", "-c", "supergateway --port ${PORT:-8081} --stdio 'node dist/index.js 2>&1'"]
```

### 3. Create railway.json
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "./Dockerfile"
  },
  "deploy": {
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  }
}
```

### 4. Create .dockerignore
```
node_modules/
.env
.env.local
test/
dist/
*.log

# Keep source files
!src/
!package.json
!package-lock.json
!tsconfig.json
```

## Railway Deployment Process

### For Each MCP Service:

1. **Create New Service in Railway**
   - In your Railway project, click "New Service"
   - Choose "GitHub Repo"
   - Select your repository (n8n_mcps)

2. **Configure Root Directory**
   - Go to Settings → General
   - Set "Root Directory" to your MCP folder (e.g., `web-scraper-mcp`)
   - Railway will only build from that directory

3. **Set Environment Variables**
   - Go to Variables tab
   - Add service-specific variables (e.g., `GITHUB_TOKEN`)
   - Each service has isolated environment variables

4. **Generate Domain**
   - Go to Settings → Networking
   - Click "Generate Domain"
   - Enter port: **8080**
   - Each service gets a unique URL:
     - `web-scraper-mcp-production.up.railway.app`
     - `example-mcp-production.up.railway.app`
     - `youtube-analyzer-production.up.railway.app`

5. **SSE Endpoints**
   - Each service's SSE endpoint: `https://[service-name].up.railway.app/sse`
   - Use these URLs in n8n MCP Client Tool

## Benefits of This Approach

1. **Independent Deployments**: Change one MCP without affecting others
2. **Separate Logs**: Each service has its own log stream
3. **Individual Scaling**: Scale services based on their usage
4. **Environment Isolation**: Each service has its own env vars
5. **Rollback Control**: Rollback individual services
6. **Cost Efficiency**: Only pay for what's running

## Managing Multiple Services

### Railway Dashboard Organization
- All services appear in your single Railway project
- Each shows its own:
  - Deployment status
  - Resource usage
  - Logs
  - Environment variables

### Deployment Triggers
- Push to main branch triggers all services
- But only services with changes actually redeploy
- Railway detects changes in each root directory

### Monitoring
- Each service has independent:
  - Health status
  - Resource metrics
  - Error tracking
  - Deployment history

## Example Commands

```bash
# Add a new MCP service
mkdir -p new-service-mcp/src
cp example-mcp/Dockerfile new-service-mcp/
cp example-mcp/railway.json new-service-mcp/
cp example-mcp/.dockerignore new-service-mcp/
# Then customize for your service

# Deploy all services (push to GitHub)
git add .
git commit -m "Add new MCP service"
git push

# Railway automatically deploys changed services
```

## Troubleshooting

1. **Service Not Building**
   - Check "Root Directory" setting in Railway
   - Ensure Dockerfile exists in that directory

2. **Environment Variables Missing**
   - Each service needs its own env vars
   - Set them per service in Railway dashboard

3. **Port Conflicts**
   - Internal ports don't matter (Railway handles routing)
   - Always use 8080 when generating domain

4. **Cross-Service Communication**
   - Services are isolated
   - Use public URLs if services need to communicate

## Best Practices

1. **Naming Convention**: Use `-mcp` suffix for clarity
2. **Documentation**: Each service should have its own README
3. **Testing**: Test locally with supergateway before deploying
4. **Versioning**: Consider using tags for production deployments
5. **Secrets**: Never commit secrets; use Railway environment variables

This approach gives you maximum flexibility while keeping everything organized in a single repository!