// lib/sources/wienInfoDetailScraper.ts

import * as cheerio from 'cheerio';
import type { DetailScraperResult } from '../../app/lib/types';

/**
 * Extracts detailed event information from Wien.info event detail page
 * This complements the basic event data with pricing, organizer, and other details
 * @param html - The HTML content of the event detail page
 * @returns DetailScraperResult with extracted details
 */
export function scrapeEventDetails(html: string): DetailScraperResult {
  try {
    const $ = cheerio.load(html);
    const result: DetailScraperResult = {};

    // Extract price information
    const priceElement = $('.event-price, [itemprop="offers"] [itemprop="price"]');
    if (priceElement.length > 0) {
      result.price = priceElement.first().text().trim();
    }

    // Extract price details (e.g., "Erwachsene: €10, Kinder: €5")
    const priceDetailsElement = $('.price-details, .ticket-info');
    if (priceDetailsElement.length > 0) {
      result.priceDetails = priceDetailsElement.text().trim();
    }

    // Extract ticket URL
    const ticketLink = $('a.ticket-link, a.buy-tickets, [href*="ticket"]').first();
    if (ticketLink.length > 0) {
      result.ticketUrl = ticketLink.attr('href') || undefined;
    }

    // Extract detailed description
    const descriptionElement = $('.event-description-full, .description-long, [itemprop="description"]');
    if (descriptionElement.length > 0) {
      result.detailedDescription = descriptionElement.text().trim();
    }

    // Extract organizer information
    const organizerElement = $('.event-organizer, [itemprop="organizer"] [itemprop="name"]');
    if (organizerElement.length > 0) {
      result.organizer = organizerElement.text().trim();
    }

    // Extract accessibility information
    const accessibilityElement = $('.accessibility, .barrier-free-info');
    if (accessibilityElement.length > 0) {
      result.accessibility = accessibilityElement.text().trim();
    }

    // Extract contact information
    const phoneElement = $('.event-phone, [itemprop="telephone"]');
    if (phoneElement.length > 0) {
      result.phoneNumber = phoneElement.text().trim();
    }

    const emailElement = $('.event-email, [itemprop="email"]');
    if (emailElement.length > 0) {
      result.email = emailElement.text().trim();
    }

    return result;
  } catch (error) {
    console.error('Error scraping event details:', error);
    return { error: String(error) };
  }
}

/**
 * Fetches and scrapes event details from a Wien.info event URL
 * @param eventUrl - Full URL to the Wien.info event detail page
 * @returns DetailScraperResult with extracted details
 */
export async function scrapeEventDetailsFromUrl(eventUrl: string): Promise<DetailScraperResult> {
  try {
    const response = await fetch(eventUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Where2GoBot/1.0)',
      }
    });

    if (!response.ok) {
      return { 
        error: `Failed to fetch event page: ${response.status} ${response.statusText}` 
      };
    }

    const html = await response.text();
    return scrapeEventDetails(html);
  } catch (error) {
    console.error('Error fetching event details from URL:', error);
    return { error: String(error) };
  }
}

/**
 * Parses price string to extract min and max values
 * Examples: "€10", "€10-€20", "ab €10", "Free"
 * @param priceString - Price string to parse
 * @returns Object with min and max price, or null if free/invalid
 */
export function parsePriceRange(priceString: string): { min?: number; max?: number } | null {
  if (!priceString) return null;

  const lowerPrice = priceString.toLowerCase();
  
  // Check if free
  if (lowerPrice.includes('free') || 
      lowerPrice.includes('frei') || 
      lowerPrice.includes('kostenlos') ||
      lowerPrice.includes('gratis')) {
    return { min: 0, max: 0 };
  }

  // Extract numeric values
  const numbers = priceString.match(/\d+(?:[.,]\d+)?/g);
  if (!numbers || numbers.length === 0) return null;

  const parsedNumbers = numbers.map(n => parseFloat(n.replace(',', '.')));

  if (parsedNumbers.length === 1) {
    // Single price or "ab €10" format
    if (lowerPrice.includes('ab') || lowerPrice.includes('from')) {
      return { min: parsedNumbers[0] };
    }
    return { min: parsedNumbers[0], max: parsedNumbers[0] };
  } else {
    // Price range
    return { 
      min: Math.min(...parsedNumbers), 
      max: Math.max(...parsedNumbers) 
    };
  }
}
