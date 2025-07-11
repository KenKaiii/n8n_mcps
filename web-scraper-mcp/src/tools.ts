/**
 * Simplified tool implementations for the web scraper MCP
 * Only includes efficient tools that don't send content through LLM
 */

import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import path from 'path';
import { extractContent } from './extractor-v2.js';
import type { CrawlConfig } from './types.js';
import got from 'got';
import * as cheerio from 'cheerio';
import { publishToGithub } from './github.js';
import puppeteer from 'puppeteer';
import { GITHUB_CONFIG as CONFIG_GITHUB } from './config.js';
import { Octokit } from '@octokit/rest';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  McpError,
  ErrorCode,
} from '@modelcontextprotocol/sdk/types.js';

// Constants
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
];

// GitHub configuration - prioritize env var over config.ts
const GITHUB_CONFIG = {
  owner: CONFIG_GITHUB.owner || 'Ken-Kabutu',
  repo: CONFIG_GITHUB.repo || 'claude-tools-knowledge-repo',
  branch: CONFIG_GITHUB.branch || 'main',
  token: process.env.GITHUB_TOKEN || CONFIG_GITHUB.token || '',
};

// Circuit breaker for failed URLs
const failedUrls = new Map<string, { count: number; lastFailed: number }>();

// Tool setup
export function setupTools(server: Server) {
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: 'extract_and_publish',
          description: `🟢 ALWAYS USE THIS TOOL for web scraping! Extracts content and publishes directly to GitHub (${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}) without sending content through the LLM. Uses only ~500 tokens per page. This is the DEFAULT tool for all scraping operations.`,
          inputSchema: {
            type: 'object',
            properties: {
              urls: {
                type: 'array',
                items: { type: 'string' },
                description: 'URLs to extract and publish',
              },
              template: {
                type: 'string',
                description: 'Optional template name for extraction',
                enum: [
                  'ecommerce_product',
                  'article',
                  'recipe',
                  'job_listing',
                  'event',
                  'real_estate',
                  'social_profile',
                  'video_media',
                  'forum_thread',
                  'documentation',
                ],
              },
              basePathInRepo: {
                type: 'string',
                description: 'Base directory path in repository (e.g., "data/articles")',
              },
              commitMessage: {
                type: 'string',
                description: 'Git commit message',
              },
            },
            required: ['urls'],
          },
        },
        {
          name: 'crawl_and_publish',
          description: `🟢 USE THIS for crawling multiple pages! Crawls website and publishes directly to GitHub (${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}) without sending content through the LLM. For single pages, use extract_and_publish. Uses only ~1,000 tokens for 5 pages.`,
          inputSchema: {
            type: 'object',
            properties: {
              url: {
                type: 'string',
                description: 'Starting URL to crawl',
              },
              config: {
                type: 'object',
                description: 'Crawl configuration (optional)',
                properties: {
                  maxPages: {
                    type: 'number',
                    description: 'Maximum pages to crawl (default: 5)',
                  },
                  maxDepth: {
                    type: 'number',
                    description: 'Maximum depth (default: 2)',
                  },
                },
              },
              basePathInRepo: {
                type: 'string',
                description: 'Base directory path in repository',
              },
            },
            required: ['url'],
          },
        },
        {
          name: 'github_editor',
          description:
            'Edit, create, move, or delete files in the GitHub repository. For bulk operations, use delete_batch action.',
          inputSchema: {
            type: 'object',
            properties: {
              action: {
                type: 'string',
                enum: ['create', 'update', 'delete', 'delete_batch', 'move', 'list'],
                description:
                  'The action to perform. Use delete_batch for deleting multiple files safely.',
              },
              path: {
                type: 'string',
                description: 'File path in the repository (for single file operations)',
              },
              paths: {
                type: 'array',
                items: { type: 'string' },
                description: 'Array of file paths (for delete_batch action)',
              },
              content: {
                type: 'string',
                description: 'File content (for create/update actions)',
              },
              newPath: {
                type: 'string',
                description: 'New file path (for move action)',
              },
              commitMessage: {
                type: 'string',
                description: 'Commit message for the change',
              },
              branch: {
                type: 'string',
                description: 'Branch to operate on (default: main)',
              },
            },
            required: ['action'],
          },
        },
      ],
    };
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async request => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case 'extract_and_publish':
          return await handleExtractAndPublish(
            args as {
              urls: string[];
              template?: string;
              basePathInRepo?: string;
              commitMessage?: string;
            }
          );
        case 'crawl_and_publish':
          return await handleCrawlAndPublish(
            args as {
              url: string;
              config?: Partial<CrawlConfig>;
              basePathInRepo?: string;
            }
          );
        case 'github_editor':
          return await handleGithubEditor(
            args as {
              action: 'create' | 'update' | 'delete' | 'delete_batch' | 'move' | 'list';
              path?: string;
              paths?: string[];
              content?: string;
              newPath?: string;
              commitMessage?: string;
              branch?: string;
            }
          );
        default:
          throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  });
}

