// app/lib/sources/wienInfoDetailScraper.ts

import * as cheerio from 'cheerio';
import type { DetailScraperResult } from '@/lib/types';

/**
 * Cleans and normalizes price text
 */
function cleanPriceText(priceText: string): string {
  // Remove common prefixes
  let cleaned = priceText
    .replace(/^(Preis|Price|Eintritt|Admission|Kosten|Cost)[:\s]*/i, '')
    .trim();
  
  // Extract first price if multiple
  const priceMatch = cleaned.match(/€?\s*\d+([.,]\d{2})?\s*€?/);
  if (priceMatch) {
    return priceMatch[0].trim();
  }
  
  // Handle free admission
  if (/frei|free|kostenlos|gratis/i.test(cleaned)) {
    return 'Freier Eintritt';
  }
  
  return cleaned;
}

/**
 * Extracts price from text using regex patterns
 */
function extractPriceFromText(text: string): string | null {
  const patterns = [
    /Eintritt[:\s]*€?\s*(\d+(?:[.,]\d{2})?)\s*€?/i,
    /Preis[:\s]*€?\s*(\d+(?:[.,]\d{2})?)\s*€?/i,
    /Tickets?[:\s]*€?\s*(\d+(?:[.,]\d{2})?)\s*€?/i,
    /€\s*(\d+(?:[.,]\d{2})?)/,
    /(\d+(?:[.,]\d{2})?)\s*€/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1] ? `€ ${match[1]}` : match[0];
    }
  }

  // Check for free admission
  if (/freier\s+eintritt|eintritt\s+frei|free\s+admission/i.test(text)) {
    return 'Freier Eintritt';
  }

  return null;
}

/**
 * Scrapes event detail page for prices and additional information
 */
export async function scrapeWienInfoDetailPage(
  url: string,
  timeout: number = 8000
): Promise<DetailScraperResult> {
  try {
    console.log(`[DETAIL-SCRAPER] Fetching: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8',
        'Cache-Control': 'no-cache',
      },
      signal: AbortSignal.timeout(timeout),
    });

    if (!response.ok) {
      return { error: `HTTP ${response.status}` };
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const result: DetailScraperResult = {};

    // Extract price - multiple selectors
    const priceSelectors = [
      '.event-price',
      '.price-info',
      '[class*="price"]',
      '.event-details__price',
      '.event-info-price',
      '[itemprop="price"]',
    ];

    for (const selector of priceSelectors) {
      const priceText = $(selector).first().text().trim();
      if (priceText && priceText.length > 0) {
        result.price = cleanPriceText(priceText);
        result.priceDetails = priceText;
        console.log(`[DETAIL-SCRAPER] Found price: ${result.price}`);
        break;
      }
    }

    // Fallback: search in text
    if (!result.price) {
      const textContent = $('body').text();
      const priceMatch = extractPriceFromText(textContent);
      if (priceMatch) {
        result.price = priceMatch;
        console.log(`[DETAIL-SCRAPER] Found price in text: ${priceMatch}`);
      }
    }

    // Extract ticket URL
    const ticketLinkSelectors = [
      'a[href*="ticket"]',
      'a[href*="karten"]',
      'a[href*="booking"]',
      'a[href*="buchung"]',
      '.buy-ticket',
      '.ticket-link',
      '[class*="ticket"]',
    ];

    for (const selector of ticketLinkSelectors) {
      const ticketHref = $(selector).attr('href');
      if (ticketHref) {
        result.ticketUrl = ticketHref.startsWith('http') 
          ? ticketHref 
          : `https://www.wien.info${ticketHref}`;
        console.log(`[DETAIL-SCRAPER] Found ticket URL`);
        break;
      }
    }

    // Extract detailed description
    const descSelectors = [
      '.event-description',
      '.description',
      '[class*="description"]',
      '.event-details__description',
      'article p',
      '.event-content',
    ];

    for (const selector of descSelectors) {
      const descText = $(selector).text().trim();
      if (descText && descText.length > 100) {
        result.detailedDescription = descText.substring(0, 1000);
        break;
      }
    }

    // Extract organizer
    const organizerSelectors = [
      '.event-organizer',
      '.organizer',
      '[class*="organizer"]',
      '.event-details__organizer',
      '[itemprop="organizer"]',
    ];

    for (const selector of organizerSelectors) {
      const organizerText = $(selector).text().trim();
      if (organizerText) {
        result.organizer = organizerText;
        break;
      }
    }

    // Extract accessibility
    const accessibilitySelectors = [
      '.accessibility',
      '.barrier-free',
      '[class*="accessibility"]',
      '[class*="barrierfrei"]',
    ];

    for (const selector of accessibilitySelectors) {
      const accessText = $(selector).text().trim();
      if (accessText) {
        result.accessibility = accessText;
        break;
      }
    }

    // Extract phone
    const phoneMatch = html.match(/(?:tel|phone|telefon)[:\s]*([+\d\s()-]+)/i);
    if (phoneMatch) {
      result.phoneNumber = phoneMatch[1].trim();
    }

    // Extract email
    const emailMatch = html.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    if (emailMatch) {
      result.email = emailMatch[1];
    }

    console.log(`[DETAIL-SCRAPER] ✓ Scraped details`);
    return result;

  } catch (error: any) {
    console.error(`[DETAIL-SCRAPER] ✗ Error:`, error.message);
    return { error: error.message };
  }
}

/**
 * Batch scrape detail pages with rate limiting
 */
export async function batchScrapeWienInfoDetails(
  events: Array<{ website_url?: string }>,
  options: {
    maxConcurrent?: number;
    delayMs?: number;
    maxRetries?: number;
  } = {}
): Promise<Map<string, DetailScraperResult>> {
  const {
    maxConcurrent = 3,
    delayMs = 1000,
    maxRetries = 2,
  } = options;

  const results = new Map<string, DetailScraperResult>();
  const urls = events
    .filter(e => e.website_url)
    .map(e => e.website_url!)
    .filter((url, index, self) => self.indexOf(url) === index); // Deduplicate

  console.log(`[DETAIL-SCRAPER] Processing ${urls.length} event detail pages`);

  const queue = [...urls];
  const inProgress: Promise<void>[] = [];

  const processUrl = async (url: string, retryCount = 0): Promise<void> => {
    try {
      const result = await scrapeWienInfoDetailPage(url);
      
      if (result.error && retryCount < maxRetries) {
        console.log(`[DETAIL-SCRAPER] Retrying ${url} (${retryCount + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delayMs * 2));
        return processUrl(url, retryCount + 1);
      }

      results.set(url, result);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    } catch (error: any) {
      console.error(`[DETAIL-SCRAPER] Failed ${url}:`, error.message);
      results.set(url, { error: error.message });
    }
  };

  while (queue.length > 0 || inProgress.length > 0) {
    while (inProgress.length < maxConcurrent && queue.length > 0) {
      const url = queue.shift()!;
      const promise = processUrl(url).then(() => {
        const index = inProgress.indexOf(promise);
        if (index > -1) inProgress.splice(index, 1);
      });
      inProgress.push(promise);
    }

    if (inProgress.length > 0) {
      await Promise.race(inProgress);
    }
  }

  console.log(`[DETAIL-SCRAPER] ✓ Completed: ${results.size}/${urls.length} pages`);
  return results;
}
