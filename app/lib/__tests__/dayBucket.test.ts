import { describe, it, expect, beforeEach } from 'vitest';
import { generateEventId, normalizeForEventId } from '../eventId';
import { EventData, DayBucket } from '../types';

describe('Event ID Generation', () => {
  describe('normalizeForEventId', () => {
    it('should normalize strings consistently', () => {
      expect(normalizeForEventId('Hello World')).toBe('hello world');
      expect(normalizeForEventId('HELLO WORLD')).toBe('hello world');
      expect(normalizeForEventId('  Hello   World  ')).toBe('hello world');
    });

    it('should strip punctuation', () => {
      expect(normalizeForEventId('Hello, World!')).toBe('hello world');
      expect(normalizeForEventId('Rock\'n\'Roll')).toBe('rock n roll');
      expect(normalizeForEventId('Test-Event')).toBe('test event');
    });

    it('should handle unicode normalization', () => {
      // NFKD decomposes characters, then punctuation is removed
      const result1 = normalizeForEventId('Café');
      const result2 = normalizeForEventId('naïve');
      // After NFKD + strip punctuation, diacritics are removed
      expect(result1).toMatch(/cafe/i);
      expect(result2).toMatch(/nai\s*ve/i);
    });

    it('should collapse multiple spaces', () => {
      expect(normalizeForEventId('a    b    c')).toBe('a b c');
    });
  });

  describe('generateEventId', () => {
    it('should generate consistent IDs for same event', () => {
      const event1: EventData = {
        title: 'Concert',
        category: 'Music',
        date: '2025-01-20',
        time: '19:00',
        venue: 'Arena',
        price: '20€',
        website: 'example.com'
      };

      const event2: EventData = {
        title: 'Concert',
        category: 'Music',
        date: '2025-01-20',
        time: '20:00', // different time
        venue: 'Arena',
        price: '25€', // different price
        website: 'different.com'
      };

      expect(generateEventId(event1)).toBe(generateEventId(event2));
    });

    it('should generate different IDs for different events', () => {
      const event1: EventData = {
        title: 'Concert A',
        category: 'Music',
        date: '2025-01-20',
        time: '19:00',
        venue: 'Arena',
        price: '20€',
        website: 'example.com'
      };

      const event2: EventData = {
        title: 'Concert B',
        category: 'Music',
        date: '2025-01-20',
        time: '19:00',
        venue: 'Arena',
        price: '20€',
        website: 'example.com'
      };

      expect(generateEventId(event1)).not.toBe(generateEventId(event2));
    });

    it('should normalize title and venue in ID', () => {
      const event1: EventData = {
        title: 'Rock Concert!',
        category: 'Music',
        date: '2025-01-20',
        time: '19:00',
        venue: 'The Arena',
        price: '20€',
        website: 'example.com'
      };

      const event2: EventData = {
        title: 'rock concert',
        category: 'Music',
        date: '2025-01-20',
        time: '19:00',
        venue: 'the arena',
        price: '20€',
        website: 'example.com'
      };

      expect(generateEventId(event1)).toBe(generateEventId(event2));
    });

    it('should use first 10 chars of date', () => {
      const event1: EventData = {
        title: 'Concert',
        category: 'Music',
        date: '2025-01-20T19:00:00',
        time: '19:00',
        venue: 'Arena',
        price: '20€',
        website: 'example.com'
      };

      const event2: EventData = {
        title: 'Concert',
        category: 'Music',
        date: '2025-01-20',
        time: '19:00',
        venue: 'Arena',
        price: '20€',
        website: 'example.com'
      };

      expect(generateEventId(event1)).toBe(generateEventId(event2));
    });
  });
});

describe('DayBucket Structure', () => {
  it('should have correct structure', () => {
    const bucket: DayBucket = {
      eventsById: {
        'event1': {
          title: 'Test',
          category: 'Music',
          date: '2025-01-20',
          time: '19:00',
          venue: 'Arena',
          price: '20€',
          website: 'example.com'
        }
      },
      index: {
        'Music': ['event1']
      },
      updatedAt: '2025-01-20T12:00:00Z'
    };

    expect(bucket.eventsById).toBeDefined();
    expect(bucket.index).toBeDefined();
    expect(bucket.updatedAt).toBeDefined();
  });

  it('should support multiple events in different categories', () => {
    const bucket: DayBucket = {
      eventsById: {
        'event1': {
          title: 'Concert',
          category: 'Music',
          date: '2025-01-20',
          time: '19:00',
          venue: 'Arena',
          price: '20€',
          website: 'example.com'
        },
        'event2': {
          title: 'Art Show',
          category: 'Art',
          date: '2025-01-20',
          time: '14:00',
          venue: 'Gallery',
          price: 'Free',
          website: 'gallery.com'
        }
      },
      index: {
        'Music': ['event1'],
        'Art': ['event2']
      },
      updatedAt: '2025-01-20T12:00:00Z'
    };

    expect(Object.keys(bucket.eventsById)).toHaveLength(2);
    expect(Object.keys(bucket.index)).toHaveLength(2);
    expect(bucket.index['Music']).toEqual(['event1']);
    expect(bucket.index['Art']).toEqual(['event2']);
  });
});
