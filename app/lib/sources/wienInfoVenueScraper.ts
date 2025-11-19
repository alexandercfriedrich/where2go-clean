// lib/sources/wienInfoVenueScraper.ts

import * as cheerio from 'cheerio';
import type { VenueScraperResult } from '@/app/lib/types';

/**
 * Generates a URL-safe slug from venue name
 * Beispiel: "Arnold Schönberg Center" -> "arnold-schonberg-center"
 */
export function generateVenueSlug(venueName: string): string {
  return venueName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[äöüß]/g, (match) => {
      const map: Record<string, string> = { 
        'ä': 'ae', 
        'ö': 'oe', 
        'ü': 'ue',
        'ß': 'ss'
      };
      return map[match] || match;
    })
    .replace(/[^\w\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-') // Replace spaces with dashes
    .replace(/-+/g, '-') // Remove duplicate dashes
    .replace(/^-+|-+$/g, '') // Trim dashes
    .trim();
}

/**
 * Parses a full address string into components
 * Beispiel: "Johannesgasse 33, 1010 Wien" -> { street: "Johannesgasse", street_number: "33", ... }
 */
export function parseAddress(fullAddress: string): {
  street?: string;
  street_number?: string;
  postal_code?: string;
  city?: string;
} {
  const result: any = {};
  
  // Pattern 1: Street Number, Postal Code City
  // "Johannesgasse 33, 1010 Wien"
  const pattern1 = /^([^,\d]+)\s+(\d+[a-z]?)\s*,?\s*(\d{4})\s+(.+)$/i;
  const match1 = fullAddress.match(pattern1);
  
  if (match1) {
    result.street = match1[1].trim();
    result.street_number = match1[2].trim();
    result.postal_code = match1[3].trim();
    result.city = match1[4].trim();
    return result;
  }
  
  // Pattern 2: Street, Postal Code City (no number)
  // "Ringstraße, 1010 Wien"
  const pattern2 = /^([^,]+)\s*,\s*(\d{4})\s+(.+)$/i;
  const match2 = fullAddress.match(pattern2);
  
  if (match2) {
    const streetPart = match2[1].trim();
    const numberMatch = streetPart.match(/^(.+?)\s+(\d+[a-z]?)$/i);
    
    if (numberMatch) {
      result.street = numberMatch[1].trim();
      result.street_number = numberMatch[2].trim();
    } else {
      result.street = streetPart;
    }
    
    result.postal_code = match2[2].trim();
    result.city = match2[3].trim();
    return result;
  }
  
  // Pattern 3: Just extract postal code and city
  const pattern3 = /(\d{4})\s+(.+)$/;
  const match3 = fullAddress.match(pattern3);
  
  if (match3) {
    result.postal_code = match3[1].trim();
    result.city = match3[2].trim();
  }
  
  return result;
}

/**
 * Extracts phone number from text
 */
export function extractPhoneNumber(text: string): string | undefined {
  const patterns = [
    /(?:tel|telefon|phone)[:\s]*([+\d\s()/-]+)/i,
    /([+]43\s*\d[\d\s/-]{8,})/i,
    /(\d{3,4}[\s/-]\d{3,})/,
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1].trim().replace(/\s+/g, ' ');
    }
  }
  
  return undefined;
}

/**
 * Extracts email from text
 */
export function extractEmail(text: string): string | undefined {
  const match = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  return match ? match[1] : undefined;
}

/**
 * Scrapes venue information from wien.info event detail page
 */
