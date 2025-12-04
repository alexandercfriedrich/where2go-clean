import { describe, it, expect } from 'vitest';
import { convertToEventData, calculateWeekendDatesUTC } from '../queries';

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

describe('calculateWeekendDatesUTC', () => {
  it('should calculate correct weekend dates for Thursday (returns next Friday)', () => {
    // Thursday, December 4, 2025 at 12:00 UTC
    const thursday = new Date(Date.UTC(2025, 11, 4, 12, 0, 0));
    
    const result = calculateWeekendDatesUTC(thursday);
    
    expect(result.daysUntilFriday).toBe(1);
    expect(result.fridayStr).toBe('2025-12-05');
    expect(result.saturdayStr).toBe('2025-12-06');
    expect(result.sundayStr).toBe('2025-12-07');
    expect(result.fridayUTC.toISOString()).toBe('2025-12-05T00:00:00.000Z');
    expect(result.mondayUTC.toISOString()).toBe('2025-12-08T00:00:00.000Z');
  });

  it('should calculate correct weekend dates for Friday (returns this Friday)', () => {
    // Friday, December 5, 2025 at 10:00 UTC
    const friday = new Date(Date.UTC(2025, 11, 5, 10, 0, 0));
    
    const result = calculateWeekendDatesUTC(friday);
    
    expect(result.daysUntilFriday).toBe(0);
    expect(result.fridayStr).toBe('2025-12-05');
    expect(result.saturdayStr).toBe('2025-12-06');
    expect(result.sundayStr).toBe('2025-12-07');
  });

  it('should calculate correct weekend dates for Saturday (returns last Friday)', () => {
    // Saturday, December 6, 2025 at 14:00 UTC
    const saturday = new Date(Date.UTC(2025, 11, 6, 14, 0, 0));
    
    const result = calculateWeekendDatesUTC(saturday);
    
    expect(result.daysUntilFriday).toBe(-1);
    expect(result.fridayStr).toBe('2025-12-05');
    expect(result.saturdayStr).toBe('2025-12-06');
    expect(result.sundayStr).toBe('2025-12-07');
  });

  it('should calculate correct weekend dates for Sunday (returns last Friday)', () => {
    // Sunday, December 7, 2025 at 18:00 UTC
    const sunday = new Date(Date.UTC(2025, 11, 7, 18, 0, 0));
    
    const result = calculateWeekendDatesUTC(sunday);
    
    expect(result.daysUntilFriday).toBe(-2);
    expect(result.fridayStr).toBe('2025-12-05');
    expect(result.saturdayStr).toBe('2025-12-06');
    expect(result.sundayStr).toBe('2025-12-07');
  });

  it('should calculate correct weekend dates for Monday (returns next Friday)', () => {
    // Monday, December 8, 2025 at 09:00 UTC
    const monday = new Date(Date.UTC(2025, 11, 8, 9, 0, 0));
    
    const result = calculateWeekendDatesUTC(monday);
    
    expect(result.daysUntilFriday).toBe(4);
    expect(result.fridayStr).toBe('2025-12-12');
    expect(result.saturdayStr).toBe('2025-12-13');
    expect(result.sundayStr).toBe('2025-12-14');
  });

  it('should handle month boundary correctly', () => {
    // Wednesday, November 26, 2025 at 12:00 UTC
    const wednesday = new Date(Date.UTC(2025, 10, 26, 12, 0, 0));
    
    const result = calculateWeekendDatesUTC(wednesday);
    
    expect(result.daysUntilFriday).toBe(2);
    expect(result.fridayStr).toBe('2025-11-28');
    expect(result.saturdayStr).toBe('2025-11-29');
    expect(result.sundayStr).toBe('2025-11-30');
    // Monday is in December
    expect(result.mondayUTC.toISOString()).toBe('2025-12-01T00:00:00.000Z');
  });

  it('should handle year boundary correctly', () => {
    // Wednesday, December 31, 2025 at 12:00 UTC
    const newYearsEve = new Date(Date.UTC(2025, 11, 31, 12, 0, 0));
    
    const result = calculateWeekendDatesUTC(newYearsEve);
    
    // Wednesday -> Friday = 2 days
    expect(result.daysUntilFriday).toBe(2);
    expect(result.fridayStr).toBe('2026-01-02');
    expect(result.saturdayStr).toBe('2026-01-03');
    expect(result.sundayStr).toBe('2026-01-04');
  });

  it('should produce consistent results regardless of timezone offset simulation', () => {
    // Simulate what would happen if we used local time in UTC+1 timezone
    // On Thursday at 00:30 local (CET), it's still Wednesday 23:30 UTC
    // This test ensures we use UTC day consistently
    
    // Thursday, December 4, 2025 at 00:30 UTC (same calendar day in UTC)
    const earlyMorningUTC = new Date(Date.UTC(2025, 11, 4, 0, 30, 0));
    
    const result = calculateWeekendDatesUTC(earlyMorningUTC);
    
    // Should be Thursday UTC (dayOfWeek = 4), so daysUntilFriday = 1
    expect(result.daysUntilFriday).toBe(1);
    expect(result.fridayStr).toBe('2025-12-05');
  });
});
