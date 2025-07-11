import { Template, DetectionSignals } from './types.js';
import { calculateMatchScore } from './utils.js';

const signals: DetectionSignals = {
  urlPatterns: ['/watch', '/video/', '/v/', '/videos/', '/player/', '/embed/', '/clip/'],
  selectors: [
    '[itemtype*="VideoObject"]',
    '[itemtype*="schema.org/VideoObject"]',
    '.video-player',
    '.video-container',
    '.player-wrapper',
    'video',
  ],
  requiredElements: [
    '.video-title',
    '[itemprop="name"]',
    '.watch-title',
    '.view-count',
    '.video-views',
    '.video-duration',
  ],
  keywords: ['views', 'likes', 'subscribe', 'watch', 'duration', 'published', 'comments', 'share'],
};

export const videoMediaTemplate: Template = {
  name: 'video_media',
  description: 'Extract video and media content information',

  detect: (url, dom) => calculateMatchScore(dom, signals),

  extract: {
    title: [
      'h1[itemprop="name"]',
      '.video-title',
      '.watch-title',
      'h1.title',
      '[data-video-title]',
    ],

    channel: [
      '[itemprop="author"]',
      '.channel-name',
      '.uploader-name',
      '.creator-name',
      '.publisher-name',
    ],

    views: {
      selectors: ['.view-count', '.video-views', '.watch-view-count', '[data-view-count]'],
      transform: (text: string) => {
        // Handle K, M, B suffixes
        let multiplier = 1;
        if (text.toLowerCase().includes('k')) multiplier = 1000;
        if (text.toLowerCase().includes('m')) multiplier = 1000000;
        if (text.toLowerCase().includes('b')) multiplier = 1000000000;
        const num = parseFloat(text.replace(/[^0-9.]/g, ''));
        return isNaN(num) ? null : Math.floor(num * multiplier);
      },
    },

    likes: {
      selectors: ['.like-count', '.likes-count', '[data-like-count]', '.video-likes'],
      transform: (text: string) => {
        let multiplier = 1;
        if (text.toLowerCase().includes('k')) multiplier = 1000;
        if (text.toLowerCase().includes('m')) multiplier = 1000000;
        const num = parseFloat(text.replace(/[^0-9.]/g, ''));
        return isNaN(num) ? null : Math.floor(num * multiplier);
      },
    },

    dislikes: {
      selectors: ['.dislike-count', '.dislikes-count', '[data-dislike-count]'],
      transform: (text: string) => {
        let multiplier = 1;
        if (text.toLowerCase().includes('k')) multiplier = 1000;
        if (text.toLowerCase().includes('m')) multiplier = 1000000;
        const num = parseFloat(text.replace(/[^0-9.]/g, ''));
        return isNaN(num) ? null : Math.floor(num * multiplier);
      },
    },

    duration: [
      '[itemprop="duration"]',
      '.video-duration',
      '.duration',
      '.runtime',
      '[data-duration]',
    ],

    uploadDate: [
      '[itemprop="uploadDate"]',
      '.upload-date',
      '.published-date',
      '.video-date',
      'time[datetime]',
    ],

    description: [
      '[itemprop="description"]',
      '.video-description',
      '.description-box',
      '.video-info-description',
      '#description',
    ],

    thumbnailUrl: {
      selectors: [
        '[itemprop="thumbnailUrl"]',
        '.video-thumbnail img',
        '.thumbnail img',
        'meta[property="og:image"]',
      ],
      attribute: 'src',
    },

    embedUrl: {
      selectors: ['[itemprop="embedUrl"]', '.embed-link', '[data-embed-url]'],
      attribute: 'content',
    },

    commentCount: {
      selectors: ['.comment-count', '.comments-count', '[data-comment-count]'],
      transform: (text: string) => {
        let multiplier = 1;
        if (text.toLowerCase().includes('k')) multiplier = 1000;
        if (text.toLowerCase().includes('m')) multiplier = 1000000;
        const num = parseFloat(text.replace(/[^0-9.]/g, ''));
        return isNaN(num) ? null : Math.floor(num * multiplier);
      },
    },

    category: ['.video-category', '.category', '[itemprop="genre"]', '.video-genre'],

    tags: {
      selectors: ['.video-tag', '.video-tags a', '.tag-list a', '[rel="tag"]', '.hashtag'],
      multiple: true,
    },

    quality: ['.video-quality', '.resolution', '.quality-label', '[data-quality]'],

    language: ['.video-language', '.audio-language', '[itemprop="inLanguage"]', '.language'],

    subtitles: {
      selectors: ['.subtitles-available', '.captions', '.cc-available'],
      contains: ['subtitles', 'captions', 'cc'],
    },

    isLive: {
      selectors: ['.live-indicator', '.is-live', '.live-badge', '[data-live]'],
      contains: ['live', 'streaming'],
    },

    transcript: ['.transcript', '.video-transcript', '.captions-text', '.subtitle-text'],
  },
};
