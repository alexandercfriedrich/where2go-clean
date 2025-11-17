import { EventRepository } from '../repositories/EventRepository'
import { eventsCache } from '../cache'
import type { EventData } from '../types'

/**
 * HybridEventService provides a unified interface for fetching events
 * with automatic fallback from PostgreSQL to Redis cache.
 * 
 * Strategy:
 * 1. Try PostgreSQL first (primary data source)
 * 2. If PostgreSQL returns no results, fallback to Redis cache
 * 3. Optionally import Redis events into PostgreSQL in background
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
    let source: 'postgresql' | 'redis' | 'hybrid' = 'postgresql'
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
        source = 'hybrid'

        // 3. Optional: Import Redis events to PostgreSQL in background
        if (backgroundImport) {
          this.importRedisEventsToPostgres(redisEvents, params.city).catch(err => {
            console.error('[HybridEventService] Background import failed:', err)
          })
        }

        return {
          events: redisEvents,
          source,
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
   * Import events from Redis to PostgreSQL in background
   * This is a best-effort operation that doesn't block the response
   */
  private static async importRedisEventsToPostgres(
    events: EventData[],
    city: string
  ): Promise<void> {
    try {
      const result = await EventRepository.upsertEvents(events, city)
      if (result.success) {
        console.log(`[HybridEventService] Imported ${result.upserted} events from Redis to PostgreSQL`)
      } else {
        console.error('[HybridEventService] Failed to import events from Redis')
      }
    } catch (error) {
      console.error('[HybridEventService] Exception during import:', error)
    }
  }

  /**
   * Batch import events from Redis to PostgreSQL
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
    errors: string[]
  }> {
    const errors: string[] = []
    let totalProcessed = 0
    let totalImported = 0

    for (const category of categories) {
      try {
        const cacheKey = `${city.toLowerCase()}_${date}_${category}`
        const redisEvents = await eventsCache.get<EventData[]>(cacheKey)

        if (!redisEvents || !Array.isArray(redisEvents) || redisEvents.length === 0) {
          continue
        }

        totalProcessed += redisEvents.length

        const result = await EventRepository.upsertEvents(redisEvents, city)
        if (result.success) {
          totalImported += result.upserted
        } else {
          errors.push(`Failed to import ${category}: upsert failed`)
        }
      } catch (error) {
        errors.push(`Exception for ${category}: ${error}`)
      }
    }

    return {
      success: errors.length === 0,
      totalProcessed,
      totalImported,
      errors
    }
  }
}
