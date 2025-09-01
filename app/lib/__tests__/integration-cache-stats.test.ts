import { describe, it, expect, beforeEach } from 'vitest';
import InMemoryCache, { eventsCache } from '../cache';

// Import the actual function from the route file
// Since it's not exported, we'll simulate it here
function getCacheStatsForCity(cityName: string): { cachedSearches: number; totalEvents: number; lastSearched: string | null } {
  let cachedSearches = 0;
  let totalEvents = 0;
  let lastSearched: string | null = null;
  
  // Access the internal cache map to count entries for this city
  const cache = (eventsCache as any).cache;
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

describe('Integration Cache Statistics Test', () => {
  beforeEach(() => {
    // Clear the global cache before each test
    eventsCache.clear();
  });

  it('should demonstrate the fix for Hot Cities Cache Statistics', () => {
    // Simulate real cache entries with complex categories
    const timestamp1 = Date.now();
    const timestamp2 = timestamp1 + 1000;
    const timestamp3 = timestamp2 + 1000;

    // Create cache entries for Wien with different categories
    const wienKey1 = InMemoryCache.createKey('Wien', '2025-01-03', ['DJ Sets/Electronic', 'Live-Konzerte']);
    const wienKey2 = InMemoryCache.createKey('Wien', '2025-01-04', ['Clubs/Discos']);
    const wienKey3 = InMemoryCache.createKey('Wien', '2025-01-05', []); // "all" categories

    eventsCache.set(wienKey1, [
      { title: 'Techno Night', venue: 'Club Vienna', category: 'DJ Sets/Electronic' },
      { title: 'Rock Concert', venue: 'Music Hall', category: 'Live-Konzerte' }
    ], 300);

    eventsCache.set(wienKey2, [
      { title: 'Dance Party', venue: 'Night Club', category: 'Clubs/Discos' }
    ], 300);

    eventsCache.set(wienKey3, [
      { title: 'General Event 1', venue: 'Venue 1' },
      { title: 'General Event 2', venue: 'Venue 2' },
      { title: 'General Event 3', venue: 'Venue 3' }
    ], 300);

    // Create cache entries for Berlin to ensure city separation works
    const berlinKey = InMemoryCache.createKey('Berlin', '2025-01-03', ['Theater/Performance']);
    eventsCache.set(berlinKey, [
      { title: 'Theater Show', venue: 'Berlin Theater', category: 'Theater/Performance' }
    ], 300);

    // Test Wien statistics
    const wienStats = getCacheStatsForCity('Wien');
    expect(wienStats.cachedSearches).toBe(3);
    expect(wienStats.totalEvents).toBe(6); // 2 + 1 + 3
    expect(wienStats.lastSearched).toBeTruthy();

    // Test Berlin statistics  
    const berlinStats = getCacheStatsForCity('Berlin');
    expect(berlinStats.cachedSearches).toBe(1);
    expect(berlinStats.totalEvents).toBe(1);
    expect(berlinStats.lastSearched).toBeTruthy();

    // Test non-existent city
    const parisStats = getCacheStatsForCity('Paris');
    expect(parisStats.cachedSearches).toBe(0);
    expect(parisStats.totalEvents).toBe(0);
    expect(parisStats.lastSearched).toBeNull();
  });

  it('should handle categories with special characters that previously caused parsing failures', () => {
    // Test the exact scenario mentioned in the problem statement
    const problemKey = InMemoryCache.createKey('Wien', '2025-01-03', ['DJ Sets/Electronic', 'Live-Konzerte']);
    
    // This should create: "wien_2025-01-03_DJ Sets/Electronic,Live-Konzerte"
    expect(problemKey).toBe('wien_2025-01-03_DJ Sets/Electronic,Live-Konzerte');

    eventsCache.set(problemKey, [
      { title: 'Electronic Event 1' },
      { title: 'Concert Event 1' },
      { title: 'Another Event' }
    ], 300);

    const stats = getCacheStatsForCity('Wien');
    
    // This should now work correctly (previously would have been 0)
    expect(stats.cachedSearches).toBe(1);
    expect(stats.totalEvents).toBe(3);
    expect(stats.lastSearched).toBeTruthy();
  });

  it('should correctly handle city names with underscores', () => {
    // Test city names with underscores (like "New_York")
    const newYorkKey = InMemoryCache.createKey('New_York', '2025-01-03', ['Test_Category', 'Another_Test']);
    
    eventsCache.set(newYorkKey, [
      { title: 'NYC Event 1' },
      { title: 'NYC Event 2' }
    ], 300);

    const stats = getCacheStatsForCity('New_York');
    
    expect(stats.cachedSearches).toBe(1);
    expect(stats.totalEvents).toBe(2);
    expect(stats.lastSearched).toBeTruthy();
  });
});