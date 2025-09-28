// Cache implementation with Redis support and proper JSON serialization
// Replaces in-memory cache with Redis-backed implementation to fix parsing issues

import { CacheEntry } from './types';
import { normalizeCategory as canonicalCategory } from './eventCategories';
import { getEventsCache, RedisCache } from './redis-cache';

// Legacy InMemoryCache class for backward compatibility and testing
class InMemoryCache {
  private cache = new Map<string, CacheEntry<any>>();

  set<T>(key: string, value: T, ttlSeconds: number = 300): void {
    const entry: CacheEntry<T> = {
      data: value,
      timestamp: Date.now(),
      ttl: ttlSeconds * 1000,
    };
    this.cache.set(key, entry);
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  size(): number {
    return this.cache.size;
  }

  clear(): void {
    this.cache.clear();
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

  getEventsByCategories(city: string, date: string, categories: string[]): {
    cachedEvents: { [category: string]: any[] };
    missingCategories: string[];
    cacheInfo: { [category: string]: { fromCache: boolean; eventCount: number } };
  } {
    const cachedEvents: { [category: string]: any[] } = {};
    const missingCategories: string[] = [];
    const cacheInfo: { [category: string]: { fromCache: boolean; eventCount: number } } = {};

    for (const category of categories) {
      const cacheKey = InMemoryCache.createKeyForCategory(city, date, category);
      const events = this.get<any[]>(cacheKey);

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

  setEventsByCategory(city: string, date: string, category: string, events: any[], ttlSeconds: number = 300): void {
    const cacheKey = InMemoryCache.createKeyForCategory(city, date, category);
    this.set(cacheKey, events, ttlSeconds);
  }
}

// Use the new Redis-backed cache implementation
export const eventsCache = getEventsCache();

// Legacy synchronous wrapper for backward compatibility
class LegacyCacheWrapper {
  private asyncCache = eventsCache;

  // Note: These methods are kept for backward compatibility but will log warnings
  // as they convert async operations to sync, which is not ideal
  
  set<T>(key: string, value: T, ttlSeconds: number = 300): void {
    console.warn('Using deprecated synchronous cache.set(). Please migrate to async eventsCache.');
    this.asyncCache.set(key, value, ttlSeconds).catch(error => {
      console.error('Cache set error:', error);
    });
  }

  get<T>(key: string): T | null {
    console.warn('Using deprecated synchronous cache.get(). Please migrate to async eventsCache.');
    // This is problematic as we can't await in sync context
    // Return null and log error
    console.error('Synchronous cache.get() is not supported with Redis. Use async eventsCache.get()');
    return null;
  }

  has(key: string): boolean {
    console.warn('Using deprecated synchronous cache.has(). Please migrate to async eventsCache.');
    return false;
  }

  delete(key: string): boolean {
    console.warn('Using deprecated synchronous cache.delete(). Please migrate to async eventsCache.');
    this.asyncCache.delete(key).catch(error => {
      console.error('Cache delete error:', error);
    });
    return true;
  }

  cleanup(): void {
    this.asyncCache.cleanup().catch(error => {
      console.error('Cache cleanup error:', error);
    });
  }

  size(): number {
    console.warn('Using deprecated synchronous cache.size(). Please migrate to async eventsCache.');
    return 0;
  }

  clear(): void {
    console.warn('Using deprecated synchronous cache.clear(). Please migrate to async eventsCache.');
    this.asyncCache.clear().catch(error => {
      console.error('Cache clear error:', error);
    });
  }

  static createKey(city: string, date: string, categories?: string[]): string {
    return RedisCache.createKey(city, date, categories);
  }

  static createKeyForCategory(city: string, date: string, category: string): string {
    return RedisCache.createKeyForCategory(city, date, category);
  }

  static normalizeCategory(category: string): string {
    return RedisCache.normalizeCategory(category);
  }

  getEventsByCategories(city: string, date: string, categories: string[]): {
    cachedEvents: { [category: string]: any[] };
    missingCategories: string[];
    cacheInfo: { [category: string]: { fromCache: boolean; eventCount: number } };
  } {
    console.warn('Using deprecated synchronous getEventsByCategories(). Please migrate to async eventsCache.');
    // Return empty result for sync compatibility
    const cacheInfo: { [category: string]: { fromCache: boolean; eventCount: number } } = {};
    categories.forEach(category => {
      cacheInfo[category] = { fromCache: false, eventCount: 0 };
    });
    
    return {
      cachedEvents: {},
      missingCategories: categories,
      cacheInfo
    };
  }

  setEventsByCategory(city: string, date: string, category: string, events: any[], ttlSeconds: number = 300): void {
    console.warn('Using deprecated synchronous setEventsByCategory(). Please migrate to async eventsCache.');
    this.asyncCache.setEventsByCategory(city, date, category, events, ttlSeconds).catch(error => {
      console.error('Cache setEventsByCategory error:', error);
    });
  }
}

// For backward compatibility, export the legacy wrapper as default
// but log warnings when used
export default LegacyCacheWrapper;
