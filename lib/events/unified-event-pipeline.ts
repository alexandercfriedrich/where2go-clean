/**
 * UNIFIED EVENT PIPELINE
 * 
 * All event imports (Wien.info, AI search, Scraper, Community) MUST go through this pipeline!
 * Guarantees: Normalization, Deduplication, Venue Matching/Creation, Slug Generation, Data Integrity
 * 
 * Architecture:
 * 1. NORMALIZE: Convert raw input to standard format
 * 2. DEDUPLICATE: Remove duplicates within batch and against existing DB entries
 * 3. VENUE MATCH/CREATE: Find or create venues, ensuring venue_id is set
 * 4. SLUG GENERATION: Generate SEO-friendly event slugs
 * 5. UPSERT: Insert/update events in database with venue_id linked
 * 6. CACHE SYNC: Update Upstash Redis day-bucket cache for consistency
 */

import { supabaseAdmin } from '@/lib/supabase/client';
import { VenueRepository } from '@/lib/repositories/VenueRepository';
import { deduplicateEvents } from '@/lib/eventDeduplication';
import { EventRepository } from '@/lib/repositories/EventRepository';
import { eventsCache } from '@/lib/cache';
import type { EventData } from '@/lib/types';
import type { Database } from '@/lib/supabase/types';

type DbVenueInsert = Database['public']['Tables']['venues']['Insert'];
type DbEventInsert = Database['public']['Tables']['events']['Insert'];

// ═══════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Supported event sources
 */
export type EventSource = 'wien.info' | 'ai-search' | 'scraper' | 'community' | 'rss';

/**
 * Raw event input from any source (Wien.info, AI search, Scraper, Community)
 * This is the standard interface all importers must provide
 */
export interface RawEventInput {
  title: string;
  description?: string;
  start_date_time: string | Date;        // ISO string or Date object
  end_date_time?: string | Date;
  venue_name: string;                     // REQUIRED: Venue name for matching
  venue_address?: string;
  venue_city?: string;                    // Defaults to 'Wien' if not provided
  category?: string;
  subcategory?: string;
  price?: string;
  price_info?: string;
  ticket_url?: string;
  booking_url?: string;
  website_url?: string;
  image_url?: string;
  source: EventSource;
  source_id?: string;                     // External ID (e.g., Wien.info ID)
  source_url?: string;
  latitude?: number;
  longitude?: number;
  tags?: string[];
}

/**
 * Pipeline processing options
 */
export interface PipelineOptions {
  /** If true, log actions but do not write to database */
  dryRun?: boolean;
  /** Number of events to process per batch (default: 50) */
  batchSize?: number;
  /** Source identifier for logging */
  source: string;
  /** City for events (default: 'Wien') */
  city?: string;
  /** Enable verbose debug logging */
  debug?: boolean;
  /** Skip deduplication (use with caution) */
  skipDeduplication?: boolean;
  /** Sync events to Upstash Redis cache after DB insert (default: true) */
  syncToCache?: boolean;
}

/**
 * Result of pipeline processing
 */
export interface PipelineResult {
  success: boolean;
  eventsProcessed: number;
  eventsInserted: number;
  eventsUpdated: number;
  eventsFailed: number;
  eventsSkippedAsDuplicates: number;
  venuesCreated: number;
  venuesReused: number;
  eventsCached: number;
  duration: number;
  errors: string[];
}

// ═══════════════════════════════════════════════════════════════
// INTERNAL TYPES
// ═══════════════════════════════════════════════════════════════

interface NormalizedEvent {
  title: string;
  description: string | null;
  start_date_time: string;
  end_date_time: string | null;
  venue_name: string;
  venue_address: string | null;
  venue_city: string;
  category: string;
  subcategory: string | null;
  price_info: string | null;
  ticket_url: string | null;
  booking_url: string | null;
  website_url: string | null;
  image_url: string | null;
  source: string;
  source_id: string | null;
  source_url: string | null;
  latitude: number | null;
  longitude: number | null;
  tags: string[] | null;
}

// ═══════════════════════════════════════════════════════════════
// MAIN PIPELINE FUNCTION
// ═══════════════════════════════════════════════════════════════

/**
 * Process events through the unified pipeline
 * 
 * @param rawEvents - Array of raw event inputs from any source
 * @param options - Pipeline processing options
 * @returns Pipeline result with statistics
 */
