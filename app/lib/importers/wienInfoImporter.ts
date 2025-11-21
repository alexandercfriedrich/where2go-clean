/**
 * Wien.info Event Importer
 * 
 * Fetches all available events from wien.info API (no date restriction by default),
 * normalizes the data, and upserts events into Supabase.
 * 
 * Note: Venue linking is handled by the database, not in application code.
 * Events are stored with custom_venue_name and custom_venue_address fields.
 * 
 * Features:
 * - Paginated fetch with throttling and retry logic
 * - Idempotent upserts using ON CONFLICT
 * - Batch processing for performance
 * - Dry-run mode for testing
 * - Comprehensive statistics and error tracking
 */

import { fetchWienInfoEvents } from '@/lib/sources/wienInfo';
import { EventRepository } from '@/lib/repositories/EventRepository';
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
 * Main importer function
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
    // Since the API doesn't support traditional pagination with offset/page,
    // we fetch all events up to the limit in a single request.
    // Note: The stats.pagesProcessed field exists for future pagination support,
    // but currently only 1 page is ever processed.
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
    
    stats.pagesProcessed = 1; // Single request (no pagination in current API)
    
    if (debug) {
      console.log(`[WIEN-IMPORTER] Fetched ${result.events.length} events`);
    }
    
    // Process events in batches
    const batches = chunkArray(result.events, batchSize);
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      if (debug) {
        console.log(`[WIEN-IMPORTER] Processing batch ${i + 1}/${batches.length} (${batch.length} events)`);
      }
      
      const batchResult = await processBatch(batch, dryRun, debug, DEFAULT_CITY);
      
      stats.totalImported += batchResult.imported;
      stats.totalUpdated += batchResult.updated;
      stats.totalFailed += batchResult.failed;
      stats.venuesProcessed += batchResult.venuesProcessed;
      stats.errors.push(...batchResult.errors);
    }
    
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

/**
 * Process a batch of events
 * Note: Venue linking is handled by the database, not in application code.
 * Events are stored with custom_venue_name and custom_venue_address fields.
 */
async function processBatch(
  events: EventData[],
  dryRun: boolean,
  debug: boolean,
  city: string = DEFAULT_CITY
): Promise<{
  imported: number;
  updated: number;
  failed: number;
  venuesProcessed: number;
  errors: string[];
}> {
  const result = {
    imported: 0,
    updated: 0,
    failed: 0,
    venuesProcessed: 0,
    errors: [] as string[]
  };
  
  // Upsert events
  if (dryRun) {
    // In dry-run mode, just log what would be done
    result.imported = events.length;
    if (debug) {
      console.log(`[WIEN-IMPORTER][DRY-RUN] Would import ${events.length} events`);
    }
  } else {
    // Bulk insert/upsert events
    try {
      const insertResult = await EventRepository.bulkInsertEvents(events, city);
      
      if (insertResult.success) {
        result.imported = insertResult.inserted;
        // We can't easily distinguish new vs updated in bulk upsert
        // Just report all as imported
      } else {
        result.failed = events.length;
        result.errors.push(...insertResult.errors);
      }
    } catch (error: any) {
      result.failed = events.length;
      result.errors.push(`Bulk insert failed: ${error.message}`);
      if (debug) {
        console.error(`[WIEN-IMPORTER] Bulk insert error:`, error);
      }
    }
  }
  
  return result;
}

/**
 * Utility: Split array into chunks
 */
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}
