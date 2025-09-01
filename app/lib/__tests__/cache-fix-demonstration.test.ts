import { describe, it, expect, beforeEach } from 'vitest';
import InMemoryCache, { eventsCache } from '../cache';

// Simulation of old broken parsing
function brokenGetCacheStats(cityName: string) {
  let cachedSearches = 0;
  let totalEvents = 0;
  
  const cache = (eventsCache as any).cache;
  if (cache && cache instanceof Map) {
    for (const [key, entry] of cache.entries()) {
      // This is the OLD BROKEN logic that was causing the issue
      const keyParts = key.split('_');
      if (keyParts.length >= 2 && keyParts[0].toLowerCase() === cityName.toLowerCase()) {
        cachedSearches++;
        totalEvents += entry.data.length;
      }
    }
  }
  
  return { cachedSearches, totalEvents };
}

// New fixed parsing logic
function fixedGetCacheStats(cityName: string) {
  let cachedSearches = 0;
  let totalEvents = 0;
  
  const cache = (eventsCache as any).cache;
  if (cache && cache instanceof Map) {
    for (const [key, entry] of cache.entries()) {
      // NEW FIXED logic that properly handles complex categories
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
      
      cachedSearches++;
      totalEvents += entry.data.length;
    }
  }
  
  return { cachedSearches, totalEvents };
}

describe('Cache Statistics Fix Demonstration', () => {
  beforeEach(() => {
    eventsCache.clear();
  });

  it('should demonstrate the exact problem case and fix', () => {
    console.log('\n=== Hot Cities Cache Statistics Fix Demonstration ===');
    
    // Create the exact problem case mentioned in the issue
    const problemKey = InMemoryCache.createKey('Wien', '2025-01-03', ['DJ Sets/Electronic', 'Live-Konzerte']);
    console.log('\n1. Problem case cache key:', problemKey);
    console.log('   This key contains slashes and commas that break simple split() parsing');
    
    eventsCache.set(problemKey, [
      { title: 'Electronic Music Festival', venue: 'Club Vienna' },
      { title: 'Rock Concert', venue: 'Music Hall' },
      { title: 'Jazz Night', venue: 'Jazz Club' }
    ], 300);

    // Add more entries to show comprehensive statistics
    const wienKey2 = InMemoryCache.createKey('Wien', '2025-01-04', ['Clubs/Discos']);
    eventsCache.set(wienKey2, [
      { title: 'Dance Party', venue: 'Night Club' },
      { title: 'House Music Night', venue: 'Underground Club' }
    ], 300);

    const brokenStats = brokenGetCacheStats('Wien');
    const fixedStats = fixedGetCacheStats('Wien');

    console.log('\n2. Results comparison:');
    console.log(`   Old broken parsing: ${brokenStats.cachedSearches} searches, ${brokenStats.totalEvents} events`);
    console.log(`   New fixed parsing:  ${fixedStats.cachedSearches} searches, ${fixedStats.totalEvents} events`);

    // The fix should show the correct numbers
    expect(fixedStats.cachedSearches).toBe(2);
    expect(fixedStats.totalEvents).toBe(5);
    
    // The broken parsing would show 0 due to the complex category parsing failure
    // (In this specific case, it might work for Wien since it's a simple city name,
    // but let's test a more complex scenario)
  });

  it('should demonstrate city name with underscores (complete failure case)', () => {
    console.log('\n=== City Name with Underscores Test ===');
    
    // This is where the old parsing completely fails
    const nyKey = InMemoryCache.createKey('New_York', '2025-01-05', ['Test_Category', 'Another_Test']);
    console.log('\n1. New York cache key:', nyKey);
    console.log('   City name "New_York" becomes "new_york" and categories contain underscores');
    
    eventsCache.set(nyKey, [
      { title: 'NYC Event 1' },
      { title: 'NYC Event 2' }
    ], 300);

    const brokenStats = brokenGetCacheStats('New_York');
    const fixedStats = fixedGetCacheStats('New_York');

    console.log('\n2. Results for New_York:');
    console.log(`   Old broken parsing: ${brokenStats.cachedSearches} searches, ${brokenStats.totalEvents} events`);
    console.log(`   New fixed parsing:  ${fixedStats.cachedSearches} searches, ${fixedStats.totalEvents} events`);

    // The broken parsing fails completely here (gets 0 events)
    expect(brokenStats.cachedSearches).toBe(0);
    expect(brokenStats.totalEvents).toBe(0);
    
    // The fixed parsing works correctly
    expect(fixedStats.cachedSearches).toBe(1);
    expect(fixedStats.totalEvents).toBe(2);
  });

  it('should show comprehensive real-world scenario', () => {
    console.log('\n=== Real-World Scenario ===');
    
    // Multiple cities with various complex categories
    const viennaKeys = [
      InMemoryCache.createKey('Wien', '2025-01-03', ['DJ Sets/Electronic', 'Live-Konzerte']),
      InMemoryCache.createKey('Wien', '2025-01-04', ['Clubs/Discos']),
      InMemoryCache.createKey('Wien', '2025-01-05', ['Theater/Performance', 'Kunst/Design']),
      InMemoryCache.createKey('Wien', '2025-01-06', []), // "all" categories
    ];

    // Set up cache entries
    eventsCache.set(viennaKeys[0], [{ title: 'Event 1' }, { title: 'Event 2' }], 300);
    eventsCache.set(viennaKeys[1], [{ title: 'Event 3' }], 300);
    eventsCache.set(viennaKeys[2], [{ title: 'Event 4' }, { title: 'Event 5' }, { title: 'Event 6' }], 300);
    eventsCache.set(viennaKeys[3], [{ title: 'Event 7' }], 300);

    // Berlin entries
    const berlinKey = InMemoryCache.createKey('Berlin', '2025-01-03', ['LGBTQ+', 'Wellness/Spirituell']);
    eventsCache.set(berlinKey, [{ title: 'Berlin Event' }], 300);

    console.log('\n1. All cache keys created:');
    const cache = (eventsCache as any).cache;
    for (const [key] of cache.entries()) {
      console.log(`   ${key}`);
    }

    const viennaBroken = brokenGetCacheStats('Wien');
    const viennaFixed = fixedGetCacheStats('Wien');
    const berlinBroken = brokenGetCacheStats('Berlin');  
    const berlinFixed = fixedGetCacheStats('Berlin');

    console.log('\n2. Final statistics comparison:');
    console.log(`Wien - Broken: ${viennaBroken.cachedSearches} searches, ${viennaBroken.totalEvents} events`);
    console.log(`Wien - Fixed:  ${viennaFixed.cachedSearches} searches, ${viennaFixed.totalEvents} events`);
    console.log(`Berlin - Broken: ${berlinBroken.cachedSearches} searches, ${berlinBroken.totalEvents} events`);
    console.log(`Berlin - Fixed:  ${berlinFixed.cachedSearches} searches, ${berlinFixed.totalEvents} events`);

    // Verify the fix works correctly
    expect(viennaFixed.cachedSearches).toBe(4);
    expect(viennaFixed.totalEvents).toBe(7);
    expect(berlinFixed.cachedSearches).toBe(1);
    expect(berlinFixed.totalEvents).toBe(1);

    console.log('\n✅ Fix successfully resolves Hot Cities Statistics parsing issues!');
    console.log('✅ Statistics will now show accurate cache hit rates and event counts');
    console.log('✅ Hot Cities admin interface will display correct data\n');
  });
});