/**
 * Redis-backed cache implementation for events
 * 
 * Replaces in-memory cache with Redis for better scalability and persistence.
 * Uses safe JSON serialization to prevent "[object Object]" corruption issues.
 */

import { Redis } from '@upstash/redis';
import { RedisJSON, normalizeRedisKey } from './redis-json';
import { CacheEntry } from './types';
import { normalizeCategory as canonicalCategory } from './eventCategories';
import { InstrumentedCache, startMetricsLogging } from './cache-metrics';

export interface CacheInterface {
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  get<T>(key: string): Promise<T | null>;
  has(key: string): Promise<boolean>;
  delete(key: string): Promise<boolean>;
  cleanup(): Promise<void>;
  size(): Promise<number>;
  clear(): Promise<void>;
  
  // Events-specific methods
  getEventsByCategories(city: string, date: string, categories: string[]): Promise<{
    cachedEvents: { [category: string]: any[] };
    missingCategories: string[];
    cacheInfo: { [category: string]: { fromCache: boolean; eventCount: number } };
  }>;
  setEventsByCategory(city: string, date: string, category: string, events: any[], ttlSeconds?: number): Promise<void>;
}

/**
 * Redis-backed cache implementation
 */
export class RedisCache implements CacheInterface {
  private redisJSON: RedisJSON;
  private keyPrefix: string;
  private defaultTTL: number;
  
  constructor(redis: Redis, keyPrefix: string = 'events:', defaultTTL: number = 300) {
    this.redisJSON = new RedisJSON(redis);
    this.keyPrefix = keyPrefix;
    this.defaultTTL = defaultTTL;
  }
  
  /**
   * Create cache key with prefix and normalization
   */
  private createCacheKey(key: string): string {
    const normalized = normalizeRedisKey(key);
    return normalizeRedisKey(`${this.keyPrefix}${normalized}`);
  }
  
  /**
   * Set value in cache with TTL
   */
  async set<T>(key: string, value: T, ttlSeconds: number = this.defaultTTL): Promise<void> {
    const cacheKey = this.createCacheKey(key);
    const entry: CacheEntry<T> = {
      data: value,
      timestamp: Date.now(),
      ttl: ttlSeconds * 1000,
    };
    
    await this.redisJSON.setJSON(cacheKey, entry, ttlSeconds);
  }
  
  /**
   * Get value from cache with TTL check
   */
  async get<T>(key: string): Promise<T | null> {
    const cacheKey = this.createCacheKey(key);
    const entry = await this.redisJSON.getJSON<CacheEntry<T>>(cacheKey);
    
    if (!entry) return null;
    
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      // Entry expired, delete it
      await this.redisJSON.deleteJSON(cacheKey);
      return null;
    }
    
