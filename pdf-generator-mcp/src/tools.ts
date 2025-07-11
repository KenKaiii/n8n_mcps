/**
 * Tool implementations for PDF Generator MCP
 */

import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  McpError,
  ErrorCode,
} from '@modelcontextprotocol/sdk/types.js';
import {
  generateTechnicalPDF,
  generateResearchPDF,
  generateEverydayPDF,
  generateMarkdownPDF,
  cleanup
} from './pdf-generator.js';
import { publishToGithub } from './github.js';
import { GITHUB_CONFIG, PDF_CONFIG } from './config.js';
import {
  TechnicalPDFOptions,
  ResearchPDFOptions,
  EverydayPDFOptions,
  MarkdownToPDFOptions,
  PDFGenerationResult
} from './types.js';

// Tool setup
export function setupTools(server: Server) {
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: 'generate_technical_pdf',
          description: `Generate a beautiful technical documentation PDF with code examples, diagrams, and professional formatting. Automatically publishes to GitHub (${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}). Perfect for API docs, system architecture, technical guides.`,
          inputSchema: {
            type: 'object',
            properties: {
              title: {
                type: 'string',
                description: 'Document title',
              },
              sections: {
                type: 'array',
                description: 'Document sections',
                items: {
                  type: 'object',
                  properties: {
                    title: { type: 'string' },
                    content: { type: 'string', description: 'Markdown content' },
                    level: { type: 'number', description: 'Heading level (1-6)' },
                  },
                  required: ['title', 'content'],
                },
              },
              codeExamples: {
                type: 'array',
                description: 'Code examples to include',
                items: {
                  type: 'object',
                  properties: {
                    language: { type: 'string' },
                    code: { type: 'string' },
                    filename: { type: 'string' },
                    description: { type: 'string' },
                  },
                  required: ['language', 'code'],
                },
              },
              theme: {
                type: 'string',
                enum: ['light', 'dark', 'sepia'],
                description: 'Color theme',
              },
              includeTableOfContents: {
                type: 'boolean',
                description: 'Include table of contents',
              },
              publishToGithub: {
                type: 'boolean',
                description: 'Publish to GitHub repository',
                default: true,
              },
              githubPath: {
                type: 'string',
                description: 'Path in GitHub repo (e.g., "technical/api-docs.pdf")',
              },
            },
            required: ['title', 'sections'],
          },
        },
        {
          name: 'generate_research_pdf',
          description: `Generate a professional research paper or report PDF with abstract, citations, charts, and academic formatting. Automatically publishes to GitHub (${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}). Ideal for whitepapers, market research, academic papers.`,
          inputSchema: {
            type: 'object',
            properties: {
              title: {
                type: 'string',
                description: 'Paper title',
              },
              abstract: {
                type: 'string',
                description: 'Paper abstract',
              },
              authors: {
                type: 'array',
                description: 'Paper authors',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    affiliation: { type: 'string' },
                    email: { type: 'string' },
                  },
                  required: ['name'],
                },
              },
              sections: {
                type: 'array',
                description: 'Paper sections',
                items: {
                  type: 'object',
                  properties: {
                    title: { type: 'string' },
                    content: { type: 'string', description: 'Markdown content' },
                    subsections: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          title: { type: 'string' },
                          content: { type: 'string' },
                        },
                        required: ['title', 'content'],
                      },
                    },
                  },
                  required: ['title', 'content'],
                },
              },
              citations: {
                type: 'array',
                description: 'Bibliography citations',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    authors: { type: 'string' },
                    title: { type: 'string' },
                    year: { type: 'number' },
                    journal: { type: 'string' },
                    url: { type: 'string' },
                  },
                  required: ['id', 'authors', 'title', 'year'],
                },
              },
              charts: {
                type: 'array',
                description: 'Charts and visualizations',
                items: {
                  type: 'object',
                  properties: {
                    type: {
                      type: 'string',
                      enum: ['line', 'bar', 'pie', 'scatter', 'radar'],
                    },
                    data: { type: 'object' },
                    title: { type: 'string' },
                    description: { type: 'string' },
                  },
                  required: ['type', 'data'],
                },
              },
              theme: {
                type: 'string',
                enum: ['light', 'dark', 'sepia'],
              },
              publishToGithub: {
                type: 'boolean',
                description: 'Publish to GitHub repository',
                default: true,
              },
              githubPath: {
                type: 'string',
                description: 'Path in GitHub repo',
              },
            },
            required: ['title', 'abstract', 'sections'],
          },
        },
        {
          name: 'generate_everyday_pdf',
          description: `Generate everyday documents like invoices, letters, certificates with beautiful templates. Automatically publishes to GitHub (${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}). Supports QR codes, signatures, and custom branding.`,
          inputSchema: {
            type: 'object',
            properties: {
              title: {
                type: 'string',
                description: 'Document title',
              },
              documentType: {
                type: 'string',
                enum: ['invoice', 'receipt', 'letter', 'resume', 'certificate', 'report'],
                description: 'Type of document',
              },
              data: {
                type: 'object',
                description: 'Document data (varies by type)',
              },
              logo: {
                type: 'object',
                properties: {
                  url: { type: 'string' },
                  width: { type: 'number' },
                  height: { type: 'number' },
                },
              },
              signature: {
                type: 'object',
                properties: {
                  image: { type: 'string' },
                  text: { type: 'string' },
                  position: {
                    type: 'string',
                    enum: ['left', 'center', 'right'],
                  },
                },
              },
              qrCode: {
                type: 'object',
                properties: {
                  data: { type: 'string' },
                  size: { type: 'number' },
                  position: {
                    type: 'string',
                    enum: ['top-right', 'bottom-right', 'bottom-left'],
                  },
                },
              },
              theme: {
                type: 'string',
                enum: ['light', 'dark', 'sepia'],
              },
              publishToGithub: {
                type: 'boolean',
                description: 'Publish to GitHub repository',
                default: true,
              },
              githubPath: {
                type: 'string',
                description: 'Path in GitHub repo',
              },
            },
            required: ['title', 'documentType', 'data'],
          },
        },
        {
          name: 'generate_markdown_pdf',
          description: `Convert markdown content to a beautiful PDF with syntax highlighting, custom styling. Automatically publishes to GitHub (${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}). Perfect for documentation, reports, articles.`,
          inputSchema: {
            type: 'object',
            properties: {
              title: {
                type: 'string',
                description: 'Document title',
              },
              markdown: {
                type: 'string',
                description: 'Markdown content to convert',
              },
              includeHighlighting: {
                type: 'boolean',
                description: 'Enable syntax highlighting for code blocks',
                default: true,
              },
              customCSS: {
                type: 'string',
                description: 'Custom CSS to apply',
              },
              theme: {
                type: 'string',
                enum: ['light', 'dark', 'sepia'],
              },
              format: {
                type: 'string',
                enum: ['A4', 'Letter', 'Legal'],
              },
              publishToGithub: {
                type: 'boolean',
                description: 'Publish to GitHub repository',
                default: true,
              },
              githubPath: {
                type: 'string',
                description: 'Path in GitHub repo',
              },
            },
            required: ['title', 'markdown'],
          },
        },
        {
          name: 'generate_and_download',
          description: 'Generate a PDF and return it as base64 without publishing to GitHub. Use this when you want to preview or download the PDF directly.',
          inputSchema: {
            type: 'object',
            properties: {
              pdfType: {
                type: 'string',
                enum: ['technical', 'research', 'everyday', 'markdown'],
                description: 'Type of PDF to generate',
              },
              options: {
                type: 'object',
                description: 'Options specific to the PDF type',
              },
            },
            required: ['pdfType', 'options'],
          },
        },
      ],
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case 'generate_technical_pdf': {
          const options: TechnicalPDFOptions = {
            template: 'technical',
            title: args.title,
            sections: args.sections,
            codeExamples: args.codeExamples,
            theme: args.theme || PDF_CONFIG.defaultTheme,
            includeTableOfContents: args.includeTableOfContents,
            includePageNumbers: true,
            publishToGithub: args.publishToGithub !== false,
            githubPath: args.githubPath,
            metadata: {
              author: args.author,
              subject: args.subject || 'Technical Documentation',
              keywords: args.keywords || ['technical', 'documentation'],
              creator: 'PDF Generator MCP',
            },
          };

          const result = await generateTechnicalPDF(options);

          if (!result.success) {
            throw new Error(result.error);
          }

          // Publish to GitHub if requested
          if (options.publishToGithub && result.pdfBase64) {
            const filename = args.githubPath ||
              `${PDF_CONFIG.basePath}/technical/${options.title.toLowerCase().replace(/\s+/g, '-')}_${Date.now()}.pdf`;

            const pdfBuffer = Buffer.from(result.pdfBase64, 'base64');
            const githubResult = await publishToGithub({
              owner: GITHUB_CONFIG.owner,
              repo: GITHUB_CONFIG.repo,
              branch: GITHUB_CONFIG.branch,
              content: [{
                path: filename,
                content: pdfBuffer,
              }],
              commitMessage: `Add technical PDF: ${options.title}`,
              token: GITHUB_CONFIG.token,
            });

            return {
              content: [
                {
                  type: 'text',
                  text: `✅ Technical PDF generated successfully!\n\n📄 Title: ${options.title}\n📏 Size: ${(result.metadata?.fileSize || 0) / 1024}KB\n🔗 GitHub URL: ${githubResult.urls[0]}\n\nThe PDF has been published to your GitHub repository.`,
                },
              ],
            };
          }

          return {
            content: [
              {
                type: 'text',
                text: `✅ Technical PDF generated successfully!\n\n📄 Title: ${options.title}\n📏 Size: ${(result.metadata?.fileSize || 0) / 1024}KB\n\nThe PDF is ready (base64 encoded).`,
              },
            ],
          };
        }

        case 'generate_research_pdf': {
          const options: ResearchPDFOptions = {
            template: 'research',
            title: args.title,
            abstract: args.abstract,
            sections: args.sections,
            authors: args.authors,
            citations: args.citations,
            charts: args.charts,
            theme: args.theme || PDF_CONFIG.defaultTheme,
            includeAbstract: true,
            citationStyle: args.citationStyle || 'APA',
            publishToGithub: args.publishToGithub !== false,
            githubPath: args.githubPath,
            metadata: {
              author: args.authors?.map((a: any) => a.name).join(', '),
              subject: args.subject || 'Research Paper',
              keywords: args.keywords || ['research', 'paper'],
              creator: 'PDF Generator MCP',
            },
          };

          const result = await generateResearchPDF(options);

          if (!result.success) {
            throw new Error(result.error);
          }

          // Publish to GitHub if requested
          if (options.publishToGithub && result.pdfBase64) {
            const filename = args.githubPath ||
              `${PDF_CONFIG.basePath}/research/${options.title.toLowerCase().replace(/\s+/g, '-')}_${Date.now()}.pdf`;

            const pdfBuffer = Buffer.from(result.pdfBase64, 'base64');
            const githubResult = await publishToGithub({
              owner: GITHUB_CONFIG.owner,
              repo: GITHUB_CONFIG.repo,
              branch: GITHUB_CONFIG.branch,
              content: [{
                path: filename,
                content: pdfBuffer,
              }],
              commitMessage: `Add research PDF: ${options.title}`,
              token: GITHUB_CONFIG.token,
            });

            return {
              content: [
                {
                  type: 'text',
                  text: `✅ Research PDF generated successfully!\n\n📄 Title: ${options.title}\n👥 Authors: ${args.authors?.map((a: any) => a.name).join(', ') || 'N/A'}\n📏 Size: ${(result.metadata?.fileSize || 0) / 1024}KB\n🔗 GitHub URL: ${githubResult.urls[0]}\n\nThe PDF has been published to your GitHub repository.`,
                },
              ],
            };
          }

          return {
            content: [
              {
                type: 'text',
                text: `✅ Research PDF generated successfully!\n\n📄 Title: ${options.title}\n👥 Authors: ${args.authors?.map((a: any) => a.name).join(', ') || 'N/A'}\n📏 Size: ${(result.metadata?.fileSize || 0) / 1024}KB\n\nThe PDF is ready (base64 encoded).`,
              },
            ],
          };
        }

        case 'generate_everyday_pdf': {
          const options: EverydayPDFOptions = {
            template: 'everyday',
            title: args.title,
            documentType: args.documentType,
            data: args.data,
            logo: args.logo,
            signature: args.signature,
            qrCode: args.qrCode,
            theme: args.theme || PDF_CONFIG.defaultTheme,
            publishToGithub: args.publishToGithub !== false,
            githubPath: args.githubPath,
            metadata: {
              author: args.data?.author || args.data?.from?.name,
              subject: `${args.documentType} Document`,
              keywords: [args.documentType, 'document'],
              creator: 'PDF Generator MCP',
            },
          };

          const result = await generateEverydayPDF(options);

          if (!result.success) {
            throw new Error(result.error);
          }

          // Publish to GitHub if requested
          if (options.publishToGithub && result.pdfBase64) {
            const filename = args.githubPath ||
              `${PDF_CONFIG.basePath}/documents/${args.documentType}/${options.title.toLowerCase().replace(/\s+/g, '-')}_${Date.now()}.pdf`;

            const pdfBuffer = Buffer.from(result.pdfBase64, 'base64');
            const githubResult = await publishToGithub({
              owner: GITHUB_CONFIG.owner,
              repo: GITHUB_CONFIG.repo,
              branch: GITHUB_CONFIG.branch,
              content: [{
                path: filename,
                content: pdfBuffer,
              }],
              commitMessage: `Add ${args.documentType}: ${options.title}`,
              token: GITHUB_CONFIG.token,
            });

            return {
              content: [
                {
                  type: 'text',
                  text: `✅ ${args.documentType.charAt(0).toUpperCase() + args.documentType.slice(1)} PDF generated successfully!\n\n📄 Title: ${options.title}\n📑 Type: ${args.documentType}\n📏 Size: ${(result.metadata?.fileSize || 0) / 1024}KB\n🔗 GitHub URL: ${githubResult.urls[0]}\n\nThe PDF has been published to your GitHub repository.`,
                },
              ],
            };
          }

          return {
            content: [
              {
                type: 'text',
                text: `✅ ${args.documentType.charAt(0).toUpperCase() + args.documentType.slice(1)} PDF generated successfully!\n\n📄 Title: ${options.title}\n📑 Type: ${args.documentType}\n📏 Size: ${(result.metadata?.fileSize || 0) / 1024}KB\n\nThe PDF is ready (base64 encoded).`,
              },
            ],
          };
        }

        case 'generate_markdown_pdf': {
          const options: MarkdownToPDFOptions = {
            title: args.title,
            markdown: args.markdown,
            includeHighlighting: args.includeHighlighting !== false,
            customCSS: args.customCSS,
            theme: args.theme || PDF_CONFIG.defaultTheme,
            format: args.format || PDF_CONFIG.defaultFormat,
            publishToGithub: args.publishToGithub !== false,
            githubPath: args.githubPath,
            metadata: {
              author: args.author,
              subject: args.subject || 'Markdown Document',
              keywords: args.keywords || ['markdown', 'document'],
              creator: 'PDF Generator MCP',
            },
          };

          const result = await generateMarkdownPDF(options);

          if (!result.success) {
            throw new Error(result.error);
          }

          // Publish to GitHub if requested
          if (options.publishToGithub && result.pdfBase64) {
            const filename = args.githubPath ||
              `${PDF_CONFIG.basePath}/markdown/${options.title.toLowerCase().replace(/\s+/g, '-')}_${Date.now()}.pdf`;

            const pdfBuffer = Buffer.from(result.pdfBase64, 'base64');
            const githubResult = await publishToGithub({
              owner: GITHUB_CONFIG.owner,
              repo: GITHUB_CONFIG.repo,
              branch: GITHUB_CONFIG.branch,
              content: [{
                path: filename,
                content: pdfBuffer,
              }],
              commitMessage: `Add markdown PDF: ${options.title}`,
              token: GITHUB_CONFIG.token,
            });

            return {
              content: [
                {
                  type: 'text',
                  text: `✅ Markdown PDF generated successfully!\n\n📄 Title: ${options.title}\n📏 Size: ${(result.metadata?.fileSize || 0) / 1024}KB\n🔗 GitHub URL: ${githubResult.urls[0]}\n\nThe PDF has been published to your GitHub repository.`,
                },
              ],
            };
          }

          return {
            content: [
              {
                type: 'text',
                text: `✅ Markdown PDF generated successfully!\n\n📄 Title: ${options.title}\n📏 Size: ${(result.metadata?.fileSize || 0) / 1024}KB\n\nThe PDF is ready (base64 encoded).`,
              },
            ],
          };
        }

        case 'generate_and_download': {
          let result: PDFGenerationResult;
          const pdfType = args.pdfType;
          const options = args.options;

          switch (pdfType) {
            case 'technical':
              result = await generateTechnicalPDF({ ...options, template: 'technical' });
              break;
            case 'research':
              result = await generateResearchPDF({ ...options, template: 'research' });
              break;
            case 'everyday':
              result = await generateEverydayPDF({ ...options, template: 'everyday' });
              break;
            case 'markdown':
              result = await generateMarkdownPDF(options);
              break;
            default:
              throw new Error(`Unknown PDF type: ${pdfType}`);
          }

          if (!result.success) {
            throw new Error(result.error);
          }

          return {
            content: [
              {
                type: 'text',
                text: `✅ PDF generated successfully!\n\n📄 Title: ${options.title}\n📏 Size: ${(result.metadata?.fileSize || 0) / 1024}KB\n💾 Format: Base64 encoded\n\nThe PDF is ready for download. You can decode the base64 string to get the PDF file.`,
              },
              {
                type: 'text',
                text: `PDF_BASE64:${result.pdfBase64}`,
              },
            ],
          };
        }

        default:
          throw new McpError(
            ErrorCode.MethodNotFound,
            `Unknown tool: ${name}`
          );
      }
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  });
}

// Cleanup on exit
process.on('exit', async () => {
  await cleanup();
});
