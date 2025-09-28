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

    // NEU: Instrumentierung zur Mapping-Qualität
    rawCategoryCounts?: Record<string, number>;
    mappedCategoryCounts?: Record<string, number>;
    unknownRawCategories?: string[];
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
  dates?: string[];      // ISO date-times
  startDate?: string;    // ISO
  endDate?: string;      // ISO
  url: string;           // Relative or absolute
  imageUrl?: string;
  tags: number[];        // F1 tag IDs
}

export async function fetchWienInfoEvents(opts: FetchWienInfoOptions): Promise<WienInfoResult> {
  const { fromISO, toISO, categories, limit = 100, debug = false, debugVerbose = false } = opts;

  try {
    // 1) Resolve F1 IDs for requested main categories
    const f1Ids = getWienInfoF1IdsForCategories(categories);

    if (f1Ids.length === 0) {
      if (debug) {
        console.log('[WIEN.INFO:FETCH] No F1 mappings found for categories:', categories);
      }
      return { events: [], error: 'No results from Wien.info!' };
    }

    // 2) JSON API endpoint (fixed)
    const apiUrl = 'https://www.wien.info/ajax/de/events';

    // 3) Human-facing "discovery" URL (assembled with dr + f1) — debug only
    const discoveryUrl = buildWienInfoUrl(fromISO, toISO, f1Ids);

    // 4) Debug label for UI
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

    // 5) Fetch JSON API
    let apiEvents: WienInfoEvent[] = [];
    let debugResponse = '';
    let apiResponse: any = null;

    try {
      const response = await fetch(apiUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'application/json, */*',
          'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8'
        },
        // Timeout guard
        signal: AbortSignal.timeout(10000)
      });

      if (response.ok) {
        const jsonData: WienInfoApiResponse = await response.json();
        apiResponse = jsonData;
        apiEvents = jsonData.items || [];

        debugResponse = `Successfully fetched ${apiEvents.length} events from wien.info JSON API\nAPI URL: ${apiUrl}`;

        if (debug) {
          console.log('[WIEN.INFO:API] Successfully fetched JSON, events count:', apiEvents.length);
        }
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (apiError) {
      const failMsg = `JSON API failed: ${apiError}. No results from Wien.info!\nAPI URL: ${apiUrl}`;
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

    // NEU: Rohkategorie- und Mapping-Histogramme für Analyse
    const rawCategoryCounts: Record<string, number> = {};
    const mappedCategoryCounts: Record<string, number> = {};
    const unknownRaw = new Set<string>();

    for (const it of apiEvents) {
      const raw = (it.category || '').trim();
      rawCategoryCounts[raw] = (rawCategoryCounts[raw] || 0) + 1;

      const { mapped, matched } = mapWienInfoCategoryWithMatch(raw);
      mappedCategoryCounts[mapped] = (mappedCategoryCounts[mapped] || 0) + 1;
      if (!matched) unknownRaw.add(raw);
    }

    if (debug && unknownRaw.size > 0) {
      console.warn('[WIEN.INFO:MAPPING] Unmapped raw categories detected:', Array.from(unknownRaw));
    }

    // 6) Filter events by date range and category tags
    const filteredEvents = filterWienInfoEvents(apiEvents, fromISO, toISO, f1Ids);

    if (debug) {
      console.log('[WIEN.INFO:FILTER] Filtered events:', filteredEvents.length, 'from', apiEvents.length);
    }

    if (filteredEvents.length === 0) {
      const resp = `${debugResponse} No events found after date/category filtering.`;
      if (debug) console.log('[WIEN.INFO:FILTER] No events found after filtering');

      return {
        events: [],
        error: 'No results from Wien.info!',
        debugInfo: debug ? {
          query: debugQuery,
          response: resp,
          categories,
          f1Ids,
          url: apiUrl,
          apiResponse: debugVerbose ? apiResponse : undefined,
          filteredEvents: 0,
          parsedEvents: apiEvents.length,
          rawCategoryCounts,
          mappedCategoryCounts,
          unknownRawCategories: Array.from(unknownRaw)
        } : undefined
      };
    }

    // 7) Normalize to our EventData format (limited by "limit")
    const normalizedEvents = filteredEvents
      .slice(0, limit)
      .map(event => normalizeWienInfoEvent(event, categories));

    if (debug) {
      console.log('[WIEN.INFO:FETCH] Final normalized events:', normalizedEvents.length);
      if (debugVerbose) {
        console.log('[WIEN.INFO:FETCH] Events:', normalizedEvents);
      }
    }

    // 8) Success + attach debug info (include histograms)
    const result: WienInfoResult = {
      events: normalizedEvents
    };

    if (debug || debugVerbose) {
      result.debugInfo = {
        query: debugQuery,
        response: debugResponse,
        categories,
        f1Ids,
        url: apiUrl,
        apiResponse: debugVerbose ? apiResponse : undefined,
        filteredEvents: filteredEvents.length,
        parsedEvents: apiEvents.length,
        rawCategoryCounts,
        mappedCategoryCounts,
        unknownRawCategories: Array.from(unknownRaw)
      };
    }

    return result;
  } catch (error) {
    console.error('[WIEN.INFO:FETCH] Error:', error);

    // Conservative default when unexpected error happens earlier
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
 * mapWienInfoCategory + Variante mit Match-Flag
 */
function mapWienInfoCategoryWithMatch(wienInfoCategory: string): { mapped: string; matched: boolean } {
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
    'art': 'Kunst/Design',

    // (Optional: erste Erweiterungen – konservativ)
    'kinder': 'Familien/Kids',
    'familie': 'Familien/Kids',
    'family': 'Familien/Kids',
    'kids': 'Familien/Kids',
    'sport': 'Sport',
    'sports': 'Sport',
    'kulinarik': 'Food/Culinary',
    'kulinarisch': 'Food/Culinary',
    'food': 'Food/Culinary',
    'essen': 'Food/Culinary',
    'trinken': 'Food/Culinary',
  };

  const lower = (wienInfoCategory || '').toLowerCase();
  for (const [key, value] of Object.entries(categoryMap)) {
    if (lower.includes(key)) {
      return { mapped: value, matched: true };
    }
  }

  return { mapped: 'Kultur/Traditionen', matched: false }; // Default category
}

function mapWienInfoCategory(wienInfoCategory: string): string {
  return mapWienInfoCategoryWithMatch(wienInfoCategory).mapped;
}

/**
 * Normalizes a Wien.info API event to our EventData format
 * IMPORTANT: Do NOT override the mapped category with requestedCategories.
 */
function normalizeWienInfoEvent(wienInfoEvent: WienInfoEvent, _requestedCategories: string[]): EventData {
  // Determine the best category match
  const category = mapWienInfoCategory(wienInfoEvent.category);

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
  const fullUrl = wienInfoEvent.url?.startsWith('http')
    ? wienInfoEvent.url
    : `https://www.wien.info${wienInfoEvent.url}`;

  return {
    title: wienInfoEvent.title,
    category,
    date: primaryDate,
    time,
    venue: wienInfoEvent.location || 'Wien',
    price: '',
    website: fullUrl,
    source: 'wien.info',
    city: 'Wien',
    description: wienInfoEvent.subtitle || '',
    address: wienInfoEvent.location || 'Wien, Austria'
  } as unknown as EventData;
}
