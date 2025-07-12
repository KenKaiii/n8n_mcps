# MCP Server Troubleshooting Guide

Comprehensive guide for diagnosing and fixing issues with MCP server development, deployment, and n8n integration.

## Quick Diagnostic Checklist

Start here for any issue:

1. **Environment Variables**
   ```bash
   # Verify in Railway dashboard
   echo $MCP_AUTH_TOKEN  # Should be 32+ characters
   echo $PORT            # Should be 8080
   echo $NODE_ENV        # Should be 'production'
   ```

2. **Railway Deployment Status**
   - Check Railway logs for startup errors
   - Verify deployment URL is accessible
   - Confirm environment variables are set

3. **Authentication**
   ```bash
   # Test auth with cURL
   curl -X POST https://your-app.railway.app \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'
   ```

## Common Issues by Phase

### Development Phase Issues

#### Issue: "Cannot find module" errors
**Symptoms:** Import errors during development
**Causes:**
- Missing `.js` extensions in imports
- Incorrect tsconfig.json module settings
- Wrong file paths

**Solutions:**
```typescript
// ❌ Wrong
import { config } from './config';

// ✅ Correct
import { config } from './config.js';
```

```json
// Ensure tsconfig.json has:
{
  "compilerOptions": {
    "module": "ES2022",
    "moduleResolution": "node"
  }
}
```

#### Issue: TypeScript compilation errors
**Symptoms:** `tsc` fails, types don't match
**Solutions:**
```bash
# Check types
npm run typecheck

# Common fixes
npm install --save-dev @types/node @types/express
```

#### Issue: MCP Inspector connection fails
**Symptoms:** Inspector can't connect to MCP server
**Solutions:**
```bash
# Ensure server uses console.error for logging
console.error('Server started'); // ✅ Correct
console.log('Server started');   // ❌ Wrong (interferes with STDIO)
```

### Deployment Phase Issues

#### Issue: "502 Bad Gateway" on Railway
**Symptoms:** Railway deployment succeeds but returns 502
**Causes:**
- Server not listening on correct port
- Environment variables not set
- Application crashes on startup

**Debug Steps:**
1. Check Railway logs:
   ```
   Railway Dashboard → Your Service → Logs
   ```

2. Verify port usage:
   ```typescript
   // ✅ Correct
   const PORT = process.env.PORT || 8080;
   app.listen(PORT);

   // ❌ Wrong
   app.listen(3000); // Hardcoded port
   ```

3. Check environment variables:
   ```dockerfile
   # Add validation to Dockerfile
   RUN if [ -z "$MCP_AUTH_TOKEN" ]; then echo "ERROR: MCP_AUTH_TOKEN required" && exit 1; fi
   ```

#### Issue: "401 Unauthorized" errors
**Symptoms:** API calls return 401 status
**Causes:**
- Token mismatch between Railway and requests
- Incorrect auth header format
- Missing authentication middleware

**Solutions:**
1. Verify token in Railway:
   ```
   Railway Dashboard → Variables → MCP_AUTH_TOKEN
   ```

2. Check request format:
   ```bash
   # ✅ Correct
   curl -H "Authorization: Bearer your-exact-token"

   # ❌ Wrong
   curl -H "Authorization: your-token"  # Missing "Bearer "
   ```

3. Implement proper auth middleware:
   ```typescript
   const authenticate = (req, res, next) => {
     const token = req.headers.authorization?.substring(7);
     if (token !== process.env.MCP_AUTH_TOKEN) {
       return res.status(401).json({error: 'Unauthorized'});
     }
     next();
   };
   ```

#### Issue: Docker build failures
**Symptoms:** Railway build fails, Docker errors
**Solutions:**
1. Test locally:
   ```bash
   docker build -t test-mcp .
   docker run -e MCP_AUTH_TOKEN=test test-mcp
   ```

2. Check multi-stage build:
   ```dockerfile
   # Ensure dist folder is copied
   COPY --from=builder /app/dist ./dist
   ```

3. Verify dependencies:
   ```dockerfile
   # Production stage should install deps
   RUN npm ci --only=production
   ```

### n8n Integration Issues

#### Issue: "MCP nodes not found" in n8n
**Symptoms:** Can't find MCP nodes in n8n
**Solutions:**
1. **n8n Cloud:**
   - Settings → Community Nodes
   - Install `@n8n/n8n-nodes-mcp`

2. **Self-hosted:**
   ```bash
   npm install @n8n/n8n-nodes-mcp
   # Or add to docker-compose
   environment:
     - N8N_COMMUNITY_PACKAGES_ENABLED=true
   ```

3. **Verify installation:**
   - Restart n8n after installation
   - Check node list for "MCP" category

#### Issue: "Connection timeout" in n8n
**Symptoms:** n8n MCP node times out
**Causes:**
- Network connectivity issues
- MCP server not responding
- Timeout too short

**Solutions:**
1. Test connection outside n8n:
   ```bash
   curl -X POST https://your-app.railway.app \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","method":"tools/list","id":1}' \
     --max-time 30
   ```

