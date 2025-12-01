/**
 * Wien.info Event Detail Scraper
 * 
 * Fetches Wien.info event URLs from Supabase and scrapes the event detail pages
 * to extract:
 * - Event start times (currently missing in API data)
 * - Event end times (if available)
 * - Detailed descriptions
 * - Venue details
 * - Price information
 * 
 * The Wien.info API only returns date-only strings (e.g., "2025-12-06"),
 * but the event detail pages contain full time information (e.g., "19:30 Uhr").
 * 
 * Rate limiting is implemented to avoid overwhelming wien.info servers.
 */

import { supabaseAdmin } from '@/lib/supabase/client';
import pThrottle from 'p-throttle';

// ═══════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════

export interface ScrapedEventData {
  /** Time slots with date and time */
  timeSlots: Array<{
    date: string;      // DD.MM.YYYY format from page
    dateISO: string;   // YYYY-MM-DD format (converted)
    time: string;      // HH:mm format
    dayOfWeek: string; // Mo, Di, Mi, etc.
  }>;
  /** Venue name */
  venueName?: string;
  /** Venue address */
  venueAddress?: string;
  /** Venue phone */
  venuePhone?: string;
  /** Full description from meta tags or page content */
  description?: string;
  /** Event category */
  category?: string;
}

export interface ScraperOptions {
  /** If true, log actions but do not write to database */
  dryRun?: boolean;
  /** Maximum number of events to scrape */
  limit?: number;
  /** Enable verbose debug logging */
  debug?: boolean;
  /** Requests per second limit (default: 2) */
  rateLimit?: number;
  /** Only scrape events that have 00:00 as start time */
  onlyMissingTimes?: boolean;
}

export interface ScraperResult {
  success: boolean;
  eventsScraped: number;
  eventsUpdated: number;
  eventsFailed: number;
  duration: number;
  errors: string[];
}

// ═══════════════════════════════════════════════════════════════
// MAIN SCRAPER CLASS
// ═══════════════════════════════════════════════════════════════

export class WienInfoScraper {
  private options: Required<ScraperOptions>;
  private throttle: ReturnType<typeof pThrottle>;
  private errors: string[] = [];

  constructor(options: ScraperOptions = {}) {
    this.options = {
      dryRun: options.dryRun ?? false,
      limit: options.limit ?? 100,
      debug: options.debug ?? false,
      rateLimit: options.rateLimit ?? 2,
      onlyMissingTimes: options.onlyMissingTimes ?? true,
    };

    // Create throttle function to limit requests per second
    this.throttle = pThrottle({
      limit: this.options.rateLimit,
      interval: 1000,
    });
  }

  /**
   * Throttled fetch wrapper
   */
  private async throttledFetch(url: string): Promise<string | null> {
    const throttledFn = this.throttle(async () => this.fetchPage(url));
    return throttledFn();
  }

  private log(message: string, level: 'info' | 'debug' | 'warn' | 'error' = 'info'): void {
    const prefix = '[WIEN-INFO-SCRAPER]';
    if (level === 'debug' && !this.options.debug) return;
    
    switch (level) {
      case 'error':
        console.error(`${prefix} ${message}`);
        break;
      case 'warn':
        console.warn(`${prefix} ${message}`);
        break;
      case 'debug':
        console.log(`${prefix} [DEBUG] ${message}`);
        break;
      default:
        console.log(`${prefix} ${message}`);
    }
  }

