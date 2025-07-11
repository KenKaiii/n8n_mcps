/**
 * Core PDF generation logic using Puppeteer
 */

import puppeteer, { Browser, PDFOptions } from 'puppeteer';
import handlebars from 'handlebars';
import { marked } from 'marked';
import Prism from 'prismjs';
import QRCode from 'qrcode';
import { ChartConfiguration } from 'chart.js';
import fs from 'fs/promises';
import path from 'path';
import {
  PDFGenerationOptions,
  TechnicalPDFOptions,
  ResearchPDFOptions,
  EverydayPDFOptions,
  MarkdownToPDFOptions,
  PDFGenerationResult
} from './types.js';

// Load Prism languages
import 'prismjs/components/prism-javascript.js';
import 'prismjs/components/prism-typescript.js';
import 'prismjs/components/prism-python.js';
import 'prismjs/components/prism-java.js';
import 'prismjs/components/prism-csharp.js';
import 'prismjs/components/prism-go.js';
import 'prismjs/components/prism-rust.js';
import 'prismjs/components/prism-sql.js';
import 'prismjs/components/prism-bash.js';
import 'prismjs/components/prism-json.js';
import 'prismjs/components/prism-yaml.js';
import 'prismjs/components/prism-markdown.js';

// Register Handlebars helpers
handlebars.registerHelper('formatDate', (date: Date) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
});

handlebars.registerHelper('currency', (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
});

handlebars.registerHelper('json', (context: any) => {
  return JSON.stringify(context, null, 2);
});

let browser: Browser | null = null;

/**
 * Get or create browser instance
 */
async function getBrowser(): Promise<Browser> {
  if (!browser) {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  }
  return browser;
}

/**
 * Generate QR code as data URL
 */
async function generateQRCode(data: string, size: number = 200): Promise<string> {
  return await QRCode.toDataURL(data, {
    width: size,
    margin: 1,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    }
  });
}

/**
 * Render Chart.js chart as image
 */
async function renderChart(config: ChartConfiguration): Promise<string> {
  // For now, return a placeholder - in production, use node-canvas or chartjs-node-canvas
  // Chart.js requires a real canvas context which is not available in a pure Node.js environment
  return `data:image/svg+xml;base64,${Buffer.from(`
    <svg width="800" height="400" xmlns="http://www.w3.org/2000/svg">
      <rect width="800" height="400" fill="#f0f0f0"/>
      <text x="400" y="200" text-anchor="middle" font-family="Arial" font-size="16">
        Chart placeholder - ${config.type}
      </text>
    </svg>
  `).toString('base64')}`;
}

/**
 * Highlight code using Prism
 */
function highlightCode(code: string, language: string): string {
  const lang = Prism.languages[language] || Prism.languages.plaintext;
  return Prism.highlight(code, lang, language);
}

/**
 * Convert markdown to HTML
 */
async function markdownToHtml(markdown: string, options?: { highlight?: boolean }): Promise<string> {
  const renderer = new marked.Renderer();

  // Custom renderer for blockquotes that might be callout boxes
  renderer.blockquote = (quote: string) => {
    // Check if this is a callout box (starts with [!type])
    const calloutMatch = quote.match(/^<p>\[!(\w+)\]\s*(.+)/s);
    if (calloutMatch) {
      const type = calloutMatch[1].toLowerCase();
      const content = calloutMatch[2].replace(/<\/p>$/, '');
      const typeMap: Record<string, string> = {
        'note': 'info',
        'info': 'info',
        'tip': 'success',
        'warning': 'warning',
        'caution': 'warning',
        'danger': 'error',
        'error': 'error'
      };
      const calloutType = typeMap[type] || 'info';
      return `<div class="callout callout-${calloutType}">${content}</div>`;
    }
    return `<blockquote>${quote}</blockquote>`;
  };

  // Enhanced list rendering with better nesting support
  renderer.list = (body: string, ordered: boolean, start: number) => {
    const type = ordered ? 'ol' : 'ul';
    const startAttr = ordered && start !== 1 ? ` start="${start}"` : '';
    return `<${type}${startAttr}>${body}</${type}>`;
  };

  // Support for horizontal rules as dividers
  renderer.hr = () => {
    return '<hr class="divider" />';
  };

  if (options?.highlight) {
    const markedOptions: any = {
      highlight: (code: string, lang: string) => {
        if (lang && Prism.languages[lang]) {
          return highlightCode(code, lang);
        }
        return code;
      },
      breaks: true, // Enable line breaks
      gfm: true, // GitHub Flavored Markdown
      tables: true // Enable tables
    };
    marked.setOptions(markedOptions);
  }

  // Process markdown with enhanced formatting
  let html = await marked(markdown, { renderer });

  // Post-process for additional formatting
  // Add support for text alignment (e.g., ->centered text<-)
  html = html.replace(/->\s*(.+?)\s*<-/g, '<div class="text-center">$1</div>');
  // Add support for right alignment (e.g., >>right aligned text)
  html = html.replace(/^>>\s*(.+?)$/gm, '<div class="text-right">$1</div>');

  return html;
}

