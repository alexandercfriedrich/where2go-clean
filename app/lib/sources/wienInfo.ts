/**
 * Wien.info Events Fetcher
 * - Fetches events directly from wien.info HTML (client-side scraping simulation)
 * - Filters by categories using F1 mappings
 * - Returns normalized events for aggregation
 */

import { EventData } from '@/lib/types';
import { getWienInfoF1IdsForCategories } from '@/event_mapping_wien_info';

interface FetchWienInfoOptions {
  fromISO: string;          // YYYY-MM-DD
  toISO: string;            // YYYY-MM-DD
  categories: string[];     // Main categories to filter for
  limit?: number;           // Maximum number of events to return
  debug?: boolean;          // Enable debug logging
  debugVerbose?: boolean;   // Enable verbose debug logging
}

interface WienInfoResult {
  events: EventData[];
  debugInfo?: {
    query: string;
    response: string;
    categories: string[];
    f1Ids: number[];
    url: string;
  };
}

/**
 * Fetches events from wien.info based on categories and date range
 */
export async function fetchWienInfoEvents(opts: FetchWienInfoOptions): Promise<WienInfoResult> {
  const { fromISO, toISO, categories, limit = 100, debug = false, debugVerbose = false } = opts;

  try {
    // Get F1 IDs for the requested categories
    const f1Ids = getWienInfoF1IdsForCategories(categories);
    
    if (f1Ids.length === 0) {
      if (debug) {
        console.log('[WIEN.INFO:FETCH] No F1 mappings found for categories:', categories);
      }
      return { events: [] };
    }

    // Build the wien.info URL (this would be the client-side URL)
    const f1Param = f1Ids.join(',');
    const url = `https://www.wien.info/en/now-on/events#/?dr=${fromISO},${toISO}&f1=${f1Param}`;
    
    // Create debug query description
    const debugQuery = `Wien.info events search for categories: ${categories.join(', ')} on ${fromISO}`;
    const debugResponse = `Mock response: Generated ${limit} sample events for wien.info categories. In production, this would scrape the actual events from the wien.info website using the URL: ${url}`;
    
    if (debug) {
      console.log('[WIEN.INFO:FETCH]', { 
        url,
        categories,
        f1Ids: f1Param,
        dateRange: `${fromISO} to ${toISO}`
      });
    }

    // For now, return mock events that simulate what would be fetched
    const mockEvents = generateMockWienInfoEvents(categories, fromISO, limit);
    
    if (debug) {
      console.log('[WIEN.INFO:FETCH] Retrieved', mockEvents.length, 'events');
      if (debugVerbose) {
        console.log('[WIEN.INFO:FETCH] Events:', mockEvents);
      }
    }

    const result: WienInfoResult = {
      events: mockEvents
    };

    // Include debug information if debug is enabled
    if (debug || debugVerbose) {
      result.debugInfo = {
        query: debugQuery,
        response: debugResponse,
        categories,
        f1Ids,
        url
      };
    }

    return result;

  } catch (error) {
    console.error('[WIEN.INFO:FETCH] Error:', error);
    return { events: [] };
  }
}

/**
 * Generates mock events for testing purposes
 * In a real implementation, this would be replaced with actual scraping logic
 */
function generateMockWienInfoEvents(categories: string[], date: string, limit: number): EventData[] {
  const events: EventData[] = [];
  
  // Generate a few mock events based on the categories
  const eventTemplates = [
    {
      title: 'Vienna Classical Concert',
      category: 'Live-Konzerte',
      venue: 'Wiener Konzerthaus',
      time: '19:30',
      price: 'Ab 35€',
      website: 'https://konzerthaus.at'
    },
    {
      title: 'Electronic Music Night',
      category: 'DJ Sets/Electronic',
      venue: 'Flex Wien',
      time: '22:00',
      price: 'Ab 15€',
      website: 'https://flex.at'
    },
    {
      title: 'Art Exhibition Opening',
      category: 'Kunst/Design',
      venue: 'Belvedere Museum',
      time: '18:00',
      price: 'Eintritt frei',
      website: 'https://www.belvedere.at'
    },
    {
      title: 'Theater Performance',
      category: 'Theater/Performance',
      venue: 'Burgtheater',
      time: '20:00',
      price: 'Ab 25€',
      website: 'https://burgtheater.at'
    },
    {
      title: 'Cultural Festival',
      category: 'Kultur/Traditionen',
      venue: 'Stadtpark Wien',
      time: '14:00',
      price: 'Kostenlos',
      website: 'https://wien.info'
    }
  ];

  // Filter templates based on requested categories and create events
  for (const template of eventTemplates) {
    if (categories.includes(template.category) && events.length < limit) {
      events.push({
        title: template.title,
        category: template.category,
        date,
        time: template.time,
        venue: template.venue,
        price: template.price,
        website: template.website,
        source: 'wien.info',
        city: 'Wien'
      });
    }
  }

  return events;
}