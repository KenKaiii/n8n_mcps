import { JSDOM } from 'jsdom';
import { DetectionSignals, ExtractorField, ExtractorSchema, ExtractedData } from './types.js';
import { ExtractionContext, querySelector, querySelectorAll } from './extraction-context.js';

export function calculateMatchScore(
  dom: JSDOM,
  signals: DetectionSignals,
  ctx?: ExtractionContext
): number {
  let score = 0;
  let maxScore = 0;
  const doc = ctx?.doc || dom.window.document;
  const bodyText = doc.body?.textContent?.toLowerCase() || '';

  // URL pattern matching (20% weight)
  maxScore += 0.2;
  const url = dom.window.location.href;
  if (signals.urlPatterns.some(pattern => url.includes(pattern))) {
    score += 0.2;
  }

  // Selector matching (30% weight)
  maxScore += 0.3;
  const selectorMatches = signals.selectors.filter(selector => {
    try {
      return !!doc.querySelector(selector);
    } catch {
      return false;
    }
  });
  if (selectorMatches.length > 0) {
    score += 0.3 * (selectorMatches.length / signals.selectors.length);
  }

  // Required elements (40% weight)
  maxScore += 0.4;
  const requiredMatches = signals.requiredElements.filter(selector => {
    try {
      return !!doc.querySelector(selector);
    } catch {
      return false;
    }
  });
  if (requiredMatches.length > 0) {
    score += 0.4 * (requiredMatches.length / signals.requiredElements.length);
  }

  // Keyword matching (10% weight)
  maxScore += 0.1;
  const keywordMatches = signals.keywords.filter(keyword =>
    bodyText.includes(keyword.toLowerCase())
  );
  if (keywordMatches.length > 0) {
    score += 0.1 * (keywordMatches.length / signals.keywords.length);
  }

  return score / maxScore;
}

export function extractField(
  dom: JSDOM,
  field: string[] | ExtractorField,
  ctx?: ExtractionContext
): any {
  const doc = ctx?.doc || dom.window.document;

  // Handle simple selector array
  if (Array.isArray(field)) {
    for (const selector of field) {
      const element = ctx ? querySelector(ctx, selector) : doc.querySelector(selector);
      if (element) {
        return element.textContent?.trim() || '';
      }
    }
    return null;
  }

  // Handle complex field configuration
  const { selectors, attribute, multiple, transform, regex, contains } = field;

  for (const selector of selectors) {
    try {
      if (multiple) {
        const elements = ctx ? querySelectorAll(ctx, selector) : doc.querySelectorAll(selector);
        if (elements.length > 0) {
          const values = Array.from(elements)
            .map((el: any) => {
              const value = attribute ? el.getAttribute(attribute) : el.textContent;
              return value?.trim() || '';
            })
            .filter(Boolean);

          return transform ? values.map(transform) : values;
        }
      } else {
        const element = ctx ? querySelector(ctx, selector) : doc.querySelector(selector);
        if (element) {
          let value = attribute ? element.getAttribute(attribute) : element.textContent;
          value = value?.trim() || '';

          if (regex && value) {
            const match = value.match(regex);
            value = match ? match[0] : value;
          }

          if (contains && value) {
            const found = contains.some(term => value.toLowerCase().includes(term.toLowerCase()));
            return found;
          }

          return transform ? transform(value) : value;
        }
      }
    } catch {
      // Invalid selector, continue to next
      continue;
    }
  }

  return multiple ? [] : null;
}

export function extractWithSchema(
  dom: JSDOM,
  schema: ExtractorSchema,
  ctx?: ExtractionContext
): ExtractedData {
  const result: ExtractedData = {};

  for (const [fieldName, fieldConfig] of Object.entries(schema)) {
    const value = extractField(dom, fieldConfig, ctx);
    if (value !== null && value !== undefined && (!Array.isArray(value) || value.length > 0)) {
      result[fieldName] = value;
    }
  }

  return result;
}

export function normalizeSelector(selector: string): string {
  // Handle attribute selectors like "a@href"
  if (selector.includes('@')) {
    return selector.split('@')[0];
  }
  return selector;
}
