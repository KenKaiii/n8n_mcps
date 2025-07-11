/**
 * Utility functions for web scraper
 */

import * as crypto from 'node:crypto';
// @ts-ignore
import * as randomUseragent from 'random-useragent';

// User agent pool
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:120.0) Gecko/20100101 Firefox/120.0',
  'Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0',
];

export function getRandomDelay(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function getRandomUserAgent(): string {
  try {
    // @ts-ignore
    return (
      randomUseragent.getRandom() || USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]
    );
  } catch {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  }
}

export async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function generateCrawlId(): string {
  return crypto.randomBytes(8).toString('hex');
}
