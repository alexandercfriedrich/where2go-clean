import { describe, it, expect } from 'vitest';
import {
  levenshteinDistance,
  calculateStringSimilarity,
  areEventsDuplicates,
  deduplicateEvents
} from '../eventDeduplication';
import { EventData } from '../types';

describe('Event Deduplication Utilities', () => {
  describe('levenshteinDistance', () => {
    it('should return 0 for identical strings', () => {
      expect(levenshteinDistance('hello', 'hello')).toBe(0);
    });

    it('should return length for completely different strings', () => {
      expect(levenshteinDistance('abc', 'xyz')).toBe(3);
    });

    it('should calculate single character substitution', () => {
      expect(levenshteinDistance('kitten', 'sitten')).toBe(1);
    });

    it('should calculate single character insertion', () => {
      expect(levenshteinDistance('cat', 'cats')).toBe(1);
    });

    it('should calculate single character deletion', () => {
      expect(levenshteinDistance('cats', 'cat')).toBe(1);
    });

    it('should handle empty strings', () => {
      expect(levenshteinDistance('', 'hello')).toBe(5);
      expect(levenshteinDistance('hello', '')).toBe(5);
      expect(levenshteinDistance('', '')).toBe(0);
    });

    it('should calculate complex transformations', () => {
      // Saturday -> Sunday requires multiple edits
      expect(levenshteinDistance('Saturday', 'Sunday')).toBe(3);
    });
  });

  describe('calculateStringSimilarity', () => {
    it('should return 1.0 for identical strings', () => {
      expect(calculateStringSimilarity('hello', 'hello')).toBe(1.0);
    });

    it('should return 1.0 for two empty strings', () => {
      expect(calculateStringSimilarity('', '')).toBe(1.0);
    });

    it('should return 0 for completely different strings of same length', () => {
      expect(calculateStringSimilarity('abc', 'xyz')).toBe(0);
    });

    it('should calculate high similarity for minor differences', () => {
      const similarity = calculateStringSimilarity('Jazz Night at Blue Note', 'Jazz Night at Blue Notes');
      expect(similarity).toBeGreaterThan(0.95);
    });

    it('should calculate medium similarity for moderate differences', () => {
      const similarity = calculateStringSimilarity('Jazz Concert', 'Jazz Festival');
      // "Jazz Concert" vs "Jazz Festival" - only "Jazz" matches, so similarity is lower
      expect(similarity).toBeGreaterThan(0.3);
      expect(similarity).toBeLessThan(0.5);
    });

    it('should handle different length strings', () => {
      const similarity = calculateStringSimilarity('Cat', 'Category');
      expect(similarity).toBeGreaterThan(0);
      expect(similarity).toBeLessThan(0.5);
    });
  });

  describe('areEventsDuplicates', () => {
    const baseEvent: EventData = {
      title: 'Jazz Concert at Blue Note',
      city: 'Wien',
      date: '2025-11-20',
      time: '20:00',
      category: 'Live-Konzerte',
      venue: 'Blue Note',
      price: '€25',
      website: 'https://example.com'
    };

    it('should detect identical events as duplicates', () => {
      const event1 = { ...baseEvent };
      const event2 = { ...baseEvent };
      expect(areEventsDuplicates(event1, event2)).toBe(true);
    });

    it('should detect events with minor title differences as duplicates', () => {
      const event1 = { ...baseEvent, title: 'Jazz Concert at Blue Note' };
      const event2 = { ...baseEvent, title: 'Jazz Concert at Blue Notes' };
      expect(areEventsDuplicates(event1, event2)).toBe(true);
    });

    it('should NOT match events with different cities', () => {
      const event1 = { ...baseEvent, city: 'Wien' };
      const event2 = { ...baseEvent, city: 'Berlin' };
      expect(areEventsDuplicates(event1, event2)).toBe(false);
    });

    it('should match events with case-insensitive city names', () => {
      const event1 = { ...baseEvent, city: 'Wien' };
      const event2 = { ...baseEvent, city: 'wien' };
      expect(areEventsDuplicates(event1, event2)).toBe(true);
    });

    it('should NOT match events more than 1 hour apart', () => {
      const event1 = { ...baseEvent, time: '20:00' };
      const event2 = { ...baseEvent, time: '21:30' }; // 1.5 hours later
      expect(areEventsDuplicates(event1, event2)).toBe(false);
    });

    it('should match events within 1 hour window', () => {
      const event1 = { ...baseEvent, time: '20:00' };
      const event2 = { ...baseEvent, time: '20:45' }; // 45 minutes later
      expect(areEventsDuplicates(event1, event2)).toBe(true);
    });

    it('should match events exactly 1 hour apart (boundary)', () => {
      const event1 = { ...baseEvent, time: '20:00' };
      const event2 = { ...baseEvent, time: '19:00' }; // Exactly 1 hour before
      expect(areEventsDuplicates(event1, event2)).toBe(true);
    });

    it('should NOT match events with significantly different titles', () => {
      const event1 = { ...baseEvent, title: 'Jazz Concert' };
      const event2 = { ...baseEvent, title: 'Rock Festival' };
      expect(areEventsDuplicates(event1, event2)).toBe(false);
    });

    it('should match events with title similarity > 85%', () => {
      const event1 = { ...baseEvent, title: 'Electronic Music Night' };
      const event2 = { ...baseEvent, title: 'Electronic Music Nights' };
      const similarity = calculateStringSimilarity(
        event1.title.toLowerCase(),
        event2.title.toLowerCase()
      );
      expect(similarity).toBeGreaterThan(0.85);
      expect(areEventsDuplicates(event1, event2)).toBe(true);
    });

    it('should NOT match events on different dates', () => {
      const event1 = { ...baseEvent, date: '2025-11-20' };
      const event2 = { ...baseEvent, date: '2025-11-21' };
      expect(areEventsDuplicates(event1, event2)).toBe(false);
    });

    it('should handle events with missing time gracefully (fall back to date comparison)', () => {
      const event1 = { ...baseEvent, time: '' };
      const event2 = { ...baseEvent, time: '' };
      expect(areEventsDuplicates(event1, event2)).toBe(true);
    });

    it('should NOT match events on different dates even without time', () => {
      const event1 = { ...baseEvent, time: '', date: '2025-11-20' };
      const event2 = { ...baseEvent, time: '', date: '2025-11-21' };
      expect(areEventsDuplicates(event1, event2)).toBe(false);
    });
  });

  describe('deduplicateEvents', () => {
    const existingEvent1: EventData = {
      title: 'Jazz Night',
      city: 'Wien',
      date: '2025-11-20',
      time: '20:00',
      category: 'Live-Konzerte',
      venue: 'Blue Note',
      price: '€25',
      website: 'https://example.com'
    };

    const existingEvent2: EventData = {
      title: 'Rock Concert',
      city: 'Wien',
      date: '2025-11-20',
      time: '22:00',
      category: 'Live-Konzerte',
      venue: 'Arena',
      price: '€30',
      website: 'https://example.com'
    };

    it('should remove exact duplicates', () => {
      const newEvents = [{ ...existingEvent1 }];
      const existingEvents = [existingEvent1];
      
      const result = deduplicateEvents(newEvents, existingEvents);
      expect(result).toHaveLength(0);
    });

    it('should remove fuzzy duplicates (similar title, same time window)', () => {
      // Use a title that's actually 85%+ similar
      const newEvents = [{
        ...existingEvent1,
        title: 'Jazz Nights' // Very similar to 'Jazz Night' - just one character difference
      }];
      const existingEvents = [existingEvent1];
      
      const result = deduplicateEvents(newEvents, existingEvents);
      expect(result).toHaveLength(0);
    });

    it('should keep unique events', () => {
      const newEvent: EventData = {
        title: 'Classical Symphony',
        city: 'Wien',
        date: '2025-11-20',
        time: '19:00',
        category: 'Live-Konzerte',
        venue: 'Musikverein',
        price: '€40',
        website: 'https://example.com'
      };
      
      const newEvents = [newEvent];
      const existingEvents = [existingEvent1, existingEvent2];
      
      const result = deduplicateEvents(newEvents, existingEvents);
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Classical Symphony');
    });

    it('should handle multiple new events with some duplicates', () => {
      const newEvents = [
        { ...existingEvent1 }, // Duplicate
        {
          title: 'New Event',
          city: 'Wien',
          date: '2025-11-20',
          time: '18:00',
          category: 'Live-Konzerte',
          venue: 'New Venue',
          price: '€15',
          website: 'https://example.com'
        }, // Unique
        { ...existingEvent2, title: 'Rock Concerts' } // Fuzzy duplicate
      ];
      
      const existingEvents = [existingEvent1, existingEvent2];
      
      const result = deduplicateEvents(newEvents, existingEvents);
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('New Event');
    });

    it('should handle empty existing events list', () => {
      const newEvents = [existingEvent1, existingEvent2];
      const existingEvents: EventData[] = [];
      
      const result = deduplicateEvents(newEvents, existingEvents);
      expect(result).toHaveLength(2);
    });

    it('should handle empty new events list', () => {
      const newEvents: EventData[] = [];
      const existingEvents = [existingEvent1, existingEvent2];
      
      const result = deduplicateEvents(newEvents, existingEvents);
      expect(result).toHaveLength(0);
    });

    it('should keep events from different cities even with same title', () => {
      const newEvent: EventData = {
        ...existingEvent1,
        city: 'Berlin'
      };
      
      const newEvents = [newEvent];
      const existingEvents = [existingEvent1];
      
      const result = deduplicateEvents(newEvents, existingEvents);
      expect(result).toHaveLength(1);
    });
  });
});
