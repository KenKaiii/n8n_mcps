# MCP Bearer Token Authentication Setup Guide

This guide will help you secure your MCP servers with bearer token authentication.

## Your Secure MCP Auth Token

```
MCP_AUTH_TOKEN=d2276cb9880d5069ea559880a51aae1cc22ac489afb460cb5873d3290b8fe348
```

**⚠️ IMPORTANT: Save this token securely! You'll need it for both Railway and n8n configuration.**

## What Changed

All MCP server Dockerfiles now include bearer token authentication:
- ✅ web-scraper-mcp
- ✅ youtube-mcp
- ✅ pdf-generator-mcp

The servers now require the `MCP_AUTH_TOKEN` to accept connections.

## Setup Instructions

### Step 1: Update Railway Environment Variables

For **EACH** MCP server deployed on Railway:

1. Go to your Railway dashboard
2. Select the service (e.g., web-scraper-mcp)
3. Go to "Variables" tab
4. Add the new environment variable:
   ```
   MCP_AUTH_TOKEN=d2276cb9880d5069ea559880a51aae1cc22ac489afb460cb5873d3290b8fe348
   ```
5. The service will automatically redeploy with authentication enabled

Repeat for all services:
- web-scraper-mcp
- youtube-mcp
- pdf-generator-mcp

### Step 2: Configure n8n MCP Client

In your n8n instance, update each MCP connection:

1. Go to your workflow with MCP Client nodes
2. For each MCP Client node:
   - Open the node settings
   - Find the "Authentication" field
   - Change from "None" to "Bearer Token"
   - Enter the token: `d2276cb9880d5069ea559880a51aae1cc22ac489afb460cb5873d3290b8fe348`
   - Save the node

### Step 3: Test the Connection

1. In n8n, run a test execution with your MCP Client node
2. It should connect successfully with authentication
3. If it fails, verify:
   - Railway has redeployed with the new env var
   - The token matches exactly (no extra spaces)
   - Authentication is set to "Bearer Token" in n8n

## Security Benefits

✅ **No more public access** - Only clients with the token can connect
✅ **Easy token rotation** - Just update the env var in Railway
✅ **No code changes needed** - Authentication handled by supergateway
✅ **Works with n8n** - Full compatibility with n8n's auth system

## Token Rotation (Recommended Monthly)

To rotate your token:

1. Generate a new token:
   ```bash
   openssl rand -hex 32
   ```
2. Update `MCP_AUTH_TOKEN` in all Railway services
3. Update the token in all n8n MCP Client nodes
4. Services will redeploy automatically

## Troubleshooting

**Connection Refused / 401 Unauthorized:**
- Verify the token is set correctly in Railway (no quotes needed)
- Check n8n is using "Bearer Token" authentication
- Ensure the token matches exactly

**Service Won't Start:**
- Check Railway logs for errors
- Verify the Dockerfile was updated correctly
- Ensure supergateway is installed (`npm install -g supergateway`)

**Still Having Issues?**
- Railway logs will show auth failures
- n8n will show connection errors with details
- The token is case-sensitive - copy it exactly

## Next Steps

1. Deploy these Dockerfile changes to Railway (push to GitHub)
2. Add the MCP_AUTH_TOKEN to each Railway service
3. Update your n8n workflows with bearer token auth
4. Test each connection to ensure it works

Your MCP servers are now secured! 🔒
