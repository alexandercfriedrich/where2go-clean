import { Redis } from '@upstash/redis';

// Interfaces
export interface CacheEntryDebug {
  key: string;
  value: any;
  sizeBytesEstimate: number;
  ttlSeconds: number | null;
}

/**
 * Get Redis client instance for direct Redis operations
 */
export function getRedisClient(): Redis {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    throw new Error('[getRedisClient] Redis env vars missing (UPSTASH_REDIS_REST_URL/TOKEN).');
  }
  return new Redis({ url, token });
}

/**
 * Redis-backed events cache (versioned namespace).
 * - Always writes JSON strings
 * - Always reads JSON strings and parses them
 * - Provides debug utilities
 * - TTL support for automatic cleanup
 * - Hot cities management
 */
class InMemoryCache {
  private redis: Redis;
  
  // Event namespaces (versioned)
  private cityBucketPrefix = 'city:v3:'; // city bucket namespace
  private dayBucketPrefix = 'events:v3:'; // day-bucket namespace

  constructor() {
    this.redis = getRedisClient();
  }

  static createKey(city: string, date: string, categories?: string[]): string {
    const base = `${city}-${date}`;
    if (categories && categories.length > 0) {
      const catString = categories.sort().join(',');
      return `${base}:${catString}`;
    }
    return base;
  }

  static createCityKey(city: string): string {
    return `${city.toLowerCase()}`;
  }

  static createDayBucketKey(city: string, date: string): string {
    return `${city.toLowerCase()}:${date}`;
  }

  // === VERSIONED KEY HELPERS ===
  private getCityBucketKey(city: string): string {
    return `${this.cityBucketPrefix}${InMemoryCache.createCityKey(city)}`;
  }

  private getDayBucketKey(city: string, date: string): string {
    return `${this.dayBucketPrefix}${InMemoryCache.createDayBucketKey(city, date)}`;
  }

  // === HOT CITIES MANAGEMENT ===
  async getHotCities(): Promise<string[]> {
    try {
      console.log('[cache] Reading hot cities from Redis');
      const data = await this.redis.get('hot-cities:v2');
      if (!data) {
        console.log('[cache] No hot cities found, returning defaults');
        return ['Wien', 'Berlin', 'Hamburg', 'München'];
      }
      const parsed = JSON.parse(data as string);
      console.log(`[cache] Hot cities loaded: ${parsed.join(', ')}`);
      return parsed;
    } catch (error) {
      console.error('[cache] Error reading hot cities:', error);
      return ['Wien', 'Berlin', 'Hamburg', 'München'];
    }
  }

  async setHotCities(cities: string[], ttlSeconds?: number): Promise<void> {
    try {
      console.log(`[cache] Saving hot cities: ${cities.join(', ')}`);
      const data = JSON.stringify(cities);
      if (ttlSeconds) {
        await this.redis.setex('hot-cities:v2', ttlSeconds, data);
        console.log(`[cache] Hot cities saved with TTL: ${ttlSeconds}s`);
      } else {
        await this.redis.set('hot-cities:v2', data);
        console.log('[cache] Hot cities saved (no TTL)');
      }
    } catch (error) {
      console.error('[cache] Error saving hot cities:', error);
      throw error;
    }
  }

  // === CITY BUCKET OPERATIONS ===
  async getCityBucket(city: string): Promise<any> {
    try {
      const key = this.getCityBucketKey(city);
      console.log(`[cache] Reading city bucket: ${key}`);
      const data = await this.redis.get(key);
      if (!data) {
        console.log(`[cache] City bucket not found: ${key}`);
        return null;
      }
      const parsed = JSON.parse(data as string);
      console.log(`[cache] City bucket loaded: ${key} (${Object.keys(parsed).length} day buckets)`);
      return parsed;
    } catch (error) {
      console.error(`[cache] Error reading city bucket ${city}:`, error);
      return null;
    }
  }

  async setCityBucket(city: string, data: any, ttlSeconds?: number): Promise<void> {
    try {
      const key = this.getCityBucketKey(city);
      const jsonData = JSON.stringify(data);
      console.log(`[cache] Saving city bucket: ${key} (${Object.keys(data).length} day buckets)`);
      
      if (ttlSeconds) {
        await this.redis.setex(key, ttlSeconds, jsonData);
        console.log(`[cache] City bucket saved with TTL: ${ttlSeconds}s`);
      } else {
        await this.redis.set(key, jsonData);
        console.log(`[cache] City bucket saved: ${key}`);
      }
    } catch (error) {
      console.error(`[cache] Error saving city bucket ${city}:`, error);
      throw error;
    }
  }

  async deleteCityBucket(city: string): Promise<void> {
    try {
      const key = this.getCityBucketKey(city);
      await this.redis.del(key);
      console.log(`[cache] Deleted city bucket: ${key}`);
    } catch (error) {
      console.error(`[cache] Error deleting city bucket ${city}:`, error);
      throw error;
    }
  }

  // === DAY BUCKET OPERATIONS ===
  async getDayBucket(city: string, date: string): Promise<any[]> {
    try {
      const key = this.getDayBucketKey(city, date);
      console.log(`[cache] Reading day bucket: ${key}`);
      const data = await this.redis.get(key);
      if (!data) {
        console.log(`[cache] Day bucket not found: ${key}`);
        return [];
      }
      const parsed = JSON.parse(data as string);
      console.log(`[cache] Day bucket loaded: ${key} (${parsed.length} events)`);
      return parsed;
    } catch (error) {
      console.error(`[cache] Error reading day bucket ${city}/${date}:`, error);
      return [];
    }
  }