    return entry.data;
  }
  
  /**
   * Check if key exists and is not expired
   */
  async has(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== null;
  }
  
  /**
   * Delete key from cache
   */
  async delete(key: string): Promise<boolean> {
    const cacheKey = this.createCacheKey(key);
    return await this.redisJSON.deleteJSON(cacheKey);
  }
  
  /**
   * Cleanup expired entries (Redis handles TTL automatically, so this is a no-op)
   */
  async cleanup(): Promise<void> {
    // Redis automatically handles TTL expiration
    // This method is kept for interface compatibility
  }
  
  /**
   * Get approximate cache size (not accurate due to Redis limitations)
   */
  async size(): Promise<number> {
    // This is an approximation since Redis doesn't provide exact key count easily
    // In production, you might want to maintain a separate counter
    console.warn('RedisCache.size() returns approximation only');
    return 0;
  }
  
  /**
   * Clear all cache entries with the prefix
   */
  async clear(): Promise<void> {
    // For Redis cache, we don't implement destructive clear operations
    // This method is kept for interface compatibility but does nothing
    console.warn('RedisCache.clear() is not implemented for safety. Use cleanup scripts if needed.');
  }
  
  /**
   * Create cache key for combined categories (legacy compatibility)
   */
  static createKey(city: string, date: string, categories?: string[]): string {
    const categoriesStr = categories && categories.length > 0
      ? categories.map(cat => RedisCache.normalizeCategory(cat)).sort().join(',')
      : 'all';
    return normalizeRedisKey(`${city}_${date}_${categoriesStr}`);
  }
  
  /**
   * Create cache key for single category
   */
  static createKeyForCategory(city: string, date: string, category: string): string {
    const normalized = normalizeRedisKey(`${city}_${date}_${RedisCache.normalizeCategory(category)}`);
    return normalized;
  }
  
  /**
   * Normalize category name for consistent caching
   */
  static normalizeCategory(category: string): string {
    if (!category) return '';
    const norm = canonicalCategory(category);
    const result = (norm || category).trim();
    return normalizeRedisKey(result);
  }
  
  /**
   * Get events by categories with cache hit/miss tracking
   */
  async getEventsByCategories(city: string, date: string, categories: string[]): Promise<{
    cachedEvents: { [category: string]: any[] };
    missingCategories: string[];
    cacheInfo: { [category: string]: { fromCache: boolean; eventCount: number } };
  }> {
    const cachedEvents: { [category: string]: any[] } = {};
    const missingCategories: string[] = [];
    const cacheInfo: { [category: string]: { fromCache: boolean; eventCount: number } } = {};
    
    for (const category of categories) {
      const cacheKey = RedisCache.createKeyForCategory(city, date, category);
      const events = await this.get<any[]>(cacheKey);
      
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
  
  /**
   * Set events for a specific category
   */
  async setEventsByCategory(city: string, date: string, category: string, events: any[], ttlSeconds: number = this.defaultTTL): Promise<void> {
    const cacheKey = RedisCache.createKeyForCategory(city, date, category);
    await this.set(cacheKey, events, ttlSeconds);
  }
}

/**
 * In-memory cache implementation (fallback for development)
 */
export class InMemoryCache implements CacheInterface {
  private cache = new Map<string, CacheEntry<any>>();
  
  async set<T>(key: string, value: T, ttlSeconds: number = 300): Promise<void> {
    const entry: CacheEntry<T> = {
      data: value,
      timestamp: Date.now(),
      ttl: ttlSeconds * 1000,
    };
    this.cache.set(key, entry);
  }
  
  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data as T;
  }
  
  async has(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== null;
  }
  
  async delete(key: string): Promise<boolean> {
    return this.cache.delete(key);
  }
  
  async cleanup(): Promise<void> {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }
  
  async size(): Promise<number> {
    return this.cache.size;
  }
  
  async clear(): Promise<void> {
    this.cache.clear();
  }
  
  async getEventsByCategories(city: string, date: string, categories: string[]): Promise<{
    cachedEvents: { [category: string]: any[] };
    missingCategories: string[];
    cacheInfo: { [category: string]: { fromCache: boolean; eventCount: number } };
  }> {
    const cachedEvents: { [category: string]: any[] } = {};
    const missingCategories: string[] = [];
    const cacheInfo: { [category: string]: { fromCache: boolean; eventCount: number } } = {};
    
    for (const category of categories) {
      const cacheKey = RedisCache.createKeyForCategory(city, date, category);
      const events = await this.get<any[]>(cacheKey);
      
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
    const cacheKey = RedisCache.createKeyForCategory(city, date, category);
    await this.set(cacheKey, events, ttlSeconds);
  }
}

/**
 * Create cache instance based on environment
 */
export function createCache(): CacheInterface {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  
  if (redisUrl && redisToken) {
    console.log('Using Redis cache for events');
    const redis = new Redis({
      url: redisUrl,
      token: redisToken,
    });
    return new RedisCache(redis);
  } else {
    console.log('Using in-memory cache for events (Redis env vars not configured)');
    return new InMemoryCache();
  }
}

// Singleton instance with cleanup
let cacheInstance: CacheInterface | null = null;

export function getEventsCache(): CacheInterface {
  if (!cacheInstance) {
    const baseCache = createCache();
    cacheInstance = new InstrumentedCache(baseCache) as any;
    
    // Setup periodic cleanup for in-memory cache
    if (baseCache instanceof InMemoryCache) {
      setInterval(() => {
        baseCache.cleanup();
      }, 10 * 60 * 1000); // 10 minutes
    }
    
    // Start metrics logging in production
    if (process.env.NODE_ENV === 'production') {
      startMetricsLogging(60); // Log every hour
    }
  }
  return cacheInstance;
}

// Legacy export for backward compatibility
export const eventsCache = getEventsCache();