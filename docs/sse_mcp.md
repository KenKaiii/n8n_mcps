# MCP SSE Implementation Guide

This guide documents how to expose a Model Context Protocol (MCP) server via Server-Sent Events (SSE) for integration with platforms like n8n that require SSE-based MCP connections.

## What This MCP Server Provides

This YouTube Analyzer MCP server exposes the following tools:
- `analyze_video_idea` - Analyze video ideas and find high-performing related videos
- `get_quota_status` - Check current YouTube API quota usage
- `expand_search_terms` - Generate semantic variations of a video idea
- `get_performance_metrics` - Get detailed performance metrics and analytics

## Overview

MCP servers typically run over stdio (standard input/output), but some platforms like n8n require SSE endpoints. This guide shows how to bridge a stdio-based MCP server to SSE using the `supergateway` tool.

## Prerequisites

1. A working MCP server that runs over stdio (e.g., `node dist/index.js`)
2. Node.js installed (v18 or higher recommended)
3. The MCP server built and ready to run
4. npm or npx available for running packages
5. (Optional) ngrok for public URL access

## Implementation Steps

### Step 1: Verify Your MCP Server Works

First, ensure your MCP server runs correctly in stdio mode:

```bash
# Install dependencies if not already done
npm install

# Build the TypeScript project
npm run build

# Test the server (it should wait for input)
node dist/index.js
```

If you see initialization logs and the server waits for input, it's working correctly. You should see output like:
```
[INFO] Tools configured successfully
[INFO] Resources configured successfully
[INFO] Prompts configured successfully
[INFO] Starting YouTube Analyzer MCP server...
```

### Step 2: Install and Run Supergateway

Supergateway is an official tool that bridges stdio MCP servers to SSE/HTTP transports.

```bash
# Run supergateway to expose your MCP server via SSE
npx supergateway --stdio "node dist/index.js" --outputTransport sse --port 8080
```

You should see output like:
```
[supergateway] Starting...
[supergateway] Listening on port 8080
[supergateway] SSE endpoint: http://localhost:8080/sse
[supergateway] POST messages: http://localhost:8080/message
```

### Step 3: Test the SSE Endpoint

Test that the SSE endpoint is working:

```bash
# This should connect and wait for events
curl -N http://localhost:8080/sse
```

### Step 4: (Optional) Expose via ngrok for Public Access

If you need a public URL (e.g., for n8n cloud):

```bash
# In a new terminal, start ngrok
ngrok http 8080

# You'll get a URL like: https://abc123.ngrok-free.app
```

Your SSE endpoint will be available at: `https://abc123.ngrok-free.app/sse`

## n8n Integration

### Configuration in n8n

1. Add an "MCP Client Tool" node to your workflow
2. Configure the credentials:
   - **Transport**: SSE
   - **SSE URL**: `http://localhost:8080/sse` (or your ngrok URL)
   - **Message Post Endpoint**: Leave empty (auto-detected)
   - **Authentication**: None (unless your server requires it)

### Testing the Connection

1. Connect the MCP Client Tool to an AI Agent node
2. The MCP tools should appear in the agent's available tools
3. Test by calling one of your MCP tools

### Verifying Tool Availability

To confirm your tools are exposed correctly:

```bash
# List available tools
curl -X POST http://localhost:8080/message \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/list",
    "params": {},
    "id": 2
  }' | jq '.result.tools[].name'
```

You should see your tool names listed.

## Important URLs and Endpoints

When using supergateway, these are the standard endpoints:

- **SSE Endpoint**: `/sse` - For establishing the SSE connection
- **Message Endpoint**: `/message` - For posting JSON-RPC messages

Note: These differ from custom implementations which might use `/messages` (plural).

## Troubleshooting

### SSE Connection Times Out
- Check that supergateway is running
- Verify the port isn't blocked by firewall
- Ensure the stdio server starts correctly

### n8n Can't Connect
- Use HTTPS (ngrok) URL for n8n cloud
- Check for any authentication requirements
- Verify the SSE URL ends with `/sse`

### Tools Don't Appear in n8n
- Check supergateway logs for initialization messages
- Verify your MCP server properly exports tools
- Look for JSON-RPC errors in the logs

## Running as a Service

### Basic Background Process
```bash
# Run in background with logs
npx supergateway --stdio "node dist/index.js" --outputTransport sse --port 8080 > sse-server.log 2>&1 &
```

### Using PM2 (Recommended for Production)
```bash
# Install PM2
npm install -g pm2

# Start the SSE server
pm2 start "npx supergateway --stdio 'node dist/index.js' --outputTransport sse --port 8080" --name mcp-sse-server

# Save PM2 configuration
pm2 save
pm2 startup
```

