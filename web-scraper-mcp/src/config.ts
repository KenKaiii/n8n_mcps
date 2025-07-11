/**
 * Configuration for the web scraper MCP
 */

export interface GitHubConfig {
  owner: string;
  repo: string;
  token: string;
  branch?: string;
}

// Default GitHub configuration
export const GITHUB_CONFIG: GitHubConfig = {
  owner: 'KenKaiii',
  repo: 'mcp_docs',
  token:
    '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', // Temporary for testing
  branch: 'main',
};

// Global crawler configuration
export const CRAWLER_CONFIG = {
  defaultMaxPages: 5,
  defaultMaxDepth: 2,
  defaultConcurrency: 2,
  delays: {
    min: 1000,
    max: 5000,
  },
};
