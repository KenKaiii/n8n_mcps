# Railway Deployment Guide for MCP Servers

This guide covers deploying your MCP server to Railway with Supergateway for HTTP/authentication support.

## Prerequisites

- Completed MCP server following the [MCP Development Guide](./MCP_DEVELOPMENT_GUIDE.md)
- Railway account (https://railway.app)
- GitHub repository with your MCP server code
- Generated authentication token for your MCP server

## Architecture on Railway

```
Railway Container
    ├── NGINX Proxy (Port 8080) - Authentication Layer
    ├── Supergateway (Port 8081) - MCP Protocol Layer
    └── Your MCP Server (STDIO) - Business Logic

External Request → Railway URL → NGINX (Bearer Auth) → Supergateway → MCP Server
                                     ↓
                              401 if invalid token
```

**Security Benefits:**
- NGINX validates Bearer tokens before reaching application
- Supergateway provides MCP protocol compatibility
- Zero-trust architecture with proper error responses

## Phase 1: Prepare for Deployment

### 1.1 Create Dockerfile

Create a multi-stage Dockerfile with NGINX authentication:

```dockerfile
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

# Install only production dependencies
RUN npm ci --only=production

# Copy built files from builder
COPY --from=builder /app/dist ./dist

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

# Expose port for Railway
EXPOSE 8080

# Set environment variables
ENV NODE_ENV=production
ENV MCP_AUTH_TOKEN=${MCP_AUTH_TOKEN}

# Start nginx proxy + supergateway
CMD ["/start.sh"]
```

### 1.2 Create railway.json

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE"
  },
  "deploy": {
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  }
}
```

### 1.3 Update .gitignore

Ensure these are in your `.gitignore`:

```
node_modules/
dist/
.env
.env.local
.env.production
*.log
```

### 1.4 Create/Update README.md

Include deployment instructions in your README:

```markdown
# Your MCP Server

## Deployment

### Railway Deployment

1. Fork/clone this repository
2. Create new Railway project
3. Connect your GitHub repository
4. Set environment variables:
   - `MCP_AUTH_TOKEN`: Your secure authentication token
   - `PORT`: 8080 (Railway sets this automatically)
   - [Add your other required variables]
5. Deploy!

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `MCP_AUTH_TOKEN` | Authentication token for API access | Yes |
| `PORT` | Server port (auto-set by Railway) | Yes |
| [Your variables] | [Description] | Yes/No |

### API Endpoint

After deployment, your MCP server will be available at:
```
https://your-app.railway.app
```

Use this URL in n8n with your authentication token.
```

## Phase 2: Deploy to Railway

### 2.1 Create Railway Project

1. Go to https://railway.app
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Authorize Railway to access your GitHub
5. Select your MCP server repository

### 2.2 Configure Environment Variables

In Railway dashboard:

1. Go to your service settings
2. Click on "Variables"
3. Add the following:

```bash
# Required
MCP_AUTH_TOKEN=generate-a-secure-token-here
PORT=8080

# Your API keys and configuration
API_KEY=your-api-key
DATABASE_URL=your-database-url
# Add all variables from your .env.example
```

**Generating a Secure Token:**
```bash
# Option 1: Using OpenSSL
openssl rand -base64 32

# Option 2: Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Option 3: Using uuidgen
uuidgen | shasum -a 256 | base64
```

### 2.3 Deploy

Railway will automatically:
1. Detect your Dockerfile
2. Build your application
3. Deploy it
4. Provide you with a URL

### 2.4 Get Your Deployment URL

1. In Railway dashboard, go to your service
2. Click on "Settings"
3. Find your deployment URL: `https://your-app-name.railway.app`

## Phase 3: Verify Deployment

### 3.1 Check Deployment Logs

In Railway:
1. Go to your service
2. Click on "Logs"
3. Look for:
   - "MCP server started successfully"
   - No error messages
   - Supergateway initialization

### 3.2 Test with cURL

Test your deployment with a simple request:

```bash
# List available tools
curl -X POST https://your-app.railway.app \
  -H "Authorization: Bearer YOUR_MCP_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/list",
    "params": {},
    "id": 1
  }'
```

Expected response:
```json
{
  "jsonrpc": "2.0",
  "result": {
    "tools": [
      {
        "name": "your_tool_name",
        "description": "...",
        "inputSchema": {...}
      }
    ]
  },
  "id": 1
}
```

### 3.3 Test Tool Execution

```bash
curl -X POST https://your-app.railway.app \
  -H "Authorization: Bearer YOUR_MCP_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "your_tool_name",
      "arguments": {
        "param1": "test"
      }
    },
    "id": 2
  }'
```

