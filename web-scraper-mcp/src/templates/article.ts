import { Template, DetectionSignals } from './types.js';
import { calculateMatchScore } from './utils.js';
import { parseNumber } from './transforms.js';

const signals: DetectionSignals = {
  urlPatterns: ['/article/', '/blog/', '/post/', '/news/', '/story/', '/entry/'],
  selectors: [
    'article',
    '[itemtype*="Article"]',
    '[itemtype*="BlogPosting"]',
    '[itemtype*="NewsArticle"]',
    '.post-content',
    '.article-content',
    'main article',
  ],
  requiredElements: [
    '.author',
    '[itemprop="author"]',
    '.byline',
    '.post-author',
    '.article-author',
    'time',
    '.publish-date',
  ],
  keywords: [
    'published',
    'written by',
    'author',
    'min read',
    'share',
    'comments',
    'posted on',
    'updated',
  ],
};

export const articleTemplate: Template = {
  name: 'article',
  description: 'Extract article and blog post content',

  detect: (url, dom) => calculateMatchScore(dom, signals),

  extract: {
    title: [
      'h1[itemprop="headline"]',
      'h1.article-title',
      '.post-title',
      'h1.entry-title',
      'article h1',
      'main h1',
    ],

    author: [
      '[itemprop="author"]',
      '.author-name',
      '.byline a',
      '.post-author',
      '.article-author',
      'span[rel="author"]',
    ],

    publishDate: [
      '[itemprop="datePublished"]',
      'time[datetime]',
      '.publish-date',
      '.post-date',
      '.article-date',
      '.entry-date',
    ],

    modifiedDate: ['[itemprop="dateModified"]', '.modified-date', '.updated-date', '.last-updated'],

    content: [
      '[itemprop="articleBody"]',
      '.article-content',
      '.post-content',
      '.entry-content',
      'article .content',
      'main .content',
    ],

    summary: [
      '[itemprop="description"]',
      '.article-summary',
      '.excerpt',
      '.post-excerpt',
      '.article-description',
      'meta[name="description"]',
    ],

    tags: {
      selectors: [
        '.tag',
        '.category',
        '[rel="tag"]',
        '.post-tags a',
        '.article-tags a',
        '.topics a',
      ],
      multiple: true,
    },

    readTime: [
      '.reading-time',
      '.min-read',
      '.read-time',
      '.time-to-read',
      '[itemprop="timeRequired"]',
    ],

    image: {
      selectors: [
        '[itemprop="image"]',
        '.featured-image img',
        '.post-thumbnail img',
        'article img:first-of-type',
        'meta[property="og:image"]',
      ],
      attribute: 'src',
    },

    commentCount: {
      selectors: ['.comment-count', '.comments-count', '.discussion-count'],
      transform: parseNumber,
    },
  },
};
