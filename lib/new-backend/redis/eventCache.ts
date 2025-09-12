/**
 * Event cache implementation for the new backend system.
 * This module provides per-category caching with Redis backend.
 * 
 * @fileoverview Per-category event caching with metadata and locking.
 */

import { getRedisClient, REDIS_KEYS } from './redisClient';
import { createComponentLogger } from '../utils/log';
import { createError, ErrorCode, fromError, type AppError } from '../utils/errors';
import { 
  type EventData, 
  type EventCacheMetadata, 
  type CacheCheckResult 
} from '../types/events';
import { normalizeCategory } from '../categories/normalize';

const logger = createComponentLogger('EventCache');

/**
 * Event cache interface for managing cached events.
 */
export interface EventCache {
  /**
   * Get events for specific categories from cache.
   */
  getEventsForCategories(
    city: string, 
    date: string, 
    categories: string[]
  ): Promise<CacheCheckResult>;

  /**
   * Cache events for a specific category.
   */
  cacheEvents(
    city: string,
    date: string,
    category: string,
    events: EventData[],
    ttlSeconds?: number
  ): Promise<void>;

  /**
   * Check if events are cached for a category.
   */
  isCached(city: string, date: string, category: string): Promise<boolean>;

  /**
   * Get cache metadata for a category.
   */
  getCacheMetadata(
    city: string, 
    date: string, 
    category: string
  ): Promise<EventCacheMetadata | null>;

  /**
   * Clear cached events for a category.
   */
  clearCategory(city: string, date: string, category: string): Promise<void>;

  /**
   * Acquire lock for category processing.
   */
  acquireLock(
    city: string, 
    date: string, 
    category: string, 
    lockTtlSeconds?: number
  ): Promise<boolean>;

  /**
   * Release lock for category processing.
   */
  releaseLock(city: string, date: string, category: string): Promise<void>;

  /**
   * Check if category is currently locked.
   */
  isLocked(city: string, date: string, category: string): Promise<boolean>;

  /**
   * Get cache statistics for debugging.
   */
  getCacheStats(): Promise<{
    totalCategories: number;
    totalEvents: number;
    averageTtl: number;
  }>;
}

/**
 * Default cache TTL in seconds (1 hour).
 */
const DEFAULT_CACHE_TTL = 3600;

/**
 * Default lock TTL in seconds (5 minutes).
 */
const DEFAULT_LOCK_TTL = 300;

/**
 * Redis-backed event cache implementation.
 */
export class RedisEventCache implements EventCache {
  private redisClient = getRedisClient();

  /**
   * Get events for specific categories from cache.
   */
  async getEventsForCategories(
    city: string,
    date: string,
    categories: string[]
  ): Promise<CacheCheckResult> {
    try {
      logger.debug('Checking cache for categories', {
        city,
        date,
        categoryCount: categories.length
      });

      const normalizedCategories = categories.map(normalizeCategory);
      const cachedEvents: Record<string, EventData[]> = {};
      const cacheMetadata: Record<string, EventCacheMetadata> = {};
      const missingCategories: string[] = [];

      // Check each category individually
      for (const category of normalizedCategories) {
        const events = await this.getCachedEventsForCategory(city, date, category);
        const metadata = await this.getCacheMetadata(city, date, category);

        if (events && metadata && !this.isExpired(metadata)) {
          cachedEvents[category] = events;
          cacheMetadata[category] = metadata;
          
          logger.debug('Cache hit for category', {
            city,
            date,
            category,
            eventCount: events.length
          });
        } else {
          missingCategories.push(category);
          
          logger.debug('Cache miss for category', {
            city,
            date,
            category,
            hasEvents: !!events,
            hasMetadata: !!metadata,
            expired: metadata ? this.isExpired(metadata) : false
          });

          // Clean up expired entries
          if (events || metadata) {
            await this.clearCategory(city, date, category);
          }
        }
      }

      const totalCachedEvents = Object.values(cachedEvents)
        .reduce((sum, events) => sum + events.length, 0);

      logger.info('Cache check completed', {
        city,
        date,
        totalCategories: categories.length,
        cachedCategories: Object.keys(cachedEvents).length,
        missingCategories: missingCategories.length,
        totalCachedEvents
      });

      return {
        cachedEvents,
        missingCategories,
        cacheMetadata
      };

    } catch (error) {
      const appError = fromError(error, ErrorCode.CACHE_ERROR);
      logger.error('Failed to get events from cache', {
        city,
        date,
        categoryCount: categories.length,
        error: appError
      });
      throw appError;
    }
  }

