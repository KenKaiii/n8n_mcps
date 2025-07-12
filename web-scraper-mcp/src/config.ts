/**
 * Configuration for the web scraper MCP
 */

export interface GitHubConfig {
  owner: string;
  repo: string;
  token: string;
  branch?: string;
}

// Default GitHub configuration from environment variables
export const GITHUB_CONFIG: GitHubConfig = {
  owner: process.env.GITHUB_OWNER || '',
  repo: process.env.GITHUB_REPO || '',
  token: process.env.GITHUB_TOKEN || '',
  branch: process.env.GITHUB_BRANCH || 'main',
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
