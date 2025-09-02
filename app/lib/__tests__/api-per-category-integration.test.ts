import { describe, it, expect, beforeEach } from 'vitest';
import { eventsCache } from '../cache';

/**
 * Integration test for the per-category caching behavior in the API routes
 * This tests the logic implemented in app/api/events/route.ts
 */
describe('API Per-Category Cache Integration', () => {
  beforeEach(() => {
    eventsCache.clear();
  });

  describe('intelligent cache usage simulation', () => {
    it('should demonstrate the cache efficiency improvements', () => {
      console.log('\n=== API Integration: Cache Efficiency Test ===');
      
      // Simulate initial cache state from previous searches
      const city = 'Wien';
      const date = '2025-01-05';
      
      // First, cache some categories from previous searches
      eventsCache.setEventsByCategory(city, date, 'Clubs/Discos', [
        { title: 'Club Event 1', category: 'Clubs/Discos', date, time: '22:00', venue: 'Flex', price: '15€', website: 'https://flex.at' },
        { title: 'Club Event 2', category: 'Clubs/Discos', date, time: '23:00', venue: 'Pratersauna', price: '20€', website: 'https://pratersauna.at' }
      ], 300);
      
      eventsCache.setEventsByCategory(city, date, 'DJ Sets/Electronic', [
        { title: 'DJ Event', category: 'DJ Sets/Electronic', date, time: '21:00', venue: 'Electronic Venue', price: '25€', website: 'https://dj.venue' }
      ], 300);
      
      console.log('→ Pre-cached categories: Clubs/Discos (2 events), DJ Sets/Electronic (1 event)');
      
      // Now simulate API request for multiple categories (some cached, some not)
      const requestedCategories = ['Clubs/Discos', 'DJ Sets/Electronic', 'Live-Konzerte', 'Theater/Performance'];
      
      // This simulates the logic in app/api/events/route.ts
      const cacheResult = eventsCache.getEventsByCategories(city, date, requestedCategories);
      
      // Combine all cached events (what the API would return immediately)
      const allCachedEvents = [];
      for (const category in cacheResult.cachedEvents) {
        allCachedEvents.push(...cacheResult.cachedEvents[category]);
      }
      
      const missingCategories = cacheResult.missingCategories;
      const cacheInfo = cacheResult.cacheInfo;
      
      console.log(`→ API request for ${requestedCategories.length} categories`);
      console.log(`→ Cache hit: ${Object.keys(cacheResult.cachedEvents).length}/${requestedCategories.length} categories`);
      console.log(`→ Immediate return: ${allCachedEvents.length} events from cache`);
      console.log(`→ Background processing needed for: ${missingCategories.length} categories`);
      console.log(`→ Missing categories: ${missingCategories.join(', ')}`);
      
      // Verify the efficiency improvements
      expect(Object.keys(cacheResult.cachedEvents)).toEqual(['Clubs/Discos', 'DJ Sets/Electronic']);
      expect(missingCategories).toEqual(['Live-Konzerte', 'Theater/Performance']);
      expect(allCachedEvents).toHaveLength(3);
      
      // Verify cache info structure 
      expect(cacheInfo['Clubs/Discos']).toEqual({ fromCache: true, eventCount: 2 });
      expect(cacheInfo['DJ Sets/Electronic']).toEqual({ fromCache: true, eventCount: 1 });
      expect(cacheInfo['Live-Konzerte']).toEqual({ fromCache: false, eventCount: 0 });
      expect(cacheInfo['Theater/Performance']).toEqual({ fromCache: false, eventCount: 0 });
      
      // Calculate efficiency 
      const cacheHitRate = (Object.keys(cacheResult.cachedEvents).length / requestedCategories.length) * 100;
      const apiCallReduction = (Object.keys(cacheResult.cachedEvents).length / requestedCategories.length) * 100;
      
      console.log(`→ Cache hit rate: ${cacheHitRate}% (2/4 categories)`);
      console.log(`→ API call reduction: ${apiCallReduction}% (only need to process 2 instead of 4 categories)`);
      console.log('✅ Per-category cache enables immediate partial results and reduces API calls');
      
      expect(cacheHitRate).toBe(50); // 50% cache hit rate in this scenario
    });

    it('should handle all-cached scenario efficiently', () => {
      console.log('\n=== API Integration: All Categories Cached Scenario ===');
      
      const city = 'Barcelona';
      const date = '2025-06-15';
      
      // Cache all requested categories
      eventsCache.setEventsByCategory(city, date, 'Clubs/Discos', [
        { title: 'Barcelona Club', category: 'Clubs/Discos', date, time: '23:00', venue: 'Razzmatazz', price: '30€', website: 'https://razzmatazz.com' }
      ], 300);
      
      eventsCache.setEventsByCategory(city, date, 'Live-Konzerte', [
        { title: 'Live Concert', category: 'Live-Konzerte', date, time: '20:00', venue: 'Palau de la Música', price: '50€', website: 'https://palaumusica.cat' }
      ], 300);
      
      console.log('→ Pre-cached all requested categories');
      
      const requestedCategories = ['Clubs/Discos', 'Live-Konzerte'];
      const cacheResult = eventsCache.getEventsByCategories(city, date, requestedCategories);
      
      // Combine all cached events
      const allCachedEvents = [];
      for (const category in cacheResult.cachedEvents) {
        allCachedEvents.push(...cacheResult.cachedEvents[category]);
      }
      
      console.log(`→ All ${requestedCategories.length} categories found in cache`);
      console.log(`→ Immediate return: ${allCachedEvents.length} events`);
      console.log(`→ No background processing needed`);
      
      // In this case, the API should return immediately with status 'done'
      expect(cacheResult.missingCategories).toHaveLength(0);
      expect(allCachedEvents).toHaveLength(2);
      expect(Object.keys(cacheResult.cachedEvents)).toEqual(requestedCategories);
      
      console.log('✅ All-cached scenario enables immediate completion without API calls');
    });

    it('should handle no-cache scenario correctly', () => {
      console.log('\n=== API Integration: No Cache Scenario ===');
      
      const city = 'London';
      const date = '2025-03-20';
      const requestedCategories = ['Theater/Performance', 'Film'];
      
      const cacheResult = eventsCache.getEventsByCategories(city, date, requestedCategories);
      
      console.log(`→ No categories found in cache`);
      console.log(`→ All ${requestedCategories.length} categories need background processing`);
      
      expect(cacheResult.missingCategories).toEqual(requestedCategories);
      expect(Object.keys(cacheResult.cachedEvents)).toHaveLength(0);
      
      // Simulate that this would trigger full background processing
      console.log('✅ No-cache scenario correctly identifies all categories for processing');
    });
  });
});