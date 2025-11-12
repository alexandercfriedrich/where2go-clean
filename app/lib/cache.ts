import { Redis } from '@upstash/redis';
import { normalizeCategory as canonicalCategory } from './eventCategories';
import { DayBucket, EventData } from './types';
import { generateEventId } from './eventId';

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
  private dayBucketPrefix = 'events:v3:'; // day-bucket namespace

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
  async set<T>(key: string, value: T, ttlSeconds = 3600): Promise<void> {
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

  async setEventsByCategory(city: string, date: string, category: string, events: any[], ttlSeconds = 3600): Promise<void> {
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

  // Day-Bucket Cache Operations (v3)

  /**
   * Creates a cache key for the day-bucket format: events:v3:day:{city}_{date}
   */
  static createDayBucketKey(city: string, date: string): string {
    return `day:${city.toLowerCase().trim()}_${date.slice(0, 10)}`;
  }

  /**
   * Retrieves the day-bucket for a given city and date.
   * Returns null if not found or invalid.
   */
  async getDayEvents(city: string, date: string): Promise<DayBucket | null> {
    const baseKey = InMemoryCache.createDayBucketKey(city, date);
    const fullKey = `${this.dayBucketPrefix}${baseKey}`;
    
    try {
      const raw = await this.redis.get(fullKey);
      if (!raw) return null;

      if (typeof raw === 'object' && raw !== null) {
        return raw as DayBucket;
      }

      const str = String(raw);
      if (str === '[object Object]' || str.startsWith('[object Object]')) {
        console.warn(`[eventsCache.getDayEvents] Corrupted value for key=${baseKey}. Deleting key.`);
        await this.redis.del(fullKey);
        return null;
      }

      return JSON.parse(str) as DayBucket;
    } catch (e) {
      console.error('[eventsCache.getDayEvents] Parse/Redis error for key=', baseKey, e);
      return null;
    }
  }

  /**
   * Upserts events into the day-bucket cache.
   * Performs field-wise merge for existing events (prefer non-empty fields, longer descriptions).
   * 
   * @param city City name
   * @param date Date in YYYY-MM-DD format
   * @param events Events to upsert
   * @param ttlSeconds Optional TTL; if not provided, computed from events
   */
  async upsertDayEvents(
    city: string,
    date: string,
    events: EventData[],
    ttlSeconds?: number
  ): Promise<void> {
    const baseKey = InMemoryCache.createDayBucketKey(city, date);
    const fullKey = `${this.dayBucketPrefix}${baseKey}`;
    
    // Get existing bucket or create new one
    let bucket: DayBucket = await this.getDayEvents(city, date) || {
      eventsById: {},
      index: {},
      updatedAt: new Date().toISOString()
    };

    // Upsert each event
    for (const event of events) {
      if (!event.title) continue;
      
      const eventId = generateEventId(event);
      const existing = bucket.eventsById[eventId];

      if (!existing) {
        // New event - add it
        bucket.eventsById[eventId] = { ...event };
      } else {
        // Merge with existing event - prefer non-empty fields
        bucket.eventsById[eventId] = this.mergeEvents(existing, event);
      }

      // Update category index
      const category = bucket.eventsById[eventId].category;
      if (category) {
        if (!bucket.index[category]) {
          bucket.index[category] = [];
        }
        if (!bucket.index[category].includes(eventId)) {
          bucket.index[category].push(eventId);
          bucket.index[category].sort(); // Keep sorted
        }
      }
    }

    bucket.updatedAt = new Date().toISOString();

    // Compute TTL if not provided
    const allEvents = Object.values(bucket.eventsById);
    const computedTtl = ttlSeconds ?? this.computeDayBucketTTL(allEvents, date);

    // Write to Redis
    try {
      const serialized = JSON.stringify(bucket);
      await this.redis.set(fullKey, serialized, { ex: computedTtl });
    } catch (e) {
      console.error('[eventsCache.upsertDayEvents] Redis error:', e);
    }
  }

  /**
   * Merges two events with field-wise preference logic:
   * - Prefer non-empty fields
   * - Longer description wins
   * - Keep earliest price/links if missing
   * - Union sources
   */
  private mergeEvents(existing: EventData, incoming: EventData): EventData {
    return {
      ...existing,
      category: existing.category || incoming.category,
      date: existing.date || incoming.date,
      time: existing.time || incoming.time,
      endTime: existing.endTime || incoming.endTime,
      venue: existing.venue || incoming.venue,
      address: existing.address || incoming.address,
      price: existing.price || incoming.price,
      ticketPrice: existing.ticketPrice || incoming.ticketPrice,
      website: existing.website || incoming.website,
      bookingLink: existing.bookingLink || incoming.bookingLink,
      eventType: existing.eventType || incoming.eventType,
      ageRestrictions: existing.ageRestrictions || incoming.ageRestrictions,
      // Longer description wins
      description: 
        !existing.description ? incoming.description :
        !incoming.description ? existing.description :
        incoming.description.length > existing.description.length ? incoming.description : existing.description,
      // Union sources (deduplicated)
      source: this.mergeSources(existing.source, incoming.source)
    };
  }

  /**
   * Merges source fields, ensuring unique sources
   */
  private mergeSources(existing?: string, incoming?: string): string {
    if (!existing) return incoming || '';
    if (!incoming) return existing;
    
    // Split by comma, trim, deduplicate via Set
    const existingSources = existing.split(',').map(s => s.trim()).filter(Boolean);
    const incomingSources = incoming.split(',').map(s => s.trim()).filter(Boolean);
    const allSources = [...existingSources, ...incomingSources];
    const uniqueSources = Array.from(new Set(allSources));
    
    return uniqueSources.join(',');
  }

  /**
   * Computes TTL for day-bucket:
   * - Until latest endTime among events
   * - If endTime missing, use event.time + 3h as candidate
   * - At least until 23:59 of the day
   * - Never more than 7 days (safety limit)
   */
  private computeDayBucketTTL(events: EventData[], date: string): number {
    const now = new Date();
    let latestEndTime: Date | null = null;

    // Parse the day's end (23:59:59)
    const dayEnd = new Date(date.slice(0, 10) + 'T23:59:59');

    // Find latest event end time
    for (const event of events) {
      if (event.endTime) {
        try {
          const endTime = new Date(event.endTime);
          if (!isNaN(endTime.getTime()) && (!latestEndTime || endTime > latestEndTime)) {
            latestEndTime = endTime;
          }
        } catch {
          // Ignore invalid dates
        }
      } else if (event.time) {
        // If endTime missing, compute from event.time + 3h
        try {
          const timeMatch = event.time.match(/^(\d{1,2}):(\d{2})/);
          if (timeMatch) {
            const hour = parseInt(timeMatch[1], 10);
            const minute = parseInt(timeMatch[2], 10);
            const eventStart = new Date(date.slice(0, 10) + `T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`);
            
            if (!isNaN(eventStart.getTime())) {
              // Add 3 hours to the start time
              const candidateEnd = new Date(eventStart.getTime() + 3 * 60 * 60 * 1000);
              if (!latestEndTime || candidateEnd > latestEndTime) {
                latestEndTime = candidateEnd;
              }
            }
          }
        } catch {
          // Ignore invalid time parsing
        }
      }
    }

    // Use latest end time, but at least day end
    const targetTime = latestEndTime && latestEndTime > dayEnd ? latestEndTime : dayEnd;
    
    // Compute TTL in seconds
    let ttlSeconds = Math.floor((targetTime.getTime() - now.getTime()) / 1000);
    
    // Safety bounds: minimum 1 hour, maximum 7 days
    const sevenDays = 7 * 24 * 60 * 60;
    ttlSeconds = Math.max(3600, Math.min(ttlSeconds, sevenDays));

    return ttlSeconds;
  }
}

// Singleton instance
export const eventsCache = new InMemoryCache();
export default InMemoryCache;

/**
 * Get a raw Redis client instance for direct access (e.g., for static pages)
 */
export function getRedisClient(): Redis {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    throw new Error('[getRedisClient] Redis env vars missing (UPSTASH_REDIS_REST_URL/TOKEN).');
  }
  return new Redis({ url, token });
}
