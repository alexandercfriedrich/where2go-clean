import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { computeTTLSecondsForEvents } from '@/lib/cacheTtl';
import { EventData } from '@/lib/types';

describe('computeTTLSecondsForEvents', () => {
  const mockNow = new Date('2025-01-20T15:00:00Z');

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(mockNow);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return default TTL for empty events array', () => {
    expect(computeTTLSecondsForEvents([])).toBe(300); // 5 minutes
  });

  it('should return default TTL for null/undefined events', () => {
    expect(computeTTLSecondsForEvents(null as any)).toBe(300);
    expect(computeTTLSecondsForEvents(undefined as any)).toBe(300);
  });

  describe('with cacheUntil field', () => {
    it('should use explicit cacheUntil when provided', () => {
      const events: EventData[] = [
        {
          title: 'Test Event',
          category: 'Music',
          date: '2025-01-20',
          time: '19:00',
          venue: 'Test Venue',
          price: '$20',
          website: 'http://test.com',
          cacheUntil: '2025-01-20T16:00:00Z' // 1 hour from mock now
        }
      ];

      expect(computeTTLSecondsForEvents(events)).toBe(3600); // 1 hour
    });

    it('should handle invalid cacheUntil gracefully', () => {
      const events: EventData[] = [
        {
          title: 'Test Event',
          category: 'Music',
          date: '2025-01-20',
          time: '19:00',
          venue: 'Test Venue',
          price: '$20',
          website: 'http://test.com',
          cacheUntil: 'invalid-date'
        }
      ];

      // Should fall back to deriving from date/time
      expect(computeTTLSecondsForEvents(events)).toBeGreaterThan(0);
    });

    it('should use earliest cacheUntil when multiple events have it', () => {
      const events: EventData[] = [
        {
          title: 'Event 1',
          category: 'Music',
          date: '2025-01-20',
          time: '19:00',
          venue: 'Venue 1',
          price: '$20',
          website: 'http://test1.com',
          cacheUntil: '2025-01-20T18:00:00Z' // 3 hours from now
        },
        {
          title: 'Event 2',
          category: 'Theater',
          date: '2025-01-20',
          time: '20:00',
          venue: 'Venue 2',
          price: '$30',
          website: 'http://test2.com',
          cacheUntil: '2025-01-20T16:00:00Z' // 1 hour from now (earliest)
        }
      ];

      expect(computeTTLSecondsForEvents(events)).toBe(3600); // 1 hour
    });
  });

  describe('with date and time parsing', () => {
    it('should handle ISO date format with time', () => {
      const events: EventData[] = [
        {
          title: 'Test Event',
          category: 'Music',
          date: '2025-01-20',
          time: '19:00',
          venue: 'Test Venue',
          price: '$20',
          website: 'http://test.com'
        }
      ];

      // Event starts at 19:00, ends at 22:00 (19:00 + 3h), TTL should be 7 hours
      const expectedTTL = 7 * 3600; // 7 hours in seconds
      expect(computeTTLSecondsForEvents(events)).toBe(expectedTTL);
    });

    it('should handle DD.MM.YYYY date format', () => {
      const events: EventData[] = [
        {
          title: 'Test Event',
          category: 'Music',
          date: '20.01.2025',
          time: '19:00',
          venue: 'Test Venue',
          price: '$20',
          website: 'http://test.com'
        }
      ];

      const expectedTTL = 7 * 3600; // 7 hours
      expect(computeTTLSecondsForEvents(events)).toBe(expectedTTL);
    });

    it('should handle MM/DD/YYYY date format', () => {
      const events: EventData[] = [
        {
          title: 'Test Event',
          category: 'Music',
          date: '01/20/2025',
          time: '19:00',
          venue: 'Test Venue',
          price: '$20',
          website: 'http://test.com'
        }
      ];

      const expectedTTL = 7 * 3600; // 7 hours
      expect(computeTTLSecondsForEvents(events)).toBe(expectedTTL);
    });

    it('should handle date-only entries (no time)', () => {
      const events: EventData[] = [
        {
          title: 'All Day Event',
          category: 'Festival',
          date: '2025-01-20',
          time: '',
          venue: 'Test Venue',
          price: 'Free',
          website: 'http://test.com'
        }
      ];

      // Should set end time to 23:59 of the day
      const expectedEndTime = new Date('2025-01-20T23:59:00');
      const expectedTTL = Math.floor((expectedEndTime.getTime() - mockNow.getTime()) / 1000);
      expect(computeTTLSecondsForEvents(events)).toBe(expectedTTL);
    });

    it('should handle AM/PM time format', () => {
      const events: EventData[] = [
        {
          title: 'Morning Event',
          category: 'Workshop',
          date: '2025-01-20',
          time: '7:30 PM',
          venue: 'Test Venue',
          price: '$15',
          website: 'http://test.com'
        }
      ];

      // 7:30 PM + 3h = 10:30 PM, TTL should be 7.5 hours
      const expectedTTL = 7.5 * 3600;
      expect(computeTTLSecondsForEvents(events)).toBe(expectedTTL);
    });

    it('should handle time without minutes in AM/PM format', () => {
      const events: EventData[] = [
        {
          title: 'Evening Event',
          category: 'Concert',
          date: '2025-01-20',
          time: '8 PM',
          venue: 'Test Venue',
          price: '$25',
          website: 'http://test.com'
        }
      ];

      // 8 PM + 3h = 11 PM, TTL should be 8 hours
      const expectedTTL = 8 * 3600;
      expect(computeTTLSecondsForEvents(events)).toBe(expectedTTL);
    });

    it('should handle 12 AM and 12 PM correctly', () => {
      const midnightEvent: EventData[] = [
        {
          title: 'Midnight Event',
          category: 'Party',
          date: '2025-01-21', // Next day
          time: '12:00 AM',
          venue: 'Test Venue',
          price: '$30',
          website: 'http://test.com'
        }
      ];

      // 12:00 AM next day + 3h = 3:00 AM next day
      const expectedEndTime = new Date('2025-01-21T03:00:00');
      const expectedTTL = Math.floor((expectedEndTime.getTime() - mockNow.getTime()) / 1000);
      expect(computeTTLSecondsForEvents(midnightEvent)).toBe(expectedTTL);

      const noonEvent: EventData[] = [
        {
          title: 'Noon Event',
          category: 'Lunch',
          date: '2025-01-20',
          time: '12:00 PM',
          venue: 'Test Venue',
          price: '$20',
          website: 'http://test.com'
        }
      ];

      // 12:00 PM + 3h = 3:00 PM, TTL should be 0 (event already ended)
      expect(computeTTLSecondsForEvents(noonEvent)).toBe(60); // Minimum 1 minute
    });
  });

  describe('TTL bounds', () => {
    it('should enforce minimum TTL of 60 seconds', () => {
      const pastEvent: EventData[] = [
        {
          title: 'Past Event',
          category: 'Concert',
          date: '2025-01-20',
          time: '10:00', // Event already ended
          venue: 'Test Venue',
          price: '$25',
          website: 'http://test.com'
        }
      ];

      expect(computeTTLSecondsForEvents(pastEvent)).toBe(60);
    });

    it('should enforce maximum TTL of 24 hours', () => {
      const futureEvent: EventData[] = [
        {
          title: 'Future Event',
          category: 'Conference',
          date: '2025-01-25', // 5 days in future
          time: '10:00',
          venue: 'Test Venue',
          price: '$100',
          website: 'http://test.com'
        }
      ];

      expect(computeTTLSecondsForEvents(futureEvent)).toBe(24 * 60 * 60); // 24 hours max
    });
  });

  describe('multiple events', () => {
    it('should use earliest event end time', () => {
      const events: EventData[] = [
        {
          title: 'Later Event',
          category: 'Music',
          date: '2025-01-20',
          time: '20:00', // Ends at 23:00
          venue: 'Venue 1',
          price: '$20',
          website: 'http://test1.com'
        },
        {
          title: 'Earlier Event',
          category: 'Theater',
          date: '2025-01-20',
          time: '18:00', // Ends at 21:00 (earliest)
          venue: 'Venue 2',
          price: '$30',
          website: 'http://test2.com'
        }
      ];

      // Should use the earlier end time (21:00)
      const expectedTTL = 6 * 3600; // 6 hours
      expect(computeTTLSecondsForEvents(events)).toBe(expectedTTL);
    });

    it('should handle mix of events with and without cacheUntil', () => {
      const events: EventData[] = [
        {
          title: 'Event with cacheUntil',
          category: 'Music',
          date: '2025-01-20',
          time: '20:00',
          venue: 'Venue 1',
          price: '$20',
          website: 'http://test1.com',
          cacheUntil: '2025-01-20T16:30:00Z' // 1.5 hours from now (earliest)
        },
        {
          title: 'Event without cacheUntil',
          category: 'Theater',
          date: '2025-01-20',
          time: '19:00', // Ends at 22:00
          venue: 'Venue 2',
          price: '$30',
          website: 'http://test2.com'
        }
      ];

      expect(computeTTLSecondsForEvents(events)).toBe(1.5 * 3600); // 1.5 hours
    });
  });

  describe('invalid data handling', () => {
    it('should handle events with invalid dates', () => {
      const events: EventData[] = [
        {
          title: 'Invalid Date Event',
          category: 'Music',
          date: 'invalid-date',
          time: '19:00',
          venue: 'Test Venue',
          price: '$20',
          website: 'http://test.com'
        }
      ];

      expect(computeTTLSecondsForEvents(events)).toBe(300); // Fallback to 5 minutes
    });

    it('should handle events with empty dates', () => {
      const events: EventData[] = [
        {
          title: 'No Date Event',
          category: 'Music',
          date: '',
          time: '19:00',
          venue: 'Test Venue',
          price: '$20',
          website: 'http://test.com'
        }
      ];

      expect(computeTTLSecondsForEvents(events)).toBe(300); // Fallback to 5 minutes
    });

    it('should handle events with invalid times gracefully', () => {
      const events: EventData[] = [
        {
          title: 'Invalid Time Event',
          category: 'Music',
          date: '2025-01-20',
          time: '25:99', // Invalid time
          venue: 'Test Venue',
          price: '$20',
          website: 'http://test.com'
        }
      ];

      // Should fall back to date-only logic (23:59)
      const expectedEndTime = new Date('2025-01-20T23:59:00');
      const expectedTTL = Math.floor((expectedEndTime.getTime() - mockNow.getTime()) / 1000);
      expect(computeTTLSecondsForEvents(events)).toBe(expectedTTL);
    });
  });
});