export async function processEvents(
  rawEvents: RawEventInput[],
  options: PipelineOptions
): Promise<PipelineResult> {
  const startTime = Date.now();
  const {
    dryRun = false,
    batchSize = 50,
    source,
    city = 'Wien',
    debug = false,
    skipDeduplication = false,
    syncToCache = true
  } = options;

  const result: PipelineResult = {
    success: true,
    eventsProcessed: 0,
    eventsInserted: 0,
    eventsUpdated: 0,
    eventsFailed: 0,
    eventsSkippedAsDuplicates: 0,
    venuesCreated: 0,
    venuesReused: 0,
    eventsCached: 0,
    duration: 0,
    errors: []
  };

  // Collect events for cache sync (grouped by date)
  const eventsForCache: Map<string, EventData[]> = new Map();

  if (debug) {
    console.log(`[PIPELINE:START] Processing ${rawEvents.length} events from ${source}`);
  }

  if (!rawEvents || rawEvents.length === 0) {
    result.duration = Date.now() - startTime;
    if (debug) {
      console.log('[PIPELINE:COMPLETE] No events to process');
    }
    return result;
  }

  try {
    // ═══════════════════════════════════════════════════════════
    // STEP 1: NORMALIZE INPUT DATA
    // ═══════════════════════════════════════════════════════════
    if (debug) {
      console.log('[PIPELINE:STEP1] Normalizing events...');
    }
    
    const normalizedEvents = rawEvents
      .map(event => normalizeEventInput(event, city))
      .filter((event): event is NormalizedEvent => event !== null);
    
    if (debug) {
      console.log(`[PIPELINE:STEP1] Normalized ${normalizedEvents.length}/${rawEvents.length} events`);
    }

    // ═══════════════════════════════════════════════════════════
    // STEP 2: DEDUPLICATE (within batch and against DB)
    // ═══════════════════════════════════════════════════════════
    let eventsToProcess = normalizedEvents;
    
    if (!skipDeduplication) {
      if (debug) {
        console.log('[PIPELINE:STEP2] Deduplicating events...');
      }
      
      // Convert to EventData format for deduplication
      const eventsAsEventData = normalizedEvents.map(e => normalizedToEventData(e));
      
      // Get unique dates from events
      const uniqueDates = [...new Set(eventsAsEventData.map(e => e.date))];
      
      // Fetch existing events for those dates
      let existingEvents: EventData[] = [];
      for (const date of uniqueDates) {
        const existing = await EventRepository.fetchRelevantExistingEvents(date, city);
        existingEvents = existingEvents.concat(existing);
      }
      
      // Deduplicate against existing events
      // deduplicateEvents returns events from eventsAsEventData that are NOT duplicates of existingEvents
      const dedupedEventsData = deduplicateEvents(eventsAsEventData, existingEvents);
      // Build a set of titles that passed the deduplication check (non-duplicates)
      const dedupedTitles = new Set(dedupedEventsData.map(e => e.title.toLowerCase()));
      
      // Filter normalized events to keep only those that passed deduplication
      // (i.e., events whose titles are in dedupedTitles are the unique ones we want to keep)
      eventsToProcess = normalizedEvents.filter(e => 
        dedupedTitles.has(e.title.toLowerCase())
      );
      
      result.eventsSkippedAsDuplicates = normalizedEvents.length - eventsToProcess.length;
      
      if (debug) {
        console.log(`[PIPELINE:STEP2] After dedup: ${eventsToProcess.length} events (${result.eventsSkippedAsDuplicates} duplicates removed)`);
      }
    }

    // ═══════════════════════════════════════════════════════════
    // STEP 3: BATCH PROCESSING
    // ═══════════════════════════════════════════════════════════
    const batches = chunkArray(eventsToProcess, batchSize);
    
    if (debug) {
      console.log(`[PIPELINE:STEP3] Processing ${batches.length} batches...`);
    }

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      
      if (debug) {
        console.log(`[PIPELINE:BATCH] Processing batch ${i + 1}/${batches.length} (${batch.length} events)`);
      }

      for (const event of batch) {
        try {
          result.eventsProcessed++;

          // ─────────────────────────────────────────────────────
          // STEP 3a: VENUE MATCHING/CREATION
          // ─────────────────────────────────────────────────────
          const venueId = await matchOrCreateVenue(
            {
              name: event.venue_name,
              address: event.venue_address,
              city: event.venue_city,
              source: event.source
            },
            dryRun,
            debug
          );

          if (venueId.isNew) {
            result.venuesCreated++;
          } else {
            result.venuesReused++;
          }

          // ─────────────────────────────────────────────────────
          // STEP 3b: SLUG GENERATION
          // Generate unique event slug: title-date-unique6chars
          // This ensures uniqueness even for events with same title/date
          // ─────────────────────────────────────────────────────
          const eventSlug = generateEventSlug(event.title, event.start_date_time);

          // ─────────────────────────────────────────────────────
          // STEP 3c: PREPARE EVENT DATA FOR DATABASE
          // ─────────────────────────────────────────────────────
          const eventData: DbEventInsert = {
            title: event.title,
            description: event.description,
            slug: eventSlug,                          // ← UNIQUE SLUG: title-date-random6
            category: event.category,
            subcategory: event.subcategory,
            city: event.venue_city,
            country: 'Austria',
            start_date_time: event.start_date_time,
            end_date_time: event.end_date_time,
            venue_id: venueId.id,                   // ← CRITICAL: Venue ID is set!
            custom_venue_name: event.venue_name,
            custom_venue_address: event.venue_address,
            price_info: event.price_info,
            is_free: isFreeEvent(event.price_info),
            website_url: event.website_url,
            booking_url: event.booking_url,
            ticket_url: event.ticket_url,
            source_url: event.source_url,
            image_urls: event.image_url ? [event.image_url] : null,
            latitude: event.latitude,
            longitude: event.longitude,
            tags: event.tags,
            source: event.source,
            external_id: event.source_id,
            published_at: new Date().toISOString()
          };

          // ─────────────────────────────────────────────────────
          // STEP 3d: UPSERT TO DATABASE
          // ─────────────────────────────────────────────────────
          if (!dryRun) {
            // Use UPSERT with ON CONFLICT to handle the unique_event constraint
            // This is idempotent and batch-safe - events with same (title, start_date_time, city)
            // will be updated instead of causing duplicate key violations
            const { data, error } = await (supabaseAdmin as any)
              .from('events')
              .upsert([eventData], {
                onConflict: 'title,start_date_time,city',  // Uses unique_event constraint
                ignoreDuplicates: false  // Update existing records
              })
              .select('id');

            if (error) {
              throw new Error(`Database operation failed: ${error.message}`);
            }

            // Count as inserted (upsert handles both insert and update internally)
            result.eventsInserted++;

            // ─────────────────────────────────────────────────────
            // STEP 3e: COLLECT EVENT FOR CACHE SYNC
            // ─────────────────────────────────────────────────────
            if (syncToCache) {
              const eventDataForCache = normalizedToEventData(event);
              const eventDate = eventDataForCache.date;
              if (eventDate) {
                if (!eventsForCache.has(eventDate)) {
                  eventsForCache.set(eventDate, []);
                }
                eventsForCache.get(eventDate)!.push(eventDataForCache);
              }
            }
          } else {
            if (debug) {
              console.log(`[PIPELINE:DRY-RUN] Would upsert event: ${event.title}`);
            }
            result.eventsInserted++;
          }

        } catch (eventError: any) {
          result.eventsFailed++;
          result.errors.push(`Event "${event.title}": ${eventError.message}`);
          if (debug) {
            console.error(`[PIPELINE:ERROR] Failed to process event:`, eventError);
          }
        }
      }

      // Small delay between batches to avoid overwhelming the database
      if (i < batches.length - 1) {
        await sleep(100);
      }
    }

    // ═══════════════════════════════════════════════════════════
    // STEP 4: POST-PROCESSING - Link any remaining unlinked events
    // ═══════════════════════════════════════════════════════════
    if (!dryRun) {
      if (debug) {
        console.log('[PIPELINE:STEP4] Running post-processing venue linking...');
      }
      
      // Call the database function to link any events that might not have been linked
      // This is a safety net for edge cases
      // Note: Function signature changed - now uses sources array and similarity threshold
      // Pass array with single source and 0.7 for similarity threshold
      const linkResult = await EventRepository.linkEventsToVenues([source], 0.7, `${source} Pipeline`);
      
      if (linkResult && debug) {
        console.log(`[PIPELINE:STEP4] Post-processing linked ${linkResult.events_linked} additional events`);
      }
    }

    // ═══════════════════════════════════════════════════════════
    // STEP 5: SYNC TO UPSTASH CACHE (Day-Buckets)
    // ═══════════════════════════════════════════════════════════
    if (!dryRun && syncToCache && eventsForCache.size > 0) {
      if (debug) {
        console.log(`[PIPELINE:STEP5] Syncing ${eventsForCache.size} days to Upstash cache...`);
      }

      try {
        for (const [date, events] of eventsForCache) {
          await eventsCache.upsertDayEvents(city, date, events);
          result.eventsCached += events.length;
          if (debug) {
            console.log(`[PIPELINE:CACHE] Synced ${events.length} events for ${date}`);
          }
        }
      } catch (cacheError: any) {
        // Cache sync failure should not fail the pipeline, just log it
        console.error('[PIPELINE:CACHE:ERROR] Failed to sync to cache:', cacheError);
        result.errors.push(`Cache sync warning: ${cacheError.message}`);
      }
    }

    result.success = result.eventsFailed === 0;

  } catch (error: any) {
    result.success = false;
    result.errors.push(`Pipeline error: ${error.message}`);
    console.error('[PIPELINE:FATAL]', error);
  }

  result.duration = Date.now() - startTime;

  if (debug) {
    console.log('[PIPELINE:COMPLETE]', {
      processed: result.eventsProcessed,
      inserted: result.eventsInserted,
      failed: result.eventsFailed,
      duplicates: result.eventsSkippedAsDuplicates,
      venuesCreated: result.venuesCreated,
      venuesReused: result.venuesReused,
      cached: result.eventsCached,
      duration: `${result.duration}ms`
    });
  }

  return result;
}

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Normalize raw event input to standard format
 */
