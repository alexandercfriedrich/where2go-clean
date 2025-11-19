// app/lib/db/venueStore.ts

import { VenueRepository } from '../repositories/VenueRepository';
import { scrapeVenueFromUrl, generateVenueSlug, isValidVenueResult } from '../../../lib/sources/wienInfoVenueScraper';
import type { VenueData, VenueScraperResult } from '../types';

/**
 * Converts VenueScraperResult to database-ready VenueData
 */
function convertScraperResultToVenueData(scraperResult: VenueScraperResult, source: string = 'wien.info'): any {
  const venueSlug = generateVenueSlug(scraperResult.name);
  
  return {
    venue_slug: venueSlug,
    name: scraperResult.name,
    street: scraperResult.street || null,
    street_number: scraperResult.street_number || null,
    postal_code: scraperResult.postal_code || null,
    city: scraperResult.city || 'Wien',
    country: scraperResult.country || 'Austria',
    full_address: scraperResult.full_address || null,
    phone: scraperResult.phone || null,
    email: scraperResult.email || null,
    website: scraperResult.website || null,
    latitude: scraperResult.latitude || null,
    longitude: scraperResult.longitude || null,
    description: scraperResult.description || null,
    accessibility_info: scraperResult.accessibility_info || null,
    source,
  };
}

/**
 * Scrapes venue from Wien.info event URL and stores it in database
 * Returns venue ID if successful
 */
export async function scrapeAndStoreVenue(eventUrl: string): Promise<string | null> {
  try {
    // Scrape venue information
    const scraperResult = await scrapeVenueFromUrl(eventUrl);
    
    if (!isValidVenueResult(scraperResult)) {
      console.warn('[venueStore] Invalid venue scraper result for URL:', eventUrl);
      return null;
    }

    // Convert to database format
    const venueData = convertScraperResultToVenueData(scraperResult, 'wien.info');

    // Upsert venue (insert or get existing ID)
    const venueId = await VenueRepository.upsertVenue(venueData);

    if (!venueId) {
      console.error('[venueStore] Failed to upsert venue:', scraperResult.name);
      return null;
    }

    console.log('[venueStore] Successfully stored venue:', scraperResult.name, '(ID:', venueId, ')');
    return venueId;
  } catch (error) {
    console.error('[venueStore] Error in scrapeAndStoreVenue:', error);
    return null;
  }
}

/**
 * Gets venue ID by name and city, or creates it from scraper result
 * Useful when you already have venue info from event scraping
 */
export async function getOrCreateVenue(
  venueName: string, 
  city: string,
  scraperResult?: VenueScraperResult
): Promise<string | null> {
  try {
    // First, check if venue already exists
    const existingVenue = await VenueRepository.getVenueByName(venueName, city);
    
    if (existingVenue) {
      return existingVenue.id;
    }

    // If no scraper result provided, we can't create the venue
    if (!scraperResult) {
      console.warn('[venueStore] Venue not found and no scraper result provided:', venueName);
      return null;
    }

    // Create new venue from scraper result
    const venueData = convertScraperResultToVenueData(scraperResult, 'wien.info');
    const venueId = await VenueRepository.upsertVenue(venueData);

    if (!venueId) {
      console.error('[venueStore] Failed to create venue:', venueName);
      return null;
    }

    console.log('[venueStore] Created new venue:', venueName, '(ID:', venueId, ')');
    return venueId;
  } catch (error) {
    console.error('[venueStore] Error in getOrCreateVenue:', error);
    return null;
  }
}

/**
 * Batch process multiple venues from event URLs
 * Returns map of URL -> venue ID
 */
export async function batchScrapeAndStoreVenues(
  eventUrls: string[]
): Promise<Map<string, string>> {
  const results = new Map<string, string>();

  for (const url of eventUrls) {
    const venueId = await scrapeAndStoreVenue(url);
    if (venueId) {
      results.set(url, venueId);
    }
    
    // Rate limiting: wait 1 second between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`[venueStore] Batch processed ${results.size}/${eventUrls.length} venues`);
  return results;
}
