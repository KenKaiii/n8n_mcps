# YouTube MCP SSE Hosting Guide

This guide explains how to deploy the YouTube Analyzer MCP server with SSE support for n8n integration.

## Overview

The YouTube Analyzer MCP provides tools for analyzing video ideas and finding high-performing related videos. It exposes an SSE endpoint that can be integrated with n8n's MCP nodes.

## Available Tools

- `analyze_video_idea` - Analyze a video idea and find related high-performing videos
- `get_quota_status` - Check YouTube API quota usage
- `expand_search_terms` - Generate semantic variations of video ideas
- `get_performance_metrics` - Get detailed performance analytics

## Deployment Options

### Option 1: Railway (Recommended)

Railway provides automatic SSL, easy scaling, and simple deployment.

#### Prerequisites
- Railway account (https://railway.app)
- Railway CLI installed: `npm install -g @railway/cli`
- YouTube Data API key (optional, but recommended)

#### Deployment Steps

1. **Navigate to the project directory:**
   ```bash
   cd youtube-mcp
   ```

2. **Run the deployment script:**
   ```bash
   chmod +x deploy-railway.sh
   ./deploy-railway.sh
   ```

3. **Set environment variables in Railway dashboard:**
   - `YOUTUBE_API_KEY` - Your YouTube Data API key (if available)
   - `PORT` - Already set to 8080 by default

4. **Get your deployment URL:**
   ```bash
   railway domain
   ```

Your SSE endpoint will be: `https://your-app.railway.app/sse`

### Option 2: Docker (Self-hosted)

#### Build and run locally:
```bash
docker build -t youtube-mcp .
docker run -p 8080:8080 -e YOUTUBE_API_KEY=your_key youtube-mcp
```

#### Using Docker Compose:
```yaml
version: '3.8'
services:
  youtube-mcp:
    build: .
    ports:
      - "8080:8080"
    environment:
      - YOUTUBE_API_KEY=your_key_here
      - NODE_ENV=production
    restart: unless-stopped
```

### Option 3: Direct Node.js

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Build TypeScript:**
   ```bash
   npm run build
   ```

3. **Start the server:**
   ```bash
   npm run start:sse
   ```

## n8n Configuration

### Adding to n8n

1. **In n8n, go to MCP settings**
2. **Add a new MCP server:**
   - Name: `YouTube Analyzer`
   - SSE URL: `https://your-deployment.railway.app/sse`
   - Transport: `SSE`

### Using in Workflows

1. **Add an MCP node to your workflow**
2. **Select "YouTube Analyzer" as the server**
3. **Choose a tool:**
   - For video analysis: `analyze_video_idea`
   - For quota checking: `get_quota_status`
   - For search expansion: `expand_search_terms`

### Example Usage

```json
{
  "tool": "analyze_video_idea",
  "arguments": {
    "videoIdea": "automation tutorials",
    "maxResults": 10,
    "minViewCount": 50000
  }
}
```

## Environment Variables

- `PORT` - Server port (default: 8080)
- `YOUTUBE_API_KEY` - YouTube Data API key (optional but recommended)
- `NODE_ENV` - Environment (development/production)

## API Endpoints

- `GET /sse` - SSE event stream
- `POST /messages` - JSON-RPC message endpoint

## Troubleshooting

### Connection Issues
1. Check if the server is running: `curl https://your-app.railway.app/sse`
2. Verify CORS headers are properly set
3. Ensure n8n can reach the deployment URL

### YouTube API Issues
1. Verify your API key is valid
2. Check quota limits in Google Cloud Console
3. Ensure the YouTube Data API v3 is enabled

### Railway Specific
1. Check deployment logs: `railway logs`
2. Verify environment variables are set
3. Ensure the build completed successfully

## Security Considerations

1. **API Key Protection:** Never commit API keys to git
2. **Rate Limiting:** The server includes basic rate limiting
3. **CORS:** Configure CORS appropriately for your n8n instance
4. **HTTPS:** Always use HTTPS in production

## Performance Notes

- The server caches YouTube API responses for 15 minutes
- Each analyze_video_idea call uses ~100 quota units
- Daily YouTube API quota is typically 10,000 units
- Consider implementing additional caching for high-traffic deployments

## Support

For issues specific to:
- YouTube MCP functionality: Check the tool implementations
- Railway deployment: Consult Railway documentation
- n8n integration: Refer to n8n MCP documentation
