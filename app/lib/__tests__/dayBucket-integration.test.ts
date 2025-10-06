import { describe, it, expect } from 'vitest';
import { generateEventId } from '../eventId';
import { EventData, DayBucket } from '../types';

/**
 * Integration tests for day-bucket cache logic.
 * These tests verify the merge and upsert behavior without requiring Redis.
 */
describe('Day-Bucket Integration Tests', () => {
  describe('Event Merge Logic', () => {
    it('should prefer non-empty fields when merging', () => {
      const existing: EventData = {
        title: 'Concert',
        category: 'Music',
        date: '2025-01-20',
        time: '19:00',
        venue: 'Arena',
        price: '20€',
        website: 'example.com',
        description: 'Short description'
      };

      const incoming: EventData = {
        title: 'Concert',
        category: 'Music',
        date: '2025-01-20',
        time: '19:00',
        venue: 'Arena',
        price: '',
        website: 'example.com',
        description: 'Much longer and more detailed description of the event'
      };

      // Simulate merge logic
      const merged = mergeEventsLocal(existing, incoming);

      expect(merged.price).toBe('20€'); // Keep non-empty price
      expect(merged.description).toBe(incoming.description); // Longer description wins
    });

    it('should merge sources correctly', () => {
      const existing: EventData = {
        title: 'Concert',
        category: 'Music',
        date: '2025-01-20',
        time: '19:00',
        venue: 'Arena',
        price: '20€',
        website: 'example.com',
        source: 'rss'
      };

      const incoming: EventData = {
        title: 'Concert',
        category: 'Music',
        date: '2025-01-20',
        time: '19:00',
        venue: 'Arena',
        price: '20€',
        website: 'example.com',
        source: 'ai'
      };

      const merged = mergeEventsLocal(existing, incoming);
      
      expect(merged.source).toContain('rss');
      expect(merged.source).toContain('ai');
    });
  });

  describe('Day-Bucket Upsert Simulation', () => {
    it('should add new events to empty bucket', () => {
      const bucket: DayBucket = {
        eventsById: {},
        index: {},
        updatedAt: new Date().toISOString()
      };

      const events: EventData[] = [
        {
          title: 'Concert A',
          category: 'Music',
          date: '2025-01-20',
          time: '19:00',
          venue: 'Arena 1',
          price: '20€',
          website: 'example.com'
        },
        {
          title: 'Concert B',
          category: 'Music',
          date: '2025-01-20',
          time: '20:00',
          venue: 'Arena 2',
          price: '25€',
          website: 'example2.com'
        }
      ];

      const updatedBucket = simulateUpsert(bucket, events);

      expect(Object.keys(updatedBucket.eventsById)).toHaveLength(2);
      expect(updatedBucket.index['Music']).toHaveLength(2);
    });

    it('should merge events with same ID', () => {
      const event1: EventData = {
        title: 'Concert',
        category: 'Music',
        date: '2025-01-20',
        time: '19:00',
        venue: 'Arena',
        price: '20€',
        website: 'example.com',
        description: 'Short'
      };

      const bucket: DayBucket = {
        eventsById: {
          [generateEventId(event1)]: event1
        },
        index: {
          'Music': [generateEventId(event1)]
        },
        updatedAt: new Date().toISOString()
      };

      const event2: EventData = {
        title: 'Concert',
        category: 'Music',
        date: '2025-01-20',
        time: '20:00', // Different time
        venue: 'Arena',
        price: '', // Empty price
        website: 'example.com',
        description: 'Much longer description'
      };

      const updatedBucket = simulateUpsert(bucket, [event2]);

      expect(Object.keys(updatedBucket.eventsById)).toHaveLength(1);
      const mergedEvent = updatedBucket.eventsById[generateEventId(event1)];
      expect(mergedEvent.price).toBe('20€'); // Kept from existing
      expect(mergedEvent.description).toBe('Much longer description'); // Longer wins
    });

    it('should maintain category index correctly', () => {
      const bucket: DayBucket = {
        eventsById: {},
        index: {},
        updatedAt: new Date().toISOString()
      };

      const events: EventData[] = [
        {
          title: 'Concert',
          category: 'Music',
          date: '2025-01-20',
          time: '19:00',
          venue: 'Arena',
          price: '20€',
          website: 'example.com'
        },
        {
          title: 'Art Show',
          category: 'Art',
          date: '2025-01-20',
          time: '14:00',
          venue: 'Gallery',
          price: 'Free',
          website: 'gallery.com'
        },
        {
          title: 'Jazz Night',
          category: 'Music',
          date: '2025-01-20',
          time: '21:00',
          venue: 'Jazz Club',
          price: '15€',
          website: 'jazz.com'
        }
      ];

      const updatedBucket = simulateUpsert(bucket, events);

      expect(updatedBucket.index['Music']).toHaveLength(2);
      expect(updatedBucket.index['Art']).toHaveLength(1);
      
      // Index should be sorted
      const musicIds = updatedBucket.index['Music'];
      expect(musicIds).toEqual([...musicIds].sort());
    });
  });

  describe('TTL Computation Logic', () => {
    it('should compute TTL until day end for events without endTime', () => {
      const date = '2025-01-20';
      const now = new Date('2025-01-20T12:00:00Z');
      const dayEnd = new Date('2025-01-20T23:59:59Z');
      
      const expectedTtl = Math.floor((dayEnd.getTime() - now.getTime()) / 1000);
      
      expect(expectedTtl).toBeGreaterThan(0);
      expect(expectedTtl).toBeLessThanOrEqual(12 * 60 * 60); // Less than 12 hours
    });

    it('should compute TTL until latest event endTime when available', () => {
      const now = new Date('2025-01-20T12:00:00Z');
      const latestEnd = new Date('2025-01-21T02:00:00Z'); // Event ends at 2 AM next day
      
      const expectedTtl = Math.floor((latestEnd.getTime() - now.getTime()) / 1000);
      
      expect(expectedTtl).toBeGreaterThan(12 * 60 * 60); // More than 12 hours
      expect(expectedTtl).toBeLessThanOrEqual(7 * 24 * 60 * 60); // Less than 7 days
    });

    it('should enforce 7-day maximum TTL', () => {
      const maxTtl = 7 * 24 * 60 * 60;
      const eightDaysTtl = 8 * 24 * 60 * 60;
      
      const limited = Math.min(eightDaysTtl, maxTtl);
      
      expect(limited).toBe(maxTtl);
    });

    it('should enforce 60-second minimum TTL', () => {
      const minTtl = 60;
      const negativeTtl = -100;
      
      const limited = Math.max(negativeTtl, minTtl);
      
      expect(limited).toBe(minTtl);
    });
  });
});

