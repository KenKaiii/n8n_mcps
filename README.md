# Ken's n8n MCP Collection

```

                _/_/
   _/_/_/    _/    _/  _/_/_/        _/_/_/  _/_/      _/_/_/  _/_/_/      _/_/_/
  _/    _/    _/_/    _/    _/      _/    _/    _/  _/        _/    _/  _/_/
 _/    _/  _/    _/  _/    _/      _/    _/    _/  _/        _/    _/      _/_/
_/    _/    _/_/    _/    _/      _/    _/    _/    _/_/_/  _/_/_/    _/_/_/
                                                           _/
                                                          _/
By Ken Kai does AI

```

**🤖 Power up your n8n workflows with 3 amazing AI-powered MCP servers!**

*Created by [Ken](https://www.skool.com/raid) to make no-code automation even more powerful* 🚀

> [!TIP]
> **Want to build your own apps with AI?**
> - **Free community:** setup guides, a 7-day build challenge and 20+ projects: [skool.com/raid](https://www.skool.com/raid)
> - **Raid+:** make money with AI, a sellable app in 30 days, live every Thursday: [skool.com/kenkai](https://www.skool.com/kenkai)
> - **Want it built for you?** [work.kenkais.com](https://work.kenkais.com/)

---

## 🎯 What This Is

Hey there! I'm Ken, and I built these **Model Context Protocol (MCP) servers** specifically for **n8n users** who want to supercharge their workflows with AI capabilities. Perfect for automation enthusiasts who want powerful AI tools!

Think of MCPs as smart plugins that give your AI assistants superpowers. Each one I've built does something awesome:

### 🎬 **YouTube Analyzer MCP**
Find high-performing YouTube videos for any topic
- Analyze video trends and performance metrics
- Get engagement data, view counts, and thumbnails
- Perfect for content creators and marketers

### 🌐 **Web Scraper MCP**
Extract data from any website intelligently
- Smart content extraction from articles, products, and more
- Saves scraped data directly to your GitHub repository
- Built-in templates for common website types

### 📄 **PDF Generator MCP**
Create beautiful PDFs from any content
- Generate professional documents, invoices, certificates
- Multiple templates (technical docs, business letters, etc.)
- Automatically uploads PDFs to your GitHub repository

---

## 🚀 Quick Start

### **Get Your Own Copy**

**🎯 Use this as a template repository:**

1. **Click the green "Use this template" button** at the top of this GitHub page
2. **Create your own repository** from this template
3. **Clone YOUR new repository:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   cd YOUR_REPO_NAME
   code .
   ```

*This gives you a clean copy with your own git history - perfect for pushing to Railway!*

### **For n8n Users**

### 1. **Choose Your Adventure**
Pick which MCP server you want to use (or use all three!):
- 🎬 Want to analyze YouTube content? → Go to `youtube-mcp/`
- 🌐 Need to scrape websites? → Go to `web-scraper-mcp/`
- 📄 Want to generate PDFs? → Go to `pdf-generator-mcp/`

### 2. **Deploy to Railway** (Free & Easy!)
Deploy any MCP server to Railway:
- Fork/clone this repository to your GitHub
- Connect it to Railway
- In Railway settings, set the **Root Directory** to your chosen MCP (e.g., `youtube-mcp/`)
- Configure your environment variables
- Deploy!

### 3. **Connect to n8n**
Follow the simple setup guide in `/docs/N8N_SETUP_GUIDE.md` to connect your deployed MCP to n8n.

### 4. **Start Automating!**
Use your new AI-powered nodes in n8n workflows!

---

## 🛠️ What You'll Need

Don't worry - these are all free to get:

### For YouTube MCP:
- 🔑 **YouTube API Key** (free from Google Cloud Console)
- 🎫 **MCP Auth Token** (see below)

### For Web Scraper & PDF Generator:
- 🐙 **GitHub Account** (for storing your scraped content/PDFs)
- 🔑 **GitHub Personal Access Token** (free to create)
- 🎫 **MCP Auth Token** (see below)

### 🔐 Getting Your MCP Auth Token

The easiest way to get a secure MCP auth token:

1. **Ask Claude**: "Generate a secure 32-byte base64 token for MCP authentication"
2. **Claude will generate** something like: `x5PY2SD2zeKSFfLuDyuHB40+K0+SaqBOt0G+DHowVJs=`
3. **Use this as your `MCP_AUTH_TOKEN`** in Railway environment variables

**What is this token for?** It authenticates your n8n instance with your MCP servers using Bearer token authentication. All endpoints require this token - **no token = no access**.

**Security Architecture:**
- **NGINX Proxy Layer**: All MCPs use NGINX as an authentication proxy on port 8080
- **Supergateway Backend**: MCP protocol implementation runs on port 8081 (internal)
- **Bearer Token Validation**: NGINX validates `Authorization: Bearer <token>` headers
- **Zero Trust**: Without the correct token, requests return `401 Unauthorized`

This dual-layer architecture ensures both security and n8n compatibility.

*Don't know how to get these? No problem! Each project folder has detailed setup instructions.*

---

## 📚 Documentation Made Simple

I've organized everything to be super beginner-friendly:

### 🎯 **Start Here:**
- **[n8n Setup Guide](docs/N8N_SETUP_GUIDE.md)** ← Perfect for beginners!
- **[Railway Deployment Guide](docs/RAILWAY_DEPLOYMENT_GUIDE.md)** ← Deploy with one click

### 🔧 **For Developers:**
- **[MCP Development Guide](docs/MCP_DEVELOPMENT_GUIDE.md)** ← Want to customize?
- **[SSE Integration Guide](docs/SSE_INTEGRATION_GUIDE.md)** ← Advanced features

### 🆘 **Need Help:**
- **[Troubleshooting Guide](docs/TROUBLESHOOTING.md)** ← Common issues & solutions

---

## 🌟 Why I Built This

As an n8n user myself, I was frustrated by the limitations of existing automation tools. I wanted:
- **Real AI intelligence** in my workflows
- **No coding required** for setup
- **Professional results** without the complexity

So I built these MCP servers to bridge that gap. Now you can have enterprise-level AI capabilities in your n8n workflows with just a few clicks!

---

## 🎉 Project Structure

```
ken-n8n-mcps/
├── 📁 docs/                    # All the guides you need
├── 🎬 youtube-mcp/             # YouTube content analyzer
├── 🌐 web-scraper-mcp/         # Intelligent web scraper
├── 📄 pdf-generator-mcp/       # Professional PDF creator
└── 📖 README.md                # You are here!
```

---

## 💡 Cool Features

### 🧠 **Smart & Intelligent**
- Uses advanced AI for content extraction and analysis
- Learns from website structures automatically
- Handles dynamic content and modern websites

### 🔒 **Secure by Design**
- All credentials stored safely in environment variables
- No hardcoded secrets anywhere
- Follow security best practices

### ⚡ **Production Ready**
- Built for reliability and scale
- Comprehensive error handling
- Detailed logging for troubleshooting

### 🎨 **n8n Friendly**
- Designed specifically for no-code users
- Clear, simple APIs
- Rich responses perfect for n8n workflows

---

## 🚀 Get Started Now!

1. **Pick your MCP** from the folders above
2. **Click the Railway deploy button** in that folder's README
3. **Follow the setup guide** (takes 5-10 minutes)
4. **Connect to n8n** using our simple guide
5. **Start building amazing workflows!**

---

## 🤝 Questions or Issues?

- 📖 Check the **[Troubleshooting Guide](docs/TROUBLESHOOTING.md)** first
- 🐛 Found a bug? Open an issue on GitHub
- 💡 Have an idea? I'd love to hear it!
- 📧 Want to connect? Find me on GitHub [@kenkai](https://github.com/kenkai)

---

## 📄 License

MIT License - Use these however you want! Build amazing things! 🎉

---

*Happy automating! 🤖✨*

**- Ken**
