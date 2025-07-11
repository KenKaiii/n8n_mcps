/**
 * Type definitions for PDF Generator MCP
 */

export interface PDFGenerationOptions {
  title: string;
  template?: 'technical' | 'research' | 'everyday';
  theme?: 'light' | 'dark' | 'sepia';
  fontStyle?: 'modern' | 'classic' | 'professional' | 'elegant' | 'technical';
  format?: 'A4' | 'Letter' | 'Legal';
  orientation?: 'portrait' | 'landscape';
  margins?: {
    top?: string;
    bottom?: string;
    left?: string;
    right?: string;
  };
  metadata?: {
    author?: string;
    subject?: string;
    keywords?: string[];
    creator?: string;
  };
  publishToGithub?: boolean;
  githubPath?: string;
  commitMessage?: string;
}

export interface TechnicalPDFOptions extends PDFGenerationOptions {
  template: 'technical';
  sections: Array<{
    title: string;
    content: string;
    level?: number;
  }>;
  codeExamples?: Array<{
    language: string;
    code: string;
    filename?: string;
    description?: string;
  }>;
  diagrams?: Array<{
    type: 'mermaid' | 'chart';
    data: string | any;
    caption?: string;
  }>;
  includeTableOfContents?: boolean;
  includePageNumbers?: boolean;
  syntaxTheme?: 'github' | 'monokai' | 'dracula' | 'nord';
}

export interface ResearchPDFOptions extends PDFGenerationOptions {
  template: 'research';
  abstract: string;
  sections: Array<{
    title: string;
    content: string;
    subsections?: Array<{
      title: string;
      content: string;
    }>;
  }>;
  authors?: Array<{
    name: string;
    affiliation?: string;
    email?: string;
  }>;
  citations?: Array<{
    id: string;
    authors: string;
    title: string;
    year: number;
    journal?: string;
    url?: string;
  }>;
  charts?: Array<{
    type: 'line' | 'bar' | 'pie' | 'scatter' | 'radar';
    data: any;
    title?: string;
    description?: string;
  }>;
  includeAbstract?: boolean;
  citationStyle?: 'APA' | 'MLA' | 'Chicago' | 'IEEE';
}

export interface EverydayPDFOptions extends PDFGenerationOptions {
  template: 'everyday';
  documentType: 'invoice' | 'receipt' | 'letter' | 'resume' | 'certificate' | 'report';
  data: Record<string, any>;
  logo?: {
    url: string;
    width?: number;
    height?: number;
  };
  signature?: {
    image?: string;
    text?: string;
    position?: 'left' | 'center' | 'right';
  };
  qrCode?: {
    data: string;
    size?: number;
    position?: 'top-right' | 'bottom-right' | 'bottom-left';
  };
}

export interface MarkdownToPDFOptions extends PDFGenerationOptions {
  markdown: string;
  includeHighlighting?: boolean;
  includeMermaid?: boolean;
  includeMath?: boolean;
  customCSS?: string;
}

export interface PDFMergeOptions {
  pdfPaths: string[];
  outputPath?: string;
  publishToGithub?: boolean;
  githubPath?: string;
  commitMessage?: string;
}

export interface GitHubConfig {
  owner: string;
  repo: string;
  branch?: string;
  token: string;
}

export interface PDFGenerationResult {
  success: boolean;
  pdfPath?: string;
  pdfBase64?: string;
  githubUrl?: string;
  metadata?: {
    pages: number;
    fileSize: number;
    generatedAt: string;
  };
  error?: string;
}

export interface TemplateData {
  [key: string]: any;
}

export interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
    [key: string]: any;
  }>;
}
