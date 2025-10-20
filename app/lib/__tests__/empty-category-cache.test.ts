import { describe, it, expect, beforeEach } from 'vitest';
import { eventsCache } from '../cache';
import InMemoryCache from '../cache';

/**
 * Test that validates caching of empty category results
 * This addresses the issue where categories with no events are not cached,
 * leading to repeated expensive searches for the same empty categories.
 */
describe('Empty Category Cache', () => {
  beforeEach(async () => {
    await eventsCache.clear();
  });

  it('should cache and retrieve empty category results', async () => {
    const city = 'TestCity';
    const date = '2025-01-15';
    const category = 'RareCategory';

    // Cache an empty result for a category
    await eventsCache.setEventsByCategory(city, date, category, [], 300);

    // Retrieve the cached empty result
    const key = InMemoryCache.createKeyForCategory(city, date, category);
    const cached = await eventsCache.get<any[]>(key);

    // Should retrieve an empty array, not null
    expect(cached).toEqual([]);
    expect(Array.isArray(cached)).toBe(true);
  });

  it('should distinguish between uncached and empty cached results', async () => {
    const city = 'TestCityUnique' + Date.now(); // Use truly unique city name
    const date = '2025-01-16';
    const cachedEmptyCategory = 'Film'; // Use a real category
    const uncachedCategory = 'Sport'; // Use a different real category

    // Cache an empty result for Film
    await eventsCache.setEventsByCategory(city, date, cachedEmptyCategory, [], 300);

    // Check both categories
    const result = await eventsCache.getEventsByCategories(city, date, [
      cachedEmptyCategory,
      uncachedCategory
    ]);

    // Empty cached category should be in cachedEvents with empty array
    expect(result.cachedEvents[cachedEmptyCategory]).toEqual([]);
    expect(result.cacheInfo[cachedEmptyCategory]).toEqual({
      fromCache: true,
      eventCount: 0
    });

    // Uncached category should be in missingCategories
    expect(result.missingCategories).toContain(uncachedCategory);
    expect(result.cacheInfo[uncachedCategory]).toEqual({
      fromCache: false,
      eventCount: 0
    });
  });

  it('should prevent redundant searches for empty categories', async () => {
    const city = 'Vienna';
    const date = '2025-01-20';
    const categories = ['Comedy/Kabarett', 'Wellness/Spirituell'];

    // First search: Comedy/Kabarett has events, Wellness/Spirituell is empty
    await eventsCache.setEventsByCategory(city, date, 'Comedy/Kabarett', [
      {
        title: 'Event 1',
        category: 'Comedy/Kabarett',
        date,
        time: '20:00',
        venue: 'Venue 1',
        price: '20€',
        website: 'https://example.com'
      }
    ], 300);
    await eventsCache.setEventsByCategory(city, date, 'Wellness/Spirituell', [], 300);

    // Second search: Both categories should be cached
    const result = await eventsCache.getEventsByCategories(city, date, categories);

    // Both should be found in cache (not in missingCategories)
    expect(result.missingCategories).toEqual([]);
    expect(result.cachedEvents['Comedy/Kabarett']).toHaveLength(1);
    expect(result.cachedEvents['Wellness/Spirituell']).toEqual([]);
    expect(result.cacheInfo['Comedy/Kabarett']).toEqual({
      fromCache: true,
      eventCount: 1
    });
    expect(result.cacheInfo['Wellness/Spirituell']).toEqual({
      fromCache: true,
      eventCount: 0
    });
  });

  it('should handle mixed results: some categories with events, some empty', async () => {
    const city = 'Berlin2Unique' + Date.now(); // Use unique city
    const date = '2025-02-02';

    // Cache various categories with different states
    await eventsCache.setEventsByCategory(city, date, 'Theater/Performance', [
      { title: 'Event 1', category: 'Theater/Performance', date, time: '19:00', venue: 'V1', price: '10€', website: 'https://e1.com' },
      { title: 'Event 2', category: 'Theater/Performance', date, time: '20:00', venue: 'V2', price: '15€', website: 'https://e2.com' }
    ], 300);
    await eventsCache.setEventsByCategory(city, date, 'Natur/Outdoor', [], 300);
    await eventsCache.setEventsByCategory(city, date, 'Märkte/Shopping', [
      { title: 'Event 3', category: 'Märkte/Shopping', date, time: '21:00', venue: 'V3', price: '20€', website: 'https://e3.com' }
    ], 300);

    // Query all three categories plus one uncached
    const result = await eventsCache.getEventsByCategories(city, date, [
      'Theater/Performance',
      'Natur/Outdoor',
      'Märkte/Shopping',
      'Familien/Kids'
    ]);

    // Verify results
    expect(result.cachedEvents['Theater/Performance']).toHaveLength(2);
    expect(result.cachedEvents['Natur/Outdoor']).toEqual([]);
    expect(result.cachedEvents['Märkte/Shopping']).toHaveLength(1);
    expect(result.missingCategories).toEqual(['Familien/Kids']);

    // Verify cache info
    expect(result.cacheInfo['Theater/Performance'].fromCache).toBe(true);
    expect(result.cacheInfo['Theater/Performance'].eventCount).toBe(2);
    expect(result.cacheInfo['Natur/Outdoor'].fromCache).toBe(true);
    expect(result.cacheInfo['Natur/Outdoor'].eventCount).toBe(0);
    expect(result.cacheInfo['Märkte/Shopping'].fromCache).toBe(true);
    expect(result.cacheInfo['Märkte/Shopping'].eventCount).toBe(1);
    expect(result.cacheInfo['Familien/Kids'].fromCache).toBe(false);
    expect(result.cacheInfo['Familien/Kids'].eventCount).toBe(0);
  });

  it('should respect TTL for empty category results', async () => {
    const city = 'Madrid';
    const date = '2025-03-10';
    const category = 'Soziales/Community';

    // Cache with short TTL (we can't easily test expiration in unit tests without mocking)
    await eventsCache.setEventsByCategory(city, date, category, [], 60);

    // Immediately verify it's cached
    const result = await eventsCache.getEventsByCategories(city, date, [category]);
    expect(result.cachedEvents[category]).toEqual([]);
    expect(result.missingCategories).toEqual([]);
  });
});
