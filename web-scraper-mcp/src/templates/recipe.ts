import { Template, DetectionSignals } from './types.js';
import { calculateMatchScore } from './utils.js';

const signals: DetectionSignals = {
  urlPatterns: ['/recipe/', '/recipes/', '/cooking/', '/baking/', '/meal/', '/dish/'],
  selectors: [
    '[itemtype*="Recipe"]',
    '[itemtype*="schema.org/Recipe"]',
    '.recipe-content',
    '.recipe-card',
    '.recipe-wrapper',
    'div[data-recipe]',
  ],
  requiredElements: [
    '.ingredients',
    '[itemprop="recipeIngredient"]',
    '.recipe-ingredients',
    '.ingredient-list',
    '.instructions',
    '[itemprop="recipeInstructions"]',
  ],
  keywords: [
    'ingredients',
    'instructions',
    'prep time',
    'cook time',
    'servings',
    'calories',
    'recipe',
    'directions',
  ],
};

export const recipeTemplate: Template = {
  name: 'recipe',
  description: 'Extract recipe information including ingredients and instructions',

  detect: (url, dom) => calculateMatchScore(dom, signals),

  extract: {
    title: [
      'h1[itemprop="name"]',
      '.recipe-title',
      'h1.recipe-name',
      '.recipe-header h1',
      '[data-recipe-name]',
    ],

    author: ['[itemprop="author"]', '.recipe-author', '.recipe-by', '.chef-name', '.created-by'],

    description: [
      '[itemprop="description"]',
      '.recipe-description',
      '.recipe-summary',
      '.recipe-intro',
    ],

    prepTime: {
      selectors: ['[itemprop="prepTime"]', '.prep-time', '.preparation-time', '.recipe-prep-time'],
      transform: (text: string) => {
        const minutes = parseInt(text.replace(/\D/g, ''));
        return isNaN(minutes) ? null : minutes;
      },
    },

    cookTime: {
      selectors: ['[itemprop="cookTime"]', '.cook-time', '.cooking-time', '.recipe-cook-time'],
      transform: (text: string) => {
        const minutes = parseInt(text.replace(/\D/g, ''));
        return isNaN(minutes) ? null : minutes;
      },
    },

    totalTime: {
      selectors: ['[itemprop="totalTime"]', '.total-time', '.recipe-total-time', '.duration'],
      transform: (text: string) => {
        const minutes = parseInt(text.replace(/\D/g, ''));
        return isNaN(minutes) ? null : minutes;
      },
    },

    servings: {
      selectors: ['[itemprop="recipeYield"]', '.servings', '.recipe-yield', '.serves', '.portions'],
      transform: (text: string) => {
        const servings = parseInt(text.replace(/\D/g, ''));
        return isNaN(servings) ? null : servings;
      },
    },

    ingredients: {
      selectors: [
        '[itemprop="recipeIngredient"]',
        '.ingredient',
        '.recipe-ingredient',
        '.ingredients li',
        '.ingredient-list li',
      ],
      multiple: true,
    },

    instructions: {
      selectors: [
        '[itemprop="recipeInstructions"]',
        '.instruction',
        '.recipe-instruction',
        '.directions li',
        '.instructions ol li',
        '.method-step',
      ],
      multiple: true,
    },

    nutrition: {
      selectors: [
        '[itemprop="nutrition"]',
        '.nutrition-info',
        '.recipe-nutrition',
        '.nutritional-info',
      ],
    },

    calories: {
      selectors: ['[itemprop="calories"]', '.calories', '.calorie-count', '.recipe-calories'],
      transform: (text: string) => {
        const calories = parseInt(text.replace(/\D/g, ''));
        return isNaN(calories) ? null : calories;
      },
    },

    image: {
      selectors: [
        '[itemprop="image"]',
        '.recipe-image img',
        '.recipe-photo img',
        '.recipe-hero img',
      ],
      attribute: 'src',
    },

    rating: {
      selectors: ['[itemprop="ratingValue"]', '.recipe-rating', '.star-rating', '[data-rating]'],
      transform: (text: string) => {
        const rating = parseFloat(text);
        return isNaN(rating) ? null : rating;
      },
    },

    reviewCount: {
      selectors: ['[itemprop="reviewCount"]', '.review-count', '.rating-count', '.reviews-count'],
      transform: (text: string) => {
        const count = parseInt(text.replace(/\D/g, ''));
        return isNaN(count) ? null : count;
      },
    },

    cuisine: ['[itemprop="recipeCuisine"]', '.cuisine-type', '.recipe-cuisine', '.food-type'],

    category: ['[itemprop="recipeCategory"]', '.recipe-category', '.meal-type', '.dish-type'],

    tags: {
      selectors: ['.recipe-tag', '.recipe-tags a', '.tag-list a', '[rel="tag"]'],
      multiple: true,
    },
  },
};
