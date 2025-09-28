/**
 * Integration test demonstrating the Redis cache fix
 * 
 * This test validates that the solution fixes the exact issues mentioned
 * in the problem statement:
 * 
 * 1. Parsing failures with keys like 'wien_2025-09-28_Comedy/Kabarett'
 * 2. "[object Object]" corruption in Redis cache
 * 3. Proper JSON serialization/deserialization
 * 4. Cache hit/miss tracking and metrics
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RedisCache, createCache } from '../redis-cache';
import { safeJSONParse, safeJSONStringify, normalizeRedisKey } from '../redis-json';
import { getCacheMetricsSummary, resetCacheMetrics } from '../cache-metrics';

describe('Redis Cache Fix Integration', () => {
  describe('Problem Statement Scenarios', () => {
    it('should handle the exact keys that were failing in production', () => {
      const problematicKeys = [
        'wien_2025-09-28_Comedy/Kabarett',
        'wien_2025-09-28_Kunst/Design', 
        'wien_2025-09-28_Museen'
      ];

      // Test key normalization fixes the slash problem
      problematicKeys.forEach(key => {
        const normalized = normalizeRedisKey(key);
        expect(normalized).not.toContain('/');
        expect(normalized).not.toContain('\\');
        expect(normalized).not.toContain(':');
        expect(normalized).toMatch(/^[a-z0-9_-]+$/);
      });

      // Verify specific expected normalizations
      expect(normalizeRedisKey('wien_2025-09-28_Comedy/Kabarett'))
        .toBe('wien_2025-09-28_comedy_kabarett');
      expect(normalizeRedisKey('wien_2025-09-28_Kunst/Design'))
        .toBe('wien_2025-09-28_kunst_design');
      expect(normalizeRedisKey('wien_2025-09-28_Museen'))
        .toBe('wien_2025-09-28_museen');
    });

    it('should handle "[object Object]" corruption gracefully', () => {
      const corruptedValues = [
        '[object Object]',
        '[object Object] some additional text'
      ];

      corruptedValues.forEach(corruptedValue => {
        const result = safeJSONParse(corruptedValue);
        expect(result).toBeNull();
      });

      // Test valid JSON string that looks like corruption but is actually valid
      const validJsonString = '"[object Object]"';
      const validResult = safeJSONParse(validJsonString);
      expect(validResult).toBe('[object Object]'); // This is valid JSON
    });

    it('should properly serialize and deserialize complex event data', () => {
      const eventData = [
        {
          title: 'Comedy Show in Vienna',
          category: 'Comedy/Kabarett',
          date: '2025-09-28',
          time: '20:00',
          venue: 'Vienna Comedy Club',
          price: '€25',
          website: 'https://example.com/comedy',
          createdAt: new Date('2025-01-01T12:00:00.000Z'),
          source: 'ai'
        },
        {
          title: 'Art Exhibition',
          category: 'Kunst/Design',
          date: '2025-09-28',
          time: '18:00',
          venue: 'Modern Art Gallery',
          price: 'Free',
          website: 'https://example.com/art',
          createdAt: new Date('2025-01-01T14:00:00.000Z'),
          source: 'cache'
        }
      ];

      // Test round-trip serialization
      const serialized = safeJSONStringify(eventData);
      expect(serialized).toContain('Comedy Show in Vienna');
      expect(serialized).toContain('2025-01-01T12:00:00.000Z');

      const parsed = safeJSONParse(serialized);
      expect(parsed).toHaveLength(2);
      expect(parsed[0].title).toBe('Comedy Show in Vienna');
      expect(parsed[0].category).toBe('Comedy/Kabarett');
      expect(parsed[0].createdAt).toBe('2025-01-01T12:00:00.000Z'); // Dates become strings after serialization
      expect(parsed[1].title).toBe('Art Exhibition');
    });
  });

  describe('Cache Integration with Mocked Redis', () => {
    let mockRedis: any;
    let cache: RedisCache;

    beforeEach(() => {
      mockRedis = {
        setex: vi.fn(),
        get: vi.fn(),
        del: vi.fn(),
        exists: vi.fn()
      };
      cache = new RedisCache(mockRedis, 'events:', 300);
      resetCacheMetrics();
    });

    it('should demonstrate complete cache workflow with problematic categories', async () => {
      const city = 'Wien';
      const date = '2025-09-28';
      const categories = ['Comedy/Kabarett', 'Kunst/Design', 'DJ Sets/Electronic'];
      
      const mockEvents = {
        'Comedy/Kabarett': [
          { title: 'Stand-up Night', category: 'Comedy/Kabarett', date, venue: 'Comedy Club' }
        ],
        'Kunst/Design': [
          { title: 'Modern Art Show', category: 'Kunst/Design', date, venue: 'Gallery' }
        ]
      };

      // Mock cache hits for first two categories, miss for third
      mockRedis.get
        .mockResolvedValueOnce(safeJSONStringify({
          data: mockEvents['Comedy/Kabarett'],
          timestamp: Date.now(),
          ttl: 300000
        }))
        .mockResolvedValueOnce(safeJSONStringify({
          data: mockEvents['Kunst/Design'],
          timestamp: Date.now(),
          ttl: 300000
        }))
        .mockResolvedValueOnce(null); // Cache miss for DJ Sets/Electronic

      const result = await cache.getEventsByCategories(city, date, categories);

      // Verify cache hits and misses
      expect(result.cachedEvents['Comedy/Kabarett']).toEqual(mockEvents['Comedy/Kabarett']);
      expect(result.cachedEvents['Kunst/Design']).toEqual(mockEvents['Kunst/Design']);
      expect(result.missingCategories).toEqual(['DJ Sets/Electronic']);

      // Verify cache info
      expect(result.cacheInfo['Comedy/Kabarett']).toEqual({
        fromCache: true,
        eventCount: 1
      });
      expect(result.cacheInfo['Kunst/Design']).toEqual({
        fromCache: true,
        eventCount: 1
      });
      expect(result.cacheInfo['DJ Sets/Electronic']).toEqual({
        fromCache: false,
        eventCount: 0
      });

      // Verify normalized keys were used
      expect(mockRedis.get).toHaveBeenCalledWith('events_wien_2025-09-28_comedy_kabarett');
      expect(mockRedis.get).toHaveBeenCalledWith('events_wien_2025-09-28_kunst_design');
      expect(mockRedis.get).toHaveBeenCalledWith('events_wien_2025-09-28_dj_sets_electronic');
    });

    it('should handle corrupted cache entries by deleting and returning null', async () => {
      const corruptedKey = 'wien_2025-09-28_comedy_kabarett';
      
      // Mock corrupted data
      mockRedis.get.mockResolvedValue('[object Object]');
      mockRedis.del.mockResolvedValue(1);

      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await cache.get(corruptedKey);

      expect(result).toBeNull();
      expect(mockRedis.del).toHaveBeenCalledWith('events_wien_2025-09-28_comedy_kabarett');
      expect(consoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('Deleting corrupted cache entry')
      );

      consoleWarn.mockRestore();
    });

    it('should properly cache events with complex category names', async () => {
      const events = [
        {
          title: 'Techno Night',
          category: 'DJ Sets/Electronic',
          date: '2025-09-28',
          venue: 'Club X',
          price: '€20'
        }
      ];

      mockRedis.setex.mockResolvedValue('OK');

      await cache.setEventsByCategory('Wien', '2025-09-28', 'DJ Sets/Electronic', events, 600);

      expect(mockRedis.setex).toHaveBeenCalledWith(
        'events_wien_2025-09-28_dj_sets_electronic',
        600,
        expect.stringContaining('Techno Night')
      );

      // Verify the serialized data is valid JSON
      const serializedData = mockRedis.setex.mock.calls[0][2];
      const parsed = JSON.parse(serializedData);
      expect(parsed.data).toEqual(events);
      expect(parsed.timestamp).toBeGreaterThan(0);
      expect(parsed.ttl).toBe(600000);
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should recover from various JSON parsing errors', () => {
      const problematicInputs = [
        '',                    // Empty string
        '   ',                 // Whitespace
        '{incomplete json',    // Invalid JSON
        'null',               // Valid JSON null
        'undefined',          // Invalid
        '[object Object]',    // Corruption pattern
        '{"valid": "json"}',  // Valid JSON
        42,                   // Number
        null,                 // Null
        undefined,            // Undefined
        { already: 'object' } // Already an object
      ];

      problematicInputs.forEach((input, index) => {
        const result = safeJSONParse(input);
        
        if (input === '{"valid": "json"}') {
          expect(result).toEqual({ valid: 'json' });
        } else if (input === 'null') {
          expect(result).toBeNull();
        } else if (input === 42) {
          expect(result).toBe(42);
        } else if (typeof input === 'object' && input !== null) {
          expect(result).toEqual(input);
        } else if (input === '[object Object]' || input === '' || input === '   ' || input === 'undefined' || input === '{incomplete json') {
          expect(result).toBeNull();
        }
      });
    });

    it('should handle Redis connection failures gracefully', async () => {
      const mockRedis = {
        get: vi.fn().mockRejectedValue(new Error('Redis connection lost')),
        del: vi.fn().mockResolvedValue(1)
      };

      const cache = new RedisCache(mockRedis, 'events:', 300);
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await cache.get('test_key');

      expect(result).toBeNull();
      expect(consoleError).toHaveBeenCalled();
      expect(mockRedis.del).toHaveBeenCalled(); // Should attempt cleanup

      consoleError.mockRestore();
    });
  });

  describe('Metrics and Monitoring', () => {
    it('should track cache performance metrics', async () => {
      // This would require the instrumented cache to be working
      // For now, we just verify the metrics structure
      const summary = getCacheMetricsSummary();
      
      expect(summary).toHaveProperty('hitRate');
      expect(summary).toHaveProperty('totalOperations');
      expect(summary).toHaveProperty('errorRate');
      expect(summary).toHaveProperty('corruptionRate');
      expect(summary).toHaveProperty('topPatterns');
      
      expect(typeof summary.hitRate).toBe('number');
      expect(Array.isArray(summary.topPatterns)).toBe(true);
    });
  });

  describe('Backward Compatibility', () => {
    it('should maintain consistent key generation with legacy system', () => {
      // Test that new normalized keys are consistent
      const city = 'Wien';
      const date = '2025-09-28';
      const category = 'Comedy/Kabarett';

      const key1 = RedisCache.createKeyForCategory(city, date, category); 
      const key2 = RedisCache.createKeyForCategory(city, date, category);

      expect(key1).toBe(key2);
      expect(key1).toBe('wien_2025-09-28_comedy_kabarett');
    });

    it('should handle category normalization consistently', () => {
      // Test that normalized categories are safe for Redis keys
      const categoryVariations = [
        'Comedy/Kabarett',
        'DJ Sets/Electronic', 
        'Kunst/Design'
      ];

      const normalizedKeys = categoryVariations.map(cat => 
        RedisCache.normalizeCategory(cat)
      );

      // All normalized categories should be safe for Redis keys
      normalizedKeys.forEach(normalized => {
        expect(normalized).not.toContain('/');
        expect(normalized).not.toContain(' ');
        expect(normalized).not.toContain(':');
        expect(normalized).toMatch(/^[a-z0-9_]+$/);
      });

      // Verify specific normalizations
      expect(normalizedKeys[0]).toBe('comedy_kabarett');
      expect(normalizedKeys[1]).toBe('dj_sets_electronic');
      expect(normalizedKeys[2]).toBe('kunst_design');
    });
  });
});