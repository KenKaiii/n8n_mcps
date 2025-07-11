/**
 * Configuration for PDF Generator MCP
 */

export const GITHUB_CONFIG = {
  owner: process.env.GITHUB_OWNER || 'KenKaiii',
  repo: process.env.GITHUB_REPO || 'mcp_docs',
  branch: process.env.GITHUB_BRANCH || 'main',
  token: process.env.GITHUB_TOKEN || '',
};

export const PDF_CONFIG = {
  defaultTheme: 'light' as const,
  defaultFormat: 'A4' as const,
  defaultOrientation: 'portrait' as const,
  basePath: process.env.PDF_BASE_PATH || 'pdfs',
};
