# PDF Generator MCP Server

A powerful Model Context Protocol (MCP) server for generating beautiful, well-designed PDF documents with templates for technical documentation, research papers, and everyday documents. Automatically publishes to GitHub for easy sharing and version control.

## Features

- **Multiple PDF Types**:
  - **Technical PDFs**: API documentation, system architecture, technical guides with syntax highlighting and code examples
  - **Research PDFs**: Academic papers, whitepapers, market research with citations and charts
  - **Everyday Documents**: Invoices, letters, certificates with QR codes and signatures
  - **Markdown to PDF**: Convert any markdown content to beautiful PDFs

- **Professional Templates**: Pre-designed templates for each document type
- **GitHub Integration**: Automatically publish PDFs to your GitHub repository
- **Theme Support**: Light, dark, and sepia themes for all document types
- **Advanced Features**:
  - Syntax highlighting for code blocks (Prism.js)
  - Chart generation (Chart.js)
  - QR code generation
  - Custom CSS support
  - Table of contents generation
  - Page numbering
  - Metadata embedding

## Installation

### Local Installation

```bash
npm install pdf-generator-mcp
```

### Using with n8n

Add the following to your n8n configuration:

```json
{
  "mcpServers": {
    "pdf-generator": {
      "command": "node",
      "args": ["/path/to/pdf-generator-mcp/dist/index.js"],
      "env": {
        "GITHUB_TOKEN": "your-github-token",
        "GITHUB_OWNER": "your-github-username",
        "GITHUB_REPO": "your-repo-name"
      }
    }
  }
}
```

### Railway Deployment

1. Fork this repository
2. Connect your GitHub account to Railway
3. Create a new project from the repository
4. Set the following environment variables:
   - `GITHUB_TOKEN`: Your GitHub personal access token
   - `GITHUB_OWNER`: Your GitHub username
   - `GITHUB_REPO`: Repository name for storing PDFs
   - `PORT`: (Optional, defaults to 8080)

## Environment Variables

- `GITHUB_TOKEN`: GitHub personal access token for publishing PDFs
- `GITHUB_OWNER`: GitHub username or organization (default: "your-github-username")
- `GITHUB_REPO`: Repository name for PDFs (default: "mcp_docs")
- `GITHUB_BRANCH`: Branch to publish to (default: "main")
- `PDF_BASE_PATH`: Base path in repository (default: "pdfs")

## Available Tools

### 1. generate_technical_pdf

Generate technical documentation PDFs with code examples and professional formatting.

```typescript
{
  title: "API Documentation",
  sections: [
    {
      title: "Introduction",
      content: "# Getting Started\n\nThis is the introduction...",
      level: 1
    }
  ],
  codeExamples: [
    {
      language: "javascript",
      code: "console.log('Hello World');",
      filename: "example.js",
      description: "Basic example"
    }
  ],
  theme: "dark",
  includeTableOfContents: true
}
```

### 2. generate_research_pdf

Create academic papers and research documents with citations and charts.

```typescript
{
  title: "Research Paper Title",
  abstract: "This paper explores...",
  authors: [
    {
      name: "John Doe",
      affiliation: "University",
      email: "john@example.com"
    }
  ],
  sections: [
    {
      title: "Introduction",
      content: "Research content..."
    }
  ],
  citations: [
    {
      id: "1",
      authors: "Smith, J.",
      title: "Previous Work",
      year: 2023,
      journal: "Nature"
    }
  ]
}
```

### 3. generate_everyday_pdf

Generate invoices, letters, certificates, and other everyday documents.

```typescript
{
  title: "Invoice #2024-001",
  documentType: "invoice",
  data: {
    invoiceNumber: "2024-001",
    date: "2024-01-15",
    from: {
      company: "Your Company",
      address: "123 Main St"
    },
    to: {
      company: "Client Company",
      name: "Jane Doe"
    },
    items: [
      {
        description: "Consulting Services",
        quantity: 10,
        unitPrice: 100,
        amount: 1000
      }
    ]
  }
}
```

