// Lightweight Wien.info JSON API integration with debug info
// - Uses official JSON endpoint (fast)
// - Maps to our EventData via SSOT mapping
// - Provides rich debug info (histograms) for UI

import type { EventData } from '@/lib/types';
import {
  buildWienInfoUrl,
  getWienInfoF1IdsForCategories,
  canonicalizeWienInfoLabel,
  mapWienInfoCategoryLabelToWhereToGo
} from '@/event_mapping_wien_info';

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
    url: string; // JSON API endpoint
    apiResponse?: any;
    filteredEvents?: number;
    parsedEvents?: number;
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
  dates?: string[];   // ISO date-times
  startDate?: string; // ISO
  endDate?: string;   // ISO
  url: string;        // Relative or absolute
  imageUrl?: string;
  tags: number[];     // F1 tag IDs
}

export async function fetchWienInfoEvents(opts: FetchWienInfoOptions): Promise<WienInfoResult> {
  const { fromISO, toISO, categories, limit = 100, debug = false, debugVerbose = false } = opts;

  try {
    // 1) Resolve F1 IDs for requested main categories (forward mapping via SSOT)
    const f1Ids = getWienInfoF1IdsForCategories(categories);

    if (f1Ids.length === 0) {
      if (debug) console.log('[WIEN.INFO:FETCH] No F1 mappings found for categories:', categories);
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
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0 Safari/537.36',
          'Accept': 'application/json, */*',
          'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8'
        },
        signal: AbortSignal.timeout(10000)
      });

      if (response.ok) {
        const jsonData: WienInfoApiResponse = await response.json();
        apiResponse = jsonData;
        apiEvents = jsonData.items || [];
        debugResponse = `Successfully fetched ${apiEvents.length} events from wien.info JSON API\nAPI URL: ${apiUrl}`;
        if (debug) console.log('[WIEN.INFO:API] Successfully fetched JSON, events count:', apiEvents.length);
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (apiError: any) {
      const failMsg = `JSON API failed: ${apiError}. No results from Wien.info!\nAPI URL: ${apiUrl}`;
      console.warn('[WIEN.INFO:API] Failed to fetch from wien.info JSON API:', apiError);
      return {
        events: [],
        error: 'No results from Wien.info!',
        debugInfo: debug ? { query: debugQuery, response: failMsg, categories, f1Ids, url: apiUrl, parsedEvents: 0 } : undefined
      };
    }

    // 6) Mapping histograms (raw + mapped) with SSOT reverse mapping
    const rawCategoryCounts: Record<string, number> = {};
    const mappedCategoryCounts: Record<string, number> = {};
    const unknownRaw = new Set<string>();

    for (const it of apiEvents) {
      const canonical = canonicalizeWienInfoLabel((it.category || '').trim());
      rawCategoryCounts[canonical] = (rawCategoryCounts[canonical] || 0) + 1;

      const mapped = mapWienInfoCategoryLabelToWhereToGo(canonical);
      if (mapped) {
        mappedCategoryCounts[mapped] = (mappedCategoryCounts[mapped] || 0) + 1;
      } else {
        if (canonical) unknownRaw.add(canonical);
      }
    }

    if (debug && unknownRaw.size > 0) {
      console.warn('[WIEN.INFO:MAPPING] Unmapped raw categories detected:', Array.from(unknownRaw));
    }

    // 7) Filter events by date range and category tags
    const filteredEvents = filterWienInfoEvents(apiEvents, fromISO, toISO, f1Ids);
    if (debug) console.log('[WIEN.INFO:FILTER] Filtered events:', filteredEvents.length, 'from', apiEvents.length);

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

    // 8) Normalize to our EventData format (limited by "limit")
    const normalizedEvents = filteredEvents.slice(0, limit).map((event) =>
      normalizeWienInfoEvent(event, categories, fromISO, toISO)
    );

    if (debug) {
      console.log('[WIEN.INFO:FETCH] Final normalized events:', normalizedEvents.length);
      if (debugVerbose) console.log('[WIEN.INFO:FETCH] Events:', normalizedEvents);
    }

    // 9) Success + attach debug info
    const result: WienInfoResult = { events: normalizedEvents };
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
    return { events: [], error: 'No results from Wien.info!', debugInfo: undefined };
  }
}

/**
 * Pick the best date and time for an event within the search window.
 * - Prefers a dates[] instance that falls inside [fromISO..toISO]
 * - Else, if [startDate..endDate] intersects the window, use fromISO and time from startDate (if present)
 * - Else, fall back to the first available dates[] or startDate
 *
 * Additionally:
 * - If no concrete time is available, label as "ganztags"
 * - Treat "00:00" as all-day -> "ganztags"
 */
