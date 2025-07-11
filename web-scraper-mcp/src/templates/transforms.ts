/**
 * Common transform functions for template extraction
 */

/**
 * Parse price from various formats
 */
export function parsePrice(text: string): number | null {
  if (!text) return null;

  // Remove currency symbols and normalize
  const cleanPrice = text.replace(/[^\d.,-]/g, '').replace(/,/g, '');

  const price = parseFloat(cleanPrice);
  return isNaN(price) ? null : price;
}

/**
 * Parse integer from text
 */
export function parseNumber(text: string): number | null {
  if (!text) return null;

  const num = parseInt(text.replace(/\D/g, ''), 10);
  return isNaN(num) ? null : num;
}

/**
 * Parse and normalize date
 */
export function parseDate(text: string): string | null {
  if (!text) return null;

  try {
    const date = new Date(text);
    if (isNaN(date.getTime())) return null;
    return date.toISOString();
  } catch {
    return null;
  }
}

/**
 * Clean and normalize text
 */
export function cleanText(text: string): string {
  return text
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\n{3,}/g, '\n\n');
}

/**
 * Extract number from text (e.g., "5 stars" -> 5)
 */
export function extractNumber(text: string): number | null {
  const match = text.match(/(\d+(?:\.\d+)?)/);
  return match ? parseFloat(match[1]) : null;
}

/**
 * Parse boolean from various text representations
 */
export function parseBoolean(text: string): boolean | null {
  const lower = text.toLowerCase().trim();
  if (['true', 'yes', '1', 'available', 'in stock'].includes(lower)) return true;
  if (['false', 'no', '0', 'unavailable', 'out of stock'].includes(lower)) return false;
  return null;
}

/**
 * Parse rating (e.g., "4.5/5" -> 4.5)
 */
export function parseRating(text: string): number | null {
  const match = text.match(/(\d+(?:\.\d+)?)\s*(?:\/|out of|of)?\s*(\d+)?/);
  if (match) {
    const rating = parseFloat(match[1]);
    const max = match[2] ? parseFloat(match[2]) : 5;
    return rating <= max ? rating : null;
  }
  return null;
}
