// lib/sources/wienInfoVenueScraper.ts

import * as cheerio from 'cheerio';
import type { VenueScraperResult } from '../../app/lib/types';

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
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Extracts structured venue information from Wien.info event detail page
 * @param html - The HTML content of the event detail page
 * @returns VenueScraperResult with extracted venue data
 */
export function scrapeVenueFromEventPage(html: string): VenueScraperResult | null {
  try {
    const $ = cheerio.load(html);
    
    // Find venue name
    const venueName = $('.location-name').text().trim() || 
                      $('[itemprop="location"] [itemprop="name"]').text().trim() ||
                      $('.event-venue').text().trim();
    
    if (!venueName) {
      console.warn('No venue name found in HTML');
      return null;
    }

    // Extract address components
    const addressBlock = $('.location-address, .event-location, [itemprop="location"] [itemprop="address"]');
    const streetAddress = addressBlock.find('[itemprop="streetAddress"]').text().trim() ||
                         addressBlock.find('.street').text().trim();
    const postalCode = addressBlock.find('[itemprop="postalCode"]').text().trim() ||
                       addressBlock.find('.postal-code').text().trim();
    const city = addressBlock.find('[itemprop="addressLocality"]').text().trim() ||
                 addressBlock.find('.city').text().trim() ||
                 'Wien';
    const country = addressBlock.find('[itemprop="addressCountry"]').text().trim() || 'Austria';

    // Parse street and street number
    let street = '';
    let streetNumber = '';
    if (streetAddress) {
      const match = streetAddress.match(/^(.+?)\s+(\d+[a-zA-Z]*)$/);
      if (match) {
        street = match[1].trim();
        streetNumber = match[2].trim();
      } else {
        street = streetAddress;
      }
    }

    // Extract contact information
    const phone = $('.location-phone, [itemprop="telephone"]').text().trim() ||
                  $('a[href^="tel:"]').first().text().trim();
    const email = $('.location-email, [itemprop="email"]').text().trim() ||
                  $('a[href^="mailto:"]').first().text().trim();
    const website = $('.location-website, [itemprop="url"]').attr('href') ||
                    $('a.venue-website').attr('href') || '';

    // Extract description
    const description = $('.location-description, .venue-description').text().trim();

    // Extract accessibility info
    const accessibilityInfo = $('.accessibility-info, .barrier-free').text().trim();

    // Try to extract coordinates if available
    let latitude: number | undefined;
    let longitude: number | undefined;
    const latAttr = $('[data-lat], [data-latitude]').attr('data-lat') || 
                    $('[data-lat], [data-latitude]').attr('data-latitude');
    const lngAttr = $('[data-lng], [data-longitude]').attr('data-lng') || 
                    $('[data-lng], [data-longitude]').attr('data-longitude');
    
    if (latAttr && lngAttr) {
      latitude = parseFloat(latAttr);
      longitude = parseFloat(lngAttr);
    }

    // Build full address
    const addressParts = [];
    if (streetAddress) addressParts.push(streetAddress);
    if (postalCode) addressParts.push(postalCode);
    if (city) addressParts.push(city);
    if (country && country !== 'Austria') addressParts.push(country);
    const fullAddress = addressParts.join(', ');

    const result: VenueScraperResult = {
      name: venueName,
      street,
      street_number: streetNumber || undefined,
      postal_code: postalCode || undefined,
      city: city || 'Wien',
      country: country || 'Austria',
      full_address: fullAddress || undefined,
      phone: phone || undefined,
      email: email || undefined,
      website: website || undefined,
      latitude,
      longitude,
      description: description || undefined,
      accessibility_info: accessibilityInfo || undefined
    };

    return result;
  } catch (error) {
    console.error('Error scraping venue from event page:', error);
    return null;
  }
}

/**
 * Fetches and scrapes venue information from a Wien.info event URL
 * @param eventUrl - Full URL to the Wien.info event detail page
 * @returns VenueScraperResult or null if scraping fails
 */
export async function scrapeVenueFromUrl(eventUrl: string): Promise<VenueScraperResult | null> {
  try {
    const response = await fetch(eventUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Where2GoBot/1.0)',
      }
    });

    if (!response.ok) {
      console.error(`Failed to fetch event page: ${response.status} ${response.statusText}`);
      return null;
    }

    const html = await response.text();
    return scrapeVenueFromEventPage(html);
  } catch (error) {
    console.error('Error fetching venue from URL:', error);
    return null;
  }
}

/**
 * Validates a venue scraper result
 * @param result - The venue scraper result to validate
 * @returns true if the result has minimum required fields
 */
export function isValidVenueResult(result: VenueScraperResult | null): result is VenueScraperResult {
  return !!(result && result.name && result.name.length > 0);
}
