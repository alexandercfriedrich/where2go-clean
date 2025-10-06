import { describe, it, expect } from 'vitest';
import { generateEventId } from '../eventId';
import { EventData, DayBucket } from '../types';

/**
 * Example usage of day-bucket cache showing typical workflow
 */
describe('Day-Bucket Cache Usage Examples', () => {
  it('Example 1: Building a day-bucket from scratch', () => {
    // Start with empty bucket
    const bucket: DayBucket = {
      eventsById: {},
      index: {},
      updatedAt: new Date().toISOString()
    };

    // Add first batch of events (e.g., from RSS feed)
    const rssEvents: EventData[] = [
      {
        title: 'Techno Night',
        category: 'Music',
        date: '2025-01-20',
        time: '22:00',
        venue: 'Berghain',
        price: '15€',
        website: 'berghain.berlin',
        source: 'rss'
      },
      {
        title: 'Art Exhibition',
        category: 'Art',
        date: '2025-01-20',
        time: '10:00',
        venue: 'Museum',
        price: 'Free',
        website: 'museum.berlin',
        source: 'rss'
      }
    ];

    // Simulate upsert
    for (const event of rssEvents) {
      const id = generateEventId(event);
      bucket.eventsById[id] = event;
      
      const cat = event.category;
      if (!bucket.index[cat]) bucket.index[cat] = [];
      if (!bucket.index[cat].includes(id)) {
        bucket.index[cat].push(id);
      }
    }

    expect(Object.keys(bucket.eventsById)).toHaveLength(2);
    expect(bucket.index['Music']).toHaveLength(1);
    expect(bucket.index['Art']).toHaveLength(1);
  });

  it('Example 2: Enriching existing events with AI data', () => {
    // Existing bucket with basic data
    const existingEvent: EventData = {
      title: 'Jazz Night',
      category: 'Music',
      date: '2025-01-20',
      time: '20:00',
      venue: 'Blue Note',
      price: '25€',
      website: 'bluenote.com',
      source: 'rss'
    };

    const bucket: DayBucket = {
      eventsById: {
        [generateEventId(existingEvent)]: existingEvent
      },
      index: {
        'Music': [generateEventId(existingEvent)]
      },
      updatedAt: new Date().toISOString()
    };

    // New data from AI with more details
    const aiEvent: EventData = {
      title: 'Jazz Night',
      category: 'Music',
      date: '2025-01-20',
      time: '20:00',
      venue: 'Blue Note',
      price: '',
      website: 'bluenote.com',
      description: 'An evening of smooth jazz featuring local and international artists',
      address: 'Main St 123, Berlin',
      source: 'ai'
    };

    // Merge: prefer non-empty fields
    const id = generateEventId(aiEvent);
    const existing = bucket.eventsById[id];
    
    if (existing) {
      bucket.eventsById[id] = {
        ...existing,
        description: existing.description || aiEvent.description,
        address: existing.address || aiEvent.address,
        price: existing.price || aiEvent.price, // Keep existing price
        source: `${existing.source},${aiEvent.source}` // Union sources
      };
    }

    const merged = bucket.eventsById[id];
    expect(merged.price).toBe('25€'); // Kept from RSS
    expect(merged.description).toBe('An evening of smooth jazz featuring local and international artists'); // From AI
    expect(merged.address).toBe('Main St 123, Berlin'); // From AI
    expect(merged.source).toContain('rss');
    expect(merged.source).toContain('ai');
  });

  it('Example 3: Querying events by category', () => {
    const events: EventData[] = [
      {
        title: 'Concert A',
        category: 'Music',
        date: '2025-01-20',
        time: '19:00',
        venue: 'Venue 1',
        price: '20€',
        website: 'example.com'
      },
      {
        title: 'Concert B',
        category: 'Music',
        date: '2025-01-20',
        time: '21:00',
        venue: 'Venue 2',
        price: '25€',
        website: 'example2.com'
      },
      {
        title: 'Art Show',
        category: 'Art',
        date: '2025-01-20',
        time: '14:00',
        venue: 'Gallery',
        price: 'Free',
        website: 'gallery.com'
      }
    ];

    const bucket: DayBucket = {
      eventsById: {},
      index: {},
      updatedAt: new Date().toISOString()
    };

    for (const event of events) {
      const id = generateEventId(event);
      bucket.eventsById[id] = event;
      
      const cat = event.category;
      if (!bucket.index[cat]) bucket.index[cat] = [];
      if (!bucket.index[cat].includes(id)) {
        bucket.index[cat].push(id);
      }
    }

    // Query: Get all music events
    const musicIds = bucket.index['Music'] || [];
    const musicEvents = musicIds.map(id => bucket.eventsById[id]);
    
    expect(musicEvents).toHaveLength(2);
    expect(musicEvents.every(e => e.category === 'Music')).toBe(true);

    // Query: Get all events
    const allEvents = Object.values(bucket.eventsById);
    expect(allEvents).toHaveLength(3);
  });

  it('Example 4: Deduplication across sources', () => {
    // Same event from different sources
    const rssEvent: EventData = {
      title: 'Rock Concert!',
      category: 'Music',
      date: '2025-01-20',
      time: '20:00',
      venue: 'The Arena',
      price: '30€',
      website: 'arena.com',
      source: 'rss'
    };

    const aiEvent: EventData = {
      title: 'rock concert', // Different capitalization
      category: 'Music',
      date: '2025-01-20',
      time: '20:30', // Slightly different time
      venue: 'the arena', // Different capitalization
      price: '',
      website: 'arena.com',
      description: 'Featuring three amazing bands',
      source: 'ai'
    };

    // Both should generate same ID due to normalization
    const id1 = generateEventId(rssEvent);
    const id2 = generateEventId(aiEvent);
    
    expect(id1).toBe(id2); // Same event!

    // Merge into bucket
    const bucket: DayBucket = {
      eventsById: {},
      index: {},
      updatedAt: new Date().toISOString()
    };

    // Add RSS event first
    bucket.eventsById[id1] = rssEvent;
    bucket.index['Music'] = [id1];

    // Try to add AI event - will merge with existing
    const existing = bucket.eventsById[id2];
    bucket.eventsById[id2] = {
      ...existing,
      description: existing.description || aiEvent.description,
      price: existing.price || aiEvent.price,
      source: `${existing.source},${aiEvent.source}`
    };

    expect(Object.keys(bucket.eventsById)).toHaveLength(1); // Still just one event
    const merged = bucket.eventsById[id1];
    expect(merged.price).toBe('30€'); // From RSS
    expect(merged.description).toBe('Featuring three amazing bands'); // From AI
    expect(merged.source).toBe('rss,ai'); // Both sources
  });
});
