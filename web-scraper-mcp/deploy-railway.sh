#!/bin/bash

echo "🚂 Preparing for Railway deployment..."

# Navigate to web-scraper-mcp directory
cd "$(dirname "$0")"

# Build the project
echo "📦 Building the project..."
npm run build

# Check if dist folder exists
if [ ! -d "dist" ]; then
    echo "❌ Build failed - dist folder not found"
    exit 1
fi

echo "✅ Build successful!"

# Navigate to root directory
cd ..

# Create a commit with all deployment files
echo "📝 Committing deployment files..."
git add Dockerfile .dockerignore railway.json web-scraper-mcp/start-server.sh web-scraper-mcp/.gitignore
git commit -m "Add Railway deployment configuration" || echo "No changes to commit"

echo "
✅ Railway deployment files are ready!

📋 Next steps:
1. Push to GitHub:
   git push

2. Go to https://railway.app and sign in with GitHub

3. Click 'New Project' → 'Deploy from GitHub repo'

4. Select your repository: n8n_mcps

5. Railway will auto-detect the Dockerfile

6. Add environment variable:
   - Click on the deployed service
   - Go to 'Variables' tab
   - Add: GITHUB_TOKEN = your_github_pat_token_here

7. Your SSE URL will be:
   https://[your-app-name].up.railway.app/sse

8. Use this URL in n8n's MCP Client Tool configuration

🎉 That's it! Railway will handle everything else automatically.
"
