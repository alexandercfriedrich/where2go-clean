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

  /**
   * Internal helper: scan all keys matching a pattern with safe fallbacks.
   * Prefers scanIterator if available; falls back to SCAN loop; final fallback to KEYS.
   */
  private async scanAllKeys(match: string, count = 1000): Promise<string[]> {
    const r: any = this.redis as any;

    // Preferred: scanIterator if available (runtime check to avoid TS type errors)
    if (typeof r.scanIterator === 'function') {
      const out: string[] = [];
      for await (const full of r.scanIterator({ match, count })) {
        out.push(String(full));
      }
      return out;
    }

    // Fallback: manual SCAN loop (supports both tuple and object return shapes)
    if (typeof r.scan === 'function') {
      const out: string[] = [];
      let cursor: number | string = 0;

      // Normalize cursor to string for safety
      const toNum = (c: any) => {
        const n = typeof c === 'string' ? parseInt(c, 10) : Number(c);
        return Number.isFinite(n) ? n : 0;
      };

      // Iterate until cursor becomes 0
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const res = await r.scan(cursor, { match, count });

        let nextCursor: number = 0;
        let keys: string[] = [];

        if (Array.isArray(res) && res.length === 2) {
          // Tuple form: [cursor, keys[]]
          nextCursor = toNum(res[0]);
          keys = Array.isArray(res[1]) ? res[1] : [];
        } else if (res && typeof res === 'object') {
          // Object form: { cursor, keys }
          nextCursor = toNum(res.cursor);
          keys = Array.isArray(res.keys) ? res.keys : [];
        } else {
          break;
        }

        if (keys.length) out.push(...keys);
        cursor = nextCursor;
        if (nextCursor === 0) break;
      }

      return out;
    }

    // Last resort: KEYS (acceptable for admin/debug; avoid in hot paths)
    if (typeof r.keys === 'function') {
      try {
        const keys: string[] = await r.keys(match);
        return Array.isArray(keys) ? keys : [];
      } catch (e) {
        console.warn('[eventsCache] KEYS fallback failed:', e);
      }
    }

    return [];
  }

  // Admin/Debug helpers
  async listBaseKeys(): Promise<string[]> {
    const fullKeys = await this.scanAllKeys(`${this.prefix}*`, 1000);
    return fullKeys.map(k => String(k).replace(this.prefix, ''));
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
    const baseKeys = await this.listBaseKeys();
    return baseKeys.length;
  }

  async clear(): Promise<void> {
    const fullKeys = await this.scanAllKeys(`${this.prefix}*`, 1000);
    if (fullKeys.length) {
      // Upstash DEL supports variadic
      await (this.redis as any).del(...fullKeys);
    }
  }

  async cleanup(): Promise<void> {
    // TTL-based cleanup handled by Redis
  }
}

// Singleton instance
export const eventsCache = new InMemoryCache();
export default InMemoryCache;