function pickDateTimeWithinWindow(
  event: WienInfoEvent,
  fromISO: string,
  toISO: string
): { date: string; time: string } {
  const from = new Date(fromISO + 'T00:00:00');
  const to = new Date(toISO + 'T23:59:59');

  const extractTimeOrAllDay = (isoDateTime?: string): string => {
    if (!isoDateTime || !isoDateTime.includes('T')) return 'ganztags';
    const hhmm = isoDateTime.split('T')[1]?.split(/[+Z]/)[0]?.slice(0, 5) || '';
    if (!/^\d{2}:\d{2}$/.test(hhmm)) return 'ganztags';
    if (hhmm === '00:00') return 'ganztags';
    return hhmm;
  };

  // 1) dates[]: first instance within window
  if (Array.isArray(event.dates) && event.dates.length > 0) {
    for (const dateTime of event.dates) {
      const dt = new Date(dateTime);
      if (dt >= from && dt <= to) {
        const date = dateTime.split('T')[0];
        const time = extractTimeOrAllDay(dateTime);
        return { date, time };
      }
    }
  }

  // 2) range intersects window -> use requested day, time from startDate if present
  if (event.startDate) {
    const start = new Date(event.startDate);
    const end = event.endDate ? new Date(event.endDate) : new Date(event.startDate);
    if (start <= to && end >= from) {
      const time = extractTimeOrAllDay(event.startDate);
      return { date: fromISO, time };
    }
  }

  // 3) fallbacks
  if (Array.isArray(event.dates) && event.dates.length > 0) {
    const [d] = event.dates[0].split('T');
    const time = extractTimeOrAllDay(event.dates[0]);
    return { date: d, time };
  }

  if (event.startDate) {
    const [d] = event.startDate.split('T');
    const time = extractTimeOrAllDay(event.startDate);
    return { date: d, time };
  }

  return { date: '', time: '' };
}

/**
 * Filter API events by date range + category tags (F1)
 */
function filterWienInfoEvents(
  events: WienInfoEvent[],
  fromISO: string,
  toISO: string,
  f1Ids: number[]
): WienInfoEvent[] {
  if (!Array.isArray(events) || events.length === 0) return [];

  const from = new Date(fromISO);
  const to = new Date(toISO);
  to.setHours(23, 59, 59, 999);

  return events.filter((ev) => {
    const hasTag = Array.isArray(ev.tags) && ev.tags.some((t) => f1Ids.includes(t));

    let occursInRange = false;
    if (Array.isArray(ev.dates) && ev.dates.length > 0) {
      occursInRange = ev.dates.some((d) => {
        const dt = new Date(d);
        return dt >= from && dt <= to;
      });
    } else if (ev.startDate) {
      const start = new Date(ev.startDate);
      const end = ev.endDate ? new Date(ev.endDate) : new Date(ev.startDate);
      occursInRange = start <= to && end >= from;
    }

    return hasTag && occursInRange;
  });
}

/**
 * Normalizes a Wien.info API event to our EventData format
 * IMPORTANT: Do NOT override the mapped category with requestedCategories.
 */
function normalizeWienInfoEvent(
  wienInfoEvent: WienInfoEvent,
  _requestedCategories: string[],
  fromISO: string,
  toISO: string
): EventData {
  const canonical = canonicalizeWienInfoLabel(wienInfoEvent.category || '');
  const category = mapWienInfoCategoryLabelToWhereToGo(canonical) ?? 'Kultur/Traditionen';

  const { date: primaryDate, time } = pickDateTimeWithinWindow(wienInfoEvent, fromISO, toISO);

  let endTime: string | undefined = undefined;
  if (wienInfoEvent.endDate && wienInfoEvent.endDate.includes('T')) {
    const t = wienInfoEvent.endDate.split('T')[1]?.split(/[+Z]/)[0]?.slice(0, 5);
    if (t && /^\d{2}:\d{2}$/.test(t) && t !== '00:00') endTime = t;
  }

  const fullUrl = wienInfoEvent.url?.startsWith('http')
    ? wienInfoEvent.url
    : `https://www.wien.info${wienInfoEvent.url}`;

  const imageUrl = wienInfoEvent.imageUrl?.startsWith('http')
    ? wienInfoEvent.imageUrl
    : wienInfoEvent.imageUrl
    ? `https://www.wien.info${wienInfoEvent.imageUrl}`
    : undefined;

  return {
    title: wienInfoEvent.title,
    category,
    date: primaryDate,
    time, // "HH:mm" or "ganztags"
    venue: wienInfoEvent.location || 'Wien',
    price: '',
    website: fullUrl,
    source: 'wien.info',
    city: 'Wien',
    description: wienInfoEvent.subtitle || '',
    address: wienInfoEvent.location || 'Wien, Austria',
    ...(endTime ? { endTime } : {}),
    ...(imageUrl ? { imageUrl } : {})
  } as unknown as EventData;
}