### 4. generate_markdown_pdf

Convert markdown content to PDF with syntax highlighting.

```typescript
{
  title: "Documentation",
  markdown: "# Title\n\n## Section\n\nContent with **bold** and *italic*...",
  theme: "light",
  includeHighlighting: true,
  format: "A4"
}
```

### 5. generate_and_download

Generate any PDF type and return as base64 without publishing to GitHub.

```typescript
{
  pdfType: "technical",
  options: {
    title: "My Document",
    // ... type-specific options
  }
}
```

## Document Templates

### Technical PDF Features
- Syntax highlighting for 20+ languages
- Code examples with filenames
- Table of contents
- Professional tech documentation styling
- Dark mode optimized for code readability

### Research PDF Features
- Academic formatting (Times New Roman, justified text)
- Abstract section
- Author affiliations
- Citation management (APA, MLA, Chicago styles)
- Chart integration
- Figure and table captions

### Everyday Documents

**Invoice Features:**
- Professional invoice layout
- Item tables with calculations
- Tax and discount support
- Payment information section
- Logo and branding support

**Letter Features:**
- Formal and informal letter formats
- Letterhead support
- Digital signatures
- CC and enclosure sections

**Certificate Features:**
- Landscape orientation
- Decorative borders
- Multiple signature blocks
- QR code verification
- Watermark support

## Examples

### Creating a Technical PDF

```javascript
const result = await mcp.callTool('generate_technical_pdf', {
  title: 'API Reference Guide',
  sections: [
    {
      title: 'Authentication',
      content: '## OAuth 2.0\n\nUse Bearer tokens...',
      level: 1
    }
  ],
  codeExamples: [
    {
      language: 'python',
      code: 'import requests\n\nresponse = requests.get("/api/users")',
      filename: 'api_example.py'
    }
  ],
  theme: 'dark',
  includeTableOfContents: true
});
```

### Creating an Invoice

```javascript
const result = await mcp.callTool('generate_everyday_pdf', {
  title: 'Invoice',
  documentType: 'invoice',
  data: {
    invoiceNumber: 'INV-2024-001',
    date: new Date().toLocaleDateString(),
    from: {
      company: 'Acme Corp',
      address: '123 Business St',
      city: 'New York',
      state: 'NY',
      zip: '10001'
    },
    to: {
      company: 'Client Inc',
      name: 'John Smith'
    },
    items: [
      {
        description: 'Web Development',
        quantity: 40,
        unitPrice: 150,
        amount: 6000
      }
    ],
    subtotal: 6000,
    tax: 480,
    total: 6480,
    currency: '$'
  }
});
```

## GitHub Integration

All PDFs are automatically published to your configured GitHub repository with the following structure:

```
pdfs/
├── technical/
│   ├── api-documentation_1234567890.pdf
│   └── system-architecture_1234567891.pdf
├── research/
│   ├── market-analysis_1234567892.pdf
│   └── whitepaper_1234567893.pdf
├── documents/
│   ├── invoice/
│   │   └── inv-2024-001_1234567894.pdf
│   ├── letter/
│   │   └── cover-letter_1234567895.pdf
│   └── certificate/
│       └── achievement-cert_1234567896.pdf
└── markdown/
    └── readme-pdf_1234567897.pdf
```

## Development

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Run in development mode
npm run dev

# Run tests
npm test

# Type checking
npm run typecheck

# Linting
npm run lint
```

## Docker Support

The server includes a Dockerfile optimized for Puppeteer with all necessary dependencies:

```bash
# Build image
docker build -t pdf-generator-mcp .

# Run container
docker run -p 8080:8080 \
  -e GITHUB_TOKEN=your-token \
  -e GITHUB_OWNER=your-username \
  -e GITHUB_REPO=your-repo \
  pdf-generator-mcp
```

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

For issues and feature requests, please use the GitHub issue tracker.