  /**
   * Fetch a web page with proper headers
   */
  private async fetchPage(url: string): Promise<string | null> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8',
        },
        signal: AbortSignal.timeout(30000), // 30 second timeout
      });

      if (!response.ok) {
        this.log(`HTTP ${response.status} for ${url}`, 'warn');
        return null;
      }

      return await response.text();
    } catch (error: any) {
      this.log(`Failed to fetch ${url}: ${error.message}`, 'error');
      return null;
    }
  }

  /**
   * Parse time slots from the "Termine" section of the event page
   * 
   * HTML structure:
   * <h2>Termine</h2>
   * <ul>
   *   <li>
   *     <span>Di</span>
   *     <span>
   *       <span>02.12.2025</span>
   *       <span><span>19:30</span><span>Uhr</span></span>
   *     </span>
   *   </li>
   * </ul>
   * 
   * Note: We use regex-based parsing instead of a full HTML parser (like jsdom/cheerio)
   * to avoid adding new dependencies. The regex patterns are designed to handle the
   * known Wien.info HTML structure. If the site structure changes significantly,
   * these patterns may need updating.
   */
  private parseTimeSlots(html: string): ScrapedEventData['timeSlots'] {
    const timeSlots: ScrapedEventData['timeSlots'] = [];

    // Find the Termine section
    const termineMatch = html.match(/<h2[^>]*>Termine<\/h2>([\s\S]*?)(?=<\/div>\s*<div class="h-\[1px\]|<h2|<\/article)/i);
    if (!termineMatch) {
      this.log('No Termine section found', 'debug');
      return timeSlots;
    }

    const termineSection = termineMatch[1];

    // Extract individual time entries from list items
    // Pattern matches: day of week, date (DD.MM.YYYY), time (HH:mm)
    const entryRegex = /<li[^>]*>[\s\S]*?<span[^>]*>([A-Za-z]{2})<\/span>[\s\S]*?<span[^>]*>(\d{2}\.\d{2}\.\d{4})<\/span>[\s\S]*?<span>(\d{2}:\d{2})<\/span>/gi;
    
    let match;
    while ((match = entryRegex.exec(termineSection)) !== null) {
      const dayOfWeek = match[1];
      const dateStr = match[2]; // DD.MM.YYYY
      const time = match[3];    // HH:mm

      // Convert DD.MM.YYYY to YYYY-MM-DD
      const [day, month, year] = dateStr.split('.');
      const dateISO = `${year}-${month}-${day}`;

      timeSlots.push({
        date: dateStr,
        dateISO,
        time,
        dayOfWeek,
      });
    }

    this.log(`Found ${timeSlots.length} time slots`, 'debug');
    return timeSlots;
  }

  /**
   * Parse venue information from the "Veranstaltungsort" section
   */
  private parseVenueInfo(html: string): { name?: string; address?: string; phone?: string } {
    const venueInfo: { name?: string; address?: string; phone?: string } = {};

    // Find venue section - use a more flexible pattern
    const venueMatch = html.match(/<h2[^>]*>Veranstaltungsort<\/h2>([\s\S]*?)(?=<\/div>\s*<div class="h-\[1px\]|<h2[^>]*>|<\/article|<\/body)/i);
    if (!venueMatch) {
      this.log('No venue section found', 'debug');
      return venueInfo;
    }

    const venueSection = venueMatch[1];

    // Extract venue name from itemprop="name" (can be in h3 or other tags)
    // Pattern handles: <h3 itemprop="name">text</h3> or itemprop="name">text<
    const nameMatch = venueSection.match(/<h3[^>]*\s+itemprop="name"[^>]*>([^<]+)</i)
      || venueSection.match(/<[^>]+itemprop="name"[^>]*>([^<]+)</i)
      || venueSection.match(/itemprop="name"[^>]*>([^<]+)</i);
    if (nameMatch) {
      venueInfo.name = nameMatch[1].trim();
    }

    // Extract address from <address> tag
    const addressMatch = venueSection.match(/<address[^>]*>([^<]+)</i);
    if (addressMatch) {
      venueInfo.address = addressMatch[1].trim();
    }

    // Extract phone from itemprop="telephone"
    const phoneMatch = venueSection.match(/itemprop="telephone"[^>]*>([^<]+)</i)
      || venueSection.match(/<[^>]+itemprop="telephone">([^<]+)</i);
    if (phoneMatch) {
      venueInfo.phone = phoneMatch[1].trim();
    }

    return venueInfo;
  }

  /**
   * Parse description from meta tags
   */
  private parseDescription(html: string): string | undefined {
    // Try og:description first
    const ogMatch = html.match(/<meta\s+property="og:description"\s+content="([^"]+)"/i)
      || html.match(/<meta\s+content="([^"]+)"\s+property="og:description"/i);
    if (ogMatch) {
      return this.decodeHtmlEntities(ogMatch[1]);
    }

    // Fall back to meta description
    const metaMatch = html.match(/<meta\s+name="description"\s+content="([^"]+)"/i)
      || html.match(/<meta\s+content="([^"]+)"\s+name="description"/i);
    if (metaMatch) {
      return this.decodeHtmlEntities(metaMatch[1]);
    }

    return undefined;
  }

  /**
   * Parse category from page content
   */
  private parseCategory(html: string): string | undefined {
    // Look for category in the structured section (svg icon + category text)
    const categoryMatch = html.match(/<svg[^>]*masks\.svg[^>]*>[\s\S]*?<\/svg>\s*([^<]+)/i);
    if (categoryMatch) {
      return categoryMatch[1].trim();
    }

    // Fall back to keywords meta tag
    const keywordsMatch = html.match(/<meta\s+name="keywords"\s+content="([^"]+)"/i);
    if (keywordsMatch) {
      const keywords = keywordsMatch[1].split(',');
      if (keywords.length > 0) {
        return keywords[0].trim();
      }
    }

    return undefined;
  }

  /**
   * Decode HTML entities
   * Note: We decode &amp; last to avoid double-decoding issues
   * (e.g., &amp;lt; should become &lt;, not <)
   */
  private decodeHtmlEntities(text: string): string {
    return text
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&');  // Decode &amp; last to avoid double-decoding
  }

  /**
   * Scrape a single event page
   */
  async scrapeEventPage(url: string): Promise<ScrapedEventData | null> {
    this.log(`Scraping: ${url}`, 'debug');

    const html = await this.throttledFetch(url);
    if (!html) {
      return null;
    }

    const timeSlots = this.parseTimeSlots(html);
    const venueInfo = this.parseVenueInfo(html);
    const description = this.parseDescription(html);
    const category = this.parseCategory(html);

    return {
      timeSlots,
      venueName: venueInfo.name,
      venueAddress: venueInfo.address,
      venuePhone: venueInfo.phone,
      description,
      category,
    };
  }

  /**
   * Get Wien.info events from database that need scraping
   */
  async getEventsToScrape(): Promise<Array<{
    id: string;
    title: string;
    source_url: string;
    start_date_time: string;
  }>> {
    // Build base query
    const { data, error } = await supabaseAdmin
      .from('events')
      .select('id, title, source_url, start_date_time')
      .eq('source', 'wien.info')
      .not('source_url', 'is', null)
      .like('source_url', '%wien.info%')
      .order('start_date_time', { ascending: true })
      .limit(this.options.limit);

    if (error) {
      this.log(`Error fetching events: ${error.message}`, 'error');
      return [];
    }

    // Type assertion since we know the structure from the select clause
    const events = (data || []) as Array<{
      id: string;
      title: string;
      source_url: string | null;
      start_date_time: string;
    }>;

    // Filter events with valid source_url
    let filteredEvents = events.filter(
      (e): e is { id: string; title: string; source_url: string; start_date_time: string } => 
        e.source_url !== null
    );

    // If onlyMissingTimes is true, filter to events with 00:00:00 time (no specific time set)
    if (this.options.onlyMissingTimes) {
      filteredEvents = filteredEvents.filter(e => {
        // Check if the time portion is 00:00:00 (midnight = no specific time)
        const dateStr = e.start_date_time;
        return dateStr.includes('T00:00:00') || dateStr.includes(' 00:00:00');
      });
    }

    return filteredEvents;
  }

  /**
   * Update an event with scraped data
   */
  async updateEventWithScrapedData(
    eventId: string,
    eventTitle: string,
    currentStartDateTime: string,
    scrapedData: ScrapedEventData
  ): Promise<boolean> {
    // Find the matching time slot for this event's date
    const currentDate = currentStartDateTime.split('T')[0]; // YYYY-MM-DD
    
    const matchingSlot = scrapedData.timeSlots.find(
      slot => slot.dateISO === currentDate
    );

    if (!matchingSlot) {
      this.log(`No matching time slot found for ${eventTitle} on ${currentDate}`, 'debug');
      // If no exact match, use the first time slot if available
      if (scrapedData.timeSlots.length > 0) {
        const firstSlot = scrapedData.timeSlots[0];
        this.log(`Using first available time slot: ${firstSlot.dateISO} ${firstSlot.time}`, 'debug');
      } else {
        return false;
      }
    }

    const timeSlot = matchingSlot || scrapedData.timeSlots[0];
    if (!timeSlot) {
      return false;
    }

    // Build updated timestamp
    const newStartDateTime = `${timeSlot.dateISO}T${timeSlot.time}:00.000Z`;

    // Build update object
    const updateData: Record<string, any> = {
      start_date_time: newStartDateTime,
      updated_at: new Date().toISOString(),
    };

    // Add description if we have a better one
    if (scrapedData.description) {
      updateData.description = scrapedData.description;
    }

    // Add venue info if we scraped it
    // Note: We always update venue info when we have scraped data since we're enriching the record
    if (scrapedData.venueName) {
      updateData.custom_venue_name = scrapedData.venueName;
    }
    if (scrapedData.venueAddress) {
      updateData.custom_venue_address = scrapedData.venueAddress;
    }

    if (this.options.dryRun) {
      this.log(`[DRY-RUN] Would update event ${eventTitle}: ${currentStartDateTime} -> ${newStartDateTime}`, 'info');
      return true;
    }

    // Use type assertion for the update operation due to Supabase SDK type inference limitations
    // See: EventRepository.ts for similar pattern used across the codebase
    const { error } = await (supabaseAdmin as any)
      .from('events')
      .update(updateData)
      .eq('id', eventId);

    if (error) {
      this.log(`Error updating event ${eventTitle}: ${error.message}`, 'error');
      this.errors.push(`Failed to update ${eventTitle}: ${error.message}`);
      return false;
    }

    this.log(`Updated ${eventTitle}: ${timeSlot.time}`, 'info');
    return true;
  }

  /**
   * Run the scraper
   */
  async run(): Promise<ScraperResult> {
    const startTime = Date.now();
    this.errors = [];

    this.log('Starting Wien.info event scraper...');
    if (this.options.dryRun) {
      this.log('Running in DRY-RUN mode (no database writes)');
    }

    // Get events to scrape
    const events = await this.getEventsToScrape();
    this.log(`Found ${events.length} events to scrape`);

    if (events.length === 0) {
      return {
        success: true,
        eventsScraped: 0,
        eventsUpdated: 0,
        eventsFailed: 0,
        duration: Date.now() - startTime,
        errors: [],
      };
    }

    let eventsScraped = 0;
    let eventsUpdated = 0;
    let eventsFailed = 0;

    for (const event of events) {
      try {
        const scrapedData = await this.scrapeEventPage(event.source_url);
        eventsScraped++;

        if (!scrapedData || scrapedData.timeSlots.length === 0) {
          this.log(`No time data found for: ${event.title}`, 'warn');
          eventsFailed++;
          this.errors.push(`No time data for: ${event.title}`);
          continue;
        }

        const updated = await this.updateEventWithScrapedData(
          event.id,
          event.title,
          event.start_date_time,
          scrapedData
        );

        if (updated) {
          eventsUpdated++;
        } else {
          eventsFailed++;
        }

      } catch (error: any) {
        eventsFailed++;
        this.errors.push(`Error scraping ${event.title}: ${error.message}`);
        this.log(`Error scraping ${event.title}: ${error.message}`, 'error');
      }
    }

    const duration = Date.now() - startTime;

    this.log(`Scraping complete: ${eventsUpdated} updated, ${eventsFailed} failed in ${duration}ms`);

    return {
      success: eventsFailed === 0,
      eventsScraped,
      eventsUpdated,
      eventsFailed,
      duration,
      errors: this.errors,
    };
  }
}

// ═══════════════════════════════════════════════════════════════
// CONVENIENCE FUNCTION
// ═══════════════════════════════════════════════════════════════

/**
 * Run the Wien.info scraper with the given options
 */
export async function scrapeWienInfoEvents(
  options: ScraperOptions = {}
): Promise<ScraperResult> {
  const scraper = new WienInfoScraper(options);
  return scraper.run();
}