async function extractContentInternal(url: string, template?: string) {
  let html: string | null = null;

  // Try HTTP first
  try {
    const userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
    const response = await got(url, {
      headers: {
        'User-Agent': userAgent,
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        Connection: 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
      timeout: { request: 10000 },
      retry: { limit: 0 },
      followRedirect: true,
    });

    if (response.statusCode === 200) {
      html = response.body;
      failedUrls.delete(url);
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      const errorMessage = error.message;
      const statusCode = (error as { response?: { statusCode?: number } }).response?.statusCode;

      // Try Playwright for blocked sites
      if (
        statusCode === 403 ||
        statusCode === 429 ||
        errorMessage.includes('ECONNREFUSED') ||
        errorMessage.includes('timeout')
      ) {
        console.error(`HTTP error from ${new URL(url).hostname}, switching to Playwright...`);

        const browser = await puppeteer.launch({
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled',
          ],
        });

        try {
          const page = await browser.newPage();
          const userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
          await page.setUserAgent(userAgent);

          await page.evaluateOnNewDocument(() => {
            /* eslint-disable no-undef */
            // @ts-ignore
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
            // @ts-ignore
            window.navigator.chrome = { runtime: {} };
            /* eslint-enable no-undef */
          });

          await page.goto(url, {
            waitUntil: 'domcontentloaded',
            timeout: 15000,
          });

          await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
          html = await page.content();
          failedUrls.delete(url);
        } finally {
          await browser.close();
        }
      } else {
        throw error;
      }
    }
  }

  if (!html) {
    throw new Error('Failed to fetch content');
  }

  return extractContent(html, url, template);
}

