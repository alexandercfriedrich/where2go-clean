// Lightweight Wien.info JSON API integration with debug info
// - Uses official JSON endpoint (fast)
// - Maps to our EventData
// - Provides rich debug info for UI

import type { EventData } from '@/lib/types';
import { buildWienInfoUrl, getWienInfoF1IdsForCategories } from '@/event_mapping_wien_info';

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
  error?: string;
  debugInfo?: {
    query: string;
    response: string;
    categories: string[];
    f1Ids: number[];
    url: string;                // JSON API endpoint (kept for tests)
    apiResponse?: any;
    filteredEvents?: number;
    parsedEvents?: number;
  };
}

interface WienInfoApiResponse {
  type: string;
  teaserTextMarkup: string;
  items: WienInfoEvent[];
}

interface WienInfoEvent {
  id: string;
  title: string;
  subtitle?: string;
  category: string;
  location: string;
  dates?: string[];
  startDate?: string;
  endDate?: string;
  url: string;
  imageUrl?: string;
  tags: number[];
}

export async function fetchWienInfoEvents(opts: FetchWienInfoOptions): Promise<WienInfoResult> {
  const { fromISO, toISO, categories, limit = 100, debug = false, debugVerbose = false } = opts;

  try {
    // Get F1 IDs for the requested categories
    const f1Ids = getWienInfoF1IdsForCategories(categories);
    
    if (f1Ids.length === 0) {
      if (debug) {
        console.log('[WIEN.INFO:FETCH] No F1 mappings found for categories:', categories);
      }
      return { events: [], error: 'No results from Wien.info!' };
    }

    // Use the JSON API endpoint
    const apiUrl = 'https://www.wien.info/ajax/de/events';
    // Build human-facing discovery URL (for UI visibility)
    const discoveryUrl = buildWienInfoUrl(fromISO, toISO, f1Ids);
    
    // Create debug information
    const debugQuery = `Wien.info events search for categories: ${categories.join(', ')} from ${fromISO} to ${toISO}`;
    
    if (debug) {
      console.log('[WIEN.INFO:FETCH]', { 
        apiUrl,
        categories,
        f1Ids,
        dateRange: `${fromISO} to ${toISO}`,
        discoveryUrl
      });
    }

    // Fetch from the JSON API
    let apiEvents: WienInfoEvent[] = [];
    let debugResponse = '';
    let apiResponse: any = null;
    
    try {
      const response = await fetch(apiUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'application/json, */*',
          'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8',
        },
        // Add timeout
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      if (response.ok) {
        const jsonData: WienInfoApiResponse = await response.json();
        apiResponse = jsonData;
        apiEvents = jsonData.items || [];
        
        // Include the final assembled discovery URL in the response for UI
        debugResponse = `Successfully fetched ${apiEvents.length} events from wien.info JSON API\nFull URL: ${discoveryUrl}`;
        
        if (debug) {
          console.log('[WIEN.INFO:API] Successfully fetched JSON, events count:', apiEvents.length);
        }
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (apiError) {
      const failMsg = `JSON API failed: ${apiError}. No results from Wien.info!\nFull URL: ${discoveryUrl}`;
      console.warn('[WIEN.INFO:API] Failed to fetch from wien.info JSON API:', apiError);
      
      return { 
        events: [], 
        error: 'No results from Wien.info!',
        debugInfo: debug ? {
          query: debugQuery,
          response: failMsg,
          categories,
          f1Ids,
          url: apiUrl,
          parsedEvents: 0
        } : undefined
      };
    }

    // Filter events by date range and categories
    const filteredEvents = filterWienInfoEvents(apiEvents, fromISO, toISO, f1Ids);
    
    if (debug) {
      console.log('[WIEN.INFO:FILTER] Filtered events:', filteredEvents.length, 'from', apiEvents.length);
    }

    // If no events found after filtering
    if (filteredEvents.length === 0) {
      console.log('[WIEN.INFO:FILTER] No events found after filtering');
      debugResponse += ' No events found after date/category filtering.';

      return { 
        events: [], 
        error: 'No results from Wien.info!',
        debugInfo: debug ? {
          query: debugQuery,
          response: debugResponse,
          categories,
          f1Ids,
          url: apiUrl,
          apiResponse: debugVerbose ? apiResponse : undefined,
          filteredEvents: 0,
          parsedEvents: apiEvents.length
        } : undefined
      };
    }

    // Convert filtered events to normalized format
    const normalizedEvents = filteredEvents
      .slice(0, limit)
      .map(event => normalizeWienInfoEvent(event, categories));

    if (debug) {
      console.log('[WIEN.INFO:FETCH] Final normalized events:', normalizedEvents.length);
      if (debugVerbose) {
        console.log('[WIEN.INFO:FETCH] Events:', normalizedEvents);
      }
    }

    const result: WienInfoResult = {
      events: normalizedEvents
    };

    // Include debug information if debug is enabled
    if (debug || debugVerbose) {
      result.debugInfo = {
        query: debugQuery,
        response: debugResponse,
        categories,
        f1Ids,
        url: apiUrl,
        apiResponse: debugVerbose ? apiResponse : undefined,
        filteredEvents: filteredEvents.length,
        parsedEvents: apiEvents.length
      };
    }

    return result;

  } catch (error) {
    console.error('[WIEN.INFO:FETCH] Error:', error);
    
    // Return error instead of mock events
    return { 
      events: [], 
      error: 'No results from Wien.info!',
      debugInfo: undefined
    };
  }
}

/**
 * Filter API events by date range + category tags (F1)
 */
function filterWienInfoEvents(events: WienInfoEvent[], fromISO: string, toISO: string, f1Ids: number[]): WienInfoEvent[] {
  if (!Array.isArray(events) || events.length === 0) return [];

  const from = new Date(fromISO);
  const to = new Date(toISO);
  to.setHours(23, 59, 59, 999);

  return events.filter(ev => {
    // Category tags intersection
    const hasTag = Array.isArray(ev.tags) && ev.tags.some(t => f1Ids.includes(t));

    // Date range check: prefer dates[], fallback to startDate/endDate
    let occursInRange = false;

    if (Array.isArray(ev.dates) && ev.dates.length > 0) {
      occursInRange = ev.dates.some(d => {
        const dt = new Date(d);
        return dt >= from && dt <= to;
      });
    } else if (ev.startDate) {
      const start = new Date(ev.startDate);
      const end = ev.endDate ? new Date(ev.endDate) : new Date(ev.startDate);
      occursInRange = (start <= to && end >= from);
    }

    return hasTag && occursInRange;
  });
}

/**
 * Maps wien.info categories to our standard categories
 */
function mapWienInfoCategory(wienInfoCategory: string): string {
  const categoryMap: Record<string, string> = {
    // Classical and concerts
    'konzerte klassisch': 'Live-Konzerte',
    'rock, pop, jazz und mehr': 'Live-Konzerte',
    'konzerte': 'Live-Konzerte',
    'music': 'Live-Konzerte',
    'concert': 'Live-Konzerte',
    
    // Theater and performance
    'theater und kabarett': 'Theater/Performance',
    'musical, tanz und performance': 'Theater/Performance',
    'oper und operette': 'Theater/Performance',
    'theater': 'Theater/Performance',
    
    // Museums and exhibitions
    'ausstellungen': 'Museen',
    'museum': 'Museen',
    'exhibition': 'Kunst/Design',
    
    // Markets and festivals
    'märkte und messen': 'Open Air',
    'festival': 'Open Air',
    
    // Entertainment
    'film und sommerkino': 'Film',
    'club': 'Clubs/Discos',
    'electronic': 'DJ Sets/Electronic',
    
    // Culture and traditions
    'typisch wien': 'Kultur/Traditionen',
    'führungen, spaziergänge & touren': 'Kultur/Traditionen',
    'culture': 'Kultur/Traditionen',
    'art': 'Kunst/Design'

    // Ergänzungen für fehlende Kategorien:
    'sport-events': 'Sport',
    'sport': 'Sport',
    'für kinder & familien': 'Kinder/Familie',
    'kinder': 'Kinder/Familie',
    'lgbtiq+': 'Diversität/LGBTQ',
    'strauss-events': 'Klassik/Strauss'
  };
  
  const lower = wienInfoCategory.toLowerCase();
  for (const [key, value] of Object.entries(categoryMap)) {
    if (lower.includes(key)) {
      return value;
    }
  }
  
  return 'Kultur/Traditionen'; // Default category
}

/**
 * Normalizes a Wien.info API event to our EventData format
 */
function normalizeWienInfoEvent(wienInfoEvent: WienInfoEvent, requestedCategories: string[]): EventData {
  // Determine the best category match
  let category = mapWienInfoCategory(wienInfoEvent.category);
  
  // If the mapped category isn't in requested categories, use the first requested category
  if (!requestedCategories.includes(category) && requestedCategories.length > 0) {
    category = requestedCategories[0];
  }

  // Extract the primary date
  const eventDates = wienInfoEvent.dates || [];
  if (wienInfoEvent.startDate) {
    eventDates.push(wienInfoEvent.startDate);
  }
  
  const primaryDate = eventDates.length > 0 ? eventDates[0].split('T')[0] : '';
  
  // Extract time if available
  let time = '';
  if (wienInfoEvent.startDate && wienInfoEvent.startDate.includes('T')) {
    const timePart = wienInfoEvent.startDate.split('T')[1];
    if (timePart) {
      time = timePart.split('+')[0]; // Remove timezone info
      if (time.length > 5) {
        time = time.substring(0, 5); // Only keep HH:mm
      }
    }
  }

  // Build full URL
  const fullUrl = wienInfoEvent.url.startsWith('http') ? 
    wienInfoEvent.url : 
    `https://www.wien.info${wienInfoEvent.url}`;
  
  return {
    title: wienInfoEvent.title,
    category,
    date: primaryDate,
    time: time,
    venue: wienInfoEvent.location || 'Wien',
    price: '', // Wien.info API doesn't provide price info directly
    website: fullUrl,
    source: 'wien.info',
    city: 'Wien',
    description: wienInfoEvent.subtitle || '',
    address: wienInfoEvent.location || 'Wien, Austria'
  } as unknown as EventData;
}