### Using systemd (Linux)
Create `/etc/systemd/system/mcp-sse.service`:

```ini
[Unit]
Description=MCP SSE Server
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/your/mcp/server
ExecStart=/usr/bin/npx supergateway --stdio "node dist/index.js" --outputTransport sse --port 8080
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Then:
```bash
sudo systemctl enable mcp-sse
sudo systemctl start mcp-sse
```

## Alternative Implementations

### Custom Express SSE Server

If you need more control, you can implement a custom SSE server. However, this is more complex and may have compatibility issues. The key requirements are:

1. SSE endpoint that sends an initial `endpoint` event
2. Message endpoint that handles JSON-RPC 2.0
3. Proper CORS headers for browser-based clients
4. Keep-alive ping events

### Direct SDK Implementation

The MCP SDK includes SSE transport, but it has complexities and is deprecated in favor of HTTP Streamable transport.

## Important Notes

1. **SSE is Deprecated**: The MCP protocol has deprecated SSE in favor of HTTP Streamable transport. SSE remains for backward compatibility.

2. **Use Supergateway**: It's the most reliable way to bridge stdio to SSE, as it properly implements the MCP SSE specification.

3. **Single Endpoint**: Unlike custom implementations, supergateway uses `/sse` for events and `/message` (singular) for posting.

4. **No Authentication by Default**: Add authentication headers in n8n if your server requires them.

## Complete Working Example

Here's a complete script to set up SSE for your MCP server:

```bash
#!/bin/bash
# setup-mcp-sse.sh

# Build the MCP server
echo "Building MCP server..."
npm run build

# Kill any existing processes
pkill -f "supergateway" || true

# Start supergateway
echo "Starting SSE bridge..."
npx supergateway --stdio "node dist/index.js" --outputTransport sse --port 8080 &

# Wait for startup
sleep 3

# Optional: Start ngrok
echo "Starting ngrok..."
ngrok http 8080 &

echo "SSE server is running!"
echo "Local URL: http://localhost:8080/sse"
echo "Check ngrok for public URL"
```

## Verification

To verify everything is working:

```bash
# Check process is running
ps aux | grep supergateway

# Test SSE endpoint
curl -s -N http://localhost:8080/sse | head -5

# Test message endpoint (initialize)
curl -X POST http://localhost:8080/message \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "method": "initialize", "params": {}, "id": 1}'
```

## Common Issues and Solutions

### Issue: "Cannot find module" errors
**Solution**: Ensure you've built the project with `npm run build` and the `dist` directory exists.

### Issue: Port already in use
**Solution**: Kill existing processes or use a different port:
```bash
pkill -f "supergateway"
# Or use a different port
npx supergateway --stdio "node dist/index.js" --outputTransport sse --port 8081
```

### Issue: ngrok URL expires
**Solution**: Free ngrok URLs expire after ~2 hours. For permanent URLs, consider:
- ngrok paid plan
- Deploy to a cloud service (Heroku, Railway, etc.)
- Use a reverse proxy service

### Issue: n8n shows "No tools available"
**Solution**: Check that your MCP server exports tools correctly. The stdio server should respond to the `tools/list` method.

## Directory Structure Requirements

Your MCP server directory should have:
```
your-mcp-server/
├── src/
│   ├── index.ts      # Main server entry
│   ├── tools.ts      # Tool implementations
│   ├── resources.ts  # Resource handlers
│   └── prompts.ts    # Prompt templates
├── dist/             # Built JavaScript files
├── package.json      # With build scripts
├── tsconfig.json     # TypeScript config
└── MCP_SSE.md        # This guide
```

## Quick Start Commands

For a future developer, here's the complete quick start:

```bash
# 1. Clone and prepare the MCP server
cd your-mcp-server
npm install
npm run build

# 2. Start the SSE bridge
npx supergateway --stdio "node dist/index.js" --outputTransport sse --port 8080

# 3. (Optional) Expose publicly
ngrok http 8080

# 4. Use in n8n
# SSE URL: http://localhost:8080/sse (or ngrok URL)
```

## Summary

The key to exposing an MCP server via SSE is using `supergateway` to bridge the stdio transport to SSE. This provides the most compatible and reliable implementation that works with n8n and other platforms expecting standard MCP SSE endpoints.

**Critical Points:**
- Use `supergateway`, not custom implementations
- The SSE endpoint is `/sse` (not `/messages`)
- The message endpoint is `/message` (singular)
- No authentication needed by default
- SSE is deprecated but still widely used