async function handleExtractAndPublish(args: {
  urls: string[];
  template?: string;
  basePathInRepo?: string;
  commitMessage?: string;
}) {
  if (!args.urls || args.urls.length === 0) {
    throw new Error('URLs are required');
  }

  // Debug token
  console.error('GitHub Config:', {
    owner: GITHUB_CONFIG.owner,
    repo: GITHUB_CONFIG.repo,
    hasToken: !!GITHUB_CONFIG.token,
    tokenPrefix: GITHUB_CONFIG.token ? GITHUB_CONFIG.token.substring(0, 10) + '...' : 'NO TOKEN',
  });

  // Extract content
  const extractResults = await Promise.all(
    args.urls.map(async url => {
      try {
        const extracted = await extractContentInternal(url, args.template);
        return { url, extracted };
      } catch (error) {
        return {
          url,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    })
  );

  // Prepare content for GitHub
  const content = extractResults
    .filter(
      (item): item is { url: string; extracted: ReturnType<typeof extractContent> } =>
        !('error' in item)
    )
    .map(item => {
      const urlObj = new URL(item.url);
      const hostname = urlObj.hostname;
      const urlPath = urlObj.pathname.replace(/^\//, '').replace(/\/$/, '') || 'index';
      const fileName = urlPath.replace(/[^a-zA-Z0-9-_]/g, '_') + '.md';

      // Always organize by domain name
      const fullPath = args.basePathInRepo
        ? path.join(args.basePathInRepo, hostname, fileName)
        : path.join(hostname, fileName);

      return {
        path: fullPath,
        content: item.extracted.markdown || item.extracted.content,
      };
    });

  if (content.length === 0) {
    throw new Error('No content successfully extracted to publish');
  }

  // Publish to GitHub
  if (!GITHUB_CONFIG.token) {
    throw new Error('GitHub token not configured. Set GITHUB_TOKEN in .env file.');
  }

  const result = await publishToGithub({
    owner: GITHUB_CONFIG.owner,
    repo: GITHUB_CONFIG.repo,
    branch: GITHUB_CONFIG.branch,
    token: GITHUB_CONFIG.token,
    content,
    commitMessage: args.commitMessage || `Extract and publish ${content.length} pages`,
  });

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            success: true,
            extracted: args.urls.length,
            published: content.length,
            failed: extractResults.filter(item => 'error' in item).length,
            repository: `${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}`,
            commitUrl: `https://github.com/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/commit/${result.commit}`,
          },
          null,
          2
        ),
      },
    ],
  };
}

async function handleCrawlAndPublish(args: {
  url: string;
  config?: Partial<CrawlConfig>;
  basePathInRepo?: string;
}) {
  if (!args.url) {
    throw new Error('URL is required');
  }

  // Default configuration
  const defaultConfig: CrawlConfig = {
    maxPages: 5,
    maxDepth: 2,
    includePatterns: [],
    excludePatterns: [],
    delays: { min: 1000, max: 5000 },
    stealth: true,
    respectRobotsTxt: true,
    concurrency: 2,
  };

  const config = { ...defaultConfig, ...args.config };
  const crawledPages: Array<{ url: string; content: ReturnType<typeof extractContent> }> = [];
  const visited = new Set<string>();
  const queue: Array<{ url: string; depth: number }> = [{ url: args.url, depth: 0 }];

  // Simple synchronous crawl for now
  while (queue.length > 0 && crawledPages.length < config.maxPages) {
    const item = queue.shift();
    if (!item) break;

    const { url, depth } = item;

    if (visited.has(url) || depth > config.maxDepth) {
      continue;
    }

    visited.add(url);

    try {
      // Delay between requests
      const delay = config.delays.min + Math.random() * (config.delays.max - config.delays.min);
      await new Promise(resolve => setTimeout(resolve, delay));

      // Extract content
      const content = await extractContentInternal(url);
      crawledPages.push({ url, content });

      // Parse links if not at max depth
      if (depth < config.maxDepth) {
        const response = await got(url);
        const $ = cheerio.load(response.body);
        $('a[href]').each((_: number, elem: cheerio.Element) => {
          const href = $(elem).attr('href');
          if (href) {
            try {
              const absoluteUrl = new URL(href, url).href;
              if (shouldCrawlUrl(absoluteUrl, args.url, config)) {
                queue.push({ url: absoluteUrl, depth: depth + 1 });
              }
            } catch {
              // Invalid URL, skip
            }
          }
        });
      }
    } catch (error) {
      console.error(`Error crawling ${url}:`, error);
    }
  }

  // Prepare content for GitHub
  const baseUrl = new URL(args.url);
  const content = crawledPages.map(page => {
    const pagePath = new URL(page.url).pathname.replace(/^\//, '').replace(/\/$/, '') || 'index';
    const fileName = pagePath.replace(/[^a-zA-Z0-9-_]/g, '_') + '.md';
    const fullPath = args.basePathInRepo
      ? path.join(args.basePathInRepo, baseUrl.hostname, fileName)
      : path.join(baseUrl.hostname, fileName);

    return {
      path: fullPath,
      content: page.content.markdown,
    };
  });

  // Publish to GitHub
  const result = await publishToGithub({
    owner: GITHUB_CONFIG.owner,
    repo: GITHUB_CONFIG.repo,
    branch: GITHUB_CONFIG.branch,
    token: GITHUB_CONFIG.token,
    content,
    commitMessage: `Crawl and publish ${crawledPages.length} pages from ${baseUrl.hostname}`,
  });

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            success: true,
            pagesCrawled: crawledPages.length,
            repository: `${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}`,
            branch: GITHUB_CONFIG.branch,
            commitUrl: `https://github.com/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/commit/${result.commit}`,
            publishedFiles: content.length,
          },
          null,
          2
        ),
      },
    ],
  };
}