function normalizeEventInput(raw: RawEventInput, defaultCity: string): NormalizedEvent | null {
  // Validate required fields
  if (!raw.title || !raw.title.trim()) {
    return null;
  }
  if (!raw.venue_name || !raw.venue_name.trim()) {
    return null;
  }
  if (!raw.start_date_time) {
    return null;
  }

  // Parse dates
  const startDateTime = parseDateTime(raw.start_date_time);
  if (!startDateTime) {
    return null;
  }

  const endDateTime = raw.end_date_time ? parseDateTime(raw.end_date_time) : null;

  return {
    title: raw.title.trim(),
    description: raw.description?.trim() || null,
    start_date_time: startDateTime,
    end_date_time: endDateTime,
    venue_name: raw.venue_name.trim(),
    venue_address: raw.venue_address?.trim() || null,
    venue_city: raw.venue_city?.trim() || defaultCity,
    category: raw.category?.trim() || 'Event',
    subcategory: raw.subcategory?.trim() || null,
    price_info: raw.price?.trim() || raw.price_info?.trim() || null,
    ticket_url: raw.ticket_url?.trim() || null,
    booking_url: raw.booking_url?.trim() || null,
    website_url: raw.website_url?.trim() || null,
    image_url: raw.image_url?.trim() || null,
    source: raw.source,
    source_id: raw.source_id?.trim() || null,
    source_url: raw.source_url?.trim() || null,
    latitude: raw.latitude ?? null,
    longitude: raw.longitude ?? null,
    tags: raw.tags || null
  };
}

