# Web Scraper MCP Server

An efficient MCP server for web scraping that extracts content and publishes directly to GitHub, using only ~500 tokens per page.

## Features

- **Direct Extract → Publish Pipeline**: No content sent through LLMs
- **Smart Extraction**: Uses Readability + 10 built-in templates
- **GitHub Integration**: Publishes extracted content as markdown
- **Anti-Blocking**: User agent rotation, delays, Puppeteer fallback
- **Crawling**: Multi-page crawling with depth control

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Configure GitHub token in `.env`:

   ```
   GITHUB_TOKEN=your_github_pat_here
   ```

3. Update repository details in `src/config.ts`

4. Build and run:
   ```bash
   npm run build
   npm start
   ```

## Tools

### extract_and_publish

Extracts content from URLs and publishes to GitHub. Content is automatically organized by domain name.

```json
{
  "urls": ["https://example.com/article"],
  "template": "article",
  "basePathInRepo": "articles",
  "commitMessage": "Add article"
}
```

Creates: `articles/example.com/article.md`

### crawl_and_publish

Crawls websites and publishes all pages, organized by domain.

```json
{
  "url": "https://example.com",
  "config": {
    "maxPages": 5,
    "maxDepth": 2
  },
  "basePathInRepo": "sites"
}
```

Creates: `sites/example.com/index.md`, `sites/example.com/about.md`, etc.

## Templates

- `article` - Blog posts
- `ecommerce_product` - Products
- `recipe` - Recipes
- `job_listing` - Jobs
- `event` - Events
- `real_estate` - Properties
- `social_profile` - Profiles
- `video_media` - Videos
- `forum_thread` - Forums
- `documentation` - Docs

## Running with SSE

For n8n integration:

```bash
npm run sse
```

Server available at: `http://localhost:8081/sse`