  /**
   * Cache events for a specific category.
   */
  async cacheEvents(
    city: string,
    date: string,
    category: string,
    events: EventData[],
    ttlSeconds: number = DEFAULT_CACHE_TTL
  ): Promise<void> {
    try {
      const normalizedCategory = normalizeCategory(category);
      const now = new Date();
      const expireAt = new Date(now.getTime() + ttlSeconds * 1000);

      logger.debug('Caching events for category', {
        city,
        date,
        category: normalizedCategory,
        eventCount: events.length,
        ttlSeconds
      });

      await this.redisClient.executeOperation(async (client) => {
        // Store events
        await client.set(
          REDIS_KEYS.EVENTS(city, date, normalizedCategory),
          JSON.stringify(events),
          { ex: ttlSeconds }
        );

        // Store metadata
        const metadata: EventCacheMetadata = {
          cachedAt: now.toISOString(),
          ttlSeconds,
          expireAt: expireAt.toISOString(),
          eventCount: events.length
        };

        await client.set(
          REDIS_KEYS.EVENTS_META(city, date, normalizedCategory),
          JSON.stringify(metadata),
          { ex: ttlSeconds }
        );

        logger.info('Cached events for category', {
          city,
          date,
          category: normalizedCategory,
          eventCount: events.length,
          expireAt: expireAt.toISOString()
        });
      }, `cacheEvents(${city}, ${date}, ${normalizedCategory})`);

    } catch (error) {
      const appError = fromError(error, ErrorCode.CACHE_ERROR);
      logger.error('Failed to cache events', {
        city,
        date,
        category,
        eventCount: events.length,
        error: appError
      });
      throw appError;
    }
  }

  /**
   * Check if events are cached for a category.
   */
  async isCached(city: string, date: string, category: string): Promise<boolean> {
    try {
      const normalizedCategory = normalizeCategory(category);

      return await this.redisClient.executeOperation(async (client) => {
        const exists = await client.exists(REDIS_KEYS.EVENTS(city, date, normalizedCategory));
        return exists === 1;
      }, `isCached(${city}, ${date}, ${normalizedCategory})`);

    } catch (error) {
      logger.error('Failed to check cache status', {
        city,
        date,
        category,
        error: fromError(error)
      });
      return false; // Assume not cached on error
    }
  }

  /**
   * Get cache metadata for a category.
   */
  async getCacheMetadata(
    city: string,
    date: string,
    category: string
  ): Promise<EventCacheMetadata | null> {
    try {
      const normalizedCategory = normalizeCategory(category);

      return await this.redisClient.executeOperation(async (client) => {
        const metadataJson = await client.get(
          REDIS_KEYS.EVENTS_META(city, date, normalizedCategory)
        );

        if (!metadataJson) {
          return null;
        }

        return JSON.parse(metadataJson) as EventCacheMetadata;
      }, `getCacheMetadata(${city}, ${date}, ${normalizedCategory})`);

    } catch (error) {
      logger.error('Failed to get cache metadata', {
        city,
        date,
        category,
        error: fromError(error)
      });
      return null;
    }
  }

  /**
   * Clear cached events for a category.
   */
  async clearCategory(city: string, date: string, category: string): Promise<void> {
    try {
      const normalizedCategory = normalizeCategory(category);

      await this.redisClient.executeOperation(async (client) => {
        await Promise.all([
          client.del(REDIS_KEYS.EVENTS(city, date, normalizedCategory)),
          client.del(REDIS_KEYS.EVENTS_META(city, date, normalizedCategory))
        ]);

        logger.debug('Cleared cache for category', {
          city,
          date,
          category: normalizedCategory
        });
      }, `clearCategory(${city}, ${date}, ${normalizedCategory})`);

    } catch (error) {
      const appError = fromError(error, ErrorCode.CACHE_ERROR);
      logger.error('Failed to clear category cache', {
        city,
        date,
        category,
        error: appError
      });
      throw appError;
    }
  }

