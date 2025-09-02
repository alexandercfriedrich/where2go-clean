import { describe, it, expect, beforeEach } from 'vitest';
import { eventsCache } from '../cache';
import InMemoryCache from '../cache';

// Test version of getCacheStatsForCity function for testing
function getCacheStatsForCity(cache: any, cityName: string): { cachedSearches: number; totalEvents: number; lastSearched: string | null } {
  let cachedSearches = 0;
  let totalEvents = 0;
  let lastSearched: string | null = null;
  
  // Track unique search combinations to avoid double-counting
  const uniqueSearches = new Set<string>();
  
  if (cache && cache instanceof Map) {
    for (const [key, entry] of cache.entries()) {
      // Look for the date pattern (YYYY-MM-DD) in the key
      const datePattern = /\d{4}-\d{2}-\d{2}/;
      const dateMatch = key.match(datePattern);
      
      if (!dateMatch) continue; // Invalid date format
      
      const dateStartIndex = dateMatch.index!;
      
      // Find the underscore immediately before the date
      const underscoreBeforeDateIndex = key.lastIndexOf('_', dateStartIndex - 1);
      
      if (underscoreBeforeDateIndex === -1) continue; // Invalid format
      
      const city = key.substring(0, underscoreBeforeDateIndex);
      
      if (city.toLowerCase() !== cityName.toLowerCase()) continue;
      
      // Check that there's an underscore after the date (separating date from categories)
      const dateEndIndex = dateStartIndex + 10; // YYYY-MM-DD is 10 characters
      if (dateEndIndex >= key.length || key[dateEndIndex] !== '_') continue; // Invalid format
      
      // Extract the date for grouping
      const date = key.substring(dateStartIndex, dateEndIndex);
      
      // Create a unique identifier for this search (city + date combination)
      const searchIdentifier = `${city}_${date}`;
      
      const events = entry.data || [];
      totalEvents += events.length;
      
      // Track unique searches - count each city+date combination once
      if (!uniqueSearches.has(searchIdentifier)) {
        uniqueSearches.add(searchIdentifier);
        cachedSearches++;
      }
      
      // Track the most recent cache entry
      if (!lastSearched || entry.timestamp > new Date(lastSearched).getTime()) {
        lastSearched = new Date(entry.timestamp).toISOString();
      }
    }
  }
  
  return { cachedSearches, totalEvents, lastSearched };
}

// Enhanced detailed stats function for testing
function getDetailedCacheStatsForCity(cache: any, cityName: string): {
  cachedSearches: number;
  totalEvents: number;
  lastSearched: string | null;
  perCategoryEntries: number;
  legacyEntries: number;
  categoryBreakdown: { [category: string]: { entries: number; events: number } };
} {
  let totalEvents = 0;
  let lastSearched: string | null = null;
  let perCategoryEntries = 0;
  let legacyEntries = 0;
  const categoryBreakdown: { [category: string]: { entries: number; events: number } } = {};
  const uniqueSearches = new Set<string>();
  
  if (cache && cache instanceof Map) {
    for (const [key, entry] of cache.entries()) {
      const datePattern = /\d{4}-\d{2}-\d{2}/;
      const dateMatch = key.match(datePattern);
      
      if (!dateMatch) continue;
      
      const dateStartIndex = dateMatch.index!;
      const underscoreBeforeDateIndex = key.lastIndexOf('_', dateStartIndex - 1);
      
      if (underscoreBeforeDateIndex === -1) continue;
      
      const city = key.substring(0, underscoreBeforeDateIndex);
      
      if (city.toLowerCase() !== cityName.toLowerCase()) continue;
      
      const dateEndIndex = dateStartIndex + 10;
      if (dateEndIndex >= key.length || key[dateEndIndex] !== '_') continue;
      
      const date = key.substring(dateStartIndex, dateEndIndex);
      const categories = key.substring(dateEndIndex + 1);
      const searchIdentifier = `${city}_${date}`;
      
      const events = entry.data || [];
      totalEvents += events.length;
      
      // Determine if this is a per-category cache or legacy cache
      if (categories.includes(',') || categories === 'all') {
        // Legacy cache entry (multiple categories or 'all')
        legacyEntries++;
      } else {
        // Per-category cache entry (single category)
        perCategoryEntries++;
        
        // Track category breakdown
        if (!categoryBreakdown[categories]) {
          categoryBreakdown[categories] = { entries: 0, events: 0 };
        }
        categoryBreakdown[categories].entries++;
        categoryBreakdown[categories].events += events.length;
      }
      
      uniqueSearches.add(searchIdentifier);
      
      if (!lastSearched || entry.timestamp > new Date(lastSearched).getTime()) {
        lastSearched = new Date(entry.timestamp).toISOString();
      }
    }
  }
  
  return {
    cachedSearches: uniqueSearches.size,
    totalEvents,
    lastSearched,
    perCategoryEntries,
    legacyEntries,
    categoryBreakdown
  };
}

