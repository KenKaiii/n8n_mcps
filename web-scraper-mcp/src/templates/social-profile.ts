import { Template, DetectionSignals } from './types.js';
import { calculateMatchScore } from './utils.js';

const signals: DetectionSignals = {
  urlPatterns: ['/profile/', '/user/', '/@', '/u/', '/people/', '/member/', '/channel/'],
  selectors: [
    '[itemtype*="Person"]',
    '[itemtype*="schema.org/Person"]',
    '.profile-info',
    '.user-profile',
    '.profile-header',
    '.member-info',
  ],
  requiredElements: [
    '.username',
    '[itemprop="name"]',
    '.profile-name',
    '.user-name',
    '.follower-count',
    '.following-count',
    '.bio',
  ],
  keywords: ['followers', 'following', 'posts', 'tweets', 'subscribers', 'joined', 'bio', 'about'],
};

export const socialProfileTemplate: Template = {
  name: 'social_profile',
  description: 'Extract social media profile information',

  detect: (url, dom) => calculateMatchScore(dom, signals),

  extract: {
    username: [
      '.username',
      '.profile-username',
      '.user-handle',
      '[itemprop="alternateName"]',
      '.screen-name',
    ],

    displayName: [
      '[itemprop="name"]',
      '.display-name',
      '.profile-name',
      '.full-name',
      '.user-full-name',
    ],

    bio: [
      '[itemprop="description"]',
      '.bio',
      '.profile-bio',
      '.user-description',
      '.about-section',
    ],

    profileImage: {
      selectors: [
        '.profile-image img',
        '.avatar img',
        '.profile-pic img',
        '[itemprop="image"]',
        '.user-photo img',
      ],
      attribute: 'src',
    },

    coverImage: {
      selectors: ['.cover-image img', '.banner img', '.header-image img', '.profile-banner img'],
      attribute: 'src',
    },

    followers: {
      selectors: ['.followers-count', '.follower-count', '[data-followers]', '.subscribers-count'],
      transform: (text: string) => {
        // Handle K, M suffixes
        let multiplier = 1;
        if (text.toLowerCase().includes('k')) multiplier = 1000;
        if (text.toLowerCase().includes('m')) multiplier = 1000000;
        const num = parseFloat(text.replace(/[^0-9.]/g, ''));
        return isNaN(num) ? null : Math.floor(num * multiplier);
      },
    },

    following: {
      selectors: ['.following-count', '.follows-count', '[data-following]', '.subscriptions-count'],
      transform: (text: string) => {
        let multiplier = 1;
        if (text.toLowerCase().includes('k')) multiplier = 1000;
        if (text.toLowerCase().includes('m')) multiplier = 1000000;
        const num = parseFloat(text.replace(/[^0-9.]/g, ''));
        return isNaN(num) ? null : Math.floor(num * multiplier);
      },
    },

    posts: {
      selectors: ['.posts-count', '.post-count', '.tweets-count', '.video-count', '[data-posts]'],
      transform: (text: string) => {
        let multiplier = 1;
        if (text.toLowerCase().includes('k')) multiplier = 1000;
        if (text.toLowerCase().includes('m')) multiplier = 1000000;
        const num = parseFloat(text.replace(/[^0-9.]/g, ''));
        return isNaN(num) ? null : Math.floor(num * multiplier);
      },
    },

    joinDate: [
      '.join-date',
      '.joined-date',
      '.member-since',
      '.created-at',
      '[itemprop="memberOf"]',
    ],

    location: [
      '[itemprop="address"]',
      '.location',
      '.user-location',
      '.profile-location',
      '[data-location]',
    ],

    website: {
      selectors: [
        '.website',
        '.user-website',
        '.profile-link',
        '[itemprop="url"]',
        '.external-link',
      ],
      attribute: 'href',
    },

    verified: {
      selectors: ['.verified', '.verified-badge', '.verification-badge', '[data-verified]'],
      contains: ['verified', 'official'],
    },

    occupation: ['[itemprop="jobTitle"]', '.occupation', '.job-title', '.profession', '.work-info'],

    company: ['[itemprop="worksFor"]', '.company', '.workplace', '.organization', '.employer'],

    education: ['.education', '.school', '.university', '.studied-at', '[itemprop="alumniOf"]'],

    socialLinks: {
      selectors: ['.social-links a', '.external-links a', '.profile-links a', '.social-media a'],
      attribute: 'href',
      multiple: true,
    },
  },
};
