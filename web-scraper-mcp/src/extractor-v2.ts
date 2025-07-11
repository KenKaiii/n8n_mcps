/**
 * Enhanced content extraction utilities - works with any type of website
 */

import TurndownService from 'turndown';
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import { ExtractedContent } from './types.js';
import { extractWithTemplate, ExtractedData } from './templates/index.js';
import { createExtractionContext } from './templates/extraction-context.js';
import { cleanText } from './templates/validators.js';

export function extractContent(html: string, url: string, templateName?: string): ExtractedContent {
  // Create extraction context once to avoid redundant DOM parsing
  const ctx = createExtractionContext(html, url);
  const { dom, doc } = ctx;

  // First try template-based extraction with the context
  const templateData = extractWithTemplate(html, url, templateName, ctx);

  if (templateData._template && templateData._template !== 'generic') {
    console.log(`Using ${templateData._template} template extraction for ${url}`);

    // Clean all extracted text fields
    Object.keys(templateData).forEach(key => {
      if (typeof templateData[key] === 'string') {
        templateData[key] = cleanText(templateData[key] as string);
      }
    });

    // For article templates, also use Readability to get the full content
    if (templateData._template === 'article') {
      const reader = new Readability(doc);
      const article = reader.parse();

      if (article && article.content) {
        // Merge template data with Readability content
        const turndownService = createTurndownService();
        const fullContent = turndownService.turndown(article.content);

        // Update templateData with full content
        templateData.content = fullContent;

        // Format with full content
        const markdown = formatTemplateDataAsMarkdown(templateData);

        return {
          url,
          title: cleanText(
            (templateData.title as string) || article.title || doc.title || 'Untitled'
          ),
          content: cleanText(article.textContent || ''),
          markdown,
          metadata: {
            template: templateData._template,
            confidence: templateData._confidence,
            author: (templateData.author as string) || article.byline || undefined,
            publishedDate: (templateData.publishDate as string) || undefined,
            tags: (templateData.tags as string[]) || undefined,
            extractedData: templateData,
          },
          crawledAt: new Date().toISOString(),
        };
      }
    }

    // For non-article templates, use the template data as-is
    const markdown = formatTemplateDataAsMarkdown(templateData);

    return {
      url,
      title: cleanText((templateData.title as string) || doc.title || 'Untitled'),
      content: JSON.stringify(templateData, null, 2),
      markdown,
      metadata: {
        template: templateData._template,
        confidence: templateData._confidence,
        extractedData: templateData,
      },
      crawledAt: new Date().toISOString(),
    };
  }

  // Fallback 1: Try Readability for article-like content
  const reader = new Readability(doc);
  const article = reader.parse();

  if (article && article.content) {
    console.log(`Using Readability extraction for ${url}`);
    const turndownService = createTurndownService();

    return {
      url,
      title: cleanText(article.title || doc.title || 'Untitled'),
      content: cleanText(article.textContent || ''),
      markdown: turndownService.turndown(article.content),
      metadata: {
        author: article.byline || undefined,
        description:
          doc.querySelector('meta[name="description"]')?.getAttribute('content') || undefined,
      },
      crawledAt: new Date().toISOString(),
    };
  }

  // Fallback 2: Generic extraction for any page
  console.log(`Using generic extraction for ${url}`);
  return genericExtraction(dom, url);
}

