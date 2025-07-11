import { Template, DetectionSignals } from './types.js';
import { calculateMatchScore } from './utils.js';

const signals: DetectionSignals = {
  urlPatterns: ['/thread/', '/topic/', '/discussion/', '/forum/', '/t/', '/posts/', '/question/'],
  selectors: [
    '[itemtype*="DiscussionForumPosting"]',
    '[itemtype*="QAPage"]',
    '.thread-content',
    '.topic-container',
    '.discussion-thread',
    '.forum-post',
  ],
  requiredElements: [
    '.post-author',
    '.thread-title',
    '.topic-title',
    '.reply-count',
    '.post-content',
    '.message-content',
  ],
  keywords: [
    'replies',
    'posts',
    'members',
    'joined',
    'posted',
    'last reply',
    'views',
    'topic starter',
  ],
};

export const forumThreadTemplate: Template = {
  name: 'forum_thread',
  description: 'Extract forum thread and discussion information',

  detect: (url, dom) => calculateMatchScore(dom, signals),

  extract: {
    title: [
      'h1[itemprop="name"]',
      '.thread-title',
      '.topic-title',
      'h1.discussion-title',
      '[data-thread-title]',
    ],

    author: [
      '[itemprop="author"]',
      '.thread-starter',
      '.topic-author',
      '.original-poster',
      '.post-author:first',
    ],

    content: [
      '[itemprop="articleBody"]',
      '.first-post-content',
      '.thread-content',
      '.original-post',
      '.post-body:first',
    ],

    replies: {
      selectors: ['.reply', '.post:not(:first-child)', '.forum-reply', '.response', '.comment'],
      multiple: true,
    },

    replyCount: {
      selectors: ['.reply-count', '.replies-count', '.response-count', '[data-reply-count]'],
      transform: (text: string) => {
        const count = parseInt(text.replace(/\D/g, ''));
        return isNaN(count) ? null : count;
      },
    },

    viewCount: {
      selectors: ['.view-count', '.views-count', '.thread-views', '[data-view-count]'],
      transform: (text: string) => {
        let multiplier = 1;
        if (text.toLowerCase().includes('k')) multiplier = 1000;
        if (text.toLowerCase().includes('m')) multiplier = 1000000;
        const num = parseFloat(text.replace(/[^0-9.]/g, ''));
        return isNaN(num) ? null : Math.floor(num * multiplier);
      },
    },

    createdDate: [
      '[itemprop="dateCreated"]',
      '.post-date:first',
      '.thread-date',
      '.created-date',
      'time[datetime]:first',
    ],

    lastReplyDate: [
      '.last-reply-date',
      '.last-post-date',
      '.latest-reply',
      '.last-activity',
      '[data-last-reply]',
    ],

    category: [
      '.forum-category',
      '.thread-category',
      '.board-name',
      '[itemprop="articleSection"]',
      '.topic-category',
    ],

    tags: {
      selectors: ['.thread-tag', '.topic-tag', '.forum-tags a', '[rel="tag"]', '.label'],
      multiple: true,
    },

    status: ['.thread-status', '.topic-status', '.discussion-status', '[data-status]'],

    isPinned: {
      selectors: ['.pinned', '.sticky', '.featured', '.announcement'],
      contains: ['pinned', 'sticky', 'featured', 'announcement'],
    },

    isLocked: {
      selectors: ['.locked', '.closed', '.archived'],
      contains: ['locked', 'closed', 'archived', 'no new replies'],
    },

    isSolved: {
      selectors: ['.solved', '.answered', '.resolved', '.solution'],
      contains: ['solved', 'answered', 'resolved', 'solution'],
    },

    participants: {
      selectors: ['.participant', '.poster', '.contributor', '.thread-participant'],
      multiple: true,
    },

    bestAnswer: [
      '.best-answer',
      '.accepted-answer',
      '.solution-post',
      '[itemprop="acceptedAnswer"]',
    ],

    votes: {
      selectors: ['.vote-count', '.votes', '.score', '[data-votes]'],
      transform: (text: string) => {
        const votes = parseInt(text.replace(/\D/g, ''));
        return isNaN(votes) ? null : votes;
      },
    },
  },
};
