import { describe, it, expect, beforeEach } from 'vitest';
import InMemoryCache from '../cache';

// Test version of getCacheStatsForCity function to test parsing logic
function getCacheStatsForCity(cache: any, cityName: string): { cachedSearches: number; totalEvents: number; lastSearched: string | null } {
  let cachedSearches = 0;
  let totalEvents = 0;
  let lastSearched: string | null = null;
  
  if (cache && cache instanceof Map) {
    for (const [key, entry] of cache.entries()) {
      // Cache keys format: "city_date_categories"
      // Since city names can contain underscores, we need to find the date pattern first
      // and work backwards to determine the city name
      
      // Look for the date pattern (YYYY-MM-DD) in the key
      const datePattern = /\d{4}-\d{2}-\d{2}/;
      const dateMatch = key.match(datePattern);
      
      if (!dateMatch) continue; // Invalid date format
      
      const dateStartIndex = dateMatch.index!;
      
      // The city should end just before the underscore that precedes the date
      // Find the underscore immediately before the date
      const underscoreBeforeDateIndex = key.lastIndexOf('_', dateStartIndex - 1);
      
      if (underscoreBeforeDateIndex === -1) continue; // Invalid format
      
      const city = key.substring(0, underscoreBeforeDateIndex);
      
      if (city.toLowerCase() !== cityName.toLowerCase()) continue;
      
      // Check that there's an underscore after the date (separating date from categories)
      const dateEndIndex = dateStartIndex + 10; // YYYY-MM-DD is 10 characters
      if (dateEndIndex >= key.length || key[dateEndIndex] !== '_') continue; // Invalid format
      
      // We have a valid cache key for this city
      cachedSearches++;
      const events = entry.data || [];
      totalEvents += events.length;
      
      // Track the most recent cache entry
      if (!lastSearched || entry.timestamp > new Date(lastSearched).getTime()) {
        lastSearched = new Date(entry.timestamp).toISOString();
      }
    }
  }
  
  return { cachedSearches, totalEvents, lastSearched };
}

describe('Cache Statistics Parsing', () => {
  let cache: InMemoryCache;
  
  beforeEach(() => {
    cache = new InMemoryCache();
  });

  it('should correctly parse cache keys with simple categories', () => {
    // Create cache entries with simple categories
    const key1 = InMemoryCache.createKey('Wien', '2025-01-03', ['Music']);
    const key2 = InMemoryCache.createKey('Wien', '2025-01-04', ['Theater']);
    
    cache.set(key1, [{ title: 'Event 1' }, { title: 'Event 2' }]);
    cache.set(key2, [{ title: 'Event 3' }]);
    
    const stats = getCacheStatsForCity((cache as any).cache, 'Wien');
    
    expect(stats.cachedSearches).toBe(2);
    expect(stats.totalEvents).toBe(3);
    expect(stats.lastSearched).toBeTruthy();
  });

  it('should correctly parse cache keys with complex categories containing slashes and commas', () => {
    // Create cache entries with complex categories like "DJ Sets/Electronic,Live-Konzerte"
    const key1 = InMemoryCache.createKey('Wien', '2025-01-03', ['DJ Sets/Electronic', 'Live-Konzerte']);
    const key2 = InMemoryCache.createKey('Berlin', '2025-01-04', ['Clubs/Discos']);
    const key3 = InMemoryCache.createKey('Wien', '2025-01-05', ['Kunst/Design', 'Theater/Performance']);
    
    cache.set(key1, [{ title: 'Event 1' }, { title: 'Event 2' }]);
    cache.set(key2, [{ title: 'Event 3' }]);
    cache.set(key3, [{ title: 'Event 4' }]);
    
    const wienStats = getCacheStatsForCity((cache as any).cache, 'Wien');
    const berlinStats = getCacheStatsForCity((cache as any).cache, 'Berlin');
    
    expect(wienStats.cachedSearches).toBe(2);
    expect(wienStats.totalEvents).toBe(3);
    expect(berlinStats.cachedSearches).toBe(1);
    expect(berlinStats.totalEvents).toBe(1);
  });

  it('should correctly parse cache keys with categories containing underscores', () => {
    // Test categories that contain underscores, which would break simple split('_')
    const key1 = InMemoryCache.createKey('New_York', '2025-01-03', ['Test_Category', 'Another_Test']);
    
    cache.set(key1, [{ title: 'Event 1' }]);
    
    const stats = getCacheStatsForCity((cache as any).cache, 'New_York');
    
    expect(stats.cachedSearches).toBe(1);
    expect(stats.totalEvents).toBe(1);
  });

  it('should handle "all" categories correctly', () => {
    // Test the case when no categories are provided (should use "all")
    const key1 = InMemoryCache.createKey('Wien', '2025-01-03');
    const key2 = InMemoryCache.createKey('Wien', '2025-01-04', []);
    
    cache.set(key1, [{ title: 'Event 1' }]);
    cache.set(key2, [{ title: 'Event 2' }]);
    
    const stats = getCacheStatsForCity((cache as any).cache, 'Wien');
    
    expect(stats.cachedSearches).toBe(2);
    expect(stats.totalEvents).toBe(2);
  });

  it('should be case insensitive for city names', () => {
    const key1 = InMemoryCache.createKey('wien', '2025-01-03', ['Music']);
    const key2 = InMemoryCache.createKey('WIEN', '2025-01-04', ['Theater']);
    
    cache.set(key1, [{ title: 'Event 1' }]);
    cache.set(key2, [{ title: 'Event 2' }]);
    
    const stats = getCacheStatsForCity((cache as any).cache, 'Wien');
    
    expect(stats.cachedSearches).toBe(2);
    expect(stats.totalEvents).toBe(2);
  });

  it('should handle empty cache gracefully', () => {
    const stats = getCacheStatsForCity((cache as any).cache, 'Wien');
    
    expect(stats.cachedSearches).toBe(0);
    expect(stats.totalEvents).toBe(0);
    expect(stats.lastSearched).toBeNull();
  });

  it('should ignore malformed cache keys', () => {
    // Manually set some malformed keys that don't follow the expected format
    const cacheMap = (cache as any).cache;
    cacheMap.set('invalid-key', { data: [{ title: 'Event 1' }], timestamp: Date.now(), ttl: 300000 });
    cacheMap.set('wien_only-one-underscore', { data: [{ title: 'Event 2' }], timestamp: Date.now(), ttl: 300000 });
    
    const stats = getCacheStatsForCity(cacheMap, 'Wien');
    
    expect(stats.cachedSearches).toBe(0);
    expect(stats.totalEvents).toBe(0);
  });
});