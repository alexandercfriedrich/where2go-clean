import { Redis } from '@upstash/redis';
import { normalizeCategory as canonicalCategory } from './eventCategories';

export interface CacheEntryDebug {
  key: string;
  dataLength: number | 'not-array' | 0;
  ttlSeconds: number | null;
}

/**
 * Redis-backed events cache (versioned namespace).
 * - Always writes JSON strings
 * - Robust parsing on read (guards against "[object Object]" corrupt values)
 * - Never falls back to in-memory (throws if Redis env is missing)
 *
 * NOTE: Class name kept as InMemoryCache for compatibility with existing imports.
 */
class InMemoryCache {
  private redis: Redis;
  private prefix = 'events:v2:'; // versioned namespace to avoid old/corrupt entries

  constructor() {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) {
      throw new Error('[eventsCache] Redis env vars missing (UPSTASH_REDIS_REST_URL/TOKEN).');
    }
    this.redis = new Redis({ url, token });
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

  static normalizeCategory(category: string): string {
    const norm = canonicalCategory(category);
    return (norm || category || '').trim();
  }

  private k(key: string) {
    return `${this.prefix}${key}`;
  }

  // Generic Redis ops with robust JSON handling
  async set<T>(key: string, value: T, ttlSeconds = 300): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      await this.redis.set(this.k(key), serialized, { ex: ttlSeconds });
    } catch (e) {
      console.error('[eventsCache.set] Redis error:', e);
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await this.redis.get(this.k(key));
      if (!raw) return null;

      if (typeof raw === 'object' && raw !== null) {
        // Upstash can sometimes return objects
        return raw as T;
      }

      const str = String(raw);
      if (str === '[object Object]' || str.startsWith('[object Object]')) {
        console.warn(`[eventsCache.get] Corrupted value for key=${key}: ${str}. Deleting key.`);
        await this.redis.del(this.k(key));
        return null;
      }

      return JSON.parse(str) as T;
    } catch (e) {
      console.error('[eventsCache.get] Parse/Redis error for key=', key, e);
      return null;
    }
  }

  // Category helpers
  async getEventsByCategories(city: string, date: string, categories: string[]): Promise<{
    cachedEvents: { [category: string]: any[] };
    missingCategories: string[];
    cacheInfo: { [category: string]: { fromCache: boolean; eventCount: number } };
  }> {
    const cachedEvents: Record<string, any[]> = {};
    const missingCategories: string[] = [];
    const cacheInfo: Record<string, { fromCache: boolean; eventCount: number }> = {};

    for (const category of categories) {
      const key = InMemoryCache.createKeyForCategory(city, date, category);
      const events = await this.get<any[]>(key);
      if (Array.isArray(events) && events.length > 0) {
        cachedEvents[category] = events;
        cacheInfo[category] = { fromCache: true, eventCount: events.length };
      } else {
        missingCategories.push(category);
        cacheInfo[category] = { fromCache: false, eventCount: 0 };
      }
    }
    return { cachedEvents, missingCategories, cacheInfo };
  }

  async setEventsByCategory(city: string, date: string, category: string, events: any[], ttlSeconds = 300): Promise<void> {
    const key = InMemoryCache.createKeyForCategory(city, date, category);
    await this.set(key, events, ttlSeconds);
  }

  // Admin/Debug helpers
  async listBaseKeys(): Promise<string[]> {
    const out: string[] = [];
    for await (const full of this.redis.scanIterator({ match: `${this.prefix}*`, count: 1000 })) {
      out.push(String(full).replace(this.prefix, ''));
    }
    return out;
  }

  async getEntryDebug(baseKey: string): Promise<CacheEntryDebug> {
    try {
      const [raw, ttl] = await Promise.all([
        this.redis.get(this.k(baseKey)),
        this.redis.ttl(this.k(baseKey))
      ]);
      let dataLength: number | 'not-array' | 0 = 0;
      if (raw) {
        if (typeof raw === 'object' && raw !== null) {
          dataLength = Array.isArray(raw) ? raw.length : 'not-array';
        } else {
          try {
            const parsed = JSON.parse(String(raw));
            dataLength = Array.isArray(parsed) ? parsed.length : 'not-array';
          } catch {
            dataLength = 'not-array';
          }
        }
      }
      return { key: baseKey, dataLength, ttlSeconds: typeof ttl === 'number' ? ttl : null };
    } catch {
      return { key: baseKey, dataLength: 0, ttlSeconds: null };
    }
  }

  async size(): Promise<number> {
    let n = 0;
    for await (const _ of this.redis.scanIterator({ match: `${this.prefix}*`, count: 1000 })) n++;
    return n;
  }

  async clear(): Promise<void> {
    const keys: string[] = [];
    for await (const full of this.redis.scanIterator({ match: `${this.prefix}*`, count: 1000 })) {
      keys.push(String(full));
    }
    if (keys.length) await this.redis.del(...keys);
  }

  async cleanup(): Promise<void> {
    // TTL-based cleanup handled by Redis
  }
}

// Singleton instance
export const eventsCache = new InMemoryCache();
export default InMemoryCache;