/**
 * Get base CSS for all templates
 */
function getBaseCSS(theme: string = 'light'): string {
  const themes = {
    light: {
      bg: '#ffffff',
      text: '#1a202c',
      heading: '#2d3748',
      code: '#f7fafc',
      codeBorder: '#e2e8f0',
      accent: '#3182ce'
    },
    dark: {
      bg: '#1a202c',
      text: '#e2e8f0',
      heading: '#f7fafc',
      code: '#2d3748',
      codeBorder: '#4a5568',
      accent: '#63b3ed'
    },
    sepia: {
      bg: '#f7f3e9',
      text: '#5c4b3a',
      heading: '#3e2f24',
      code: '#ede7d3',
      codeBorder: '#d4c5a9',
      accent: '#8b6f47'
    }
  };

  const t = themes[theme as keyof typeof themes] || themes.light;

  return `
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Fira+Code:wght@300;400;500;600;700&display=swap');

      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      body {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        line-height: 1.6;
        color: ${t.text};
        background: ${t.bg};
        padding: 40px;
      }

      h1, h2, h3, h4, h5, h6 {
        color: ${t.heading};
        margin: 1.5em 0 0.5em;
        font-weight: 600;
        line-height: 1.2;
      }

      h1 { font-size: 2.5em; }
      h2 { font-size: 2em; }
      h3 { font-size: 1.5em; }
      h4 { font-size: 1.25em; }
      h5 { font-size: 1.1em; }
      h6 { font-size: 1em; }

      p {
        margin: 1em 0;
      }

      /* Typography enhancements */
      strong, b {
        font-weight: 700;
        color: ${t.heading};
      }

      em, i {
        font-style: italic;
      }

      u {
        text-decoration: underline;
      }

      del, s {
        text-decoration: line-through;
        opacity: 0.7;
      }

      /* Lists styling */
      ul, ol {
        margin: 1em 0;
        padding-left: 2em;
      }

      ul li {
        list-style-type: disc;
        margin: 0.5em 0;
      }

      ul ul li {
        list-style-type: circle;
      }

      ul ul ul li {
        list-style-type: square;
      }

      ol li {
        list-style-type: decimal;
        margin: 0.5em 0;
      }

      /* Blockquotes */
      blockquote {
        margin: 1em 0;
        padding: 1em 1.5em;
        border-left: 4px solid ${t.accent};
        background: ${t.code};
        font-style: italic;
      }

      blockquote p:first-child {
        margin-top: 0;
      }

      blockquote p:last-child {
        margin-bottom: 0;
      }

      /* Horizontal rules */
      hr {
        margin: 2em 0;
        border: none;
        border-top: 2px solid ${t.codeBorder};
      }

      /* Text alignment utilities */
      .text-left { text-align: left; }
      .text-center { text-align: center; }
      .text-right { text-align: right; }
      .text-justify { text-align: justify; }

      /* Callout boxes */
      .callout {
        margin: 1em 0;
        padding: 1em;
        border-radius: 6px;
        border: 1px solid;
      }

      .callout-info {
        background: #e3f2fd;
        border-color: #2196f3;
        color: #0d47a1;
      }

      .callout-warning {
        background: #fff3cd;
        border-color: #ffc107;
        color: #856404;
      }

      .callout-success {
        background: #d4edda;
        border-color: #28a745;
        color: #155724;
      }

      .callout-error {
        background: #f8d7da;
        border-color: #dc3545;
        color: #721c24;
      }

      /* Dark theme adjustments */
      ${theme === 'dark' ? `
      .callout-info {
        background: #1e3a5f;
        border-color: #2196f3;
        color: #90caf9;
      }

      .callout-warning {
        background: #5d4e37;
        border-color: #ffc107;
        color: #ffecb3;
      }

      .callout-success {
        background: #1b5e20;
        border-color: #4caf50;
        color: #a5d6a7;
      }

      .callout-error {
        background: #5f2120;
        border-color: #f44336;
        color: #ef9a9a;
      }
      ` : ''}

      code {
        font-family: 'Fira Code', monospace;
        background: ${t.code};
        border: 1px solid ${t.codeBorder};
        padding: 0.2em 0.4em;
        border-radius: 3px;
        font-size: 0.9em;
      }

      pre {
        background: ${t.code};
        border: 1px solid ${t.codeBorder};
        border-radius: 6px;
        padding: 1em;
        overflow-x: auto;
        margin: 1em 0;
      }

      pre code {
        background: none;
        border: none;
        padding: 0;
      }

      a {
        color: ${t.accent};
        text-decoration: none;
      }

      a:hover {
        text-decoration: underline;
      }

      table {
        width: 100%;
        border-collapse: collapse;
        margin: 1em 0;
      }

      th, td {
        border: 1px solid ${t.codeBorder};
        padding: 0.5em 1em;
        text-align: left;
      }

      th {
        background: ${t.code};
        font-weight: 600;
      }

      img {
        max-width: 100%;
        height: auto;
      }

      .page-break {
        page-break-after: always;
      }

      /* Additional utilities */
      .mb-0 { margin-bottom: 0; }
      .mt-0 { margin-top: 0; }
      .mb-1 { margin-bottom: 0.25em; }
      .mt-1 { margin-top: 0.25em; }
      .mb-2 { margin-bottom: 0.5em; }
      .mt-2 { margin-top: 0.5em; }
      .mb-4 { margin-bottom: 1em; }
      .mt-4 { margin-top: 1em; }

      .font-bold { font-weight: 700; }
      .font-normal { font-weight: 400; }
      .italic { font-style: italic; }

      /* Section dividers */
      .divider {
        margin: 2em 0;
        text-align: center;
        color: ${t.codeBorder};
      }

      .divider::before {
        content: "•••";
        letter-spacing: 1em;
      }

      @media print {
        body {
          padding: 0;
        }
      }
    </style>
    <script src="https://cdn.tailwindcss.com"></script>
  `;
}

