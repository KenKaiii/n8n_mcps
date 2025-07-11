import { Template, DetectionSignals } from './types.js';
import { calculateMatchScore } from './utils.js';
import { parsePrice, parseNumber } from './transforms.js';

const signals: DetectionSignals = {
  urlPatterns: ['/product/', '/item/', '/p/', '/dp/', '/products/', '-pd', '/buy/'],
  selectors: [
    '[itemtype*="Product"]',
    '[itemtype*="schema.org/Product"]',
    '.product-info',
    '#product-details',
    '.product-page',
    '.pdp-wrapper', // product detail page
  ],
  requiredElements: [
    '.price',
    '[itemprop="price"]',
    '.product-price',
    '.price-now',
    '[data-price]',
    '.pricing',
  ],
  keywords: [
    'add to cart',
    'buy now',
    'in stock',
    'out of stock',
    'quantity',
    'availability',
    'add to bag',
  ],
};

export const ecommerceProductTemplate: Template = {
  name: 'ecommerce_product',
  description: 'Extract product information from e-commerce pages',

  detect: (url, dom) => calculateMatchScore(dom, signals),

  extract: {
    title: [
      'h1[itemprop="name"]',
      '.product-title',
      'h1.product-name',
      '.pdp-title h1',
      '[data-testid="product-title"]',
    ],

    price: {
      selectors: [
        '[itemprop="price"]',
        '.price-now',
        '.product-price span',
        '.price-sales',
        '[data-price]',
      ],
      transform: parsePrice,
    },

    originalPrice: {
      selectors: ['.price-was', '.price-original', 's.price', '.compare-at-price'],
      transform: parsePrice,
    },

    currency: {
      selectors: ['[itemprop="priceCurrency"]', '.currency-symbol'],
      regex: /[$£€¥₹]/,
    },

    availability: {
      selectors: [
        '.availability',
        '[itemprop="availability"]',
        '.stock-status',
        '.in-stock',
        '.out-of-stock',
      ],
      contains: ['in stock', 'available', 'out of stock', 'unavailable'],
    },

    images: {
      selectors: [
        '.product-images img',
        '[itemprop="image"]',
        '.product-photo img',
        '.gallery-image img',
        '[data-testid="product-image"]',
      ],
      attribute: 'src',
      multiple: true,
    },

    description: [
      '[itemprop="description"]',
      '.product-description',
      '.product-details',
      '.description-content',
      '#product-description',
    ],

    sku: ['[itemprop="sku"]', '.product-code', '.item-number', '[data-sku]'],

    brand: ['[itemprop="brand"]', '.brand-name', '.product-brand', '[data-brand]'],

    rating: {
      selectors: ['[itemprop="ratingValue"]', '.star-rating', '.rating-stars', '[data-rating]'],
      transform: (text: string) => {
        const rating = parseFloat(text);
        return isNaN(rating) ? null : rating;
      },
    },

    reviewCount: {
      selectors: ['.review-count', '[itemprop="reviewCount"]', '.reviews-count'],
      transform: parseNumber,
    },

    variants: {
      selectors: ['.product-options', '.variant-selector', '.size-selector', '.color-selector'],
      multiple: true,
    },

    features: {
      selectors: ['.product-features li', '.feature-list li', '.product-bullets li'],
      multiple: true,
    },
  },
};
