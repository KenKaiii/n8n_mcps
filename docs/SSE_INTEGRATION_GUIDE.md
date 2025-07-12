# SSE Integration Guide for n8n

This guide explains how to set up Server-Sent Events (SSE) for your MCP server to work with n8n's MCP nodes.

## Why SSE?

n8n's MCP nodes can work with either:
1. **Direct HTTP endpoints** (via Supergateway)
2. **SSE endpoints** for real-time streaming

SSE provides:
- Real-time event streaming
- Automatic reconnection
- Lower overhead for long-running operations
- Better compatibility with n8n's streaming features

## Architecture

```
n8n MCP Node
    ↓
SSE Connection → /sse endpoint
    ↓
Returns → /messages endpoint URL
    ↓
n8n sends requests → /messages endpoint
    ↓
Express server spawns → STDIO MCP Server
    ↓
Returns response → n8n
```

## Phase 1: Understanding SSE vs Direct HTTP

### Option 1: Direct HTTP (Supergateway Only)

If your MCP server doesn't need streaming:

```dockerfile
# In Dockerfile
CMD ["sh", "-c", "supergateway --port ${PORT:-8080} --oauth2Bearer \"${MCP_AUTH_TOKEN}\" --stdio 'node dist/index.js 2>&1'"]
```

**Use this when:**
- Simple request/response operations
- No need for real-time updates
- Simpler deployment

### Option 2: SSE Server (Recommended for n8n)

Implement SSE server for better n8n integration:

```typescript
// src/sse-simple.ts
// Full implementation in MCP Development Guide
```

**Use this when:**
- n8n integration required
- Real-time updates needed
- Streaming responses
- Multiple concurrent operations

## Phase 2: Implementing SSE Server

### 2.1 Basic SSE Server Structure

The SSE server requires these endpoints:

1. **GET /sse** - SSE endpoint that returns the messages URL
2. **POST /messages** - Handles JSON-RPC requests
3. **GET /health** - Optional health check

### 2.2 Key Implementation Details

```typescript
#!/usr/bin/env node
import express from 'express';
import { spawn } from 'child_process';
import { config } from './config.js';

const app = express();
app.use(express.json());

// CRITICAL: SSE endpoint must return the messages URL
app.get('/sse', (req, res) => {
  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  // IMPORTANT: Send the messages endpoint URL
  const messageUrl = `${req.protocol}://${req.get('host')}/messages`;
  res.write(`event: endpoint\ndata: ${messageUrl}\n\n`);

  // Keep connection alive with pings
  const pingInterval = setInterval(() => {
    res.write(`event: ping\ndata: ${Date.now()}\n\n`);
  }, 30000);

  // Cleanup on disconnect
  req.on('close', () => {
    clearInterval(pingInterval);
  });
});

// Messages endpoint - proxies to STDIO server
app.post('/messages', async (req, res) => {
  try {
    const { jsonrpc, method, params, id } = req.body;

    // Validate JSON-RPC request
    if (!jsonrpc || jsonrpc !== '2.0') {
      return res.status(400).json({
        jsonrpc: '2.0',
        error: { code: -32600, message: 'Invalid Request' },
        id: id || null
      });
    }

    // Spawn STDIO MCP server
    const child = spawn('node', ['dist/index.js'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env }
    });

    let responseData = '';
    let errorData = '';

    // Collect stdout
    child.stdout.on('data', (data) => {
      responseData += data.toString();
    });

    // Collect stderr (for debugging)
    child.stderr.on('data', (data) => {
      errorData += data.toString();
      console.error('MCP stderr:', data.toString());
    });

    // Handle process completion
    child.on('close', (code) => {
      try {
        // Parse JSON-RPC response from stdout
        const lines = responseData.split('\n').filter(line => line.trim());

        for (const line of lines) {
          try {
            const parsed = JSON.parse(line);
            // Find response matching our request ID
            if (parsed.id === id) {
              return res.json(parsed);
            }
          } catch (e) {
            // Skip non-JSON lines
            continue;
          }
        }

        // No matching response found
        res.status(500).json({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: 'No response from MCP server',
            data: { stderr: errorData }
          },
          id
        });
      } catch (error) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: 'Internal error',
            data: { error: error.message }
          },
          id
        });
      }
    });

    // Send request to STDIO server
    const request = JSON.stringify({ jsonrpc, method, params, id });
    child.stdin.write(request + '\n');
    child.stdin.end();

  } catch (error) {
    res.status(500).json({
      jsonrpc: '2.0',
      error: {
        code: -32603,
        message: error.message
      },
      id: req.body.id || null
    });
  }
});

