import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  normalizeRedisKey, 
  safeJSONStringify, 
  safeJSONParse, 
  RedisJSON,
  setRedisJSON,
  getRedisJSON 
} from '../redis-json';

describe('Redis JSON Utilities', () => {
  describe('normalizeRedisKey', () => {
    it('should normalize keys with problematic characters', () => {
      expect(normalizeRedisKey('wien_2025-09-28_Comedy/Kabarett')).toBe('wien_2025-09-28_comedy_kabarett');
      expect(normalizeRedisKey('Wien_2025-09-28_Kunst/Design')).toBe('wien_2025-09-28_kunst_design');
      expect(normalizeRedisKey('berlin_2025-01-01_DJ Sets/Electronic')).toBe('berlin_2025-01-01_dj_sets_electronic');
    });

    it('should handle multiple slashes and colons', () => {
      expect(normalizeRedisKey('city/date//category:subcategory')).toBe('city_date_category_subcategory');
      expect(normalizeRedisKey('path\\with\\backslashes')).toBe('path_with_backslashes');
    });

    it('should remove leading/trailing underscores', () => {
      expect(normalizeRedisKey('_key_')).toBe('key');
      expect(normalizeRedisKey('___multiple___underscores___')).toBe('multiple_underscores');
    });

    it('should handle empty and null keys', () => {
      expect(normalizeRedisKey('')).toBe('');
      expect(normalizeRedisKey(null as any)).toBe('');
      expect(normalizeRedisKey(undefined as any)).toBe('');
    });
  });

  describe('safeJSONStringify', () => {
    it('should stringify simple objects', () => {
      const obj = { name: 'test', value: 123 };
      const result = safeJSONStringify(obj);
      expect(result).toBe('{"name":"test","value":123}');
    });

    it('should handle Date objects', () => {
      const date = new Date('2025-01-01T12:00:00.000Z');
      const result = safeJSONStringify(date);
      expect(result).toBe('"2025-01-01T12:00:00.000Z"');
    });

    it('should handle objects with Date properties', () => {
      const obj = {
        title: 'Event',
        createdAt: new Date('2025-01-01T12:00:00.000Z'),
        count: 42
      };
      const result = safeJSONStringify(obj);
      const parsed = JSON.parse(result);
      expect(parsed.title).toBe('Event');
      expect(parsed.createdAt).toBe('2025-01-01T12:00:00.000Z');
      expect(parsed.count).toBe(42);
    });

    it('should handle null and undefined', () => {
      expect(safeJSONStringify(null)).toBe('null');
      expect(safeJSONStringify(undefined)).toBe('null');
    });

    it('should throw on circular references', () => {
      const circular: any = { name: 'test' };
      circular.self = circular;
      expect(() => safeJSONStringify(circular)).toThrow();
    });
  });

  describe('safeJSONParse', () => {
    it('should parse valid JSON strings', () => {
      const jsonStr = '{"name":"test","value":123}';
      const result = safeJSONParse(jsonStr);
      expect(result).toEqual({ name: 'test', value: 123 });
    });

    it('should handle objects passed directly', () => {
      const obj = { name: 'test', value: 123 };
      const result = safeJSONParse(obj);
      expect(result).toEqual(obj);
    });

    it('should detect corrupted "[object Object]" patterns', () => {
      expect(safeJSONParse('[object Object]')).toBeNull();
      expect(safeJSONParse('[object Object] some text')).toBeNull();
    });

    it('should handle null and undefined', () => {
      expect(safeJSONParse(null)).toBeNull();
      expect(safeJSONParse(undefined)).toBeNull();
    });

    it('should handle empty strings', () => {
      expect(safeJSONParse('')).toBeNull();
      expect(safeJSONParse('   ')).toBeNull();
    });

    it('should handle invalid JSON gracefully', () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      expect(safeJSONParse('invalid json {')).toBeNull();
      expect(consoleError).toHaveBeenCalled();
      consoleError.mockRestore();
    });
  });

  describe('RedisJSON class', () => {
    let mockRedis: any;
    let redisJSON: RedisJSON;

    beforeEach(() => {
      mockRedis = {
        setex: vi.fn(),
        set: vi.fn(),
        get: vi.fn(),
        del: vi.fn(),
        exists: vi.fn()
      };
      redisJSON = new RedisJSON(mockRedis);
    });

    describe('setJSON', () => {
      it('should set JSON with TTL', async () => {
        const data = { events: [{ title: 'Test Event' }] };
        mockRedis.setex.mockResolvedValue('OK');

        await redisJSON.setJSON('wien_2025-09-28_Comedy/Kabarett', data, 300);

        expect(mockRedis.setex).toHaveBeenCalledWith(
          'wien_2025-09-28_comedy_kabarett',
          300,
          JSON.stringify(data)
        );
      });

      it('should set JSON without TTL', async () => {
        const data = { events: [] };
        mockRedis.set.mockResolvedValue('OK');

        await redisJSON.setJSON('test_key', data);

        expect(mockRedis.set).toHaveBeenCalledWith(
          'test_key',
          JSON.stringify(data)
        );
      });
    });

    describe('getJSON', () => {
      it('should get and parse valid JSON', async () => {
        const data = { events: [{ title: 'Test Event' }] };
        mockRedis.get.mockResolvedValue(JSON.stringify(data));

        const result = await redisJSON.getJSON('wien_2025-09-28_Comedy/Kabarett');

        expect(mockRedis.get).toHaveBeenCalledWith('wien_2025-09-28_comedy_kabarett');
        expect(result).toEqual(data);
      });

      it('should delete corrupted entries and return null', async () => {
        mockRedis.get.mockResolvedValue('[object Object]');
        mockRedis.del.mockResolvedValue(1);
        const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

        const result = await redisJSON.getJSON('corrupted_key');

        expect(result).toBeNull();
        expect(mockRedis.del).toHaveBeenCalledWith('corrupted_key');
        expect(consoleWarn).toHaveBeenCalled();
        consoleWarn.mockRestore();
      });

      it('should return null for non-existent keys', async () => {
        mockRedis.get.mockResolvedValue(null);

        const result = await redisJSON.getJSON('missing_key');

        expect(result).toBeNull();
      });
    });

    describe('deleteJSON', () => {
      it('should delete existing key', async () => {
        mockRedis.del.mockResolvedValue(1);

        const result = await redisJSON.deleteJSON('test_key');

        expect(result).toBe(true);
        expect(mockRedis.del).toHaveBeenCalledWith('test_key');
      });

      it('should return false for non-existent key', async () => {
        mockRedis.del.mockResolvedValue(0);

        const result = await redisJSON.deleteJSON('missing_key');

        expect(result).toBe(false);
      });
    });

    describe('hasJSON', () => {
      it('should return true for existing key', async () => {
        mockRedis.exists.mockResolvedValue(1);

        const result = await redisJSON.hasJSON('existing_key');

        expect(result).toBe(true);
      });

      it('should return false for non-existent key', async () => {
        mockRedis.exists.mockResolvedValue(0);

        const result = await redisJSON.hasJSON('missing_key');

        expect(result).toBe(false);
      });
    });
  });

  describe('Standalone utility functions', () => {
    let mockRedis: any;

    beforeEach(() => {
      mockRedis = {
        setex: vi.fn(),
        get: vi.fn()
      };
    });

    it('should use standalone setRedisJSON', async () => {
      const data = { test: 'value' };
      mockRedis.setex.mockResolvedValue('OK');

      await setRedisJSON(mockRedis, 'test_key', data, 300);

      expect(mockRedis.setex).toHaveBeenCalledWith('test_key', 300, JSON.stringify(data));
    });

    it('should use standalone getRedisJSON', async () => {
      const data = { test: 'value' };
      mockRedis.get.mockResolvedValue(JSON.stringify(data));

      const result = await getRedisJSON(mockRedis, 'test_key');

      expect(result).toEqual(data);
    });
  });

  describe('Round-trip serialization', () => {
    it('should handle events data correctly', () => {
      const eventsData = [
        {
          title: 'Comedy Show',
          category: 'Comedy/Kabarett',
          date: '2025-09-28',
          time: '20:00',
          venue: 'Vienna Comedy Club',
          price: '€25',
          website: 'https://example.com',
          createdAt: new Date('2025-01-01T12:00:00.000Z')
        }
      ];

      const serialized = safeJSONStringify(eventsData);
      const parsed = safeJSONParse(serialized);

      expect(parsed).toEqual([
        {
          title: 'Comedy Show',
          category: 'Comedy/Kabarett',
          date: '2025-09-28',
          time: '20:00',
          venue: 'Vienna Comedy Club',
          price: '€25',
          website: 'https://example.com',
          createdAt: '2025-01-01T12:00:00.000Z'
        }
      ]);
    });

    it('should handle complex nested objects', () => {
      const complexData = {
        cityData: {
          name: 'Vienna',
          events: [
            { title: 'Event 1', date: new Date('2025-01-01') },
            { title: 'Event 2', date: new Date('2025-01-02') }
          ]
        },
        metadata: {
          cached: true,
          timestamp: new Date('2025-01-01T10:00:00.000Z')
        }
      };

      const serialized = safeJSONStringify(complexData);
      const parsed = safeJSONParse(serialized);

      expect(parsed.cityData.name).toBe('Vienna');
      expect(parsed.cityData.events).toHaveLength(2);
      expect(parsed.metadata.cached).toBe(true);
      expect(parsed.metadata.timestamp).toBe('2025-01-01T10:00:00.000Z');
    });
  });
});