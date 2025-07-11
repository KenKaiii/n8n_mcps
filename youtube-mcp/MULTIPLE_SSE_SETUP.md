# Multiple SSE Endpoints Setup Guide

## Best Solution: Cloudflare Tunnels + PM2

This setup allows you to run 10+ MCP SSE servers for free with persistent URLs.

### Prerequisites
- Cloudflare account (free)
- Domain name (optional but recommended)
- VPS or local machine

### Step 1: Install Required Tools

```bash
# Install PM2 for process management
npm install -g pm2

# Install Cloudflare tunnel
# macOS
brew install cloudflared

# Linux
wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb
```

### Step 2: Create PM2 Ecosystem File

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [
    {
      name: 'mcp-youtube-8080',
      script: 'npx',
      args: 'supergateway --stdio "node dist/youtube-analyzer/index.js" --port 8080',
      cwd: '/path/to/mcp-servers'
    },
    {
      name: 'mcp-github-8081',
      script: 'npx',
      args: 'supergateway --stdio "node dist/github-mcp/index.js" --port 8081',
      cwd: '/path/to/mcp-servers'
    },
    {
      name: 'mcp-slack-8082',
      script: 'npx',
      args: 'supergateway --stdio "node dist/slack-mcp/index.js" --port 8082',
      cwd: '/path/to/mcp-servers'
    },
    // Add more as needed...
  ]
};
```

### Step 3: Start All MCP Servers

```bash
# Start all servers
pm2 start ecosystem.config.js

# Save configuration
pm2 save
pm2 startup
```

### Step 4: Set Up Cloudflare Tunnels

```bash
# Login to Cloudflare (one time)
cloudflared tunnel login

# Create config file ~/.cloudflared/config.yml
```

Create `~/.cloudflared/config.yml`:

```yaml
tunnel: mcp-servers
credentials-file: /home/user/.cloudflared/mcp-servers.json

ingress:
  - hostname: youtube-mcp.yourdomain.com
    service: http://localhost:8080
  - hostname: github-mcp.yourdomain.com
    service: http://localhost:8081
  - hostname: slack-mcp.yourdomain.com
    service: http://localhost:8082
  - hostname: jira-mcp.yourdomain.com
    service: http://localhost:8083
  - hostname: notion-mcp.yourdomain.com
    service: http://localhost:8084
  - hostname: confluence-mcp.yourdomain.com
    service: http://localhost:8085
  - hostname: trello-mcp.yourdomain.com
    service: http://localhost:8086
  - hostname: asana-mcp.yourdomain.com
    service: http://localhost:8087
  - hostname: discord-mcp.yourdomain.com
    service: http://localhost:8088
  - hostname: teams-mcp.yourdomain.com
    service: http://localhost:8089
  # Default catch-all
  - service: http_status:404
```

### Step 5: Create and Run Tunnel

```bash
# Create tunnel
cloudflared tunnel create mcp-servers

# Route DNS (if using your domain)
cloudflared tunnel route dns mcp-servers youtube-mcp.yourdomain.com
cloudflared tunnel route dns mcp-servers github-mcp.yourdomain.com
# ... repeat for each subdomain

# Run tunnel
cloudflared tunnel run mcp-servers
```

### Alternative: Without Custom Domain

```bash
# Get random subdomains from Cloudflare
cloudflared tunnel --url http://localhost:8080
# Gives you: https://random-name-1234.trycloudflare.com
```

## Quick Multi-Port Script

Create `start-all-mcp.sh`:

```bash
#!/bin/bash

# Array of MCP servers
declare -A servers=(
  [8080]="youtube-analyzer"
  [8081]="github-mcp"
  [8082]="slack-mcp"
  [8083]="jira-mcp"
  [8084]="notion-mcp"
  [8085]="confluence-mcp"
  [8086]="trello-mcp"
  [8087]="asana-mcp"
  [8088]="discord-mcp"
  [8089]="teams-mcp"
)

# Kill existing processes
pkill -f supergateway

# Start each server
for port in "${!servers[@]}"; do
  name=${servers[$port]}
  echo "Starting $name on port $port..."
  npx supergateway --stdio "node dist/$name/index.js" --port $port > logs/$name.log 2>&1 &
done

echo "All MCP servers started!"

# Start Cloudflare tunnel
cloudflared tunnel run mcp-servers
```

## Cost Comparison

| Solution | Free Tier | 10+ URLs | Persistent URLs | Setup Complexity |
|----------|-----------|----------|-----------------|------------------|
| ngrok | 1 tunnel | $390+/mo | No | Easy |
| Cloudflare Tunnels | 100 tunnels | Free | Yes | Medium |
| VPS + Caddy | N/A | ~$5/mo | Yes | Medium |
| LocalTunnel | Unlimited | Free | No | Easy |
| Serveo | Unlimited | Free | Semi | Easy |
| Bore.pub | Unlimited | Free | No | Easy |

## n8n Configuration for Multiple MCPs

In n8n, create multiple MCP credentials:

1. **YouTube MCP**
   - SSE URL: `https://youtube-mcp.yourdomain.com/sse`

2. **GitHub MCP**
   - SSE URL: `https://github-mcp.yourdomain.com/sse`

3. **Slack MCP**
   - SSE URL: `https://slack-mcp.yourdomain.com/sse`

## Monitoring All Servers

```bash
# View all running MCP servers
pm2 list

# Monitor in real-time
pm2 monit

# View logs
pm2 logs mcp-youtube-8080
pm2 logs --lines 100

# Restart a specific server
pm2 restart mcp-github-8081
```

## Docker Alternative

For easier deployment, use Docker:

```dockerfile
# Dockerfile
FROM node:18
WORKDIR /app
COPY . .
RUN npm install && npm run build

# docker-compose.yml
version: '3'
services:
  mcp-youtube:
    build: .
    command: npx supergateway --stdio "node dist/index.js" --port 8080
    ports:
      - "8080:8080"

  mcp-github:
    build: .
    command: npx supergateway --stdio "node dist/index.js" --port 8080
    ports:
      - "8081:8080"

  # Add more services...
```

## Summary

For 10+ MCP SSE endpoints:
1. **Best free option**: Cloudflare Tunnels (100 free tunnels)
2. **Easiest setup**: LocalTunnel or Serveo
3. **Most reliable**: VPS ($5/mo) with Caddy/nginx
4. **Most scalable**: Kubernetes with ingress controller

The Cloudflare Tunnels approach gives you persistent URLs, SSL certificates, and DDoS protection all for free.