/**
 * Generate PDF from HTML
 */
export async function generatePDF(
  html: string,
  options: PDFGenerationOptions
): Promise<PDFGenerationResult> {
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    // Set viewport
    await page.setViewport({ width: 1200, height: 800 });

    // Set content
    await page.setContent(html, { waitUntil: 'networkidle0' });

    // Generate PDF
    const pdfOptions: PDFOptions = {
      format: options.format || 'A4',
      landscape: options.orientation === 'landscape',
      printBackground: true,
      margin: options.margins || {
        top: '1cm',
        bottom: '1cm',
        left: '1cm',
        right: '1cm'
      }
    };

    const pdfBuffer = await page.pdf(pdfOptions);

    // Get metadata
    const pdfBase64 = Buffer.from(pdfBuffer).toString('base64');

    return {
      success: true,
      pdfBase64,
      metadata: {
        pages: 1, // Would need pdf-lib to get actual page count
        fileSize: pdfBuffer.length,
        generatedAt: new Date().toISOString()
      }
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message
    };
  } finally {
    await page.close();
  }
}

/**
 * Generate technical PDF
 */
export async function generateTechnicalPDF(
  options: TechnicalPDFOptions
): Promise<PDFGenerationResult> {
  const css = getBaseCSS(options.theme);

  // Build HTML content
  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${options.title}</title>
      ${css}
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-${options.syntaxTheme || 'github'}.min.css">
    </head>
    <body class="max-w-5xl mx-auto">
      <div class="mb-16">
        <h1 class="text-5xl font-bold mb-4">${options.title}</h1>
        ${options.metadata?.author ? `<p class="text-lg text-gray-600">By ${options.metadata.author}</p>` : ''}
        <p class="text-gray-500">${new Date().toLocaleDateString()}</p>
      </div>
  `;

  // Table of contents
  if (options.includeTableOfContents) {
    html += '<div class="mb-12"><h2>Table of Contents</h2><ol class="list-decimal ml-6">';
    for (const section of options.sections) {
      html += `<li class="mb-2"><a href="#${section.title.toLowerCase().replace(/\s+/g, '-')}">${section.title}</a></li>`;
    }
    html += '</ol></div>';
  }

  // Sections
  for (const section of options.sections) {
    const sectionId = section.title.toLowerCase().replace(/\s+/g, '-');
    const level = section.level || 2;
    html += `
      <div class="mb-8">
        <h${level} id="${sectionId}" class="mb-4">${section.title}</h${level}>
        <div class="prose max-w-none">${await markdownToHtml(section.content, { highlight: true })}</div>
      </div>
    `;
  }

  // Code examples
  if (options.codeExamples) {
    html += '<div class="mb-12"><h2>Code Examples</h2>';
    for (const example of options.codeExamples) {
      html += `
        <div class="mb-8">
          ${example.filename ? `<div class="bg-gray-800 text-white px-4 py-2 rounded-t-lg text-sm">${example.filename}</div>` : ''}
          <pre class="!mt-0 ${example.filename ? '!rounded-t-none' : ''}"><code class="language-${example.language}">${highlightCode(example.code, example.language)}</code></pre>
          ${example.description ? `<p class="text-sm text-gray-600 mt-2">${example.description}</p>` : ''}
        </div>
      `;
    }
    html += '</div>';
  }

  // Diagrams
  if (options.diagrams) {
    html += '<div class="mb-12"><h2>Diagrams</h2>';
    for (const diagram of options.diagrams) {
      if (diagram.type === 'mermaid') {
        // For production, would use mermaid CLI or puppeteer to render
        html += `
          <div class="mb-8 text-center">
            <div class="border-2 border-gray-300 rounded-lg p-8 inline-block">
              <pre class="mermaid">${diagram.data}</pre>
            </div>
            ${diagram.caption ? `<p class="text-sm text-gray-600 mt-2">${diagram.caption}</p>` : ''}
          </div>
        `;
      } else if (diagram.type === 'chart') {
        const chartImage = await renderChart(diagram.data);
        html += `
          <div class="mb-8 text-center">
            <img src="${chartImage}" alt="Chart" class="mx-auto">
            ${diagram.caption ? `<p class="text-sm text-gray-600 mt-2">${diagram.caption}</p>` : ''}
          </div>
        `;
      }
    }
    html += '</div>';
  }

  html += '</body></html>';

  return generatePDF(html, options);
}

/**
 * Generate research PDF
 */
export async function generateResearchPDF(
  options: ResearchPDFOptions
): Promise<PDFGenerationResult> {
  const css = getBaseCSS(options.theme);

  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${options.title}</title>
      ${css}
      <style>
        .abstract {
          background: #f8f9fa;
          border-left: 4px solid #007bff;
          padding: 1.5em;
          margin: 2em 0;
        }
        .citation {
          font-size: 0.9em;
          color: #666;
        }
        .author-info {
          text-align: center;
          margin: 1em 0;
        }
      </style>
    </head>
    <body class="max-w-4xl mx-auto">
      <div class="text-center mb-12">
        <h1 class="text-4xl font-bold mb-6">${options.title}</h1>
  `;

  // Authors
  if (options.authors) {
    html += '<div class="author-info">';
    for (const author of options.authors) {
      html += `
        <div class="mb-2">
          <span class="font-semibold">${author.name}</span>
          ${author.affiliation ? `<br><span class="text-sm text-gray-600">${author.affiliation}</span>` : ''}
          ${author.email ? `<br><span class="text-sm text-gray-500">${author.email}</span>` : ''}
        </div>
      `;
    }
    html += '</div>';
  }

  html += '</div>';

  // Abstract
  if (options.includeAbstract !== false) {
    html += `
      <div class="abstract">
        <h2 class="text-xl font-bold mb-2">Abstract</h2>
        <p>${options.abstract}</p>
      </div>
    `;
  }

  // Sections
  for (const section of options.sections) {
    html += `
      <div class="mb-8">
        <h2 class="text-2xl font-bold mb-4">${section.title}</h2>
        <div class="prose max-w-none">${await markdownToHtml(section.content)}</div>
    `;

    // Subsections
    if (section.subsections) {
      for (const subsection of section.subsections) {
        html += `
          <div class="ml-6 mb-4">
            <h3 class="text-xl font-semibold mb-2">${subsection.title}</h3>
            <div class="prose max-w-none">${await markdownToHtml(subsection.content)}</div>
          </div>
        `;
      }
    }

    html += '</div>';
  }

  // Charts
  if (options.charts) {
    html += '<div class="mb-12"><h2 class="text-2xl font-bold mb-4">Figures</h2>';
    for (let i = 0; i < options.charts.length; i++) {
      const chart = options.charts[i];
      const chartImage = await renderChart({
        type: chart.type as any,
        data: chart.data,
        options: {
          responsive: true,
          plugins: {
            title: {
              display: !!chart.title,
              text: chart.title
            }
          }
        }
      });

      html += `
        <div class="mb-8 text-center">
          <img src="${chartImage}" alt="Figure ${i + 1}" class="mx-auto mb-2">
          <p class="text-sm"><strong>Figure ${i + 1}:</strong> ${chart.title || chart.description || ''}</p>
        </div>
      `;
    }
    html += '</div>';
  }

  // References
  if (options.citations) {
    html += '<div class="page-break"></div><div><h2 class="text-2xl font-bold mb-4">References</h2><ol class="list-decimal ml-6">';
    for (const citation of options.citations) {
      html += `
        <li class="citation mb-2">
          ${citation.authors} (${citation.year}). <em>${citation.title}</em>.
          ${citation.journal ? `${citation.journal}.` : ''}
          ${citation.url ? `<a href="${citation.url}" class="text-blue-600">${citation.url}</a>` : ''}
        </li>
      `;
    }
    html += '</ol></div>';
  }

  html += '</body></html>';

  return generatePDF(html, options);
}

