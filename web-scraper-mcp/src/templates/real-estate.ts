import { Template, DetectionSignals } from './types.js';
import { calculateMatchScore } from './utils.js';

const signals: DetectionSignals = {
  urlPatterns: ['/property/', '/listing/', '/home/', '/real-estate/', '/mls/', '/for-sale/'],
  selectors: [
    '[itemtype*="RealEstateListing"]',
    '[itemtype*="schema.org/Residence"]',
    '.property-details',
    '.listing-details',
    '.property-info',
    '.real-estate-listing',
  ],
  requiredElements: [
    '.price',
    '[itemprop="price"]',
    '.listing-price',
    '.property-price',
    '.bedrooms',
    '.bathrooms',
    '.sqft',
  ],
  keywords: [
    'bedrooms',
    'bathrooms',
    'square feet',
    'sqft',
    'for sale',
    'for rent',
    'mls',
    'property type',
  ],
};

export const realEstateTemplate: Template = {
  name: 'real_estate',
  description: 'Extract real estate property listing information',

  detect: (url, dom) => calculateMatchScore(dom, signals),

  extract: {
    title: [
      'h1[itemprop="name"]',
      '.property-title',
      '.listing-title',
      'h1.property-address',
      '.property-header h1',
    ],

    price: {
      selectors: [
        '[itemprop="price"]',
        '.listing-price',
        '.property-price',
        '.price-display',
        '[data-price]',
      ],
      transform: (text: string) => {
        const cleanPrice = text.replace(/[^0-9.,]/g, '').replace(',', '');
        return parseFloat(cleanPrice) || null;
      },
    },

    address: [
      '[itemprop="address"]',
      '.property-address',
      '.listing-address',
      '.full-address',
      '.street-address',
    ],

    bedrooms: {
      selectors: ['.bedrooms', '.beds', '[data-bedrooms]', '.bedroom-count'],
      transform: (text: string) => {
        const beds = parseInt(text.replace(/\D/g, ''));
        return isNaN(beds) ? null : beds;
      },
    },

    bathrooms: {
      selectors: ['.bathrooms', '.baths', '[data-bathrooms]', '.bathroom-count'],
      transform: (text: string) => {
        const baths = parseFloat(text.replace(/[^0-9.]/g, ''));
        return isNaN(baths) ? null : baths;
      },
    },

    squareFeet: {
      selectors: ['.sqft', '.square-feet', '.living-area', '[data-sqft]', '.property-size'],
      transform: (text: string) => {
        const sqft = parseInt(text.replace(/\D/g, ''));
        return isNaN(sqft) ? null : sqft;
      },
    },

    propertyType: [
      '.property-type',
      '.listing-type',
      '[itemprop="propertyType"]',
      '.home-type',
      '.style',
    ],

    description: [
      '[itemprop="description"]',
      '.property-description',
      '.listing-description',
      '.property-details',
      '#description',
    ],

    yearBuilt: {
      selectors: ['.year-built', '.built-year', '[data-year-built]', '.construction-year'],
      transform: (text: string) => {
        const year = parseInt(text.replace(/\D/g, ''));
        return isNaN(year) ? null : year;
      },
    },

    lotSize: ['.lot-size', '.lot-area', '.land-size', '[data-lot-size]', '.acreage'],

    mlsNumber: ['.mls-number', '.listing-id', '.mls-id', '[data-mls]', '.property-id'],

    listingAgent: [
      '.listing-agent',
      '.agent-name',
      '.realtor-name',
      '[itemprop="agent"]',
      '.broker-name',
    ],

    features: {
      selectors: [
        '.property-features li',
        '.amenities li',
        '.feature-list li',
        '.home-features li',
      ],
      multiple: true,
    },

    images: {
      selectors: [
        '.property-images img',
        '.gallery img',
        '.listing-photos img',
        '[itemprop="image"]',
      ],
      attribute: 'src',
      multiple: true,
    },

    virtualTourUrl: {
      selectors: ['.virtual-tour', '.3d-tour', '[href*="virtual"]', '[href*="tour"]'],
      attribute: 'href',
    },

    status: ['.listing-status', '.property-status', '.sale-status', '[data-status]'],

    hoaFees: {
      selectors: ['.hoa-fee', '.hoa-dues', '.association-fee', '.monthly-hoa'],
      transform: (text: string) => {
        const fee = parseFloat(text.replace(/[^0-9.]/g, ''));
        return isNaN(fee) ? null : fee;
      },
    },

    parking: ['.parking', '.garage', '.parking-spaces', '.parking-info'],

    heating: ['.heating', '.heating-type', '.heat-type', '.heating-system'],

    cooling: ['.cooling', '.ac', '.air-conditioning', '.cooling-system'],

    taxes: {
      selectors: ['.property-taxes', '.annual-taxes', '.tax-amount', '[data-taxes]'],
      transform: (text: string) => {
        const taxes = parseFloat(text.replace(/[^0-9.]/g, ''));
        return isNaN(taxes) ? null : taxes;
      },
    },
  },
};