2. Increase timeout in n8n node settings:
   - Node Settings → Timeout: 30000ms

3. Check Railway logs for errors

#### Issue: "Method not found" in n8n
**Symptoms:** Tool calls fail with method not found
**Solutions:**
1. List available tools first:
   ```json
   {
     "jsonrpc": "2.0",
     "method": "tools/list",
     "params": {},
     "id": 1
   }
   ```

2. Use exact tool names (case-sensitive):
   ```javascript
   // ✅ Correct
   "tool": "analyze_video_idea"

   // ❌ Wrong
   "tool": "analyzeVideoIdea"
   ```

### SSE-Specific Issues

#### Issue: "No endpoint event received"
**Symptoms:** n8n can't get SSE endpoint
**Solutions:**
1. Verify SSE endpoint response:
   ```bash
   curl -N https://your-app.railway.app/sse
   # Should output:
   # event: endpoint
   # data: https://your-app.railway.app/messages
   ```

2. Check CORS headers:
   ```typescript
   res.writeHead(200, {
     'Content-Type': 'text/event-stream',
     'Access-Control-Allow-Origin': '*'
   });
   ```

#### Issue: "SSE connection drops"
**Symptoms:** Connection unstable, frequent reconnects
**Solutions:**
1. Implement proper keepalive:
   ```typescript
   const pingInterval = setInterval(() => {
     res.write(`event: ping\ndata: ${Date.now()}\n\n`);
   }, 30000);
   ```

2. Handle disconnections:
   ```typescript
   req.on('close', () => {
     clearInterval(pingInterval);
   });
   ```

### Performance Issues

#### Issue: Slow response times
**Symptoms:** Requests take >10 seconds
**Solutions:**
1. Implement process pooling:
   ```typescript
   const processPool = [];
   // Pre-spawn processes instead of spawning per request
   ```

2. Add response caching:
   ```typescript
   const cache = new Map();
   // Cache frequent tool responses
   ```

3. Optimize spawning:
   ```typescript
   // Use existing process instead of spawning new
   if (existingProcess && !existingProcess.killed) {
     return existingProcess;
   }
   ```

#### Issue: High memory usage
**Symptoms:** Railway memory warnings, crashes
**Solutions:**
1. Monitor process cleanup:
   ```typescript
   child.on('close', () => {
     // Ensure process is cleaned up
     processPool.delete(child.pid);
   });
   ```

2. Set memory limits:
   ```json
   // railway.json
   {
     "deploy": {
       "restartPolicyType": "ON_FAILURE",
       "restartPolicyMaxRetries": 3
     }
   }
   ```

## Debugging Tools and Commands

### Local Development
```bash
# Test MCP server directly
echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | node dist/index.js

# Use MCP Inspector
npx @modelcontextprotocol/inspector npm run dev

# Debug SSE server
npm run dev:sse
curl -N http://localhost:8080/sse
```

### Railway Debugging
```bash
# View logs
railway logs

# Shell access (if available)
railway shell

# Environment check
railway variables
```

### n8n Debugging
1. Enable debug mode in MCP node
2. Check execution data in workflow
3. Review n8n logs for errors

## Error Code Reference

### HTTP Status Codes
- **400:** Bad Request - Check JSON format
- **401:** Unauthorized - Verify auth token
- **404:** Not Found - Check URL/endpoint
- **500:** Internal Error - Check server logs
- **502:** Bad Gateway - Server not responding
- **503:** Service Unavailable - Temporary issue

### JSON-RPC Error Codes
- **-32700:** Parse error - Invalid JSON
- **-32600:** Invalid Request - Missing required fields
- **-32601:** Method not found - Check tool name
- **-32602:** Invalid params - Check arguments
- **-32603:** Internal error - Check server implementation

## Performance Benchmarks

### Expected Response Times
- Tool listing: <500ms
- Simple tool execution: <2s
- Complex operations: <30s
- SSE connection: <1s

### Resource Usage
- Memory: <256MB per instance
- CPU: <50% during normal operation
- Network: <1MB/request typically

## Emergency Recovery

### Railway Deployment Rollback
1. Railway Dashboard → Deployments
2. Find last working deployment
3. Click "Rollback"

### Reset Environment Variables
1. Railway Dashboard → Variables
2. Delete and recreate MCP_AUTH_TOKEN
3. Redeploy service

### Complete Reset
1. Delete Railway service
2. Recreate from GitHub
3. Reconfigure all environment variables
4. Test thoroughly before connecting to n8n

## Getting Help

### Log Analysis
Always include these in support requests:
- Railway deployment logs
- n8n execution data
- cURL test results
- Environment variable list (without values)

### Support Channels
- Railway Discord: https://discord.gg/railway
- n8n Community: https://community.n8n.io
- MCP GitHub Issues: https://github.com/modelcontextprotocol/sdk

### Before Asking for Help
1. Check this troubleshooting guide
2. Review Railway logs
3. Test with cURL
4. Try the working examples
5. Include specific error messages and steps to reproduce