## Phase 4: Monitoring and Maintenance

### 4.1 View Logs

Railway provides real-time logs:
1. Go to your service
2. Click "Logs"
3. Filter by:
   - Deploy logs
   - Runtime logs
   - Error logs

### 4.2 Metrics

Monitor in Railway dashboard:
- Memory usage
- CPU usage
- Network I/O
- Response times

### 4.3 Scaling

Railway automatically handles:
- Horizontal scaling
- Load balancing
- Zero-downtime deployments

To manually scale:
1. Go to service settings
2. Adjust "Replicas" count
3. Configure memory/CPU limits

## Phase 5: Troubleshooting

### Common Issues and Solutions

#### 1. "502 Bad Gateway"
- **Cause**: Server not starting properly
- **Solution**:
  - Check logs for startup errors
  - Verify all environment variables are set
  - Ensure `PORT` is correctly used

#### 2. "401 Unauthorized"
- **Cause**: Authentication token mismatch
- **Solution**:
  - Verify `MCP_AUTH_TOKEN` is set in Railway
  - Check token format in requests
  - Ensure no extra spaces in token

#### 3. "Cannot find module"
- **Cause**: Build or dependency issues
- **Solution**:
  - Check Dockerfile stages
  - Verify `npm ci` in production stage
  - Ensure dist folder is copied

#### 4. "Connection timeout"
- **Cause**: Server not listening on correct port
- **Solution**:
  - Use `${PORT}` environment variable
  - Don't hardcode port numbers
  - Check Supergateway command

#### 5. Build Failures
- **Cause**: TypeScript or dependency errors
- **Solution**:
  - Test build locally first
  - Check Node.js version compatibility
  - Review TypeScript errors

### Debug Commands

Run these in Railway's shell:

```bash
# Check running processes
ps aux

# View environment variables (be careful with secrets!)
env | grep -E "PORT|NODE_ENV"

# Test MCP server directly
echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | node dist/index.js

# Check Supergateway
which supergateway
supergateway --version
```

## Phase 6: Advanced Configuration

### 6.1 Custom Domains

1. Go to service settings
2. Click "Domains"
3. Add custom domain
4. Configure DNS CNAME to Railway

### 6.2 Environment-Specific Config

Use Railway environments for staging/production:

```javascript
// In your config.ts
export const config = {
  isDevelopment: process.env.RAILWAY_ENVIRONMENT === 'development',
  isProduction: process.env.RAILWAY_ENVIRONMENT === 'production',
  // ... other config
};
```

### 6.3 Secrets Management

For sensitive data:
1. Use Railway's encrypted variables
2. Never commit secrets to Git
3. Rotate tokens regularly
4. Use different tokens per environment

### 6.4 Health Checks

Add health endpoint for monitoring:

```typescript
// In your SSE server or separate health server
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version,
  });
});
```

## Phase 7: CI/CD Integration

### 7.1 Automatic Deployments

Railway automatically deploys when you:
- Push to main branch
- Merge pull requests
- Tag releases

### 7.2 Deployment Checks

Add these checks before deployment:

```json
// package.json scripts
{
  "scripts": {
    "predeploy": "npm run typecheck && npm run lint && npm run test",
    "typecheck": "tsc --noEmit",
    "lint": "eslint src --ext .ts",
    "test": "jest"
  }
}
```

### 7.3 Rollback Strategy

If deployment fails:
1. Go to Railway dashboard
2. Click "Deployments"
3. Find last working deployment
4. Click "Rollback"

## Best Practices

1. **Security**
   - Use strong authentication tokens
   - Rotate tokens regularly
   - Never expose tokens in logs
   - Use HTTPS only (Railway provides this)

2. **Performance**
   - Keep Docker images small
   - Use multi-stage builds
   - Cache dependencies properly
   - Monitor memory usage

3. **Reliability**
   - Set restart policies
   - Implement health checks
   - Use proper error handling
   - Monitor logs regularly

4. **Development Workflow**
   - Test locally first
   - Use staging environment
   - Automate tests
   - Document changes

## Next Steps

1. Set up SSE endpoint: [SSE Integration Guide](./SSE_INTEGRATION_GUIDE.md)
2. Connect to n8n: [n8n Setup Guide](./N8N_SETUP_GUIDE.md)
3. Monitor and optimize performance
4. Set up alerts for errors

## Support Resources

- Railway Documentation: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- MCP SDK: https://github.com/modelcontextprotocol/sdk
- Supergateway: https://www.npmjs.com/package/supergateway