/**
 * Generate everyday PDF
 */
export async function generateEverydayPDF(
  options: EverydayPDFOptions
): Promise<PDFGenerationResult> {
  // Load template based on document type
  const templatePath = path.join(process.cwd(), 'templates', `${options.documentType}.hbs`);
  let templateContent: string;

  try {
    templateContent = await fs.readFile(templatePath, 'utf-8');
  } catch {
    // Use default template if specific one doesn't exist
    templateContent = getDefaultTemplate(options.documentType);
  }

  // Compile template
  const template = handlebars.compile(templateContent);

  // Prepare data
  const data = {
    ...options.data,
    logo: options.logo,
    signature: options.signature,
    qrCode: options.qrCode ? await generateQRCode(options.qrCode.data, options.qrCode.size) : null,
    generatedDate: new Date()
  };

  // Generate HTML
  const css = getBaseCSS(options.theme);
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${options.title}</title>
      ${css}
    </head>
    <body>
      ${template(data)}
    </body>
    </html>
  `;

  return generatePDF(html, options);
}

/**
 * Convert markdown to PDF
 */
export async function generateMarkdownPDF(
  options: MarkdownToPDFOptions
): Promise<PDFGenerationResult> {
  const css = getBaseCSS(options.theme);
  const htmlContent = await markdownToHtml(options.markdown, {
    highlight: options.includeHighlighting
  });

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${options.title}</title>
      ${css}
      ${options.customCSS ? `<style>${options.customCSS}</style>` : ''}
    </head>
    <body class="max-w-4xl mx-auto">
      <h1 class="text-4xl font-bold mb-8">${options.title}</h1>
      <div class="prose max-w-none">
        ${htmlContent}
      </div>
    </body>
    </html>
  `;

  return generatePDF(html, options);
}

