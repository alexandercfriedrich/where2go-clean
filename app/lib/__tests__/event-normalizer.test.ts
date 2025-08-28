import { describe, it, expect } from 'vitest';
import { normalizeEvent, normalizeEvents } from '../event-normalizer';

describe('Event Normalizer', () => {
  describe('normalizeEvent', () => {
    it('should map common synonyms to expected field names', () => {
      const rawEvent = {
        name: 'Test Concert',
        location: 'Music Hall',
        url: 'example.com',
        ticket: 'tickets.example.com',
        date_str: '2025-01-20',
        start_time: '20:00',
        summary: 'A great concert',
        cost: '25€'
      };

      const normalized = normalizeEvent(rawEvent);

      expect(normalized.title).toBe('Test Concert');
      expect(normalized.venue).toBe('Music Hall');
      expect(normalized.website).toBe('https://example.com');
      expect(normalized.bookingLink).toBe('https://tickets.example.com');
      expect(normalized.date).toBe('2025-01-20');
      expect(normalized.time).toBe('20:00');
      expect(normalized.description).toBe('A great concert');
      expect(normalized.price).toBe('25€');
    });

    it('should handle already normalized events without changes', () => {
      const alreadyNormalized = {
        title: 'Theater Show',
        venue: 'City Theater',
        website: 'https://theater.com',
        bookingLink: 'https://tickets.theater.com',
        date: '2025-01-21',
        time: '19:30',
        price: '35€',
        category: 'Theater'
      };

      const normalized = normalizeEvent(alreadyNormalized);

      expect(normalized.title).toBe('Theater Show');
      expect(normalized.venue).toBe('City Theater');
      expect(normalized.website).toBe('https://theater.com');
      expect(normalized.bookingLink).toBe('https://tickets.theater.com');
      expect(normalized.category).toBe('Theater');
    });

    it('should prepend https:// to URLs missing protocol', () => {
      const rawEvent = {
        title: 'Test Event',
        venue: 'Test Venue',
        url: 'example.com',
        ticket_url: 'www.tickets.com',
        date: '2025-01-20',
        time: '20:00'
      };

      const normalized = normalizeEvent(rawEvent);

      expect(normalized.website).toBe('https://example.com');
      expect(normalized.bookingLink).toBe('https://www.tickets.com');
    });

    it('should preserve URLs that already have protocol', () => {
      const rawEvent = {
        title: 'Test Event',
        venue: 'Test Venue',
        website: 'https://example.com',
        bookingLink: 'http://tickets.com',
        date: '2025-01-20',
        time: '20:00'
      };

      const normalized = normalizeEvent(rawEvent);

      expect(normalized.website).toBe('https://example.com');
      expect(normalized.bookingLink).toBe('http://tickets.com');
    });

    it('should handle missing optional fields gracefully', () => {
      const rawEvent = {
        title: 'Minimal Event',
        venue: 'Some Venue',
        date: '2025-01-20',
        time: '20:00'
      };

      const normalized = normalizeEvent(rawEvent);

      expect(normalized.title).toBe('Minimal Event');
      expect(normalized.venue).toBe('Some Venue');
      expect(normalized.website).toBe('');
      expect(normalized.bookingLink).toBe('');
      expect(normalized.description).toBe('');
      expect(normalized.endTime).toBe('');
      expect(normalized.price).toBe('Preis auf Anfrage');
      expect(normalized.category).toBe('Event');
    });

    it('should trim whitespace from all fields', () => {
      const rawEvent = {
        title: '  Concert with Spaces  ',
        venue: '\n\tVenue Name\t  ',
        url: '  example.com  ',
        date: '  2025-01-20  ',
        time: '  20:00  '
      };

      const normalized = normalizeEvent(rawEvent);

      expect(normalized.title).toBe('Concert with Spaces');
      expect(normalized.venue).toBe('Venue Name');
      expect(normalized.website).toBe('https://example.com');
      expect(normalized.date).toBe('2025-01-20');
      expect(normalized.time).toBe('20:00');
    });

    it('should handle empty or null values', () => {
      const rawEvent = {
        title: 'Test Event',
        venue: 'Test Venue',
        url: '',
        ticket_url: null,
        description: undefined,
        date: '2025-01-20',
        time: '20:00'
      };

      const normalized = normalizeEvent(rawEvent);

      expect(normalized.title).toBe('Test Event');
      expect(normalized.website).toBe('');
      expect(normalized.bookingLink).toBe('');
      expect(normalized.description).toBe('');
    });

    it('should prioritize earlier field names in synonym list', () => {
      const rawEvent = {
        title: 'Primary Title',
        name: 'Secondary Title',
        venue: 'Primary Venue',
        location: 'Secondary Location',
        date: '2025-01-20',
        time: '20:00'
      };

      const normalized = normalizeEvent(rawEvent);

      expect(normalized.title).toBe('Primary Title');
      expect(normalized.venue).toBe('Primary Venue');
    });

    it('should handle all optional fields when present', () => {
      const rawEvent = {
        title: 'Full Event',
        venue: 'Event Venue',
        date: '2025-01-20',
        time: '19:00',
        endTime: '23:00',
        address: '123 Main St',
        ticketPrice: '30€',
        eventType: 'Concert',
        description: 'Amazing event',
        ageRestrictions: '18+',
        website: 'https://event.com',
        bookingLink: 'https://tickets.com'
      };

      const normalized = normalizeEvent(rawEvent);

      expect(normalized.endTime).toBe('23:00');
      expect(normalized.address).toBe('123 Main St');
      expect(normalized.ticketPrice).toBe('30€');
      expect(normalized.eventType).toBe('Concert');
      expect(normalized.description).toBe('Amazing event');
      expect(normalized.ageRestrictions).toBe('18+');
    });
  });

  describe('normalizeEvents', () => {
    it('should normalize an array of events', () => {
      const rawEvents = [
        {
          name: 'Event 1',
          location: 'Venue 1',
          date_str: '2025-01-20',
          start_time: '20:00'
        },
        {
          title: 'Event 2',
          venue: 'Venue 2',
          date: '2025-01-21',
          time: '19:00'
        }
      ];

      const normalized = normalizeEvents(rawEvents);

      expect(normalized).toHaveLength(2);
      expect(normalized[0].title).toBe('Event 1');
      expect(normalized[0].venue).toBe('Venue 1');
      expect(normalized[1].title).toBe('Event 2');
      expect(normalized[1].venue).toBe('Venue 2');
    });

    it('should return empty array for non-array input', () => {
      expect(normalizeEvents(null as any)).toEqual([]);
      expect(normalizeEvents(undefined as any)).toEqual([]);
      expect(normalizeEvents('not an array' as any)).toEqual([]);
      expect(normalizeEvents({} as any)).toEqual([]);
    });

    it('should handle empty array', () => {
      expect(normalizeEvents([])).toEqual([]);
    });
  });
});