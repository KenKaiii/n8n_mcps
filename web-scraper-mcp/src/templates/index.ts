import { JSDOM } from 'jsdom';
import { Template, ExtractedData } from './types.js';
import { extractWithSchema } from './utils.js';
import { ExtractionContext } from './extraction-context.js';

// Import individual templates
import { ecommerceProductTemplate } from './ecommerce-product.js';
import { articleTemplate } from './article.js';
import { recipeTemplate } from './recipe.js';
import { jobListingTemplate } from './job-listing.js';
import { eventTemplate } from './event.js';
import { realEstateTemplate } from './real-estate.js';
import { socialProfileTemplate } from './social-profile.js';
import { videoMediaTemplate } from './video-media.js';
import { forumThreadTemplate } from './forum-thread.js';
import { documentationTemplate } from './documentation.js';

// Export all templates
export const templates: Template[] = [
  ecommerceProductTemplate,
  articleTemplate,
  recipeTemplate,
  jobListingTemplate,
  eventTemplate,
  realEstateTemplate,
  socialProfileTemplate,
  videoMediaTemplate,
  forumThreadTemplate,
  documentationTemplate,
];

export function detectBestTemplate(
  url: string,
  html: string,
  ctx?: ExtractionContext
): Template | null {
  const dom = ctx?.dom || new JSDOM(html, { url });
  const scores: Map<Template, number> = new Map();

  // Run all template detections
  for (const template of templates) {
    const score = template.detect(url, dom);
    scores.set(template, score);

    // Early exit if high confidence
    if (score > 0.85) {
      console.log(
        `Auto-detected template: ${template.name} (confidence: ${score.toFixed(2)}) - early exit`
      );
      return template;
    }
  }

  // Get highest scoring template
  const sortedTemplates = Array.from(scores.entries()).sort((a, b) => b[1] - a[1]);

  const [bestTemplate, bestScore] = sortedTemplates[0] || [null, 0];

  // Use template if confidence is high enough
  if (bestTemplate && bestScore > 0.5) {
    console.log(
      `Auto-detected template: ${bestTemplate.name} (confidence: ${bestScore.toFixed(2)})`
    );
    return bestTemplate;
  }

  return null;
}

export function extractWithTemplate(
  html: string,
  url: string,
  templateName?: string,
  ctx?: ExtractionContext
): ExtractedData {
  const dom = ctx?.dom || new JSDOM(html, { url });

  let template: Template | null = null;

  if (templateName) {
    // Use specified template
    template = templates.find(t => t.name === templateName) || null;
    if (!template) {
      console.warn(`Template "${templateName}" not found, falling back to auto-detection`);
    }
  }

  if (!template) {
    // Auto-detect template
    template = detectBestTemplate(url, html, ctx);
  }

  if (template) {
    const data = extractWithSchema(dom, template.extract, ctx);
    data._template = template.name;
    data._confidence = template.detect(url, dom);
    return data;
  }

  // No template matched, return basic extraction
  return {
    _template: 'generic',
    _confidence: 0,
    title: dom.window.document.title || '',
    url: url,
  };
}

export type { Template, ExtractedData } from './types.js';