/**
 * Get default template for document type
 */
function getDefaultTemplate(documentType: string): string {
  const templates: Record<string, string> = {
    invoice: `
      <div class="max-w-4xl mx-auto p-8">
        {{#if logo}}
        <img src="{{logo.url}}" alt="Logo" style="width: {{logo.width}}px; height: {{logo.height}}px;" class="mb-8">
        {{/if}}

        <h1 class="text-3xl font-bold mb-8">INVOICE</h1>

        <div class="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h3 class="font-bold mb-2">From:</h3>
            <p>{{from.name}}</p>
            <p>{{from.address}}</p>
            <p>{{from.email}}</p>
          </div>
          <div>
            <h3 class="font-bold mb-2">To:</h3>
            <p>{{to.name}}</p>
            <p>{{to.address}}</p>
            <p>{{to.email}}</p>
          </div>
        </div>

        <table class="w-full mb-8">
          <thead>
            <tr>
              <th>Description</th>
              <th>Quantity</th>
              <th>Price</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {{#each items}}
            <tr>
              <td>{{description}}</td>
              <td>{{quantity}}</td>
              <td>{{currency price}}</td>
              <td>{{currency total}}</td>
            </tr>
            {{/each}}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="3" class="text-right font-bold">Total:</td>
              <td class="font-bold">{{currency total}}</td>
            </tr>
          </tfoot>
        </table>

        {{#if qrCode}}
        <div class="text-right">
          <img src="{{qrCode}}" alt="QR Code" class="inline-block">
        </div>
        {{/if}}
      </div>
    `,

    letter: `
      <div class="max-w-3xl mx-auto p-8">
        <div class="mb-8">
          <p>{{sender.name}}</p>
          <p>{{sender.address}}</p>
          <p>{{sender.city}}, {{sender.state}} {{sender.zip}}</p>
          <p>{{formatDate generatedDate}}</p>
        </div>

        <div class="mb-8">
          <p>{{recipient.name}}</p>
          <p>{{recipient.title}}</p>
          <p>{{recipient.company}}</p>
          <p>{{recipient.address}}</p>
          <p>{{recipient.city}}, {{recipient.state}} {{recipient.zip}}</p>
        </div>

        <p class="mb-4">Dear {{recipient.name}},</p>

        <div class="prose max-w-none mb-8">
          {{{body}}}
        </div>

        <p class="mb-8">Sincerely,</p>

        {{#if signature.image}}
        <img src="{{signature.image}}" alt="Signature" class="mb-2" style="height: 60px;">
        {{/if}}

        <p>{{sender.name}}</p>
        <p>{{sender.title}}</p>
      </div>
    `,

    certificate: `
      <div class="text-center p-16 max-w-4xl mx-auto">
        <div class="border-8 border-double border-gray-800 p-12">
          <h1 class="text-5xl font-bold mb-8" style="font-family: 'Old English Text MT', serif;">
            Certificate of {{certificateType}}
          </h1>

          <p class="text-xl mb-8">This is to certify that</p>

          <h2 class="text-4xl font-bold mb-8">{{recipientName}}</h2>

          <p class="text-lg mb-12">{{achievement}}</p>

          <div class="grid grid-cols-2 gap-16 mt-16">
            <div>
              <div class="border-t-2 border-gray-800 pt-2">
                <p>{{issuer.name}}</p>
                <p class="text-sm">{{issuer.title}}</p>
              </div>
            </div>
            <div>
              <div class="border-t-2 border-gray-800 pt-2">
                <p>{{formatDate generatedDate}}</p>
                <p class="text-sm">Date</p>
              </div>
            </div>
          </div>

          {{#if qrCode}}
          <div class="mt-8">
            <img src="{{qrCode}}" alt="Verification QR Code" class="mx-auto" style="width: 100px;">
          </div>
          {{/if}}
        </div>
      </div>
    `
  };

  return templates[documentType] || templates.letter;
}

/**
 * Cleanup browser on exit
 */
export async function cleanup() {
  if (browser) {
    await browser.close();
    browser = null;
  }
}
