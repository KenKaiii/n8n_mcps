# Hosting MCP SSE Servers - Easiest Options

## 🥇 Option 1: Railway (Easiest)

Railway is the simplest option with automatic builds and HTTPS.

### Setup Steps:

1. **Prepare your project**:

```bash
# Create a Dockerfile
cat > Dockerfile << 'EOF'
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy built files
COPY dist ./dist
COPY start-server.sh ./
COPY .env.example .env

# Install supergateway globally
RUN npm install -g supergateway

# Make start script executable
RUN chmod +x start-server.sh

# Expose port
EXPOSE 8081

# Start with supergateway
CMD ["supergateway", "--port", "8081", "--stdio", "./start-server.sh"]
EOF
```

2. **Push to GitHub**:

```bash
git add .
git commit -m "Add Dockerfile for Railway deployment"
git push
```

3. **Deploy on Railway**:

- Go to [railway.app](https://railway.app)
- Click "New Project" → "Deploy from GitHub repo"
- Select your repository
- Railway auto-detects the Dockerfile
- Add environment variable: `GITHUB_TOKEN`
- Get your public URL (e.g., `https://your-app.up.railway.app`)

**SSE URL**: `https://your-app.up.railway.app/sse`

## 🥈 Option 2: Render (Simple + Free Tier)

### Setup Steps:

1. **Create render.yaml**:

```yaml
services:
  - type: web
    name: mcp-sse-server
    env: docker
    dockerfilePath: ./Dockerfile
    envVars:
      - key: GITHUB_TOKEN
        sync: false
```

2. **Deploy**:

- Push to GitHub
- Go to [render.com](https://render.com)
- New → Web Service → Connect GitHub
- Select repository
- Render auto-deploys

**SSE URL**: `https://your-app.onrender.com/sse`

## 🥉 Option 3: Fly.io (Fast Global Deploy)

### Setup Steps:

1. **Install flyctl**:

```bash
curl -L https://fly.io/install.sh | sh
```

2. **Initialize**:

```bash
fly launch --no-deploy
# Choose app name and region
```

3. **Update fly.toml**:

```toml
app = "your-mcp-sse"
primary_region = "sjc"

[build]
  dockerfile = "Dockerfile"

[env]
  PORT = "8081"

[[services]]
  http_checks = []
  internal_port = 8081
  protocol = "tcp"

  [[services.ports]]
    port = 443
    handlers = ["http"]

  [[services.ports]]
    port = 80
    handlers = ["tls", "http"]
```

4. **Set secrets and deploy**:

```bash
fly secrets set GITHUB_TOKEN=your_token_here
fly deploy
```

**SSE URL**: `https://your-mcp-sse.fly.dev/sse`

## 🚀 Option 4: DigitalOcean App Platform

### Setup Steps:

1. **Create app.yaml**:

```yaml
name: mcp-sse-server
services:
  - dockerfile_path: Dockerfile
    github:
      branch: main
      deploy_on_push: true
      repo: your-github/repo
    http_port: 8081
    instance_count: 1
    instance_size_slug: basic-xxs
    name: web
    envs:
      - key: GITHUB_TOKEN
        scope: RUN_TIME
        type: SECRET
```

2. **Deploy via CLI**:

```bash
doctl apps create --spec app.yaml
```

**SSE URL**: `https://your-app.ondigitalocean.app/sse`

## 🔧 Quick Start Script

Save this as `deploy-setup.sh`:

```bash
#!/bin/bash

# Create necessary files for deployment
cat > Dockerfile << 'EOF'
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
COPY start-server.sh ./
COPY .env.example .env
RUN npm install -g supergateway
RUN chmod +x start-server.sh
EXPOSE 8081
CMD ["supergateway", "--port", "8081", "--stdio", "./start-server.sh"]
EOF

# Create .env.example (without secrets)
cat > .env.example << 'EOF'
# Add your GitHub token as environment variable in hosting platform
# GITHUB_TOKEN=your_token_here
EOF

# Update .gitignore
echo ".env" >> .gitignore
echo "!.env.example" >> .gitignore

# Build the project
npm run build

echo "✅ Deployment files created!"
echo "Next steps:"
echo "1. Commit and push to GitHub"
echo "2. Choose a hosting platform above"
echo "3. Add GITHUB_TOKEN as environment variable"
echo "4. Deploy!"
```

## 🎯 Comparison

| Platform     | Setup Time | Free Tier   | Auto-Deploy | Custom Domain |
| ------------ | ---------- | ----------- | ----------- | ------------- |
| Railway      | 5 min      | $5 credit   | ✅          | ✅            |
| Render       | 10 min     | ✅          | ✅          | ✅            |
| Fly.io       | 15 min     | ✅          | ✅          | ✅            |
| DigitalOcean | 20 min     | $200 credit | ✅          | ✅            |

## 🔒 Security Notes

1. **Never commit .env with secrets**
2. **Use environment variables on hosting platform**
3. **Enable HTTPS (automatic on all platforms above)**
4. **Consider adding authentication for production**

## 📝 Testing Your Deployment

Once deployed, test your SSE endpoint:

```bash
# Test SSE connection
curl -N https://your-app.example.com/sse

# Test with n8n
# Use the HTTPS URL in n8n MCP Client Tool configuration
```

## 🆘 Troubleshooting

### Port Issues

Most platforms auto-assign ports. Update Dockerfile if needed:

```dockerfile
CMD ["supergateway", "--port", "$PORT", "--stdio", "./start-server.sh"]
```

### Environment Variables

Ensure GITHUB_TOKEN is set in platform dashboard, not in code.

### Build Failures

Check that `dist/` folder exists after `npm run build`.

## 🎉 Quickest Path

1. Run `deploy-setup.sh`
2. Push to GitHub
3. Deploy on Railway (literally 3 clicks)
4. Add GITHUB_TOKEN
5. Done! Your SSE URL is ready

Total time: ~10 minutes
