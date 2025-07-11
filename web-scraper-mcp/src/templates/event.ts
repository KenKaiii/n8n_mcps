import { Template, DetectionSignals } from './types.js';
import { calculateMatchScore } from './utils.js';

const signals: DetectionSignals = {
  urlPatterns: ['/event/', '/events/', '/ticket/', '/show/', '/concert/', '/conference/'],
  selectors: [
    '[itemtype*="Event"]',
    '[itemtype*="schema.org/Event"]',
    '.event-details',
    '.event-info',
    '.event-page',
    '.event-wrapper',
  ],
  requiredElements: [
    '.event-date',
    '[itemprop="startDate"]',
    '.event-time',
    '.event-location',
    '[itemprop="location"]',
    '.venue',
  ],
  keywords: [
    'tickets',
    'register',
    'rsvp',
    'venue',
    'doors open',
    'starts at',
    'admission',
    'event',
  ],
};

export const eventTemplate: Template = {
  name: 'event',
  description: 'Extract event information including date, location, and ticketing',

  detect: (url, dom) => calculateMatchScore(dom, signals),

  extract: {
    title: [
      'h1[itemprop="name"]',
      '.event-title',
      'h1.event-name',
      '.event-header h1',
      '[data-event-name]',
    ],

    startDate: [
      '[itemprop="startDate"]',
      '.event-date',
      '.start-date',
      '.event-start',
      'time[datetime]',
    ],

    endDate: ['[itemprop="endDate"]', '.end-date', '.event-end', '.finish-time'],

    location: {
      selectors: [
        '[itemprop="location"]',
        '.event-location',
        '.venue-name',
        '.event-venue',
        '[data-venue]',
      ],
    },

    address: [
      '[itemprop="address"]',
      '.venue-address',
      '.event-address',
      '.location-details',
      '.street-address',
    ],

    price: {
      selectors: ['.ticket-price', '.event-price', '.admission-fee', '[itemprop="price"]'],
      transform: (text: string) => {
        const cleanPrice = text.replace(/[^0-9.,]/g, '').replace(',', '');
        return parseFloat(cleanPrice) || null;
      },
    },

    description: [
      '[itemprop="description"]',
      '.event-description',
      '.event-details',
      '.event-summary',
      '#event-description',
    ],

    organizer: [
      '[itemprop="organizer"]',
      '.event-organizer',
      '.hosted-by',
      '.presented-by',
      '.organizer-name',
    ],

    performers: {
      selectors: [
        '[itemprop="performer"]',
        '.performer',
        '.artist-name',
        '.lineup li',
        '.performers-list li',
      ],
      multiple: true,
    },

    ticketUrl: {
      selectors: [
        '.ticket-link',
        '.buy-tickets',
        '.register-button',
        '[href*="ticket"]',
        '[href*="register"]',
      ],
      attribute: 'href',
    },

    availableTickets: {
      selectors: ['.tickets-remaining', '.seats-available', '.availability-count'],
      transform: (text: string) => {
        const count = parseInt(text.replace(/\D/g, ''));
        return isNaN(count) ? null : count;
      },
    },

    eventType: ['.event-type', '.event-category', '[itemprop="eventType"]', '.event-format'],

    ageRestriction: ['.age-limit', '.age-restriction', '.minimum-age', '.age-requirement'],

    image: {
      selectors: [
        '[itemprop="image"]',
        '.event-image img',
        '.event-banner img',
        '.event-poster img',
      ],
      attribute: 'src',
    },

    status: ['[itemprop="eventStatus"]', '.event-status', '.ticket-status', '.availability-status'],

    duration: ['.event-duration', '.runtime', '.event-length', '.duration'],

    tags: {
      selectors: ['.event-tag', '.event-tags a', '.category-tag', '[rel="tag"]'],
      multiple: true,
    },
  },
};