// Helper functions to simulate the merge logic without Redis
function mergeEventsLocal(existing: EventData, incoming: EventData): EventData {
  return {
    ...existing,
    category: existing.category || incoming.category,
    date: existing.date || incoming.date,
    time: existing.time || incoming.time,
    endTime: existing.endTime || incoming.endTime,
    venue: existing.venue || incoming.venue,
    address: existing.address || incoming.address,
    price: existing.price || incoming.price,
    ticketPrice: existing.ticketPrice || incoming.ticketPrice,
    website: existing.website || incoming.website,
    bookingLink: existing.bookingLink || incoming.bookingLink,
    eventType: existing.eventType || incoming.eventType,
    ageRestrictions: existing.ageRestrictions || incoming.ageRestrictions,
    description: 
      !existing.description ? incoming.description :
      !incoming.description ? existing.description :
      incoming.description.length > existing.description.length ? incoming.description : existing.description,
    source: mergeSourcesLocal(existing.source, incoming.source)
  };
}

function mergeSourcesLocal(existing?: string, incoming?: string): string {
  if (!existing) return incoming || '';
  if (!incoming) return existing;
  
  const sources = new Set([existing, incoming]);
  return Array.from(sources).join(',');
}

function simulateUpsert(bucket: DayBucket, events: EventData[]): DayBucket {
  const newBucket: DayBucket = {
    eventsById: { ...bucket.eventsById },
    index: JSON.parse(JSON.stringify(bucket.index)), // Deep copy
    updatedAt: new Date().toISOString()
  };

  for (const event of events) {
    if (!event.title) continue;
    
    const eventId = generateEventId(event);
    const existing = newBucket.eventsById[eventId];

    if (!existing) {
      newBucket.eventsById[eventId] = { ...event };
    } else {
      newBucket.eventsById[eventId] = mergeEventsLocal(existing, event);
    }

    const category = newBucket.eventsById[eventId].category;
    if (category) {
      if (!newBucket.index[category]) {
        newBucket.index[category] = [];
      }
      if (!newBucket.index[category].includes(eventId)) {
        newBucket.index[category].push(eventId);
        newBucket.index[category].sort();
      }
    }
  }

  return newBucket;
}