// Enable CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Start server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`SSE MCP Server running on port ${PORT}`);
  console.log(`SSE endpoint: http://localhost:${PORT}/sse`);
});
```

## Phase 3: Deployment Configuration

### 3.1 Update Dockerfile for SSE

```dockerfile
FROM node:20-slim AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci

# Copy source files
COPY tsconfig.json ./
COPY src ./src

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-slim

WORKDIR /app

# Copy package files and install production deps
COPY package*.json ./
RUN npm ci --only=production

# Copy built files
COPY --from=builder /app/dist ./dist

# Create .env file
RUN touch .env

EXPOSE 8080

ENV NODE_ENV=production

# For SSE server
CMD ["node", "dist/sse-simple.js"]

# Alternative: Use Supergateway if not using SSE
# RUN npm install -g supergateway
# CMD ["sh", "-c", "supergateway --port ${PORT:-8080} --oauth2Bearer \"${MCP_AUTH_TOKEN}\" --stdio 'node dist/index.js 2>&1'"]
```

### 3.2 Update package.json Scripts

```json
{
  "scripts": {
    "start": "node dist/index.js",
    "start:sse": "node dist/sse-simple.js",
    "build": "tsc",
    "dev": "tsx src/index.ts",
    "dev:sse": "tsx src/sse-simple.ts"
  }
}
```

## Phase 4: Authentication with SSE

### 4.1 Token-Based Authentication

For SSE with authentication, modify the server:

```typescript
// CRITICAL: Authentication middleware - ALWAYS implement this
const authenticate = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Support both header and query parameter auth
  const authHeader = req.headers.authorization;
  const queryToken = req.query.token as string;

  let token: string | undefined;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (queryToken) {
    token = queryToken;
  }

  if (!token) {
    return res.status(401).json({
      jsonrpc: '2.0',
      error: { code: -32001, message: 'Unauthorized - Missing token' },
      id: null
    });
  }

  if (token !== process.env.MCP_AUTH_TOKEN) {
    return res.status(401).json({
      jsonrpc: '2.0',
      error: { code: -32001, message: 'Unauthorized - Invalid token' },
      id: null
    });
  }

  next();
};

// Apply to messages endpoint
app.post('/messages', authenticate, async (req, res) => {
  // ... existing handler
});

// SSE endpoint can check auth via query param
app.get('/sse', (req, res) => {
  // Optional: Check auth token in query
  const token = req.query.token;
  if (process.env.MCP_AUTH_TOKEN && token !== process.env.MCP_AUTH_TOKEN) {
    return res.status(401).end();
  }

  // ... existing SSE handler
});
```

### 4.2 Environment Variables

Required environment variables for SSE:

```bash
# In Railway or .env
PORT=8080
NODE_ENV=production
MCP_AUTH_TOKEN=your-secure-token-here

