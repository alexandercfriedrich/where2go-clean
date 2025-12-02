/**
 * Wien.info Event Importer
 * 
 * Fetches events from wien.info API and processes them through the unified pipeline.
 * 
 * Features:
 * - Paginated fetch with throttling and retry logic
 * - Uses unified pipeline for consistent venue linking and data integrity
 * - Automatic cache synchronization with Upstash Redis
 * - Dry-run mode for testing
 * - Comprehensive statistics and error tracking
 */

import { fetchWienInfoEvents } from '@/lib/sources/wienInfo';
import { processEvents, RawEventInput } from '../../../lib/events/unified-event-pipeline';
import type { EventData } from '@/lib/types';
import pThrottle from 'p-throttle';
import pRetry from 'p-retry';

// Constants
const DEFAULT_CITY = 'Wien';

// Create throttle at module level to persist across calls and properly limit requests
const throttle = pThrottle({
  limit: 2,
  interval: 1000
});

export interface ImporterOptions {
  /**
   * If true, log actions but do not write to database
   */
  dryRun?: boolean;
  
  /**
   * Number of events to process per batch
   * @default 100
   */
  batchSize?: number;
  
  /**
   * Start date for event fetch (YYYY-MM-DD)
   * If not provided, uses today's date
   */
  fromDate?: string;
  
  /**
   * End date for event fetch (YYYY-MM-DD)
   * If not provided, fetches 365 days from start date
   */
  toDate?: string;
  
  /**
   * Maximum number of events to fetch (pagination limit)
   * @default 10000
   */
  limit?: number;
  
  /**
   * Enable verbose logging
   */
  debug?: boolean;
}

export interface ImporterStats {
  /**
   * Total events successfully imported/updated
   */
  totalImported: number;
  
  /**
   * Best-effort count of updated (vs new) events
   */
  totalUpdated: number;
  
  /**
   * Total events that failed to import
   */
  totalFailed: number;
  
  /**
   * Number of API pages processed
   */
  pagesProcessed: number;
  
  /**
   * Total venues created/reused
   */
  venuesProcessed: number;
  
  /**
   * Import duration in milliseconds
   */
  duration: number;
  
  /**
   * Individual error messages
   */
  errors: string[];
  
  /**
   * Date range imported
   */
  dateRange: {
    from: string;
    to: string;
  };
}

/**
 * Main importer function - uses unified pipeline for consistent data integrity
 */
export async function importWienInfoEvents(
  options: ImporterOptions = {}
): Promise<ImporterStats> {
  const startTime = Date.now();
  
  const {
    dryRun = false,
    batchSize = 100,
    fromDate,
    toDate,
    limit = 10000,
    debug = false
  } = options;
  
  // Calculate date range
  const today = new Date();
  const fromISO = fromDate || today.toISOString().split('T')[0];
  const defaultToDate = new Date(today);
  defaultToDate.setDate(defaultToDate.getDate() + 365); // 1 year ahead
  const toISO = toDate || defaultToDate.toISOString().split('T')[0];
  
  const stats: ImporterStats = {
    totalImported: 0,
    totalUpdated: 0,
    totalFailed: 0,
    pagesProcessed: 0,
    venuesProcessed: 0,
    duration: 0,
    errors: [],
    dateRange: { from: fromISO, to: toISO }
  };
  
  if (debug || dryRun) {
    console.log('[WIEN-IMPORTER] Starting import', {
      dryRun,
      batchSize,
      fromISO,
      toISO,
      limit
    });
  }
  
  try {
    // Fetch events from Wien.info API
    const result = await fetchEventsWithRetry(fromISO, toISO, limit, debug);
    
    if (result.error || !result.events || result.events.length === 0) {
      const errorMsg = result.error || 'No events returned from Wien.info API';
      stats.errors.push(errorMsg);
      if (debug) {
        console.warn('[WIEN-IMPORTER] Fetch failed:', errorMsg);
      }
      stats.duration = Date.now() - startTime;
      return stats;
    }
    
    stats.pagesProcessed = 1;
    
    if (debug) {
      console.log(`[WIEN-IMPORTER] Fetched ${result.events.length} events, converting to pipeline format...`);
    }
    
    // Convert EventData to RawEventInput for unified pipeline
    const rawEvents = convertToRawEventInput(result.events);
    
    if (debug) {
      console.log(`[WIEN-IMPORTER] Converted ${rawEvents.length} events, sending to unified pipeline...`);
    }
    
    // Process through unified pipeline - handles venue matching, deduplication, 
    // slug generation, DB upsert, and cache sync automatically
    const pipelineResult = await processEvents(rawEvents, {
      source: 'wien.info',
      city: DEFAULT_CITY,
      dryRun,
      batchSize,
      debug
    });
    
    // Map pipeline results to importer stats
    stats.totalImported = pipelineResult.eventsInserted;
    stats.totalUpdated = pipelineResult.eventsUpdated;
    stats.totalFailed = pipelineResult.eventsFailed;
    stats.venuesProcessed = pipelineResult.venuesCreated + pipelineResult.venuesReused;
    stats.errors.push(...pipelineResult.errors);
    
    stats.duration = Date.now() - startTime;
    
    if (debug || dryRun) {
      console.log('[WIEN-IMPORTER] Import complete', {
        imported: stats.totalImported,
        updated: stats.totalUpdated,
        failed: stats.totalFailed,
        venues: stats.venuesProcessed,
        duration: `${stats.duration}ms`,
        dryRun
      });
    }
    
    return stats;
    
  } catch (error: any) {
    stats.errors.push(`Fatal error: ${error.message}`);
    stats.duration = Date.now() - startTime;
    console.error('[WIEN-IMPORTER] Fatal error:', error);
    return stats;
  }
}