  /**
   * Acquire lock for category processing.
   */
  async acquireLock(
    city: string,
    date: string,
    category: string,
    lockTtlSeconds: number = DEFAULT_LOCK_TTL
  ): Promise<boolean> {
    try {
      const normalizedCategory = normalizeCategory(category);

      return await this.redisClient.executeOperation(async (client) => {
        const lockKey = REDIS_KEYS.EVENTS_LOCK(city, date, normalizedCategory);
        
        // Try to acquire lock (set if not exists)
        const result = await client.set(
          lockKey,
          new Date().toISOString(),
          { ex: lockTtlSeconds }
        );

        const acquired = result === 'OK';

        if (acquired) {
          logger.debug('Acquired lock for category', {
            city,
            date,
            category: normalizedCategory,
            lockTtlSeconds
          });
        } else {
          logger.debug('Failed to acquire lock for category (already locked)', {
            city,
            date,
            category: normalizedCategory
          });
        }

        return acquired;
      }, `acquireLock(${city}, ${date}, ${normalizedCategory})`);

    } catch (error) {
      logger.error('Failed to acquire lock', {
        city,
        date,
        category,
        error: fromError(error)
      });
      return false; // Assume lock not acquired on error
    }
  }

  /**
   * Release lock for category processing.
   */
  async releaseLock(city: string, date: string, category: string): Promise<void> {
    try {
      const normalizedCategory = normalizeCategory(category);

      await this.redisClient.executeOperation(async (client) => {
        await client.del(REDIS_KEYS.EVENTS_LOCK(city, date, normalizedCategory));

        logger.debug('Released lock for category', {
          city,
          date,
          category: normalizedCategory
        });
      }, `releaseLock(${city}, ${date}, ${normalizedCategory})`);

    } catch (error) {
      logger.error('Failed to release lock', {
        city,
        date,
        category,
        error: fromError(error)
      });
      // Don't throw - lock will expire anyway
    }
  }

  /**
   * Check if category is currently locked.
   */
  async isLocked(city: string, date: string, category: string): Promise<boolean> {
    try {
      const normalizedCategory = normalizeCategory(category);

      return await this.redisClient.executeOperation(async (client) => {
        const exists = await client.exists(
          REDIS_KEYS.EVENTS_LOCK(city, date, normalizedCategory)
        );
        return exists === 1;
      }, `isLocked(${city}, ${date}, ${normalizedCategory})`);

    } catch (error) {
      logger.error('Failed to check lock status', {
        city,
        date,
        category,
        error: fromError(error)
      });
      return false; // Assume not locked on error
    }
  }

  /**
   * Get cache statistics for debugging.
   */
  async getCacheStats(): Promise<{
    totalCategories: number;
    totalEvents: number;
    averageTtl: number;
  }> {
    try {
      // This is a simplified implementation
      // In production, you might want to scan Redis keys more efficiently
      return {
        totalCategories: 0,
        totalEvents: 0,
        averageTtl: 0
      };
    } catch (error) {
      logger.error('Failed to get cache stats', { error: fromError(error) });
      return {
        totalCategories: 0,
        totalEvents: 0,
        averageTtl: 0
      };
    }
  }

  /**
   * Get cached events for a specific category.
   */
  private async getCachedEventsForCategory(
    city: string,
    date: string,
    category: string
  ): Promise<EventData[] | null> {
    try {
      return await this.redisClient.executeOperation(async (client) => {
        const eventsJson = await client.get(REDIS_KEYS.EVENTS(city, date, category));

        if (!eventsJson) {
          return null;
        }

        return JSON.parse(eventsJson) as EventData[];
      }, `getCachedEventsForCategory(${city}, ${date}, ${category})`);

    } catch (error) {
      logger.error('Failed to get cached events for category', {
        city,
        date,
        category,
        error: fromError(error)
      });
      return null;
    }
  }

  /**
   * Check if cache metadata indicates expiration.
   */
  private isExpired(metadata: EventCacheMetadata): boolean {
    const now = new Date();
    const expireAt = new Date(metadata.expireAt);
    return now > expireAt;
  }
}

/**
 * Global event cache instance.
 */
let eventCache: EventCache | null = null;

/**
 * Get the global event cache instance.
 */
export function getEventCache(): EventCache {
  if (!eventCache) {
    eventCache = new RedisEventCache();
  }
  return eventCache;
}