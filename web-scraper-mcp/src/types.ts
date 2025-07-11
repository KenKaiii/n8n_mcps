/**
 * Type definitions for the web scraper MCP
 */

export interface CrawlState {
  id: string;
  status: 'running' | 'completed' | 'failed';
  startUrl: string;
  config: CrawlConfig;
  pagesCrawled: number;
  pagesQueued: Set<string>;
  errors: string[];
  results: Map<string, ExtractedContent>;
  startTime: number;
}

export interface CrawlConfig {
  maxPages: number;
  maxDepth: number;
  includePatterns: string[];
  excludePatterns: string[];
  delays: {
    min: number;
    max: number;
  };
  stealth: boolean;
  respectRobotsTxt: boolean;
  userAgent?: string;
  proxy?: string;
  concurrency: number;
  usePlaywright?: boolean; // Only use Playwright when explicitly requested
}

export interface ExtractedContent {
  url: string;
  title: string;
  content: string;
  markdown: string;
  metadata: {
    author?: string;
    publishDate?: string;
    description?: string;
    template?: string;
    confidence?: number;
    extractedData?: Record<string, unknown>;
    [key: string]: unknown;
  };
  crawledAt: string;
}
