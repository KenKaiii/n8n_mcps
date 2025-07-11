# SSE MCP Server Template Guide

This is a complete guide for creating ANY MCP server with SSE integration for n8n cloud.

## Prerequisites

1. **Install ken-kai-mcp** (MCP generator)
```bash
npm install -g ken-kai-mcp
```

2. **Install supergateway** (SSE bridge)
```bash
npm install -g @modelcontextprotocol/supergateway
```

3. **Install ngrok** (public tunnel)
```bash
brew install ngrok  # macOS
# or download from https://ngrok.com
```

## Step 1: Generate Your MCP Server

```bash
# Use ken-kai-mcp to generate from requirements
npx ken-kai-mcp generate "Your MCP requirements here" my-mcp-name

# Example:
npx ken-kai-mcp generate "Create a web scraper MCP with crawl and extract tools" web-scraper-mcp
```

## Step 2: Configure Your MCP

```bash
cd my-mcp-name

# Install dependencies
npm install

# Create .env if needed (for API keys, etc)
touch .env

# Add any required environment variables
echo "API_KEY=your_key_here" >> .env
```

## Step 3: Build the MCP

```bash
# Build TypeScript to JavaScript
npm run build
```

## Step 4: Start SSE Server

```bash
# Start with supergateway (SSE bridge)
npx supergateway --port 8081 --stdio "node dist/index.js"

# Or run in background with logging
npx supergateway --port 8081 --stdio "node dist/index.js" 2>&1 | tee sse-server.log &
```

## Step 5: Create Public Tunnel

```bash
# In a new terminal, create ngrok tunnel
ngrok http 8081

# Note the public URL (e.g., https://abc123.ngrok-free.app)
```

## Step 6: Connect to n8n

1. In n8n, add **MCP Client** node
2. Configure:
   - SSE URL: `https://YOUR-NGROK-ID.ngrok-free.app/sse`
   - The tools will auto-populate

## Common MCP Patterns

### Tool-Based MCP
```typescript
// For MCPs that perform actions
{
  tools: [
    {
      name: "do_something",
      description: "Performs an action",
      inputSchema: { /* ... */ }
    }
  ]
}
```

### Resource-Based MCP
```typescript
// For MCPs that provide data
{
  resources: [
    {
      uri: "data://list",
      name: "List all data",
      mimeType: "application/json"
    }
  ]
}
```

### Prompt-Based MCP
```typescript
// For MCPs that provide AI prompts
{
  prompts: [
    {
      name: "analyze",
      description: "Analyze data"
    }
  ]
}
```

## Quick Commands Reference

### Start Everything (One Line)
```bash
# Build, start SSE server, and create tunnel
npm run build && npx supergateway --port 8081 --stdio "node dist/index.js" & ngrok http 8081
```

### Check Status
```bash
# Is SSE server running?
ps aux | grep supergateway

# Get ngrok URL
curl -s http://localhost:4040/api/tunnels | grep -o '"public_url":"https://[^"]*"' | cut -d'"' -f4
```

### Restart Server
```bash
# Kill and restart
pkill -f "node dist/index.js" && npm run build && npx supergateway --port 8081 --stdio "node dist/index.js"
```

### Debug Issues
```bash
# Watch logs
tail -f sse-server.log

# Test SSE connection
curl -N https://YOUR-NGROK-URL.ngrok-free.app/sse

# Test tool listing
curl -X POST https://YOUR-NGROK-URL.ngrok-free.app/message \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

## Environment Variables

Common environment variables for MCP servers:

```bash
# API Keys
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GITHUB_TOKEN=ghp_...

# Service Configs
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
API_ENDPOINT=https://api.example.com

# MCP Settings
MCP_LOG_LEVEL=debug
MCP_TIMEOUT=30000
```

## Docker Alternative (Optional)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 8081
CMD ["npx", "supergateway", "--port", "8081", "--stdio", "node dist/index.js"]
```

```bash
# Build and run
docker build -t my-mcp .
docker run -p 8081:8081 my-mcp
```

## Tips for n8n Integration

1. **Tool Descriptions**: Make them clear for AI agents
   - Good: "Extract content from a single URL (fast)"
   - Bad: "Extracts content"

2. **Error Handling**: Return structured errors
   ```typescript
   return {
     content: [{
       type: 'text',
       text: JSON.stringify({ error: "Clear error message" })
     }]
   };
   ```

3. **Async Operations**: For long-running tasks
   - Return a task ID immediately
   - Provide a status-check tool
   - Let n8n poll for completion

4. **Resource Efficiency**:
   - Single-page tasks: Direct extraction
   - Multi-page tasks: Use queues/crawlers
   - Heavy operations: Add progress indicators

## Complete Example Script

```bash
#!/bin/bash
# save as: start-mcp-sse.sh

# Configuration
MCP_NAME="my-mcp"
PORT=8081

echo "🚀 Starting MCP with SSE..."

# Build
echo "📦 Building..."
npm run build

# Start SSE server
echo "🌐 Starting SSE server on port $PORT..."
npx supergateway --port $PORT --stdio "node dist/index.js" 2>&1 | tee sse-server.log &
SSE_PID=$!

# Wait for server to start
sleep 3

# Start ngrok
echo "🔗 Creating public tunnel..."
ngrok http $PORT &
NGROK_PID=$!

# Wait and get URL
sleep 3
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o '"public_url":"https://[^"]*"' | cut -d'"' -f4 | head -1)

echo "✅ MCP Server Ready!"
echo "📍 SSE URL: $NGROK_URL/sse"
echo "📝 Use this URL in n8n MCP Client node"
echo ""
echo "Press Ctrl+C to stop..."

# Keep running
wait
```

## Troubleshooting Checklist

- [ ] Dependencies installed? `npm install`
- [ ] Project built? `npm run build`
- [ ] Port 8081 available? `lsof -i :8081`
- [ ] SSE server running? `ps aux | grep supergateway`
- [ ] Ngrok tunnel active? Check http://localhost:4040
- [ ] Environment variables set? `cat .env`
- [ ] Tools showing in n8n? Check SSE URL is correct

---

Save this template and use it for any MCP server you create!