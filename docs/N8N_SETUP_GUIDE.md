# n8n Setup Guide for MCP Servers

**For Users:** Simple guide to connect your Railway-deployed MCP server to n8n workflows.

## Quick Setup

1. **Add MCP Client node** to your n8n workflow
2. **Configure connection:**
   - SSE Endpoint URL: `https://your-app.railway.app/sse`
   - Bearer Token: `your-mcp-auth-token`
3. **Use the node** to call your MCP tools

That's it! 🎉

## Step-by-Step Instructions

### Step 1: Install MCP Nodes (if needed)

**n8n Cloud:**
- Settings → Community Nodes → Install `@n8n/n8n-nodes-mcp`

**Self-hosted:**
```bash
npm install @n8n/n8n-nodes-mcp
```

### Step 2: Add MCP Client Node

1. In your n8n workflow, click the `+` button
2. Search for "MCP Client"
3. Add the node to your workflow

### Step 3: Configure Connection

In the MCP Client node:

1. **SSE Endpoint URL:** `https://your-app.railway.app/sse`
   - Replace `your-app` with your actual Railway app name

2. **Bearer Token:** Your MCP authentication token
   - This is the `MCP_AUTH_TOKEN` you set in Railway

3. **Operation:** Choose what you want to do:
   - `List Tools` - See available tools
   - `Call Tool` - Execute a specific tool

### Step 4: Test Connection

1. Set Operation to "List Tools"
2. Execute the node
3. You should see all available tools from your MCP server

## Example: Calling a Tool

Once connected, you can call your MCP tools:

1. **Set Operation to "Call Tool"**
2. **Tool Name:** Enter the exact tool name (e.g., `generate_pdf`)
3. **Arguments:** Provide the required parameters:
   ```json
   {
     "title": "My Document",
     "content": "Document content here"
   }
   ```

## Common Issues

### "Connection Failed"
- Check your Railway app is deployed and running
- Verify the SSE endpoint URL is correct
- Test the endpoint: `curl -N https://your-app.railway.app/sse`

### "401 Unauthorized"
- Make sure the Bearer Token matches your `MCP_AUTH_TOKEN` in Railway
- Check for extra spaces in the token

### "Tool Not Found"
- First use "List Tools" to see available tools
- Tool names are case-sensitive and must match exactly

## Testing Your Connection

Use cURL to test outside n8n:

```bash
# Test the SSE endpoint with authentication
curl -N https://your-app.railway.app/sse \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test tool execution
curl -X POST https://your-app.railway.app/message?sessionId=SESSION_ID \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/list",
    "params": {},
    "id": 1
  }'
```

**Note:** Replace `YOUR_TOKEN` with your actual MCP_AUTH_TOKEN and `SESSION_ID` with the session ID from the SSE response.

## Next Steps

1. Test with "List Tools" to see what's available
2. Try calling a simple tool
3. Build it into your n8n workflows

For more advanced configurations and troubleshooting, see the [Troubleshooting Guide](./TROUBLESHOOTING.md).