/**
 * Convert EventData array to RawEventInput array for unified pipeline
 */
function convertToRawEventInput(events: EventData[]): RawEventInput[] {
  return events
    .filter(event => event.title && event.venue) // Must have title and venue
    .map(event => {
      // Parse date and time to ISO timestamp
      let startDateTime: string;
      if (event.date && event.time) {
        // Handle 'ganztags' (all-day) events - use 00:00:01 as the marker
        // This distinguishes all-day events from actual midnight events
        if (/ganztags|all[- ]?day|ganztagig/i.test(event.time)) {
          // All-day event: use 00:00:01 marker
          startDateTime = `${event.date}T00:00:01.000Z`;
        } else {
          // Regular time: format HH:MM becomes HH:MM:00.000Z
          startDateTime = `${event.date}T${event.time}:00.000Z`;
        }
      } else if (event.date) {
        // No time specified means all-day event, use 00:00:01 marker
        startDateTime = `${event.date}T00:00:01.000Z`;
      } else {
        startDateTime = new Date().toISOString();
      }
      
      return {
        title: event.title,
        description: event.description,
        start_date_time: startDateTime,
        end_date_time: event.endTime ? `${event.date}T${event.endTime}:00.000Z` : undefined,
        venue_name: event.venue || 'Unknown Venue',
        venue_address: event.address,
        venue_city: event.city || DEFAULT_CITY,
        category: event.category,
        price: event.price,
        ticket_url: event.bookingLink,
        website_url: event.website,
        image_url: event.imageUrl,
        source: 'wien.info' as const,
        source_url: event.website,
        latitude: event.latitude,
        longitude: event.longitude
      };
    });
}

/**
 * Fetch events with retry logic using p-retry
 * Uses module-level throttle to properly limit API requests to 2 per second
 */
async function fetchEventsWithRetry(
  fromISO: string,
  toISO: string,
  limit: number,
  debug: boolean
): Promise<{ events?: EventData[]; error?: string; debugInfo?: any }> {
  // Use module-level throttle that persists across calls
  const throttledFetch = throttle(async () => {
    return await fetchWienInfoEvents({
      fromISO,
      toISO,
      categories: [], // Empty = fetch all categories
      limit,
      debug,
      debugVerbose: false
    });
  });
  
  // Retry up to 3 times with exponential backoff
  return await pRetry(
    async () => {
      const result = await throttledFetch();
      if (result.error) {
        throw new Error(result.error);
      }
      return result;
    },
    {
      retries: 3,
      minTimeout: 1000,
      maxTimeout: 5000,
      onFailedAttempt: (error) => {
        if (debug) {
          console.warn(
            `[WIEN-IMPORTER] Fetch attempt ${error.attemptNumber} failed. ${error.retriesLeft} retries left.`
          );
        }
      }
    }
  );
}
