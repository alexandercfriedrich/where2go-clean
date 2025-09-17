// Simple in-memory cache with TTL
// Phase 2A: Kategorie-Normalisierung via eventCategories (Single Source of Truth)

import { CacheEntry } from './types';
import { normalizeCategory } from './eventCategories';

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

  // Jetzt zentrale Normalisierung (Fallback: Trim)
  static normalizeCategory(category: string): string {
    if (!category) return '';
    const norm = normalizeCategory(category);
    return norm?.trim() || category.trim();
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

export const eventsCache = new InMemoryCache();

setInterval(() => {
  eventsCache.cleanup();
}, 10 * 60 * 1000);

export default InMemoryCache;