function formatTemplateDataAsMarkdown(data: ExtractedData): string {
  const { _template, ...fields } = data;
  let markdown = '';

  // Add title if present
  if (fields.title) {
    markdown += `# ${fields.title}\n\n`;
  }

  // Format different fields based on template type
  switch (_template) {
    case 'ecommerce_product':
      if (fields.price) markdown += `**Price:** ${fields.currency || '$'}${fields.price}\n`;
      if (fields.originalPrice)
        markdown += `**Was:** ${fields.currency || '$'}${fields.originalPrice}\n`;
      if (fields.availability) markdown += `**Availability:** ${fields.availability}\n`;
      if (fields.rating) markdown += `**Rating:** ${fields.rating}/5`;
      if (fields.reviewCount) markdown += ` (${fields.reviewCount} reviews)`;
      markdown += '\n\n';

      if (fields.description) {
        markdown += `## Description\n\n${fields.description}\n\n`;
      }

      if (fields.features && Array.isArray(fields.features)) {
        markdown += `## Features\n\n`;
        fields.features.forEach((feature: string) => {
          markdown += `- ${feature}\n`;
        });
        markdown += '\n';
      }
      break;

    case 'article':
      if (fields.author) markdown += `*By ${fields.author}*\n`;
      if (fields.publishDate) markdown += `*Published: ${fields.publishDate}*\n`;
      if (fields.readTime) markdown += `*${fields.readTime}*\n`;
      markdown += '\n';

      if (fields.summary) {
        markdown += `> ${fields.summary}\n\n`;
      }

      if (fields.content) {
        markdown += fields.content + '\n\n';
      }

      if (fields.tags && Array.isArray(fields.tags)) {
        markdown += `**Tags:** ${fields.tags.join(', ')}\n`;
      }
      break;

    case 'recipe':
      if (fields.prepTime) markdown += `**Prep Time:** ${fields.prepTime}\n`;
      if (fields.cookTime) markdown += `**Cook Time:** ${fields.cookTime}\n`;
      if (fields.servings) markdown += `**Servings:** ${fields.servings}\n\n`;

      if (fields.ingredients && Array.isArray(fields.ingredients)) {
        markdown += `## Ingredients\n\n`;
        fields.ingredients.forEach((ingredient: string) => {
          markdown += `- ${ingredient}\n`;
        });
        markdown += '\n';
      }

      if (fields.instructions && Array.isArray(fields.instructions)) {
        markdown += `## Instructions\n\n`;
        fields.instructions.forEach((instruction: string, index: number) => {
          markdown += `${index + 1}. ${instruction}\n`;
        });
        markdown += '\n';
      }
      break;

    default:
      // Generic formatting for other templates
      Object.entries(fields).forEach(([key, value]) => {
        if (value === null || value === undefined) return;

        if (Array.isArray(value)) {
          markdown += `## ${key.charAt(0).toUpperCase() + key.slice(1)}\n\n`;
          value.forEach(item => {
            markdown += `- ${item}\n`;
          });
          markdown += '\n';
        } else if (typeof value === 'object') {
          markdown += `## ${key.charAt(0).toUpperCase() + key.slice(1)}\n\n`;
          markdown += '```json\n' + JSON.stringify(value, null, 2) + '\n```\n\n';
        } else {
          markdown += `**${key.charAt(0).toUpperCase() + key.slice(1)}:** ${value}\n`;
        }
      });
  }

  return markdown;
}

function createTurndownService(): TurndownService {
  const turndownService = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
  });

  // Remove scripts, styles, etc
  turndownService.addRule('removeScripts', {
    filter: ['script', 'style', 'noscript', 'iframe'],
    replacement: () => '',
  });

  // Better link handling
  turndownService.addRule('links', {
    filter: 'a',
    replacement: (content, node) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const href = (node as any).getAttribute('href');
      if (!href) return content;
      return `[${content}](${href})`;
    },
  });

  return turndownService;
}

function genericExtraction(dom: JSDOM, url: string): ExtractedContent {
  const doc = dom.window.document;
  const turndownService = createTurndownService();

  // Remove navigation, header, footer, sidebars
  const elementsToRemove = doc.querySelectorAll(
    'nav, header, footer, aside, .nav, .header, .footer, .sidebar, #nav, #header, #footer, #sidebar'
  );
  elementsToRemove.forEach(el => el.remove());

  // Get main content area
  const main =
    doc.querySelector('main, [role="main"], #main, .main, article, .content, #content') || doc.body;

  // Build structured markdown
  let markdown = `# ${doc.title}\n\n`;

  // Add any headings and their content
  const headings = main?.querySelectorAll('h1, h2, h3, h4, h5, h6') || [];

  if (headings.length > 0) {
    // Structure content by headings
    headings.forEach(heading => {
      const level = parseInt(heading.tagName[1]);
      markdown += '\n' + '#'.repeat(level) + ' ' + heading.textContent?.trim() + '\n\n';

      // Get content after this heading until next heading
      let sibling = heading.nextElementSibling;
      while (sibling && !sibling.matches('h1, h2, h3, h4, h5, h6')) {
        const content = turndownService.turndown(sibling.outerHTML);
        if (content.trim()) {
          markdown += content + '\n\n';
        }
        sibling = sibling.nextElementSibling;
      }
    });
  } else {
    // No headings, just convert all content
    markdown += turndownService.turndown(main?.innerHTML || '');
  }

  return {
    url,
    title: doc.title || 'Untitled',
    content: main?.textContent?.trim() || '',
    markdown,
    metadata: {
      description:
        doc.querySelector('meta[name="description"]')?.getAttribute('content') || undefined,
    },
    crawledAt: new Date().toISOString(),
  };
}
