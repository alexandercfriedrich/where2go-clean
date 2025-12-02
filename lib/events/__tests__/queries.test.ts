import { describe, it, expect } from 'vitest';
import { convertToEventData } from '../queries';

describe('convertToEventData', () => {
  it('should include slug from database event', () => {
    const dbEvent = {
      id: '123',
      title: 'Test Event',
      slug: 'test-event-2025-12-03-abc123',
      start_date_time: '2025-12-03T19:00:00.000Z',
      custom_venue_name: 'Test Venue',
      category: 'Konzert',
      city: 'Wien',
      price_info: '€25',
      description: 'Test description',
    };

    const result = convertToEventData(dbEvent);

    expect(result).not.toBeNull();
    expect(result!.slug).toBe('test-event-2025-12-03-abc123');
    expect(result!.title).toBe('Test Event');
    expect(result!.venue).toBe('Test Venue');
    expect(result!.category).toBe('Konzert');
  });

  it('should return null for event without slug', () => {
    const dbEvent = {
      id: '456',
      title: 'Event Without Slug',
      start_date_time: '2025-12-03T20:00:00.000Z',
      custom_venue_name: 'Another Venue',
      category: 'Theater',
      city: 'Wien',
    };

    const result = convertToEventData(dbEvent);

    // Events without slugs return null to be filtered out
    expect(result).toBeNull();
  });

  it('should use location when custom_venue_name is not available', () => {
    const dbEvent = {
      id: '789',
      title: 'Event With Location',
      start_date_time: '2025-12-03T21:00:00.000Z',
      location: 'Fallback Location',
      category: 'Party',
      city: 'Wien',
      slug: 'event-with-location-2025-12-03-xyz789',
    };

    const result = convertToEventData(dbEvent);

    expect(result).not.toBeNull();
    expect(result!.venue).toBe('Fallback Location');
    expect(result!.slug).toBe('event-with-location-2025-12-03-xyz789');
  });

  describe('date and time parsing', () => {
    it('should extract date and time from ISO string without timezone conversion', () => {
      const dbEvent = {
        title: 'Midnight Event',
        start_date_time: '2025-12-03T00:00:00.000Z',
        category: 'Event',
        city: 'Wien',
        slug: 'midnight-event-2025-12-03-abc123',
      };

      const result = convertToEventData(dbEvent);

      expect(result).not.toBeNull();
      // Should extract date directly from ISO string, not convert to local timezone
      expect(result!.date).toBe('2025-12-03');
      expect(result!.time).toBe('00:00');
    });

    it('should handle events at 00:00:01 (all-day marker)', () => {
      const dbEvent = {
        title: 'All Day Event',
        start_date_time: '2025-12-03T00:00:01.000Z',
        category: 'Event',
        city: 'Wien',
        slug: 'all-day-event-2025-12-03-def456',
      };

      const result = convertToEventData(dbEvent);

      expect(result).not.toBeNull();
      expect(result!.date).toBe('2025-12-03');
      expect(result!.time).toBe('00:00'); // Regex extracts only HH:MM, discarding seconds (00:00:01 → 00:00)
    });

    it('should extract correct date for evening events', () => {
      const dbEvent = {
        title: 'Evening Event',
        start_date_time: '2025-12-03T19:30:00.000Z',
        category: 'Event',
        city: 'Wien',
        slug: 'evening-event-2025-12-03-ghi789',
      };

      const result = convertToEventData(dbEvent);

      expect(result).not.toBeNull();
      expect(result!.date).toBe('2025-12-03');
      expect(result!.time).toBe('19:30');
    });

    it('should handle events close to midnight', () => {
      const dbEvent = {
        title: 'Late Night Event',
        start_date_time: '2025-12-03T23:59:00.000Z',
        category: 'Event',
        city: 'Wien',
        slug: 'late-night-event-2025-12-03-jkl012',
      };

      const result = convertToEventData(dbEvent);

      expect(result).not.toBeNull();
      expect(result!.date).toBe('2025-12-03');
      expect(result!.time).toBe('23:59');
    });

    it('should handle missing start_date_time but with valid slug', () => {
      const dbEvent = {
        title: 'Event Without Time',
        category: 'Event',
        city: 'Wien',
        slug: 'event-without-time-2025-12-03-mno345',
      };

      const result = convertToEventData(dbEvent);

      expect(result).not.toBeNull();
      expect(result!.date).toBe('');
      expect(result!.time).toBe('00:00');
    });
  });
});
