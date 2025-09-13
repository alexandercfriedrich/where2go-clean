import { describe, it, expect, beforeEach, vi } from 'vitest';
import { eventsCache } from '../cache';
import InMemoryCache from '../cache';

// Mock the modules we don't want to test
vi.mock('../../../lib/new-backend/services/perplexityClient', () => ({
  getPerplexityClient: vi.fn(() => ({
    queryMultipleCategories: vi.fn(),
    queryGeneral: vi.fn(),
    isConfigured: vi.fn(() => true)
  }))
}));

vi.mock('@/lib/aggregator', () => ({
  eventAggregator: {
    parseEventsFromResponse: vi.fn(() => []),
    aggregateResults: vi.fn(() => []),
    categorizeEvents: vi.fn(events => events)
  }
}));

vi.mock('@/lib/cacheTtl', () => ({
  computeTTLSecondsForEvents: vi.fn(() => 300)
}));

describe('Per-Category Search Logic', () => {
  beforeEach(() => {
    // Clear cache before each test
    eventsCache.clear();
  });

  describe('cache lookup behavior', () => {
    it('should reuse cached single category in multi-category search', () => {
      // Setup: Cache events for Clubs/Discos category
      const clubEvents = [
        { title: 'Club Event 1', category: 'Clubs/Discos' },
        { title: 'Club Event 2', category: 'Clubs/Discos' }
      ];
      
      eventsCache.setEventsByCategory('Ibiza', '2025-09-02', 'Clubs/Discos', clubEvents, 300);

      // Test: Search for both categories should find cached Clubs/Discos
      const result = eventsCache.getEventsByCategories('Ibiza', '2025-09-02', ['Clubs/Discos', 'DJ Sets/Electronic']);

      expect(result.cachedEvents['Clubs/Discos']).toEqual(clubEvents);
      expect(result.missingCategories).toEqual(['DJ Sets/Electronic']);
      expect(result.cacheInfo['Clubs/Discos']).toEqual({
        fromCache: true,
        eventCount: 2
      });
      expect(result.cacheInfo['DJ Sets/Electronic']).toEqual({
        fromCache: false,
        eventCount: 0
      });
    });

    it('should handle complete cache miss', () => {
      const result = eventsCache.getEventsByCategories('Ibiza', '2025-09-02', ['Clubs/Discos', 'DJ Sets/Electronic']);

      expect(result.cachedEvents).toEqual({});
      expect(result.missingCategories).toEqual(['Clubs/Discos', 'DJ Sets/Electronic']);
      expect(result.cacheInfo['Clubs/Discos']).toEqual({
        fromCache: false,
        eventCount: 0
      });
      expect(result.cacheInfo['DJ Sets/Electronic']).toEqual({
        fromCache: false,
        eventCount: 0
      });
    });

    it('should handle complete cache hit', () => {
      // Setup: Cache events for both categories
      const clubEvents = [
        { title: 'Club Event 1', category: 'Clubs/Discos' }
      ];
      const djEvents = [
        { title: 'DJ Event 1', category: 'DJ Sets/Electronic' }
      ];
      
      eventsCache.setEventsByCategory('Ibiza', '2025-09-02', 'Clubs/Discos', clubEvents, 300);
      eventsCache.setEventsByCategory('Ibiza', '2025-09-02', 'DJ Sets/Electronic', djEvents, 300);

      const result = eventsCache.getEventsByCategories('Ibiza', '2025-09-02', ['Clubs/Discos', 'DJ Sets/Electronic']);

      expect(result.cachedEvents['Clubs/Discos']).toEqual(clubEvents);
      expect(result.cachedEvents['DJ Sets/Electronic']).toEqual(djEvents);
      expect(result.missingCategories).toEqual([]);
      expect(result.cacheInfo['Clubs/Discos']).toEqual({
        fromCache: true,
        eventCount: 1
      });
      expect(result.cacheInfo['DJ Sets/Electronic']).toEqual({
        fromCache: true,
        eventCount: 1
      });
    });
  });

  describe('cache key generation', () => {
    it('should generate consistent keys for categories', () => {
      const key1 = InMemoryCache.createKeyForCategory('Ibiza', '2025-09-02', 'Clubs/Discos');
      const key2 = InMemoryCache.createKeyForCategory('ibiza', '2025-09-02', 'Clubs/Discos');
      
      expect(key1).toBe('ibiza_2025-09-02_Clubs/Discos');
      expect(key2).toBe('ibiza_2025-09-02_Clubs/Discos');
      expect(key1).toBe(key2); // Should be case-insensitive for city
    });

    it('should handle categories with special characters', () => {
      const key = InMemoryCache.createKeyForCategory('Wien', '2025-01-03', 'DJ Sets/Electronic');
      expect(key).toBe('wien_2025-01-03_DJ Sets/Electronic');
    });
  });

  describe('backward compatibility', () => {
    it('should maintain legacy createKey format', () => {
      const legacyKey = InMemoryCache.createKey('Ibiza', '2025-09-02', ['Clubs/Discos', 'DJ Sets/Electronic']);
      expect(legacyKey).toBe('ibiza_2025-09-02_Clubs/Discos,DJ Sets/Electronic');
      
      // Should be different from per-category keys
      const categoryKey1 = InMemoryCache.createKeyForCategory('Ibiza', '2025-09-02', 'Clubs/Discos');
      const categoryKey2 = InMemoryCache.createKeyForCategory('Ibiza', '2025-09-02', 'DJ Sets/Electronic');
      
      expect(legacyKey).not.toBe(categoryKey1);
      expect(legacyKey).not.toBe(categoryKey2);
    });

    it('should work with existing cache operations', () => {
      const events = [{ title: 'Event' }];
      const key = InMemoryCache.createKey('Wien', '2025-01-03', ['Music']);
      
      eventsCache.set(key, events, 300);
      const retrieved = eventsCache.get(key);
      
      expect(retrieved).toEqual(events);
      expect(eventsCache.has(key)).toBe(true);
    });
  });

  describe('performance scenarios', () => {
    it('should demonstrate the efficiency gain scenario from problem statement', () => {
      // Scenario 1: Search for Clubs/Discos only - gets cached
      const clubEvents = [
        { title: 'Club Event 1', category: 'Clubs/Discos' },
        { title: 'Club Event 2', category: 'Clubs/Discos' }
      ];
      
      eventsCache.setEventsByCategory('Ibiza', '2025-09-02', 'Clubs/Discos', clubEvents, 300);
      
      // Scenario 2: Search for both Clubs/Discos and DJ Sets/Electronic
      // Should reuse cached Clubs/Discos events and only search for DJ Sets/Electronic
      const result = eventsCache.getEventsByCategories('Ibiza', '2025-09-02', ['Clubs/Discos', 'DJ Sets/Electronic']);
      
      // Verify cached events are found
      expect(result.cachedEvents['Clubs/Discos']).toEqual(clubEvents);
      expect(result.cachedEvents['Clubs/Discos']).toHaveLength(2);
      
      // Verify only DJ Sets/Electronic needs to be searched
      expect(result.missingCategories).toEqual(['DJ Sets/Electronic']);
      expect(result.missingCategories).toHaveLength(1);
      
      // This proves the efficiency: we only need to search for 1 category instead of 2
      console.log('✅ Efficiency gain: Only need to search for', result.missingCategories.length, 'out of 2 categories');
      console.log('✅ Reusing', Object.keys(result.cachedEvents).length, 'cached categories:', Object.keys(result.cachedEvents));
    });
  });
});