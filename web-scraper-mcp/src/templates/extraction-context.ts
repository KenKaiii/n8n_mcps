/**
 * Optimized extraction context to avoid redundant DOM parsing
 */

import { JSDOM } from 'jsdom';

export interface ExtractionContext {
  dom: JSDOM;
  doc: Document;
  url: string;
  html: string;
  selectorCache: Map<string, Element | null>;
  queryCache: Map<string, NodeListOf<Element>>;
}

// Type declarations for DOM types
type Element = any;
type Document = any;
type NodeListOf<T> = T[];

export function createExtractionContext(html: string, url: string): ExtractionContext {
  const dom = new JSDOM(html, { url });
  return {
    dom,
    doc: dom.window.document,
    url,
    html,
    selectorCache: new Map(),
    queryCache: new Map(),
  };
}

/**
 * Cached querySelector that avoids redundant DOM queries
 */
export function querySelector(ctx: ExtractionContext, selector: string): Element | null {
  if (ctx.selectorCache.has(selector)) {
    return ctx.selectorCache.get(selector) || null;
  }

  try {
    const element = ctx.doc.querySelector(selector);
    ctx.selectorCache.set(selector, element);
    return element;
  } catch {
    ctx.selectorCache.set(selector, null);
    return null;
  }
}

/**
 * Cached querySelectorAll
 */
export function querySelectorAll(ctx: ExtractionContext, selector: string): NodeListOf<Element> {
  if (ctx.queryCache.has(selector)) {
    return ctx.queryCache.get(selector)!;
  }

  try {
    const elements = ctx.doc.querySelectorAll(selector);
    ctx.queryCache.set(selector, elements);
    return elements;
  } catch {
    const empty = ctx.doc.querySelectorAll('__none__');
    ctx.queryCache.set(selector, empty);
    return empty;
  }
}

/**
 * Batch query multiple selectors at once
 */
export function batchQuerySelectors(
  ctx: ExtractionContext,
  selectors: string[]
): Map<string, Element | null> {
  const results = new Map<string, Element | null>();

  for (const selector of selectors) {
    results.set(selector, querySelector(ctx, selector));
  }

  return results;
}

/**
 * Find the first matching element from a list of selectors
 */
export function findFirstMatch(
  ctx: ExtractionContext,
  selectors: string[]
): { element: Element | null; selector: string | null } {
  for (const selector of selectors) {
    const element = querySelector(ctx, selector);
    if (element) {
      return { element, selector };
    }
  }
  return { element: null, selector: null };
}
