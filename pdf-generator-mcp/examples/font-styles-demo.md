# Font Style Examples for PDF Generator

This document demonstrates the available font styles in the PDF generator MCP.

## Available Font Styles

### 1. Modern (Default)
- **Body Font**: Inter - Clean, modern sans-serif
- **Heading Font**: Inter - Same as body for consistency
- **Code Font**: Fira Code - Monospace with ligatures
- **Best for**: Technical documentation, modern web content

### 2. Classic
- **Body Font**: Merriweather - Traditional serif for readability
- **Heading Font**: Source Sans Pro - Clean sans-serif for contrast
- **Code Font**: Source Code Pro - Adobe's monospace font
- **Best for**: Academic papers, traditional documents

### 3. Professional
- **Body Font**: Roboto - Google's clean sans-serif
- **Heading Font**: Roboto Slab - Serif variant for emphasis
- **Code Font**: Roboto Mono - Matching monospace
- **Best for**: Business documents, presentations

### 4. Elegant
- **Body Font**: Lora - Elegant serif with character
- **Heading Font**: Montserrat - Bold, modern sans-serif
- **Code Font**: JetBrains Mono - Developer-friendly monospace
- **Best for**: Creative documents, portfolios

### 5. Technical
- **Body Font**: IBM Plex Sans - IBM's corporate font
- **Heading Font**: IBM Plex Sans - Consistent technical look
- **Code Font**: IBM Plex Mono - Matching monospace
- **Best for**: Technical manuals, API documentation

## Usage Example

When using the MCP tools, specify the `fontStyle` parameter:

```javascript
{
  "tool": "generate_markdown_pdf",
  "params": {
    "markdown": "Your content here",
    "title": "Document Title",
    "fontStyle": "elegant", // Choose: modern, classic, professional, elegant, technical
    "theme": "light"
  }
}
```

## Typography Features

All font styles support:
- **Bold text** for emphasis
- *Italic text* for subtle emphasis
- `Inline code` with monospace font
- Multiple heading levels with appropriate sizing
- Optimized line height and letter spacing
- Anti-aliased rendering for smooth text

The fonts are loaded from Google Fonts, ensuring consistent rendering across different systems and optimal web performance.
