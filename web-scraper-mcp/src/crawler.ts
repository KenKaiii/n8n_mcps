/**
 * Web crawler implementation with anti-blocking features
 */

import type { Browser, Page } from 'playwright';
import { JSDOM } from 'jsdom';
import robotsParser from 'robots-parser';
import PQueue from 'p-queue';
import got from 'got';
import { CookieJar } from 'tough-cookie';
// randomUseragent imported in utils.ts
import { CrawlState, CrawlConfig, ExtractedContent } from './types.js';
import { extractContent } from './extractor-v2.js';
import { getRandomDelay, sleep, getRandomUserAgent } from './utils.js';

export async function crawlWebsiteAsync(crawlState: CrawlState) {
  const { config } = crawlState;
  let browser: Browser | null = null;

  try {
    // Only initialize browser if explicitly requested
    if (config.usePlaywright) {
      // Dynamic import to avoid loading Playwright unless needed
      const { chromium } = await import('playwright');
      browser = await chromium.launch({
        headless: true,
        args: [
          '--disable-blink-features=AutomationControlled',
          '--disable-features=IsolateOrigins,site-per-process',
          config.proxy ? `--proxy-server=${config.proxy}` : '',
        ].filter(Boolean),
      });
    }

    // Check robots.txt if enabled
    if (config.respectRobotsTxt) {
      const robotsUrl = new URL('/robots.txt', crawlState.startUrl).href;
      try {
        const robotsText = await got(robotsUrl).text();
        // @ts-expect-error robots-parser types are incorrect
        const robots = robotsParser(robotsUrl, robotsText);

        if (!robots.isAllowed(crawlState.startUrl, config.userAgent || 'bot')) {
          throw new Error('Crawling disallowed by robots.txt');
        }
      } catch {
        // If robots.txt doesn't exist, continue
        console.log('No robots.txt found, continuing...');
      }
    }

    // Create queue for concurrent crawling
    const queue = new PQueue({ concurrency: config.concurrency });
    const visited = new Set<string>();
    const toVisit = new Map<string, number>([[crawlState.startUrl, 0]]);

    // Cookie jar for session persistence
    const cookieJar = new CookieJar();

    while (toVisit.size > 0 && crawlState.pagesCrawled < config.maxPages) {
      const batch = Array.from(toVisit.entries()).slice(0, config.concurrency);

      await Promise.all(
        batch.map(([url, depth]) =>
          queue.add(async () => {
            if (visited.has(url) || crawlState.pagesCrawled >= config.maxPages) {
              return;
            }

            try {
              // Random delay
              const delay = getRandomDelay(config.delays.min, config.delays.max);
              await sleep(delay);

              // Crawl the page
              const result = await crawlPage(url, depth, config, browser, cookieJar);

              // Store result
              crawlState.results.set(url, result);
              crawlState.pagesCrawled++;
              visited.add(url);
              toVisit.delete(url);

              // Add new URLs to queue if within depth limit
              if (depth < config.maxDepth - 1) {
                for (const newUrl of result.links || []) {
                  if (!visited.has(newUrl) && shouldCrawlUrl(newUrl, config)) {
                    toVisit.set(newUrl, depth + 1);
                    crawlState.pagesQueued.add(newUrl);
                  }
                }
              }
            } catch (error) {
              crawlState.errors.push(
                `Failed to crawl ${url}: ${error instanceof Error ? error.message : String(error)}`
              );
              toVisit.delete(url);
            }
          })
        )
      );
    }

    crawlState.status = 'completed';
  } catch (error) {
    crawlState.status = 'failed';
    crawlState.errors.push(error instanceof Error ? error.message : String(error));
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

export async function crawlPage(
  url: string,
  depth: number,
  config: CrawlConfig,
  browser: Browser | null,
  cookieJar: CookieJar
): Promise<ExtractedContent & { links?: string[] }> {
  let page: Page | null = null;

  try {
    // Use browser if available (for JS-heavy sites)
    if (browser) {
      page = await browser.newPage();

      // Set user agent
      const userAgent = config.userAgent || getRandomUserAgent();
      await page.setExtraHTTPHeaders({
        'User-Agent': userAgent,
      });

      // Set viewport to avoid mobile detection
      await page.setViewportSize({ width: 1920, height: 1080 });

      // Navigate with stealth
      await page.goto(url, {
        waitUntil: 'networkidle',
        timeout: 30000,
      });

      // Get page content
      const html = await page.content();
      const links = await page.$$eval('a[href]', anchors =>
        anchors.map(a => (a as any).href).filter((href: string) => href.startsWith('http'))
      );

      // Extract content
      const extracted = extractContent(html, url);

      return { ...extracted, links };
    } else {
      // Fallback to simple HTTP request
      const response = await got(url, {
        headers: {
          'User-Agent': config.userAgent || getRandomUserAgent(),
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
        },
        cookieJar: cookieJar as unknown as CookieJar,
        followRedirect: true,
        retry: {
          limit: 3,
          methods: ['GET'],
        },
      });

      const extracted = extractContent(response.body, url);

      // Extract links from HTML
      const dom = new JSDOM(response.body);
      const links = Array.from(dom.window.document.querySelectorAll('a[href]'))
        .map(a => (a as any).href)
        .filter((href: string) => href.startsWith('http'));

      return { ...extracted, links };
    }
  } finally {
    if (page) {
      await page.close();
    }
  }
}

export function shouldCrawlUrl(url: string, config: CrawlConfig): boolean {
  // Check include patterns
  if (config.includePatterns.length > 0) {
    const included = config.includePatterns.some(pattern => new RegExp(pattern).test(url));
    if (!included) return false;
  }

  // Check exclude patterns
  if (config.excludePatterns.length > 0) {
    const excluded = config.excludePatterns.some(pattern => new RegExp(pattern).test(url));
    if (excluded) return false;
  }

  return true;
}
