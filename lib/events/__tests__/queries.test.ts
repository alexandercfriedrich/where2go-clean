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

    expect(result.slug).toBe('test-event-2025-12-03-abc123');
    expect(result.title).toBe('Test Event');
    expect(result.venue).toBe('Test Venue');
    expect(result.category).toBe('Konzert');
  });

  it('should handle event without slug', () => {
    const dbEvent = {
      id: '456',
      title: 'Event Without Slug',
      start_date_time: '2025-12-03T20:00:00.000Z',
      custom_venue_name: 'Another Venue',
      category: 'Theater',
      city: 'Wien',
    };

    const result = convertToEventData(dbEvent);

    expect(result.slug).toBeUndefined();
    expect(result.title).toBe('Event Without Slug');
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

    expect(result.venue).toBe('Fallback Location');
    expect(result.slug).toBe('event-with-location-2025-12-03-xyz789');
  });
});