export async function scrapeVenueFromDetailPage(
  url: string,
  venueName: string,
  timeout: number = 8000
): Promise<VenueScraperResult> {
  try {
    console.log(`[VENUE-SCRAPER] Fetching: ${url}`);
    
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
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const result: VenueScraperResult = {
      name: venueName,
      city: 'Wien',
      country: 'Austria',
    };

    // Extract address - Multiple selectors for robustness
    const addressSelectors = [
      '.event-location',
      '.location-address',
      '.venue-address',
      '[class*="address"]',
      '[itemprop="address"]',
      '.event-details__location',
      '.event-info__location',
    ];

    for (const selector of addressSelectors) {
      const addressText = $(selector).text().trim();
      if (addressText && addressText.length > 5 && !result.full_address) {
        result.full_address = addressText;
        const parsed = parseAddress(addressText);
        Object.assign(result, parsed);
        console.log(`[VENUE-SCRAPER] Found address: ${addressText}`);
        break;
      }
    }

    // Try structured data (JSON-LD)
    const jsonLdScripts = $('script[type="application/ld+json"]');
    jsonLdScripts.each((_, script) => {
      try {
        const jsonText = $(script).html();
        if (!jsonText) return;
        
        const data = JSON.parse(jsonText);
        
        // Handle array of JSON-LD objects
        const jsonLdData = Array.isArray(data) ? data[0] : data;
        
        if (jsonLdData.location?.address) {
          const addr = jsonLdData.location.address;
          result.street = addr.streetAddress || result.street;
          result.postal_code = addr.postalCode || result.postal_code;
          result.city = addr.addressLocality || result.city || 'Wien';
          result.country = addr.addressCountry || result.country || 'Austria';
          
          if (!result.full_address && addr.streetAddress && addr.postalCode) {
            result.full_address = `${addr.streetAddress}, ${addr.postalCode} ${addr.addressLocality || 'Wien'}`;
          }
          
          console.log(`[VENUE-SCRAPER] Found JSON-LD address`);
        }
        
        if (jsonLdData.location?.geo) {
          result.latitude = parseFloat(jsonLdData.location.geo.latitude);
          result.longitude = parseFloat(jsonLdData.location.geo.longitude);
          console.log(`[VENUE-SCRAPER] Found coordinates: ${result.latitude}, ${result.longitude}`);
        }
      } catch (e) {
        // Ignore JSON parsing errors
      }
    });

    // Extract coordinates from map links
    const mapLink = $('a[href*="maps.google"], a[href*="openstreetmap"]').attr('href');
    if (mapLink && !result.latitude) {
      const coordMatch = mapLink.match(/[-]?\d+\.\d+,[-]?\d+\.\d+/);
      if (coordMatch) {
        const [lat, lng] = coordMatch[0].split(',');
        result.latitude = parseFloat(lat);
        result.longitude = parseFloat(lng);
        console.log(`[VENUE-SCRAPER] Found coordinates from map link`);
      }
    }

    // Extract phone number
    const phoneSelectors = [
      '.contact-info',
      '.venue-contact',
      '[class*="phone"]',
      '[class*="tel"]',
      '[itemprop="telephone"]',
    ];
    
    for (const selector of phoneSelectors) {
      const phoneText = $(selector).text();
      if (phoneText) {
        const phone = extractPhoneNumber(phoneText);
        if (phone) {
          result.phone = phone;
          console.log(`[VENUE-SCRAPER] Found phone: ${phone}`);
          break;
        }
      }
    }
    
    // Fallback: search entire HTML for phone
    if (!result.phone) {
      result.phone = extractPhoneNumber(html);
    }

    // Extract email
    result.email = extractEmail(html);
    if (result.email) {
      console.log(`[VENUE-SCRAPER] Found email: ${result.email}`);
    }

    // Extract website (external link, not wien.info)
    const websiteSelectors = [
      'a[href^="http"]:not([href*="wien.info"])',
      '.venue-website a',
      '.website-link',
    ];

    for (const selector of websiteSelectors) {
      const href = $(selector).attr('href');
      if (href && href.startsWith('http') && !href.includes('wien.info') && !href.includes('maps.google')) {
        result.website = href;
        console.log(`[VENUE-SCRAPER] Found website: ${href}`);
        break;
      }
    }

    // Extract venue description
    const venueDescSelectors = [
      '.venue-description',
      '.location-description',
      '[class*="venue"][class*="description"]',
    ];

    for (const selector of venueDescSelectors) {
      const descText = $(selector).text().trim();
      if (descText && descText.length > 20) {
        result.description = descText.substring(0, 500);
        break;
      }
    }

    // Extract accessibility information
    const accessibilitySelectors = [
      '.accessibility',
      '.barrier-free',
      '[class*="accessibility"]',
      '[class*="barrierfrei"]',
      '.wheelchair-accessible',
    ];

    for (const selector of accessibilitySelectors) {
      const accessText = $(selector).text().trim();
      if (accessText) {
        result.accessibility_info = accessText;
        console.log(`[VENUE-SCRAPER] Found accessibility info`);
        break;
      }
    }

    console.log(`[VENUE-SCRAPER] ✓ Scraped venue: ${venueName}`);
    return result;

  } catch (error: any) {
    console.error(`[VENUE-SCRAPER] ✗ Error scraping ${url}:`, error.message);
    
    // Return minimal venue data even on error
    return {
      name: venueName,
      city: 'Wien',
      country: 'Austria',
    };
  }
}

/**
 * Batch scrape venue information with deduplication and rate limiting
 */
export async function batchScrapeVenues(
  eventsWithUrls: Array<{ venue: string; url: string }>,
  options: {
    maxConcurrent?: number;
    delayMs?: number;
    maxRetries?: number;
  } = {}
): Promise<Map<string, VenueScraperResult>> {
  const {
    maxConcurrent = 2,
    delayMs = 1500,
    maxRetries = 2,
  } = options;

  const results = new Map<string, VenueScraperResult>();
  const uniqueVenues = new Map<string, string>();
  
  // Deduplicate venues by name
  for (const { venue, url } of eventsWithUrls) {
    if (venue && url && !uniqueVenues.has(venue)) {
      uniqueVenues.set(venue, url);
    }
  }

  console.log(`[VENUE-SCRAPER] Processing ${uniqueVenues.size} unique venues`);

  const queue = Array.from(uniqueVenues.entries());
  const inProgress: Promise<void>[] = [];

  const processVenue = async (
    venueName: string,
    url: string,
    retryCount = 0
  ): Promise<void> => {
    try {
      const result = await scrapeVenueFromDetailPage(url, venueName);
      results.set(venueName, result);
      
      // Rate limiting delay
      await new Promise(resolve => setTimeout(resolve, delayMs));
    } catch (error: any) {
      if (retryCount < maxRetries) {
        console.log(`[VENUE-SCRAPER] Retrying ${venueName} (${retryCount + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delayMs * 2));
        return processVenue(venueName, url, retryCount + 1);
      }
      
      console.error(`[VENUE-SCRAPER] Failed ${venueName} after ${maxRetries} retries`);
      
      // Store minimal venue data on failure
      results.set(venueName, {
        name: venueName,
        city: 'Wien',
        country: 'Austria',
      });
    }
  };

  // Process queue with concurrency limit
  while (queue.length > 0 || inProgress.length > 0) {
    while (inProgress.length < maxConcurrent && queue.length > 0) {
      const [venueName, url] = queue.shift()!;
      const promise = processVenue(venueName, url).then(() => {
        const index = inProgress.indexOf(promise);
        if (index > -1) inProgress.splice(index, 1);
      });
      inProgress.push(promise);
    }

    if (inProgress.length > 0) {
      await Promise.race(inProgress);
    }
  }

  console.log(`[VENUE-SCRAPER] ✓ Completed: ${results.size}/${uniqueVenues.size} venues`);
  return results;
}