/**
 * Parse date/time input to ISO string
 */
function parseDateTime(input: string | Date): string | null {
  if (!input) return null;

  try {
    if (input instanceof Date) {
      return input.toISOString();
    }
    
    // Try parsing as ISO string
    const date = new Date(input);
    if (isNaN(date.getTime())) {
      return null;
    }
    return date.toISOString();
  } catch {
    return null;
  }
}

/**
 * Convert normalized event to EventData format for deduplication
 */
function normalizedToEventData(event: NormalizedEvent): EventData {
  // Extract date and time from ISO timestamp
  const dateMatch = event.start_date_time.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
  const date = dateMatch ? dateMatch[1] : event.start_date_time.split('T')[0] || '';
  const time = dateMatch ? dateMatch[2] : '';

  return {
    title: event.title,
    category: event.category,
    date: date,
    time: time,
    venue: event.venue_name,
    price: event.price_info || '',
    website: event.website_url || '',
    description: event.description || undefined,
    address: event.venue_address || undefined,
    city: event.venue_city,
    source: event.source  // EventData accepts string source
  };
}

/**
 * Match or create venue in database
 */
async function matchOrCreateVenue(
  venueInfo: {
    name: string;
    address: string | null;
    city: string;
    source: string;
  },
  dryRun: boolean,
  debug: boolean
): Promise<{ id: string | null; isNew: boolean }> {
  if (dryRun) {
    // In dry-run mode, generate a placeholder ID
    if (debug) {
      console.log(`[PIPELINE:VENUE:DRY-RUN] Would upsert venue: ${venueInfo.name}`);
    }
    return { id: `dry-run-${venueInfo.name.toLowerCase().replace(/\s+/g, '-')}`, isNew: true };
  }

  try {
    // First, try to find existing venue
    const existingVenue = await VenueRepository.getVenueByName(venueInfo.name, venueInfo.city);
    
    if (existingVenue) {
      return { id: existingVenue.id, isNew: false };
    }

    // Create new venue with unique slug
    // Slug format: {name}-{city}-{unique6chars}
    const venueSlug = `${slugifyText(venueInfo.name)}-${slugifyText(venueInfo.city)}-${generateUniqueId()}`.replace(/-+/g, '-');
    
    const venueData: DbVenueInsert = {
      name: venueInfo.name,
      slug: venueSlug,  // Required field with unique value
      address: venueInfo.address,
      city: venueInfo.city,
      country: 'Austria'
    };

    const venueId = await VenueRepository.upsertVenue(venueData, null);
    
    if (debug && venueId) {
      console.log(`[PIPELINE:VENUE] Created new venue: ${venueInfo.name} (${venueId})`);
    }

    return { id: venueId, isNew: true };
  } catch (error: any) {
    console.error(`[PIPELINE:VENUE:ERROR] Failed to match/create venue ${venueInfo.name}:`, error);
    return { id: null, isNew: false };
  }
}

