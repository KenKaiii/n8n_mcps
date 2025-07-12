# MCP Server Documentation

Complete guide for building and deploying MCP (Model Context Protocol) servers for n8n integration via Railway.

## Quick Start

Follow these guides in order:

1. **[MCP Development Guide](./MCP_DEVELOPMENT_GUIDE.md)** - Build your MCP server
2. **[Railway Deployment Guide](./RAILWAY_DEPLOYMENT_GUIDE.md)** - Deploy to Railway with Supergateway
3. **[SSE Integration Guide](./SSE_INTEGRATION_GUIDE.md)** - Set up SSE for n8n (optional)
4. **[n8n Setup Guide](./N8N_SETUP_GUIDE.md)** - Connect your MCP to n8n

## Architecture Overview

```
n8n Workflow
    ↓
HTTP/SSE Request
    ↓
Railway (Cloud Platform)
    ├── Supergateway (HTTP→STDIO Auth)
    └── Your MCP Server
         ├── Tools
         ├── Resources
         └── Prompts
```

## Key Components

### MCP Server
- STDIO-based protocol server
- Implements tools, resources, and prompts
- Built with TypeScript and @modelcontextprotocol/sdk

### Supergateway
- Converts HTTP requests to STDIO
- Handles Bearer token authentication
- Installed globally in Docker container

### Railway
- Cloud deployment platform
- Automatic SSL/HTTPS
- Environment variable management
- GitHub integration for CI/CD

### n8n Integration
- MCP nodes for workflow automation
- Supports both HTTP and SSE connections
- Full JSON-RPC 2.0 compatibility

## Quick Reference

### Essential Commands

```bash
# Development
npm run dev          # Run MCP server locally
npm run dev:sse      # Run SSE server locally
npm run typecheck    # Check TypeScript types
npm run test         # Run tests

# Building
npm run build        # Compile TypeScript

# Testing with MCP
npx @modelcontextprotocol/inspector npm run dev
```

### Environment Variables

```bash
# Required for all deployments
MCP_AUTH_TOKEN=your-secure-token
PORT=8080

# For GitHub integration (optional)
GITHUB_OWNER=your-username
GITHUB_REPO=your-repo
GITHUB_BRANCH=main
GITHUB_TOKEN=your-pat-token

# Your API keys
API_KEY=your-api-key
```

### Railway Deployment URL Format

```
https://your-app-name.railway.app
```

### n8n Connection Format

For HTTP (Supergateway):
```
Base URL: https://your-app.railway.app
Auth: Bearer Token
Token: your-mcp-auth-token
```

For SSE:
```
SSE URL: https://your-app.railway.app/sse
Token: your-mcp-auth-token
```

## Example Projects

Check out these working examples:
- `pdf-generator-mcp/` - PDF generation with templates
- `web-scraper-mcp/` - Web scraping with template extraction
- `youtube-mcp/` - YouTube video analysis

## Troubleshooting

### Common Issues

1. **502 Bad Gateway** - Check Railway logs, verify PORT usage
2. **401 Unauthorized** - Verify MCP_AUTH_TOKEN matches
3. **Method not found** - Use exact tool names, check case
4. **Timeout errors** - Increase timeout, check process spawning

### Debug Tools

- Railway logs: `railway logs`
- MCP Inspector: `npx @modelcontextprotocol/inspector`
- cURL testing: See deployment guide
- n8n debug mode: Enable in node settings

## Best Practices

1. **Security**
   - Use strong auth tokens
   - Never commit secrets
   - Rotate tokens regularly

2. **Performance**
   - Implement caching
   - Use connection pooling
   - Set appropriate timeouts

3. **Error Handling**
   - Validate all inputs with Zod
   - Return structured errors
   - Log to console.error only

4. **Development**
   - Test locally first
   - Use TypeScript strict mode
   - Write comprehensive tests

## Resources

- [Model Context Protocol Spec](https://modelcontextprotocol.io)
- [MCP SDK Documentation](https://github.com/modelcontextprotocol/sdk)
- [Railway Documentation](https://docs.railway.app)
- [n8n Documentation](https://docs.n8n.io)
- [Supergateway NPM](https://www.npmjs.com/package/supergateway)

## Contributing

When adding new MCP servers:
1. Follow the architecture patterns in existing servers
2. Include comprehensive error handling
3. Add environment variables to `.env.example`
4. Update documentation with examples
5. Test with both Supergateway and SSE modes