  async setDayBucket(city: string, date: string, events: any[], ttlSeconds?: number): Promise<void> {
    try {
      const key = this.getDayBucketKey(city, date);
      const jsonData = JSON.stringify(events);
      console.log(`[cache] Saving day bucket: ${key} (${events.length} events)`);
      
      if (ttlSeconds) {
        await this.redis.setex(key, ttlSeconds, jsonData);
        console.log(`[cache] Day bucket saved with TTL: ${ttlSeconds}s`);
      } else {
        await this.redis.set(key, jsonData);
        console.log(`[cache] Day bucket saved: ${key}`);
      }
    } catch (error) {
      console.error(`[cache] Error saving day bucket ${city}/${date}:`, error);
      throw error;
    }
  }

  async deleteDayBucket(city: string, date: string): Promise<void> {
    try {
      const key = this.getDayBucketKey(city, date);
      await this.redis.del(key);
      console.log(`[cache] Deleted day bucket: ${key}`);
    } catch (error) {
      console.error(`[cache] Error deleting day bucket ${city}/${date}:`, error);
      throw error;
    }
  }

  // === LEGACY SUPPORT (DEPRECATED) ===
  async get(key: string): Promise<any> {
    try {
      console.log(`[cache] Reading legacy key: ${key}`);
      const data = await this.redis.get(key);
      if (!data) {
        console.log(`[cache] Legacy key not found: ${key}`);
        return null;
      }
      return JSON.parse(data as string);
    } catch (error) {
      console.error(`[cache] Error reading legacy key ${key}:`, error);
      return null;
    }
  }

  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    try {
      const jsonData = JSON.stringify(value);
      console.log(`[cache] Saving legacy key: ${key}`);
      
      if (ttlSeconds) {
        await this.redis.setex(key, ttlSeconds, jsonData);
        console.log(`[cache] Legacy key saved with TTL: ${ttlSeconds}s`);
      } else {
        await this.redis.set(key, jsonData);
        console.log(`[cache] Legacy key saved: ${key}`);
      }
    } catch (error) {
      console.error(`[cache] Error saving legacy key ${key}:`, error);
      throw error;
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.redis.del(key);
      console.log(`[cache] Deleted legacy key: ${key}`);
    } catch (error) {
      console.error(`[cache] Error deleting legacy key ${key}:`, error);
      throw error;
    }
  }

  // === DEBUGGING UTILITIES ===
  async getKeysByPattern(pattern: string): Promise<string[]> {
    try {
      console.log(`[cache] Scanning keys with pattern: ${pattern}`);
      const keys = await this.redis.keys(pattern);
      console.log(`[cache] Found ${keys.length} keys matching pattern`);
      return keys;
    } catch (error) {
      console.error(`[cache] Error scanning keys with pattern ${pattern}:`, error);
      return [];
    }
  }

  async debugAllKeys(): Promise<CacheEntryDebug[]> {
    try {
      const keys = await this.getKeysByPattern('*');
      const debugEntries: CacheEntryDebug[] = [];

      for (const key of keys) {
        try {
          const value = await this.redis.get(key);
          const ttl = await this.redis.ttl(key);
          
          debugEntries.push({
            key,
            value: JSON.parse(value as string),
            sizeBytesEstimate: JSON.stringify(value).length,
            ttlSeconds: ttl > 0 ? ttl : null,
          });
        } catch (error) {
          console.error(`[cache] Error debugging key ${key}:`, error);
          debugEntries.push({
            key,
            value: 'ERROR',
            sizeBytesEstimate: 0,
            ttlSeconds: null,
          });
        }
      }

      console.log(`[cache] Debug completed: ${debugEntries.length} entries`);
      return debugEntries;
    } catch (error) {
      console.error('[cache] Error during debug:', error);
      return [];
    }
  }

  async flushAll(): Promise<void> {
    try {
      console.log('[cache] Flushing all cache data');
      await this.redis.flushall();
      console.log('[cache] All cache data flushed');
    } catch (error) {
      console.error('[cache] Error flushing cache:', error);
      throw error;
    }
  }

  async getStats(): Promise<any> {
    try {
      const keys = await this.getKeysByPattern('*');
      const hotCities = await this.getHotCities();
      const cityKeys = keys.filter(k => k.startsWith(this.cityBucketPrefix));
      const dayKeys = keys.filter(k => k.startsWith(this.dayBucketPrefix));
      const legacyKeys = keys.filter(k => !k.startsWith(this.cityBucketPrefix) && !k.startsWith(this.dayBucketPrefix));

      return {
        totalKeys: keys.length,
        hotCities: hotCities,
        cityBuckets: cityKeys.length,
        dayBuckets: dayKeys.length,
        legacyKeys: legacyKeys.length,
        keyPrefixes: {
          city: this.cityBucketPrefix,
          day: this.dayBucketPrefix
        }
      };
    } catch (error) {
      console.error('[cache] Error getting stats:', error);
      return {
        totalKeys: 0,
        hotCities: [],
        cityBuckets: 0,
        dayBuckets: 0,
        legacyKeys: 0,
        keyPrefixes: {
          city: this.cityBucketPrefix,
          day: this.dayBucketPrefix
        }
      };
    }
  }
}

// Singleton instance
export const eventsCache = new InMemoryCache();
export default InMemoryCache;
