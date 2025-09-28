import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RedisCache, InMemoryCache } from '../redis-cache';

describe('Redis Cache Implementation', () => {
  describe('RedisCache', () => {
    let mockRedis: any;
    let cache: RedisCache;

    beforeEach(() => {
      mockRedis = {
        setex: vi.fn(),
        set: vi.fn(),
        get: vi.fn(),
        del: vi.fn(),
        exists: vi.fn()
      };
      cache = new RedisCache(mockRedis, 'test:', 300);
    });

    it('should create proper cache keys with normalization', () => {
      expect(RedisCache.createKeyForCategory('Wien', '2025-09-28', 'Comedy/Kabarett'))
        .toBe('wien_2025-09-28_comedy_kabarett');
      
      expect(RedisCache.createKeyForCategory('Berlin', '2025-01-01', 'DJ Sets/Electronic'))
        .toBe('berlin_2025-01-01_dj_sets_electronic');
    });

    it('should set events by category', async () => {
      const events = [
        { title: 'Comedy Show', category: 'Comedy/Kabarett', date: '2025-09-28' }
      ];
      mockRedis.setex.mockResolvedValue('OK');

      await cache.setEventsByCategory('Wien', '2025-09-28', 'Comedy/Kabarett', events, 300);

      expect(mockRedis.setex).toHaveBeenCalledWith(
        'test_wien_2025-09-28_comedy_kabarett',
        300,
        expect.any(String)
      );
    });

    it('should get events by categories with cache hits and misses', async () => {
      const cachedEvents = [
        { title: 'Cached Event', category: 'Comedy/Kabarett' }
      ];
      
      // Mock one hit and one miss
      mockRedis.get
        .mockResolvedValueOnce(JSON.stringify({
          data: cachedEvents,
          timestamp: Date.now(),
          ttl: 300000
        }))
        .mockResolvedValueOnce(null);

      const result = await cache.getEventsByCategories('Wien', '2025-09-28', ['Comedy/Kabarett', 'Kunst/Design']);

      expect(result.cachedEvents['Comedy/Kabarett']).toEqual(cachedEvents);
      expect(result.missingCategories).toEqual(['Kunst/Design']);
      expect(result.cacheInfo['Comedy/Kabarett']).toEqual({
        fromCache: true,
        eventCount: 1
      });
      expect(result.cacheInfo['Kunst/Design']).toEqual({
        fromCache: false,
        eventCount: 0
      });
    });

    it('should handle expired cache entries', async () => {
      const expiredEntry = {
        data: [{ title: 'Old Event' }],
        timestamp: Date.now() - 400000, // 400 seconds ago
        ttl: 300000 // 300 seconds TTL
      };
      
      mockRedis.get.mockResolvedValue(JSON.stringify(expiredEntry));
      mockRedis.del.mockResolvedValue(1);

      const result = await cache.get('test_key');

      expect(result).toBeNull();
      expect(mockRedis.del).toHaveBeenCalledWith('test_test_key');
    });

    it('should normalize category names', () => {
      expect(RedisCache.normalizeCategory('Comedy/Kabarett')).toBe('comedy_kabarett');
      expect(RedisCache.normalizeCategory('DJ Sets/Electronic')).toBe('dj_sets_electronic');
      expect(RedisCache.normalizeCategory('')).toBe('');
    });
  });

  describe('InMemoryCache fallback', () => {
    let cache: InMemoryCache;

    beforeEach(() => {
      cache = new InMemoryCache();
    });

    it('should work as fallback when Redis is not available', async () => {
      const events = [{ title: 'Test Event' }];
      
      await cache.setEventsByCategory('Wien', '2025-09-28', 'Comedy/Kabarett', events);
      
      const result = await cache.getEventsByCategories('Wien', '2025-09-28', ['Comedy/Kabarett']);
      
      expect(result.cachedEvents['Comedy/Kabarett']).toEqual(events);
      expect(result.missingCategories).toEqual([]);
      expect(result.cacheInfo['Comedy/Kabarett']).toEqual({
        fromCache: true,
        eventCount: 1
      });
    });

    it('should handle TTL expiration in memory', async () => {
      await cache.set('test_key', { data: 'test' }, 0.001); // Very short TTL
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const result = await cache.get('test_key');
      expect(result).toBeNull();
    });
  });

  describe('Legacy key patterns', () => {
    it('should handle problematic keys from the issue', () => {
      const problemKeys = [
        'wien_2025-09-28_Comedy/Kabarett',
        'wien_2025-09-28_Kunst/Design',
        'wien_2025-09-28_Museen'
      ];

      problemKeys.forEach(key => {
        const normalized = RedisCache.createKeyForCategory('Wien', '2025-09-28', key.split('_')[2]);
        expect(normalized).not.toContain('/');
        expect(normalized).toMatch(/^wien_2025-09-28_[a-z_]+$/);
      });
    });

    it('should create consistent keys for combined categories', () => {
      const categories = ['Comedy/Kabarett', 'Kunst/Design', 'DJ Sets/Electronic'];
      const key1 = RedisCache.createKey('Wien', '2025-09-28', categories);
      const key2 = RedisCache.createKey('Wien', '2025-09-28', [...categories].reverse());
      
      // Should be same regardless of order due to sorting
      expect(key1).toBe(key2);
      expect(key1).not.toContain('/');
    });
  });

  describe('Error handling', () => {
    let mockRedis: any;
    let cache: RedisCache;

    beforeEach(() => {
      mockRedis = {
        setex: vi.fn(),
        get: vi.fn(),
        del: vi.fn()
      };
      cache = new RedisCache(mockRedis);
    });

    it('should handle Redis connection errors gracefully', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis connection failed'));
      mockRedis.del.mockResolvedValue(1);
      
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const result = await cache.get('test_key');
      
      expect(result).toBeNull();
      expect(consoleError).toHaveBeenCalled();
      expect(mockRedis.del).toHaveBeenCalled();
      
      consoleError.mockRestore();
    });

    it('should handle corrupted data from the problem statement', async () => {
      mockRedis.get.mockResolvedValue('[object Object]');
      mockRedis.del.mockResolvedValue(1);
      
      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const result = await cache.get('corrupted_key');
      
      expect(result).toBeNull();
      expect(mockRedis.del).toHaveBeenCalledWith('events_corrupted_key');
      expect(consoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('Deleting corrupted cache entry')
      );
      
      consoleWarn.mockRestore();
    });
  });
});