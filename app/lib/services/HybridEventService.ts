import { EventRepository } from '../repositories/EventRepository'
import { eventsCache } from '../cache'
import { processEvents, RawEventInput } from '../../../lib/events/unified-event-pipeline'
import type { EventData } from '../types'

/**
 * HybridEventService provides a unified interface for fetching events
 * with automatic fallback from PostgreSQL to Redis cache.
 * 
 * Strategy:
 * 1. Try PostgreSQL first (primary data source)
 * 2. If PostgreSQL returns no results, fallback to Redis cache
 * 3. Optionally import Redis events into PostgreSQL via unified pipeline
 */
export class HybridEventService {
  /**
   * Get events with hybrid fallback logic
   * @param params Query parameters
   * @param options Additional options
   * @returns Events array with metadata about source
   */
  static async getEvents(
    params: {
      city: string
      date?: string
      category?: string
      limit?: number
    },
    options: {
      enableRedisFallback?: boolean
      backgroundImport?: boolean
    } = {}
  ): Promise<{
    events: EventData[]
    source: 'postgresql' | 'redis' | 'hybrid'
    fromCache: boolean
    meta: {
      pgCount: number
      redisCount: number
      imported?: number
    }
  }> {
    const { enableRedisFallback = true, backgroundImport = false } = options
    const meta = { pgCount: 0, redisCount: 0 }

    // 1. Try PostgreSQL first
    const pgEvents = await EventRepository.getEvents(params)
    meta.pgCount = pgEvents.length

    if (pgEvents.length > 0) {
      return {
        events: pgEvents,
        source: 'postgresql',
        fromCache: false,
        meta
      }
    }

    // 2. Fallback to Redis if enabled and PG returned nothing
    if (enableRedisFallback && params.date && params.category) {
      const cacheKey = `${params.city.toLowerCase()}_${params.date}_${params.category}`
      const redisEvents = await eventsCache.get<EventData[]>(cacheKey)
      
      if (redisEvents && Array.isArray(redisEvents) && redisEvents.length > 0) {
        meta.redisCount = redisEvents.length

        // 3. Optional: Import Redis events to PostgreSQL in background
        if (backgroundImport) {
          this.importRedisEventsToPostgres(redisEvents, params.city).catch(err => {
            try {
              console.error('[HybridEventService] Background import failed:', err)
            } catch (logErr) {
              // Defensive: if console.error fails, write to stderr
              process.stderr && process.stderr.write('[HybridEventService] Logging failed: ' + String(logErr) + '\n')
            }
          })
        }

        return {
          events: redisEvents,
          source: 'hybrid',
          fromCache: true,
          meta
        }
      }
    }

    // No results from either source
    return {
      events: [],
      source: 'postgresql',
      fromCache: false,
      meta
    }
  }

  /**
   * Search events with hybrid fallback
   */
  static async searchEvents(
    params: {
      city: string
      searchTerm: string
      limit?: number
    }
  ): Promise<{
    events: EventData[]
    source: 'postgresql'
  }> {
    // For search, we only use PostgreSQL (full-text search capability)
    const events = await EventRepository.searchEvents(params)

    return {
      events,
      source: 'postgresql'
    }
  }

  /**
   * Import events from Redis to PostgreSQL via unified pipeline
   * This is a best-effort operation that doesn't block the response
   */
  private static async importRedisEventsToPostgres(
    events: EventData[],
    city: string
  ): Promise<void> {
    try {
      // Convert EventData to RawEventInput for unified pipeline
      const rawEvents: RawEventInput[] = events
        .filter(e => e.title && e.venue)
        .map(e => ({
          title: e.title,
          description: e.description,
          start_date_time: e.date && e.time ? `${e.date}T${e.time}:00.000Z` : e.date ? `${e.date}T00:00:00.000Z` : new Date().toISOString(),
          end_date_time: e.endTime && e.date ? `${e.date}T${e.endTime}:00.000Z` : undefined,
          venue_name: e.venue || 'Unknown Venue',
          venue_address: e.address,
          venue_city: e.city || city,
          category: e.category,
          price: e.price,
          website_url: e.website,
          ticket_url: e.bookingLink,
          image_url: e.imageUrl,
          source: 'rss' as const, // Redis cache events are typically from RSS or similar sources
          source_url: e.website,
          latitude: e.latitude,
          longitude: e.longitude
        }));

      if (rawEvents.length === 0) {
        console.log('[HybridEventService] No valid events to import from Redis');
        return;
      }

      const result = await processEvents(rawEvents, {
        source: 'redis-import',
        city: city,
        dryRun: false,
        debug: false
      });

      if (result.success) {
        console.log(`[HybridEventService] Imported ${result.eventsInserted} events from Redis via unified pipeline, ${result.venuesCreated} new venues`);
      } else {
        console.error('[HybridEventService] Failed to import events from Redis:', result.errors);
      }
    } catch (error) {
      console.error('[HybridEventService] Exception during import:', error)
    }
  }

  /**
   * Batch import events from Redis to PostgreSQL via unified pipeline
   * Used by migration script
   */
  static async batchImportFromRedis(
    city: string,
    date: string,
    categories: string[]
  ): Promise<{
    success: boolean
    totalProcessed: number
    totalImported: number
    venuesCreated: number
    errors: string[]
  }> {
    const errors: string[] = []
    let totalProcessed = 0
    let totalImported = 0
    let venuesCreated = 0

    for (const category of categories) {
      try {
        const cacheKey = `${city.toLowerCase()}_${date}_${category}`
        const redisEvents = await eventsCache.get<EventData[]>(cacheKey)

        if (!redisEvents || !Array.isArray(redisEvents) || redisEvents.length === 0) {
          continue
        }

        totalProcessed += redisEvents.length

        // Convert EventData to RawEventInput for unified pipeline
        const rawEvents: RawEventInput[] = redisEvents
          .filter(e => e.title && e.venue)
          .map(e => ({
            title: e.title,
            description: e.description,
            start_date_time: e.date && e.time ? `${e.date}T${e.time}:00.000Z` : e.date ? `${e.date}T00:00:00.000Z` : new Date().toISOString(),
            end_date_time: e.endTime && e.date ? `${e.date}T${e.endTime}:00.000Z` : undefined,
            venue_name: e.venue || 'Unknown Venue',
            venue_address: e.address,
            venue_city: e.city || city,
            category: e.category,
            price: e.price,
            website_url: e.website,
            ticket_url: e.bookingLink,
            image_url: e.imageUrl,
            source: 'rss' as const,
            source_url: e.website,
            latitude: e.latitude,
            longitude: e.longitude
          }));

        if (rawEvents.length === 0) continue;

        const result = await processEvents(rawEvents, {
          source: 'redis-batch-import',
          city: city,
          dryRun: false,
          debug: false
        });

        if (result.success) {
          totalImported += result.eventsInserted
          venuesCreated += result.venuesCreated
        } else {
          errors.push(`Failed to import ${category}: ${result.errors.join(', ')}`)
        }
      } catch (error) {
        errors.push(`Exception for ${category}: ${error}`)
      }
    }

    return {
      success: errors.length === 0,
      totalProcessed,
      totalImported,
      venuesCreated,
      errors
    }
  }
}