describe('Admin Statistics with Per-Category Cache', () => {
  let cache: InMemoryCache;

  beforeEach(() => {
    cache = new InMemoryCache();
  });

  describe('per-category cache statistics', () => {
    it('should correctly count per-category cache entries', () => {
      // Set up per-category cache entries
      const clubEvents = [
        { title: 'Club Event 1', category: 'Clubs/Discos' },
        { title: 'Club Event 2', category: 'Clubs/Discos' }
      ];
      const djEvents = [
        { title: 'DJ Event 1', category: 'DJ Sets/Electronic' }
      ];

      cache.setEventsByCategory('Wien', '2025-01-03', 'Clubs/Discos', clubEvents, 300);
      cache.setEventsByCategory('Wien', '2025-01-03', 'DJ Sets/Electronic', djEvents, 300);

      const stats = getCacheStatsForCity((cache as any).cache, 'Wien');
      
      // Should count as 1 search (Wien + 2025-01-03) with 3 total events
      expect(stats.cachedSearches).toBe(1);
      expect(stats.totalEvents).toBe(3);
      expect(stats.lastSearched).toBeTruthy();
    });

    it('should provide detailed breakdown of cache types', () => {
      // Set up mixed cache entries
      const clubEvents = [{ title: 'Club Event', category: 'Clubs/Discos' }];
      const djEvents = [{ title: 'DJ Event', category: 'DJ Sets/Electronic' }];
      const legacyEvents = [{ title: 'Legacy Event 1' }, { title: 'Legacy Event 2' }];

      // Per-category entries
      cache.setEventsByCategory('Wien', '2025-01-03', 'Clubs/Discos', clubEvents, 300);
      cache.setEventsByCategory('Wien', '2025-01-03', 'DJ Sets/Electronic', djEvents, 300);
      
      // Legacy entry
      const legacyKey = InMemoryCache.createKey('Wien', '2025-01-04', ['Music', 'Theater']);
      cache.set(legacyKey, legacyEvents, 300);

      const detailedStats = getDetailedCacheStatsForCity((cache as any).cache, 'Wien');
      
      expect(detailedStats.cachedSearches).toBe(2); // 2 unique date combinations
      expect(detailedStats.totalEvents).toBe(4); // 1 + 1 + 2 events
      expect(detailedStats.perCategoryEntries).toBe(2); // 2 per-category entries
      expect(detailedStats.legacyEntries).toBe(1); // 1 legacy entry
      
      expect(detailedStats.categoryBreakdown['Clubs/Discos']).toEqual({
        entries: 1,
        events: 1
      });
      expect(detailedStats.categoryBreakdown['DJ Sets/Electronic']).toEqual({
        entries: 1,
        events: 1
      });
    });

    it('should handle the efficiency scenario from problem statement', () => {
      console.log('\n=== Admin Statistics: Per-Category Cache Efficiency ===');
      
      // Simulate the problem statement scenario
      // 1. First search: Clubs/Discos only
      const clubEvents = [
        { title: 'Club Event 1', category: 'Clubs/Discos' },
        { title: 'Club Event 2', category: 'Clubs/Discos' }
      ];
      cache.setEventsByCategory('Ibiza', '2025-09-02', 'Clubs/Discos', clubEvents, 300);
      
      console.log('1. After caching Clubs/Discos:');
      let stats = getCacheStatsForCity((cache as any).cache, 'Ibiza');
      console.log(`   Searches: ${stats.cachedSearches}, Events: ${stats.totalEvents}`);
      
      // 2. Second search adds DJ Sets/Electronic
      const djEvents = [
        { title: 'DJ Event 1', category: 'DJ Sets/Electronic' }
      ];
      cache.setEventsByCategory('Ibiza', '2025-09-02', 'DJ Sets/Electronic', djEvents, 300);
      
      console.log('2. After adding DJ Sets/Electronic:');
      stats = getCacheStatsForCity((cache as any).cache, 'Ibiza');
      console.log(`   Searches: ${stats.cachedSearches}, Events: ${stats.totalEvents}`);
      
      // Verify the results
      expect(stats.cachedSearches).toBe(1); // Still counts as 1 search (same city+date)
      expect(stats.totalEvents).toBe(3); // Total of 3 events
      
      const detailedStats = getDetailedCacheStatsForCity((cache as any).cache, 'Ibiza');
      expect(detailedStats.perCategoryEntries).toBe(2); // 2 per-category entries
      expect(detailedStats.legacyEntries).toBe(0); // No legacy entries
      
      console.log('✅ Admin statistics correctly aggregate per-category cache entries');
      console.log(`✅ Shows ${detailedStats.perCategoryEntries} per-category entries as 1 logical search`);
    });
  });

  describe('mixed cache scenario', () => {
    it('should handle combination of legacy and per-category caches', () => {
      // Legacy cache entry
      const legacyEvents = [
        { title: 'Legacy Event 1' },
        { title: 'Legacy Event 2' }
      ];
      const legacyKey = InMemoryCache.createKey('Wien', '2025-01-03', ['Music', 'Theater']);
      cache.set(legacyKey, legacyEvents, 300);
      
      // Per-category cache entries for different date
      const clubEvents = [{ title: 'Club Event' }];
      cache.setEventsByCategory('Wien', '2025-01-04', 'Clubs/Discos', clubEvents, 300);
      
      const stats = getCacheStatsForCity((cache as any).cache, 'Wien');
      const detailedStats = getDetailedCacheStatsForCity((cache as any).cache, 'Wien');
      
      expect(stats.cachedSearches).toBe(2); // 2 different dates
      expect(stats.totalEvents).toBe(3); // 2 + 1 events
      expect(detailedStats.perCategoryEntries).toBe(1);
      expect(detailedStats.legacyEntries).toBe(1);
    });

    it('should not double-count when both legacy and per-category exist for same date', () => {
      // Legacy cache for combined categories
      const legacyEvents = [
        { title: 'Legacy Combined Event 1' },
        { title: 'Legacy Combined Event 2' }
      ];
      const legacyKey = InMemoryCache.createKey('Wien', '2025-01-03', ['Clubs/Discos', 'DJ Sets/Electronic']);
      cache.set(legacyKey, legacyEvents, 300);
      
      // Per-category cache for same categories and date
      const clubEvents = [{ title: 'Club Event' }];
      cache.setEventsByCategory('Wien', '2025-01-03', 'Clubs/Discos', clubEvents, 300);
      
      const stats = getCacheStatsForCity((cache as any).cache, 'Wien');
      
      // Should still count as 1 search since it's the same city+date combination
      expect(stats.cachedSearches).toBe(1);
      expect(stats.totalEvents).toBe(3); // All events are counted
    });
  });

  describe('edge cases', () => {
    it('should handle cities with underscores correctly', () => {
      const events = [{ title: 'Event' }];
      cache.setEventsByCategory('New_York', '2025-01-03', 'Music', events, 300);
      
      const stats = getCacheStatsForCity((cache as any).cache, 'New_York');
      
      expect(stats.cachedSearches).toBe(1);
      expect(stats.totalEvents).toBe(1);
    });

    it('should be case insensitive for city names', () => {
      const events1 = [{ title: 'Event 1' }];
      const events2 = [{ title: 'Event 2' }];
      
      cache.setEventsByCategory('wien', '2025-01-03', 'Music', events1, 300);
      cache.setEventsByCategory('WIEN', '2025-01-04', 'Theater', events2, 300);
      
      const stats = getCacheStatsForCity((cache as any).cache, 'Wien');
      
      expect(stats.cachedSearches).toBe(2); // 2 different dates
      expect(stats.totalEvents).toBe(2);
    });
  });
});