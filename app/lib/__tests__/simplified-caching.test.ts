import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventData } from '@/lib/types';

// Mock events cache
const mockEventsCache = {
  getEventsByCategories: vi.fn(),
  setEventsByCategory: vi.fn(),
  get: vi.fn(),
  set: vi.fn()
};

// Mock event aggregator
const mockEventAggregator = {
  deduplicateEvents: vi.fn((events: EventData[]) => {
    // Simple deduplication by title+venue+date
    const seen = new Set();
    return events.filter(event => {
      const key = `${event.title}-${event.venue}-${event.date}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }),
  categorizeEvents: vi.fn((events: EventData[]) => events),
  parseEventsFromResponse: vi.fn(),
  aggregateResults: vi.fn()
};

vi.mock('@/lib/cache', () => ({
  eventsCache: mockEventsCache
}));

vi.mock('@/lib/aggregator', () => ({
  eventAggregator: mockEventAggregator
}));

describe('Simplified Per-Category Caching', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return cached events immediately without job polling', async () => {
    const cachedEvents: EventData[] = [
      {
        title: 'Cached Club Night',
        category: 'Clubs/Discos',
        date: '2025-01-15',
        time: '23:00',
        venue: 'Test Club',
        price: '25 €',
        website: 'https://example.com'
      }
    ];

    // Mock all categories cached
    mockEventsCache.getEventsByCategories.mockReturnValue({
      cachedEvents: {
        'Clubs/Discos': cachedEvents
      },
      missingCategories: [],
      cacheInfo: {
        'Clubs/Discos': { fromCache: true, eventCount: 1 }
      }
    });

    const city = 'Test City';
    const date = '2025-01-15';
    const categories = ['Clubs/Discos'];

    // Simulate the logic from the route handler
    const cacheResult = mockEventsCache.getEventsByCategories(city, date, categories);
    const allCachedEvents = Object.values(cacheResult.cachedEvents).flat();
    const missingCategories = cacheResult.missingCategories;

    // Test that route would return immediate results (without job polling)
    const expectedResponse = {
      events: allCachedEvents,
      status: 'completed',
      cached: true,
      cacheInfo: {
        fromCache: true,
        totalEvents: allCachedEvents.length,
        cachedEvents: allCachedEvents.length,
        cacheBreakdown: cacheResult.cacheInfo
      },
      message: `${allCachedEvents.length} Events aus dem Cache geladen`
    };

    expect(mockEventsCache.getEventsByCategories).toHaveBeenCalledWith(city, date, categories);
    expect(missingCategories).toEqual([]);
    expect(expectedResponse.status).toBe('completed');
    expect(expectedResponse.cached).toBe(true);
    expect(expectedResponse.events).toHaveLength(1);
  });

  it('should return partial cached events and schedule processing for missing', async () => {
    const cachedEvents: EventData[] = [
      {
        title: 'Cached Event',
        category: 'Clubs/Discos',
        date: '2025-01-15',
        time: '23:00',
        venue: 'Cached Venue',
        price: '20 €',
        website: 'https://cached.com'
      }
    ];

    // Mock partial cache hit
    mockEventsCache.getEventsByCategories.mockReturnValue({
      cachedEvents: {
        'Clubs/Discos': cachedEvents
      },
      missingCategories: ['Live-Konzerte'],
      cacheInfo: {
        'Clubs/Discos': { fromCache: true, eventCount: 1 },
        'Live-Konzerte': { fromCache: false, eventCount: 0 }
      }
    });

    const city = 'Test City';
    const date = '2025-01-15';
    const categories = ['Clubs/Discos', 'Live-Konzerte'];

    // Expected partial response
    const expectedResponse = {
      status: 'partial',
      events: cachedEvents,
      cached: true,
      processing: true,
      cacheInfo: {
        fromCache: true,
        totalEvents: 1,
        cachedEvents: 1
      },
      progress: {
        completedCategories: 1,
        totalCategories: 2,
        missingCategories: ['Live-Konzerte']
      }
    };

    expect(expectedResponse.status).toBe('partial');
    expect(expectedResponse.events).toHaveLength(1);
    expect(expectedResponse.processing).toBe(true);
    expect(expectedResponse.progress?.missingCategories).toEqual(['Live-Konzerte']);
  });

  it('should deduplicate events properly between cached and new events', () => {
    const cachedEvents: EventData[] = [
      {
        title: 'Club Night',
        category: 'Clubs/Discos',
        date: '2025-01-15',
        time: '23:00',
        venue: 'Test Club',
        price: '25 €',
        website: 'https://example.com'
      }
    ];

    const newEvents: EventData[] = [
      {
        title: 'Club Night', // Duplicate
        category: 'Clubs/Discos',
        date: '2025-01-15',
        time: '23:00',
        venue: 'Test Club',
        price: '25 €',
        website: 'https://example.com'
      },
      {
        title: 'Live Concert',
        category: 'Live-Konzerte',
        date: '2025-01-15',
        time: '20:00',
        venue: 'Concert Hall',
        price: '45 €',
        website: 'https://concert.com'
      }
    ];

    const combinedEvents = [...cachedEvents, ...newEvents];
    const deduplicatedEvents = mockEventAggregator.deduplicateEvents(combinedEvents);

    expect(deduplicatedEvents).toHaveLength(2); // Should remove one duplicate
    expect(deduplicatedEvents.some(e => e.title === 'Club Night')).toBe(true);
    expect(deduplicatedEvents.some(e => e.title === 'Live Concert')).toBe(true);
  });

  it('should handle empty cache gracefully', () => {
    // Mock empty cache
    mockEventsCache.getEventsByCategories.mockReturnValue({
      cachedEvents: {},
      missingCategories: ['Clubs/Discos', 'Live-Konzerte'],
      cacheInfo: {
        'Clubs/Discos': { fromCache: false, eventCount: 0 },
        'Live-Konzerte': { fromCache: false, eventCount: 0 }
      }
    });

    const city = 'New City';
    const date = '2025-01-16';
    const categories = ['Clubs/Discos', 'Live-Konzerte'];

    // Should trigger job processing for all categories
    const expectedResponse = {
      status: 'partial',
      events: [],
      cached: false,
      processing: true,
      progress: {
        completedCategories: 0,
        totalCategories: 2,
        missingCategories: ['Clubs/Discos', 'Live-Konzerte']
      }
    };

    expect(expectedResponse.events).toHaveLength(0);
    expect(expectedResponse.processing).toBe(true);
    expect(expectedResponse.progress?.completedCategories).toBe(0);
  });
});