import { Template, DetectionSignals } from './types.js';
import { calculateMatchScore } from './utils.js';

const signals: DetectionSignals = {
  urlPatterns: ['/docs/', '/documentation/', '/api/', '/reference/', '/guide/', '/manual/'],
  selectors: [
    '[itemtype*="TechArticle"]',
    '[itemtype*="APIReference"]',
    '.documentation',
    '.docs-content',
    '.api-documentation',
    '.reference-content',
  ],
  requiredElements: ['pre', 'code', '.code-block', '.syntax', '.parameter', '.method-signature'],
  keywords: [
    'parameters',
    'returns',
    'example',
    'syntax',
    'usage',
    'installation',
    'configuration',
    'api',
  ],
};

export const documentationTemplate: Template = {
  name: 'documentation',
  description: 'Extract technical documentation and API reference information',

  detect: (url, dom) => calculateMatchScore(dom, signals),

  extract: {
    title: ['h1[itemprop="headline"]', '.doc-title', '.page-title', 'h1.title', '[data-doc-title]'],

    version: ['.version', '.doc-version', '.api-version', '[data-version]', '.release-version'],

    lastUpdated: [
      '.last-updated',
      '.modified-date',
      '.doc-updated',
      'time[datetime]',
      '[data-last-modified]',
    ],

    content: [
      '[itemprop="articleBody"]',
      '.doc-content',
      '.documentation-content',
      '.reference-content',
      'main .content',
    ],

    codeBlocks: {
      selectors: ['pre code', '.code-block', '.highlight pre', '.syntax-highlight'],
      multiple: true,
    },

    parameters: {
      selectors: ['.parameter', '.param', '.api-parameter', '.method-param', 'dl.parameters dt'],
      multiple: true,
    },

    returnValue: ['.return-value', '.returns', '.method-returns', '.api-response', '.output'],

    examples: {
      selectors: ['.example', '.code-example', '.usage-example', '.sample-code'],
      multiple: true,
    },

    installation: [
      '.installation',
      '.setup',
      '.getting-started',
      '.install-instructions',
      '#installation',
    ],

    prerequisites: {
      selectors: ['.prerequisites', '.requirements', '.dependencies', '.system-requirements'],
      multiple: true,
    },

    relatedTopics: {
      selectors: ['.related-topics a', '.see-also a', '.related-links a', '.further-reading a'],
      multiple: true,
    },

    tableOfContents: {
      selectors: ['.toc', '.table-of-contents', '.nav-sidebar', '.doc-nav'],
      multiple: true,
    },

    breadcrumbs: {
      selectors: ['.breadcrumb', '.breadcrumbs', 'nav[aria-label="breadcrumb"]'],
      multiple: true,
    },

    tags: {
      selectors: ['.doc-tag', '.topic-tag', '.category-tag', '[rel="tag"]'],
      multiple: true,
    },

    language: ['.programming-language', '.code-language', '.syntax-language', '[data-language]'],

    framework: ['.framework', '.platform', '.technology', '[data-framework]'],

    difficulty: ['.difficulty', '.level', '.complexity', '[data-difficulty]'],

    timeToRead: ['.reading-time', '.time-to-complete', '.estimated-time', '[data-reading-time]'],

    deprecated: {
      selectors: ['.deprecated', '.obsolete', '.legacy'],
      contains: ['deprecated', 'obsolete', 'legacy', 'no longer supported'],
    },

    warnings: {
      selectors: ['.warning', '.alert', '.caution', '.important'],
      multiple: true,
    },

    notes: {
      selectors: ['.note', '.info', '.tip', '.hint'],
      multiple: true,
    },
  },
};
