/**
 * Test for reproducing the event cache flow bug.
 * Events are not returned despite EventCache and includeEvents=true.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RedisEventCache } from '../../../lib/new-backend/redis/eventCache';
import { EventData, CacheCheckResult, EventCacheMetadata } from '../../../lib/new-backend/types/events';

// Mock Redis client
const mockRedisClient = {
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
  exists: vi.fn(),
  executeOperation: vi.fn()
};

// Mock getRedisClient
vi.mock('../../../lib/new-backend/redis/redisClient', () => ({
  getRedisClient: () => mockRedisClient,
  REDIS_KEYS: {
    EVENTS: (city: string, date: string, category: string) => 
      `events:${city.toLowerCase()}:${date}:${category}`,
    EVENTS_META: (city: string, date: string, category: string) => 
      `events:${city.toLowerCase()}:${date}:${category}:meta`,
    EVENTS_LOCK: (city: string, date: string, category: string) => 
      `events:${city.toLowerCase()}:${date}:${category}:lock`
  }
}));

// Mock normalize category
vi.mock('../../../lib/new-backend/categories/normalize', () => ({
  normalizeCategory: (category: string) => category
}));

describe('Event Cache Flow Bug Reproduction', () => {
  let eventCache: RedisEventCache;
  
  const testCity = 'Berlin';
  const testDate = '2024-01-15';
  const testCategories = ['DJ Sets/Electronic', 'Clubs/Discos'];
  
  const mockEvents: EventData[] = [
    {
      title: 'Test Event 1',
      category: 'DJ Sets/Electronic',
      date: '2024-01-15',
      time: '20:00',
      venue: 'Test Venue',
      price: '10€',
      website: 'https://test.com'
    },
    {
      title: 'Test Event 2', 
      category: 'Clubs/Discos',
      date: '2024-01-15',
      time: '22:00',
      venue: 'Test Club',
      price: '15€',
      website: 'https://test2.com'
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    eventCache = new RedisEventCache();
    
    // Setup default mock behavior
    mockRedisClient.executeOperation.mockImplementation(async (operation) => {
      return await operation(mockRedisClient);
    });
  });

  it('should return cached events when they exist and are not expired', async () => {
    // Setup: Events exist in cache with valid metadata
    const now = new Date();
    const expireAt = new Date(now.getTime() + 3600 * 1000); // 1 hour from now
    
    const metadata: EventCacheMetadata = {
      cachedAt: now.toISOString(),
      ttlSeconds: 3600,
      expireAt: expireAt.toISOString(),
      eventCount: 1
    };

    // Mock Redis responses for DJ Sets/Electronic category
    mockRedisClient.get
      .mockImplementationOnce(() => Promise.resolve(JSON.stringify([mockEvents[0]]))) // events
      .mockImplementationOnce(() => Promise.resolve(JSON.stringify(metadata))); // metadata

    // Mock Redis responses for Clubs/Discos category  
    mockRedisClient.get
      .mockImplementationOnce(() => Promise.resolve(JSON.stringify([mockEvents[1]]))) // events
      .mockImplementationOnce(() => Promise.resolve(JSON.stringify(metadata))); // metadata

    const result = await eventCache.getEventsForCategories(testCity, testDate, testCategories);

    expect(result.cachedEvents).toHaveProperty('DJ Sets/Electronic');
    expect(result.cachedEvents).toHaveProperty('Clubs/Discos');
    expect(result.cachedEvents['DJ Sets/Electronic']).toEqual([mockEvents[0]]);
    expect(result.cachedEvents['Clubs/Discos']).toEqual([mockEvents[1]]);
    expect(result.missingCategories).toEqual([]);
    expect(Object.keys(result.cacheMetadata)).toEqual(testCategories);
  });

  it('should identify missing categories when cache is empty', async () => {
    // Setup: No events in cache
    mockRedisClient.get.mockResolvedValue(null);

    const result = await eventCache.getEventsForCategories(testCity, testDate, testCategories);

    expect(result.cachedEvents).toEqual({});
    expect(result.missingCategories).toEqual(testCategories);
    expect(result.cacheMetadata).toEqual({});
  });

  it('should identify expired events as missing and clean them up', async () => {
    // Setup: Events exist but are expired
    const now = new Date();
    const expiredAt = new Date(now.getTime() - 3600 * 1000); // 1 hour ago
    
    const expiredMetadata: EventCacheMetadata = {
      cachedAt: new Date(now.getTime() - 7200 * 1000).toISOString(), // 2 hours ago
      ttlSeconds: 3600,
      expireAt: expiredAt.toISOString(),
      eventCount: 1
    };

    // Mock Redis responses - events exist but metadata shows expired
    mockRedisClient.get
      .mockImplementationOnce(() => Promise.resolve(JSON.stringify([mockEvents[0]]))) // events
      .mockImplementationOnce(() => Promise.resolve(JSON.stringify(expiredMetadata))) // expired metadata
      .mockImplementationOnce(() => Promise.resolve(JSON.stringify([mockEvents[1]]))) // events  
      .mockImplementationOnce(() => Promise.resolve(JSON.stringify(expiredMetadata))); // expired metadata

    // Mock del for cleanup
    mockRedisClient.del.mockResolvedValue(1);

    const result = await eventCache.getEventsForCategories(testCity, testDate, testCategories);

    expect(result.cachedEvents).toEqual({});
    expect(result.missingCategories).toEqual(testCategories);
    expect(result.cacheMetadata).toEqual({});
    
    // Verify cleanup was called for both categories
    expect(mockRedisClient.del).toHaveBeenCalledTimes(4); // 2 categories × 2 keys each
  });

  it('should handle mixed scenario with some cached and some missing categories', async () => {
    // Setup: First category cached, second missing
    const now = new Date();
    const expireAt = new Date(now.getTime() + 3600 * 1000);
    
    const validMetadata: EventCacheMetadata = {
      cachedAt: now.toISOString(),
      ttlSeconds: 3600,
      expireAt: expireAt.toISOString(),
      eventCount: 1
    };

    // Mock Redis responses
    mockRedisClient.get
      .mockImplementationOnce(() => Promise.resolve(JSON.stringify([mockEvents[0]]))) // events for category 1
      .mockImplementationOnce(() => Promise.resolve(JSON.stringify(validMetadata))) // metadata for category 1
      .mockImplementationOnce(() => Promise.resolve(null)) // no events for category 2
      .mockImplementationOnce(() => Promise.resolve(null)); // no metadata for category 2

    const result = await eventCache.getEventsForCategories(testCity, testDate, testCategories);

    expect(result.cachedEvents).toHaveProperty('DJ Sets/Electronic');
    expect(result.cachedEvents['DJ Sets/Electronic']).toEqual([mockEvents[0]]);
    expect(result.missingCategories).toEqual(['Clubs/Discos']);
    expect(Object.keys(result.cacheMetadata)).toEqual(['DJ Sets/Electronic']);
  });
});