/**
 * Generate a 6-character random alphanumeric suffix for unique slugs
 */
function generateUniqueId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generate URL-friendly slug from text
 */
function slugifyText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-zA-Z0-9\s-]/g, '') // Remove special chars
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Generate unique event slug: title-date-unique6chars
 * Format: {event-title}-{YYYY-MM-DD}-{6-char-suffix}
 */
function generateEventSlug(title: string, startDateTime: string): string {
  const titleSlug = slugifyText(title);
  // Extract date from ISO timestamp
  const dateMatch = startDateTime.match(/^(\d{4}-\d{2}-\d{2})/);
  const dateSlug = dateMatch ? dateMatch[1] : new Date().toISOString().split('T')[0];
  const uniqueSuffix = generateUniqueId();
  
  return `${titleSlug}-${dateSlug}-${uniqueSuffix}`.replace(/-+/g, '-');
}

/**
 * Check if an event is free based on price string
 */
function isFreeEvent(priceStr?: string | null): boolean {
  if (!priceStr) return false;
  const lower = priceStr.toLowerCase().trim();
  return (
    lower === 'free' ||
    lower === 'gratis' ||
    lower === 'kostenlos' ||
    lower.startsWith('free ') ||
    lower.startsWith('gratis ') ||
    lower.includes('eintritt frei')
  );
}

/**
 * Split array into chunks
 */
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ═══════════════════════════════════════════════════════════════
// CONVENIENCE FUNCTIONS FOR DIFFERENT SOURCES
// ═══════════════════════════════════════════════════════════════

/**
 * Process events from Wien.info source
 */
export async function processWienInfoEvents(
  events: RawEventInput[],
  options?: Partial<Omit<PipelineOptions, 'source'>>
): Promise<PipelineResult> {
  return processEvents(events, {
    ...options,
    source: 'wien.info'
  });
}

/**
 * Process events from AI search source
 */
export async function processAISearchEvents(
  events: RawEventInput[],
  options?: Partial<Omit<PipelineOptions, 'source'>>
): Promise<PipelineResult> {
  return processEvents(events, {
    ...options,
    source: 'ai-search'
  });
}

/**
 * Process events from scraper source
 */
export async function processScraperEvents(
  events: RawEventInput[],
  options?: Partial<Omit<PipelineOptions, 'source'>>
): Promise<PipelineResult> {
  return processEvents(events, {
    ...options,
    source: 'scraper'
  });
}

/**
 * Process events from community submissions
 */
export async function processCommunityEvents(
  events: RawEventInput[],
  options?: Partial<Omit<PipelineOptions, 'source'>>
): Promise<PipelineResult> {
  return processEvents(events, {
    ...options,
    source: 'community'
  });
}
