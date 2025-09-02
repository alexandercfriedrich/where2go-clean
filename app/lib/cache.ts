// Simple in-memory cache with TTL

import { CacheEntry } from './types';

class InMemoryCache {
  private cache = new Map<string, CacheEntry<any>>();

  /**
   * Sets a value in the cache with TTL in seconds
   */
  set<T>(key: string, value: T, ttlSeconds: number = 300): void {
    const entry: CacheEntry<T> = {
      data: value,
      timestamp: Date.now(),
      ttl: ttlSeconds * 1000, // Convert to milliseconds
    };
    this.cache.set(key, entry);
  }

  /**
   * Gets a value from the cache if not expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      // Entry has expired, remove it
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Checks if a key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Removes a key from the cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clears all expired entries from the cache
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Gets the current cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Clears all entries from the cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Creates a cache key from city, date, and optional categories
   */
  static createKey(city: string, date: string, categories?: string[]): string {
    const categoriesStr = categories && categories.length > 0 
      ? categories.map(cat => this.normalizeCategory(cat)).sort().join(',') 
      : 'all';
    return `${city.toLowerCase().trim()}_${date}_${categoriesStr}`;
  }

  /**
   * Creates a cache key for a single category
   */
  static createKeyForCategory(city: string, date: string, category: string): string {
    // Normalize city and category to prevent case sensitivity issues
    return `${city.toLowerCase().trim()}_${date}_${this.normalizeCategory(category)}`;
  }

  /**
   * Normalizes category names to prevent case sensitivity issues
   * Maps common category variations to canonical forms
   */
  static normalizeCategory(category: string): string {
    const normalized = category.trim();
    
    // Create a map of case-insensitive category variations to canonical forms
    const categoryMappings: { [key: string]: string } = {
      // Clubs/Discos variations
      'clubs/discos': 'Clubs/Discos',
      'clubs/disco': 'Clubs/Discos', 
      'club/disco': 'Clubs/Discos',
      'club/discos': 'Clubs/Discos',
      'clubs': 'Clubs/Discos',
      'discos': 'Clubs/Discos',
      
      // DJ Sets/Electronic variations
      'dj sets/electronic': 'DJ Sets/Electronic',
      'dj set/electronic': 'DJ Sets/Electronic',
      'dj/electronic': 'DJ Sets/Electronic',
      'electronic': 'DJ Sets/Electronic',
      'dj sets': 'DJ Sets/Electronic',
      'dj set': 'DJ Sets/Electronic',
      
      // Live-Konzerte variations
      'live-konzerte': 'Live-Konzerte',
      'live konzerte': 'Live-Konzerte',
      'livekonzerte': 'Live-Konzerte',
      'konzerte': 'Live-Konzerte',
      'live': 'Live-Konzerte',
      'concerts': 'Live-Konzerte',
      'live concerts': 'Live-Konzerte',
      
      // Theater/Performance variations
      'theater/performance': 'Theater/Performance',
      'theater': 'Theater/Performance',
      'theatre': 'Theater/Performance',
      'performance': 'Theater/Performance',
      
      // Kunst/Design variations
      'kunst/design': 'Kunst/Design',
      'kunst': 'Kunst/Design',
      'design': 'Kunst/Design',
      'art': 'Kunst/Design',
      'art/design': 'Kunst/Design',
      
      // LGBTQ+ variations
      'lgbtq+': 'LGBTQ+',
      'lgbtq': 'LGBTQ+',
      'lgbt': 'LGBTQ+',
    };
    
    // Check for exact match first (preserves existing behavior)
    const lowerCase = normalized.toLowerCase();
    if (categoryMappings[lowerCase]) {
      return categoryMappings[lowerCase];
    }
    
    // Return original if no mapping found (preserves existing categories)
    return normalized;
  }

  /**
   * Gets events for multiple categories, checking cache for each category individually
   * Returns object with cached events per category and list of missing categories
   */
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

  /**
   * Sets events for a single category
   */
  setEventsByCategory(city: string, date: string, category: string, events: any[], ttlSeconds: number = 300): void {
    const cacheKey = InMemoryCache.createKeyForCategory(city, date, category);
    this.set(cacheKey, events, ttlSeconds);
  }
}

// Export a singleton instance for global use
export const eventsCache = new InMemoryCache();

// Run cleanup every 10 minutes
setInterval(() => {
  eventsCache.cleanup();
}, 10 * 60 * 1000);

export default InMemoryCache;