async function handleGithubEditor(args: {
  action: 'create' | 'update' | 'delete' | 'delete_batch' | 'move' | 'list';
  path?: string;
  paths?: string[];
  content?: string;
  newPath?: string;
  commitMessage?: string;
  branch?: string;
}): Promise<{ content: Array<{ type: string; text: string }> }> {
  const branch = args.branch || GITHUB_CONFIG.branch;
  const octokit = new Octokit({ auth: GITHUB_CONFIG.token });

  try {
    switch (args.action) {
      case 'list': {
        // List files in the repository
        const targetPath = args.path || '';
        const { data } = await octokit.repos.getContent({
          owner: GITHUB_CONFIG.owner,
          repo: GITHUB_CONFIG.repo,
          path: targetPath,
          ref: branch,
        });

        const files = Array.isArray(data) ? data : [data];
        const fileList = files.map(file => ({
          name: file.name,
          path: file.path,
          type: file.type,
          size: file.size,
        }));

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ success: true, files: fileList }, null, 2),
            },
          ],
        };
      }

      case 'create': {
        if (!args.path || !args.content) {
          throw new Error('Path and content are required for create action');
        }

        const content = Buffer.from(args.content).toString('base64');
        const { data } = await octokit.repos.createOrUpdateFileContents({
          owner: GITHUB_CONFIG.owner,
          repo: GITHUB_CONFIG.repo,
          path: args.path,
          message: args.commitMessage || `Create ${args.path}`,
          content,
          branch,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  action: 'created',
                  path: args.path,
                  commit: data.commit.sha,
                  url: data.content?.html_url,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'update': {
        if (!args.path || !args.content) {
          throw new Error('Path and content are required for update action');
        }

        // Get the current file to get its SHA
        const { data: currentFile } = await octokit.repos.getContent({
          owner: GITHUB_CONFIG.owner,
          repo: GITHUB_CONFIG.repo,
          path: args.path,
          ref: branch,
        });

        if ('sha' in currentFile) {
          const content = Buffer.from(args.content).toString('base64');
          const { data } = await octokit.repos.createOrUpdateFileContents({
            owner: GITHUB_CONFIG.owner,
            repo: GITHUB_CONFIG.repo,
            path: args.path,
            message: args.commitMessage || `Update ${args.path}`,
            content,
            sha: currentFile.sha,
            branch,
          });

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    success: true,
                    action: 'updated',
                    path: args.path,
                    commit: data.commit.sha,
                    url: data.content?.html_url,
                  },
                  null,
                  2
                ),
              },
            ],
          };
        } else {
          throw new Error('Cannot update: file not found or is a directory');
        }
      }

      case 'delete': {
        if (!args.path) {
          throw new Error('Path is required for delete action');
        }

        // Get the current file to get its SHA
        const { data: currentFile } = await octokit.repos.getContent({
          owner: GITHUB_CONFIG.owner,
          repo: GITHUB_CONFIG.repo,
          path: args.path,
          ref: branch,
        });

        if ('sha' in currentFile) {
          const { data } = await octokit.repos.deleteFile({
            owner: GITHUB_CONFIG.owner,
            repo: GITHUB_CONFIG.repo,
            path: args.path,
            message: args.commitMessage || `Delete ${args.path}`,
            sha: currentFile.sha,
            branch,
          });

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    success: true,
                    action: 'deleted',
                    path: args.path,
                    commit: data.commit.sha,
                  },
                  null,
                  2
                ),
              },
            ],
          };
        } else {
          throw new Error('Cannot delete: file not found or is a directory');
        }
      }

      case 'delete_batch': {
        if (!args.paths || args.paths.length === 0) {
          throw new Error('Paths array is required for delete_batch action');
        }

        const results: Array<{ path: string; success: boolean; error?: string }> = [];

        // Process deletions one by one to avoid SHA conflicts
        for (const filePath of args.paths) {
          try {
            // Get the current file to get its SHA
            const { data: currentFile } = await octokit.repos.getContent({
              owner: GITHUB_CONFIG.owner,
              repo: GITHUB_CONFIG.repo,
              path: filePath,
              ref: branch,
            });

            if ('sha' in currentFile) {
              await octokit.repos.deleteFile({
                owner: GITHUB_CONFIG.owner,
                repo: GITHUB_CONFIG.repo,
                path: filePath,
                message: args.commitMessage || `Delete ${filePath}`,
                sha: currentFile.sha,
                branch,
              });

              results.push({ path: filePath, success: true });
            } else {
              results.push({
                path: filePath,
                success: false,
                error: 'Not a file or not found',
              });
            }
          } catch (error: any) {
            results.push({
              path: filePath,
              success: false,
              error: error.message || 'Unknown error',
            });
          }

          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        const successCount = results.filter(r => r.success).length;
        const failureCount = results.filter(r => !r.success).length;

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: failureCount === 0,
                  action: 'delete_batch',
                  totalFiles: args.paths.length,
                  successCount,
                  failureCount,
                  results,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'move': {
        if (!args.path || !args.newPath) {
          throw new Error('Both path and newPath are required for move action');
        }

        // Get the current file content
        const { data: currentFile } = await octokit.repos.getContent({
          owner: GITHUB_CONFIG.owner,
          repo: GITHUB_CONFIG.repo,
          path: args.path,
          ref: branch,
        });

        if ('content' in currentFile && 'sha' in currentFile) {
          // Create the new file
          await octokit.repos.createOrUpdateFileContents({
            owner: GITHUB_CONFIG.owner,
            repo: GITHUB_CONFIG.repo,
            path: args.newPath,
            message: args.commitMessage || `Move ${args.path} to ${args.newPath}`,
            content: currentFile.content,
            branch,
          });

          // Delete the old file
          await octokit.repos.deleteFile({
            owner: GITHUB_CONFIG.owner,
            repo: GITHUB_CONFIG.repo,
            path: args.path,
            message: `Delete ${args.path} (moved to ${args.newPath})`,
            sha: currentFile.sha,
            branch,
          });

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    success: true,
                    action: 'moved',
                    oldPath: args.path,
                    newPath: args.newPath,
                  },
                  null,
                  2
                ),
              },
            ],
          };
        } else {
          throw new Error('Cannot move: file not found or is a directory');
        }
      }

      default:
        throw new Error(`Unknown action: ${args.action}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            },
            null,
            2
          ),
        },
      ],
    };
  }
}

function shouldCrawlUrl(url: string, startUrl: string, config: CrawlConfig): boolean {
  // Must be same domain
  const urlObj = new URL(url);
  const startUrlObj = new URL(startUrl);
  if (urlObj.hostname !== startUrlObj.hostname) {
    return false;
  }

  // Check include patterns
  if (config.includePatterns.length > 0) {
    const included = config.includePatterns.some(pattern => url.includes(pattern));
    if (!included) return false;
  }

  // Check exclude patterns
  if (config.excludePatterns.length > 0) {
    const excluded = config.excludePatterns.some(pattern => url.includes(pattern));
    if (excluded) return false;
  }

  return true;
}
