import { describe, it, expect, beforeEach } from 'vitest';
import InMemoryCache from '../cache';

describe('Per-Category Cache', () => {
  let cache: InMemoryCache;

  beforeEach(() => {
    cache = new InMemoryCache();
  });

  describe('createKeyForCategory', () => {
    it('should create cache key for single category', () => {
      const key = InMemoryCache.createKeyForCategory('Wien', '2025-01-03', 'Clubs/Discos');
      expect(key).toBe('wien_2025-01-03_Clubs/Discos');
    });

    it('should handle categories with complex characters', () => {
      const key = InMemoryCache.createKeyForCategory('Wien', '2025-01-03', 'DJ Sets/Electronic');
      expect(key).toBe('wien_2025-01-03_DJ Sets/Electronic');
    });
  });

  describe('setEventsByCategory', () => {
    it('should cache events for a single category', () => {
      const events = [
        { title: 'Club Event 1', category: 'Clubs/Discos' },
        { title: 'Club Event 2', category: 'Clubs/Discos' }
      ];

      cache.setEventsByCategory('Wien', '2025-01-03', 'Clubs/Discos', events, 300);

      const key = InMemoryCache.createKeyForCategory('Wien', '2025-01-03', 'Clubs/Discos');
      const cachedEvents = cache.get(key);
      
      expect(cachedEvents).toEqual(events);
    });
  });

  describe('getEventsByCategories', () => {
    beforeEach(() => {
      // Set up some cached data
      const clubEvents = [
        { title: 'Club Event 1', category: 'Clubs/Discos' },
        { title: 'Club Event 2', category: 'Clubs/Discos' }
      ];
      const djEvents = [
        { title: 'DJ Event 1', category: 'DJ Sets/Electronic' }
      ];

      cache.setEventsByCategory('Wien', '2025-01-03', 'Clubs/Discos', clubEvents, 300);
      cache.setEventsByCategory('Wien', '2025-01-03', 'DJ Sets/Electronic', djEvents, 300);
    });

    it('should return cached events for categories that exist in cache', () => {
      const result = cache.getEventsByCategories('Wien', '2025-01-03', ['Clubs/Discos']);
      
      expect(result.cachedEvents['Clubs/Discos']).toHaveLength(2);
      expect(result.missingCategories).toEqual([]);
      expect(result.cacheInfo['Clubs/Discos']).toEqual({
        fromCache: true,
        eventCount: 2
      });
    });

    it('should identify missing categories', () => {
      const result = cache.getEventsByCategories('Wien', '2025-01-03', ['Clubs/Discos', 'Theater']);
      
      expect(result.cachedEvents['Clubs/Discos']).toHaveLength(2);
      expect(result.missingCategories).toEqual(['Theater']);
      expect(result.cacheInfo['Clubs/Discos']).toEqual({
        fromCache: true,
        eventCount: 2
      });
      expect(result.cacheInfo['Theater']).toEqual({
        fromCache: false,
        eventCount: 0
      });
    });

    it('should handle mixed cache hits and misses', () => {
      const result = cache.getEventsByCategories('Wien', '2025-01-03', [
        'Clubs/Discos',
        'DJ Sets/Electronic', 
        'Theater',
        'Live-Konzerte'
      ]);
      
      expect(result.cachedEvents['Clubs/Discos']).toHaveLength(2);
      expect(result.cachedEvents['DJ Sets/Electronic']).toHaveLength(1);
      expect(result.missingCategories).toEqual(['Theater', 'Live-Konzerte']);
      
      expect(result.cacheInfo['Clubs/Discos']).toEqual({
        fromCache: true,
        eventCount: 2
      });
      expect(result.cacheInfo['DJ Sets/Electronic']).toEqual({
        fromCache: true,
        eventCount: 1
      });
      expect(result.cacheInfo['Theater']).toEqual({
        fromCache: false,
        eventCount: 0
      });
      expect(result.cacheInfo['Live-Konzerte']).toEqual({
        fromCache: false,
        eventCount: 0
      });
    });

    it('should return empty results when no categories are cached', () => {
      const result = cache.getEventsByCategories('Berlin', '2025-01-04', ['Theater', 'Music']);
      
      expect(result.cachedEvents).toEqual({});
      expect(result.missingCategories).toEqual(['Theater', 'Music']);
      expect(result.cacheInfo['Theater']).toEqual({
        fromCache: false,
        eventCount: 0
      });
      expect(result.cacheInfo['Music']).toEqual({
        fromCache: false,
        eventCount: 0
      });
    });
  });

  describe('backward compatibility', () => {
    it('should maintain existing createKey functionality', () => {
      const oldKey = InMemoryCache.createKey('Wien', '2025-01-03', ['Clubs/Discos', 'DJ Sets/Electronic']);
      expect(oldKey).toBe('wien_2025-01-03_Clubs/Discos,DJ Sets/Electronic');
    });

    it('should work with existing cache methods', () => {
      const events = [{ title: 'Event' }];
      const key = InMemoryCache.createKey('Wien', '2025-01-03', ['Clubs/Discos']);
      
      cache.set(key, events, 300);
      const retrieved = cache.get(key);
      
      expect(retrieved).toEqual(events);
    });
  });
});