# Your API keys
API_KEY=your-api-key
# ... other configuration
```

## Phase 5: Testing SSE Implementation

### 5.1 Local Testing

1. **Start SSE server:**
   ```bash
   npm run dev:sse
   ```

2. **Test SSE endpoint:**
   ```bash
   curl -N http://localhost:8080/sse
   ```

   Expected output:
   ```
   event: endpoint
   data: http://localhost:8080/messages

   event: ping
   data: 1234567890
   ```

3. **Test messages endpoint:**
   ```bash
   curl -X POST http://localhost:8080/messages \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer your-token" \
     -d '{
       "jsonrpc": "2.0",
       "method": "tools/list",
       "params": {},
       "id": 1
     }'
   ```

### 5.2 Production Testing

After Railway deployment:

1. **Test SSE connection:**
   ```bash
   curl -N https://your-app.railway.app/sse?token=your-token
   ```

2. **Test with n8n format:**
   ```bash
   # Get SSE endpoint
   SSE_URL=$(curl -s https://your-app.railway.app/sse | grep "data:" | cut -d' ' -f2)

   # Call messages endpoint
   curl -X POST "$SSE_URL" \
     -H "Authorization: Bearer your-token" \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","method":"tools/list","params":{},"id":1}'
   ```

## Phase 6: Optimizations

### 6.1 Connection Pooling

For high-traffic scenarios, implement connection pooling:

```typescript
// Simple process pool
const processPool: ChildProcess[] = [];
const POOL_SIZE = 5;

// Pre-spawn processes
for (let i = 0; i < POOL_SIZE; i++) {
  const child = spawn('node', ['dist/index.js'], {
    stdio: ['pipe', 'pipe', 'pipe']
  });
  processPool.push(child);
}

// Use from pool instead of spawning new
```

### 6.2 Response Caching

Cache frequent requests:

```typescript
const cache = new Map();
const CACHE_TTL = 60000; // 1 minute

app.post('/messages', async (req, res) => {
  const cacheKey = JSON.stringify(req.body);
  const cached = cache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return res.json(cached.response);
  }

  // ... process request

  cache.set(cacheKey, {
    response: jsonResponse,
    timestamp: Date.now()
  });
});
```

### 6.3 Error Recovery

Implement graceful error handling:

```typescript
// Retry logic for failed spawns
async function spawnWithRetry(retries = 3): Promise<ChildProcess> {
  for (let i = 0; i < retries; i++) {
    try {
      const child = spawn('node', ['dist/index.js'], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      // Test if process started successfully
      await new Promise((resolve, reject) => {
        child.on('spawn', resolve);
        child.on('error', reject);
        setTimeout(() => reject(new Error('Spawn timeout')), 5000);
      });

      return child;
    } catch (error) {
      console.error(`Spawn attempt ${i + 1} failed:`, error);
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  throw new Error('Failed to spawn process');
}
```

## Phase 7: Monitoring

### 7.1 Add Metrics

Track SSE performance:

```typescript
let metrics = {
  totalRequests: 0,
  failedRequests: 0,
  activeConnections: 0,
  averageResponseTime: 0
};

app.get('/metrics', (req, res) => {
  res.json(metrics);
});
```

### 7.2 Health Checks

Comprehensive health endpoint:

```typescript
app.get('/health', async (req, res) => {
  try {
    // Test MCP server spawn
    const testChild = spawn('node', ['dist/index.js'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    testChild.kill();

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      metrics: {
        activeConnections: sseConnections.size,
        uptime: process.uptime()
      }
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});
```

## Troubleshooting

### Common SSE Issues

1. **"No endpoint event received"**
   - Ensure SSE sends `event: endpoint` with messages URL
   - Check CORS headers

2. **"Connection keeps dropping"**
   - Implement ping/keepalive
   - Check proxy timeouts

3. **"Messages endpoint 404"**
   - Verify URL construction in SSE response
   - Check for trailing slashes

4. **"Spawn ENOENT"**
   - Ensure dist/index.js exists
   - Check NODE_PATH

5. **"Response timeout"**
   - Add timeout handling
   - Check for hanging processes

### Debug Tips

1. **Enable verbose logging:**
   ```typescript
   if (process.env.DEBUG) {
     console.log('Request:', req.body);
     console.log('Response:', responseData);
   }
   ```

2. **Monitor process spawning:**
   ```typescript
   child.on('spawn', () => console.log('Process spawned'));
   child.on('error', (err) => console.error('Spawn error:', err));
   ```

3. **Track SSE connections:**
   ```typescript
   console.log(`Active SSE connections: ${sseConnections.size}`);
   ```

## Next Steps

1. Deploy with SSE: Update Dockerfile to use `CMD ["node", "dist/sse-simple.js"]`
2. Configure n8n: Follow [n8n Setup Guide](./N8N_SETUP_GUIDE.md)
3. Test end-to-end flow
4. Monitor performance and optimize as needed
