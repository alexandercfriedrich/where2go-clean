// Redis-backed events cache using Upstash Redis
// Phase 2A: Kategorie-Normalisierung via eventCategories (Single Source of Truth)

import { Redis } from '@upstash/redis';
import { normalizeCategory as canonicalCategory } from './eventCategories';

/**
 * Redis-backed events cache implementation
 * Requires UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN environment variables
 */
class EventsCache {
  private redis: Redis;

  constructor() {
    const restUrl = process.env.UPSTASH_REDIS_REST_URL;
    const restToken = process.env.UPSTASH_REDIS_REST_TOKEN;
    
    if (!restUrl || !restToken) {
      throw new Error('UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN environment variables are required for events cache. In-memory cache is not allowed.');
    }
    
    this.redis = new Redis({
      url: restUrl,
      token: restToken,
    });
  }

  async set<T>(key: string, value: T, ttlSeconds: number = 300): Promise<void> {
    const serialized = JSON.stringify(value);
    await this.redis.setex(key, ttlSeconds, serialized);
  }

  async get<T>(key: string): Promise<T | null> {
    const data = await this.redis.get<string>(key);
    if (!data) return null;
    try {
      return JSON.parse(data) as T;
    } catch (error) {
      console.warn('Failed to parse cached data for key:', key, error);
      return null;
    }
  }

  async has(key: string): Promise<boolean> {
    const result = await this.redis.exists(key);
    return result === 1;
  }

  async delete(key: string): Promise<boolean> {
    const result = await this.redis.del(key);
    return result === 1;
  }

  // No-op for Redis as TTL is handled automatically
  cleanup(): void {
    // Redis automatically handles TTL expiration
  }

  async size(): Promise<number> {
    // Count keys with our pattern - this could be expensive in production
    const keys = await this.redis.keys('*');
    return keys.length;
  }

  async clear(): Promise<void> {
    const keys = await this.redis.keys('*');
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  static createKey(city: string, date: string, categories?: string[]): string {
    const categoriesStr = categories && categories.length > 0
      ? categories.map(cat => this.normalizeCategory(cat)).sort().join(',')
      : 'all';
    return `${city.toLowerCase().trim()}_${date}_${categoriesStr}`;
  }

  static createKeyForCategory(city: string, date: string, category: string): string {
    return `${city.toLowerCase().trim()}_${date}_${this.normalizeCategory(category)}`;
  }

  // Jetzt zentrale Normalisierung (Alias für Import, kein rekursiver Self-Call)
  static normalizeCategory(category: string): string {
    if (!category) return '';
    const norm = canonicalCategory(category);
    return (norm || category).trim();
  }

  async getEventsByCategories(city: string, date: string, categories: string[]): Promise<{
    cachedEvents: { [category: string]: any[] };
    missingCategories: string[];
    cacheInfo: { [category: string]: { fromCache: boolean; eventCount: number } };
  }> {
    const cachedEvents: { [category: string]: any[] } = {};
    const missingCategories: string[] = [];
    const cacheInfo: { [category: string]: { fromCache: boolean; eventCount: number } } = {};

    // Process categories in parallel for better performance
    const results = await Promise.all(
      categories.map(async (category) => {
        const cacheKey = EventsCache.createKeyForCategory(city, date, category);
        const events = await this.get<any[]>(cacheKey);
        return { category, cacheKey, events };
      })
    );

    for (const { category, events } of results) {
      if (events) {
        cachedEvents[category] = events;
        cacheInfo[category] = { fromCache: true, eventCount: events.length };
      } else {
        missingCategories.push(category);
        cacheInfo[category] = { fromCache: false, eventCount: 0 };
      }
    }

    return { cachedEvents, missingCategories, cacheInfo };
  }

  async setEventsByCategory(city: string, date: string, category: string, events: any[], ttlSeconds: number = 300): Promise<void> {
    const cacheKey = EventsCache.createKeyForCategory(city, date, category);
    await this.set(cacheKey, events, ttlSeconds);
  }

  // Admin/Debug methods for Redis cache inspection
  async listBaseKeys(): Promise<string[]> {
    const keys = await this.redis.keys('*');
    // Extract base keys (city_date pattern) from cache keys
    const baseKeySet = new Set<string>();
    for (const key of keys) {
      const parts = key.split('_');
      if (parts.length >= 3) {
        const baseKey = `${parts[0]}_${parts[1]}`;
        baseKeySet.add(baseKey);
      }
    }
    return Array.from(baseKeySet);
  }

  async getEntryDebug(baseKey: string): Promise<{ key: string; ttl: number; length: number }[]> {
    const pattern = `${baseKey}_*`;
    const keys = await this.redis.keys(pattern);
    
    const debugEntries = await Promise.all(
      keys.map(async (key) => {
        const ttl = await this.redis.ttl(key);
        const data = await this.get<any[]>(key);
        return {
          key,
          ttl: ttl === -1 ? -1 : ttl, // -1 means no expiration, -2 means key doesn't exist
          length: Array.isArray(data) ? data.length : 0
        };
      })
    );

    return debugEntries.filter(entry => entry.ttl !== -2); // Filter out non-existent keys
  }
}

export const eventsCache = new EventsCache();

// Note: Redis automatically handles TTL expiration, no cleanup needed

export default EventsCache;
