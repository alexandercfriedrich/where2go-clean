import { describe, it, expect, beforeEach } from 'vitest';
import { eventsCache } from '../cache';
import InMemoryCache from '../cache';
import type { EventData } from '../types';

describe('Per-Category Cache Integration Tests', () => {
  beforeEach(() => {
    eventsCache.clear();
  });

  describe('end-to-end cache efficiency scenarios', () => {
    it('should demonstrate the exact problem statement scenario', () => {
      console.log('\n=== Problem Statement Scenario Demonstration ===');
      
      // Initial state: Empty cache
      expect(eventsCache.size()).toBe(0);
      
      // Scenario 1: Search for Clubs/Discos only
      console.log('1. First search: Ibiza, today, ["Clubs/Discos"]');
      
      const clubEvents: EventData[] = [
        {
          title: 'Night Club Party',
          category: 'Clubs/Discos',
          date: '2025-09-02',
          time: '22:00',
          venue: 'Space Ibiza',
          price: '30€',
          website: 'https://spaceibiza.com'
        },
        {
          title: 'Electronic Dance Night',
          category: 'Clubs/Discos', 
          date: '2025-09-02',
          time: '23:00',
          venue: 'Amnesia',
          price: '35€',
          website: 'https://amnesia.es'
        }
      ];
      
      // Cache the clubs events per category
      eventsCache.setEventsByCategory('Ibiza', '2025-09-02', 'Clubs/Discos', clubEvents, 300);
      
      console.log(`   → Cached ${clubEvents.length} Clubs/Discos events`);
      expect(eventsCache.size()).toBe(1);
      
      // Scenario 2: Search for both categories
      console.log('2. Second search: Ibiza, today, ["Clubs/Discos", "DJ Sets/Electronic"]');
      
      const cacheResult = eventsCache.getEventsByCategories('Ibiza', '2025-09-02', ['Clubs/Discos', 'DJ Sets/Electronic']);
      
      console.log(`   → Found ${Object.keys(cacheResult.cachedEvents).length} cached categories: ${Object.keys(cacheResult.cachedEvents)}`);
      console.log(`   → Missing ${cacheResult.missingCategories.length} categories: ${cacheResult.missingCategories}`);
      console.log(`   → Cached events: ${cacheResult.cachedEvents['Clubs/Discos']?.length || 0} from Clubs/Discos`);
      
      // Verify the efficiency gain
      expect(cacheResult.cachedEvents['Clubs/Discos']).toHaveLength(2);
      expect(cacheResult.missingCategories).toEqual(['DJ Sets/Electronic']);
      expect(cacheResult.cacheInfo['Clubs/Discos']).toEqual({
        fromCache: true,
        eventCount: 2
      });
      expect(cacheResult.cacheInfo['DJ Sets/Electronic']).toEqual({
        fromCache: false,
        eventCount: 0
      });
      
      // Simulate adding the missing category
      const djEvents: EventData[] = [
        {
          title: 'DJ Tiësto Live',
          category: 'DJ Sets/Electronic',
          date: '2025-09-02', 
          time: '20:00',
          venue: 'Pacha Ibiza',
          price: '50€',
          website: 'https://pacha.com'
        }
      ];
      
      eventsCache.setEventsByCategory('Ibiza', '2025-09-02', 'DJ Sets/Electronic', djEvents, 300);
      console.log(`   → Cached ${djEvents.length} new DJ Sets/Electronic events`);
      
      // Final verification - both categories should now be cached
      const finalResult = eventsCache.getEventsByCategories('Ibiza', '2025-09-02', ['Clubs/Discos', 'DJ Sets/Electronic']);
      
      expect(finalResult.missingCategories).toHaveLength(0);
      expect(finalResult.cachedEvents['Clubs/Discos']).toHaveLength(2);
      expect(finalResult.cachedEvents['DJ Sets/Electronic']).toHaveLength(1);
      
      console.log('✅ SUCCESS: Per-category cache reuse working perfectly!');
      console.log('✅ API calls reduced from 2 categories to 1 category on second search');
    });

    it('should handle complex multi-category scenarios', () => {
      // Set up cache with some categories
      const categories = ['Clubs/Discos', 'DJ Sets/Electronic', 'Live-Konzerte', 'Theater/Performance'];
      
      // Cache first two categories
      eventsCache.setEventsByCategory('Wien', '2025-01-03', 'Clubs/Discos', [
        { title: 'Club Event', category: 'Clubs/Discos', date: '2025-01-03', time: '22:00', venue: 'Flex', price: '15€', website: 'https://flex.at' }
      ], 300);
      
      eventsCache.setEventsByCategory('Wien', '2025-01-03', 'DJ Sets/Electronic', [
        { title: 'DJ Event 1', category: 'DJ Sets/Electronic', date: '2025-01-03', time: '20:00', venue: 'Techno Club', price: '20€', website: 'https://techno.at' },
        { title: 'DJ Event 2', category: 'DJ Sets/Electronic', date: '2025-01-03', time: '21:00', venue: 'Electronic Venue', price: '25€', website: 'https://electronic.at' }
      ], 300);
      
      // Search for all 4 categories
      const result = eventsCache.getEventsByCategories('Wien', '2025-01-03', categories);
      
      // Should find 2 cached, 2 missing
      expect(Object.keys(result.cachedEvents)).toHaveLength(2);
      expect(result.missingCategories).toHaveLength(2);
      expect(result.missingCategories).toEqual(['Live-Konzerte', 'Theater/Performance']);
      
      // Verify cached events count
      const totalCachedEvents = Object.values(result.cachedEvents).flat().length;
      expect(totalCachedEvents).toBe(3); // 1 + 2 events
    });
  });

  describe('backward compatibility validation', () => {
    it('should work seamlessly with existing legacy cache entries', () => {
      // Create legacy cache entry
      const legacyEvents: EventData[] = [
        { title: 'Legacy Event 1', category: 'Music', date: '2025-01-03', time: '19:00', venue: 'Concert Hall', price: '40€', website: 'https://concert.com' },
        { title: 'Legacy Event 2', category: 'Theater', date: '2025-01-03', time: '20:00', venue: 'Theater House', price: '25€', website: 'https://theater.com' }
      ];
      
      const legacyKey = InMemoryCache.createKey('Berlin', '2025-01-03', ['Music', 'Theater']);
      eventsCache.set(legacyKey, legacyEvents, 300);
      
      // Add per-category cache for different categories
      eventsCache.setEventsByCategory('Berlin', '2025-01-03', 'Clubs/Discos', [
        { title: 'Club Event', category: 'Clubs/Discos', date: '2025-01-03', time: '23:00', venue: 'Berlin Club', price: '20€', website: 'https://club.de' }
      ], 300);
      
      // Verify both types work
      const legacyCached = eventsCache.get(legacyKey);
      expect(legacyCached).toHaveLength(2);
      
      const perCategoryResult = eventsCache.getEventsByCategories('Berlin', '2025-01-03', ['Clubs/Discos']);
      expect(perCategoryResult.cachedEvents['Clubs/Discos']).toHaveLength(1);
      expect(perCategoryResult.missingCategories).toHaveLength(0);
    });

    it('should handle migration from legacy to per-category gracefully', () => {
      // Start with legacy cache
      const legacyEvents: EventData[] = [
        { title: 'Event 1', category: 'Clubs/Discos', date: '2025-01-03', time: '22:00', venue: 'Club 1', price: '15€', website: 'https://club1.com' },
        { title: 'Event 2', category: 'DJ Sets/Electronic', date: '2025-01-03', time: '23:00', venue: 'DJ Venue', price: '20€', website: 'https://dj.com' }
      ];
      
      const legacyKey = InMemoryCache.createKey('Madrid', '2025-01-03', ['Clubs/Discos', 'DJ Sets/Electronic']);
      eventsCache.set(legacyKey, legacyEvents, 300);
      
      // Later, add per-category cache for individual categories
      eventsCache.setEventsByCategory('Madrid', '2025-01-03', 'Clubs/Discos', [
        { title: 'New Club Event', category: 'Clubs/Discos', date: '2025-01-03', time: '21:00', venue: 'New Club', price: '18€', website: 'https://newclub.com' }
      ], 300);
      
      // Both should be accessible
      const legacyCached = eventsCache.get(legacyKey);
      expect(legacyCached).toHaveLength(2);
      
      const perCategoryResult = eventsCache.getEventsByCategories('Madrid', '2025-01-03', ['Clubs/Discos']);
      expect(perCategoryResult.cachedEvents['Clubs/Discos']).toHaveLength(1);
    });
  });

  describe('cache key format validation', () => {
    it('should generate correct keys for various scenarios', () => {
      // Per-category keys
      expect(InMemoryCache.createKeyForCategory('Ibiza', '2025-09-02', 'Clubs/Discos'))
        .toBe('ibiza_2025-09-02_Clubs/Discos');
      
      expect(InMemoryCache.createKeyForCategory('New_York', '2025-01-03', 'DJ Sets/Electronic'))
        .toBe('new_york_2025-01-03_DJ Sets/Electronic');
      
      // Legacy keys
      expect(InMemoryCache.createKey('Ibiza', '2025-09-02', ['Clubs/Discos', 'DJ Sets/Electronic']))
        .toBe('ibiza_2025-09-02_Clubs/Discos,DJ Sets/Electronic');
      
      expect(InMemoryCache.createKey('Wien', '2025-01-03', []))
        .toBe('wien_2025-01-03_all');
      
      expect(InMemoryCache.createKey('Berlin', '2025-01-04'))
        .toBe('berlin_2025-01-04_all');
    });

    it('should maintain key consistency for case variations', () => {
      const key1 = InMemoryCache.createKeyForCategory('Ibiza', '2025-09-02', 'Clubs/Discos');
      const key2 = InMemoryCache.createKeyForCategory('IBIZA', '2025-09-02', 'Clubs/Discos');
      const key3 = InMemoryCache.createKeyForCategory('ibiza', '2025-09-02', 'Clubs/Discos');
      
      expect(key1).toBe(key2);
      expect(key2).toBe(key3);
      expect(key1).toBe('ibiza_2025-09-02_Clubs/Discos');
    });
  });

  describe('real-world performance scenarios', () => {
    it('should demonstrate significant efficiency improvements', () => {
      console.log('\n=== Performance Analysis ===');
      
      const categories = ['Clubs/Discos', 'DJ Sets/Electronic', 'Live-Konzerte', 'Theater/Performance', 'Kunst/Design'];
      
      // Simulate initial search for 2 categories
      console.log('Scenario: User searches for 2 categories initially');
      eventsCache.setEventsByCategory('Barcelona', '2025-06-15', 'Clubs/Discos', [
        { title: 'Club Event 1', category: 'Clubs/Discos', date: '2025-06-15', time: '22:00', venue: 'Club BCN', price: '20€', website: 'https://club.es' },
        { title: 'Club Event 2', category: 'Clubs/Discos', date: '2025-06-15', time: '23:00', venue: 'Disco BCN', price: '25€', website: 'https://disco.es' }
      ], 300);
      
      eventsCache.setEventsByCategory('Barcelona', '2025-06-15', 'DJ Sets/Electronic', [
        { title: 'DJ Event', category: 'DJ Sets/Electronic', date: '2025-06-15', time: '21:00', venue: 'Electronic BCN', price: '30€', website: 'https://dj.es' }
      ], 300);
      
      console.log('→ Cached: Clubs/Discos (2 events), DJ Sets/Electronic (1 event)');
      
      // Later search for all 5 categories
      console.log('Later: User expands search to all 5 categories');
      const result = eventsCache.getEventsByCategories('Barcelona', '2025-06-15', categories);
      
      const cachedCategories = Object.keys(result.cachedEvents);
      const missingCategories = result.missingCategories;
      
      console.log(`→ Cache hit: ${cachedCategories.length}/5 categories (${cachedCategories.join(', ')})`);
      console.log(`→ Need to search: ${missingCategories.length}/5 categories (${missingCategories.join(', ')})`);
      console.log(`→ Efficiency: ${Math.round((cachedCategories.length / categories.length) * 100)}% cache hit rate`);
      
      expect(cachedCategories).toHaveLength(2);
      expect(missingCategories).toHaveLength(3);
      expect(result.cachedEvents['Clubs/Discos']).toHaveLength(2);
      expect(result.cachedEvents['DJ Sets/Electronic']).toHaveLength(1);
      
      console.log('✅ 60% reduction in API calls (3 instead of 5 categories)');
    });
  });
});