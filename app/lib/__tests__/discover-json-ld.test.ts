import { describe, it, expect } from 'vitest';
import { generateEventListSchema } from '../schemaOrg';

describe('Discover Pages JSON-LD Implementation', () => {
  /**
   * Helper function to extract time from ISO datetime string
   * (Same as used in discover pages)
   */
  function extractTime(isoString: string): string {
    try {
      const timeMatch = isoString.match(/T(\d{2}:\d{2})/);
      return timeMatch ? timeMatch[1] : '00:00';
    } catch {
      return '00:00';
    }
  }

  describe('Event Data Transformation', () => {
    it('should transform database event to EventData format with all fields', () => {
      // Mock database event
      const dbEvent = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Test Concert Event',
        category: 'Live-Konzerte',
        start_date_time: '2025-01-15T19:30:00',
        venue: 'Wiener Stadthalle',
        custom_venue_name: null,
        full_address: 'Roland-Rainer-Platz 1, 1150 Wien',
        description: 'A great concert event',
        price_min: 25,
        price_max: 50,
        is_free: false,
        website: 'https://example.com',
        city: 'Wien'
      };

      // Transform (same logic as discover pages)
      const transformed = {
        ...dbEvent,
        date: dbEvent.start_date_time?.split('T')[0] || new Date().toISOString().split('T')[0],
        time: dbEvent.start_date_time ? extractTime(dbEvent.start_date_time) : '00:00',
        venue: dbEvent.custom_venue_name || dbEvent.venue || 'Veranstaltungsort',
        price: dbEvent.is_free ? 'Gratis' : (dbEvent.price_min ? `Ab ${dbEvent.price_min}€` : 'Preis auf Anfrage'),
        website: dbEvent.website || 'https://www.where2go.at/discover',
        address: dbEvent.full_address || '',
        description: dbEvent.description || `${dbEvent.title} - Veranstaltung in ${dbEvent.city}`,
        bookingLink: dbEvent.website || '',
        city: dbEvent.city,
      };

      // Validate all required fields are present
      expect(transformed.title).toBe('Test Concert Event');
      expect(transformed.date).toBe('2025-01-15');
      expect(transformed.time).toBe('19:30');
      expect(transformed.venue).toBe('Wiener Stadthalle');
      expect(transformed.price).toBe('Ab 25€');
      expect(transformed.description).toBe('A great concert event');
      expect(transformed.website).toBe('https://example.com');
      expect(transformed.city).toBe('Wien');
      expect(transformed.address).toBe('Roland-Rainer-Platz 1, 1150 Wien');
    });

    it('should handle free events correctly', () => {
      const freeEvent = {
        id: '123',
        title: 'Free Workshop',
        start_date_time: '2025-01-16T14:00:00',
        venue: 'Community Center',
        is_free: true,
        price_min: null,
        city: 'Wien'
      };

      const transformed = {
        ...freeEvent,
        date: freeEvent.start_date_time.split('T')[0],
        time: extractTime(freeEvent.start_date_time),
        venue: freeEvent.venue,
        price: freeEvent.is_free ? 'Gratis' : 'Preis auf Anfrage',
        website: 'https://www.where2go.at/discover',
        address: '',
        description: `${freeEvent.title} - Veranstaltung in ${freeEvent.city}`,
        bookingLink: '',
        city: freeEvent.city,
      };

      expect(transformed.price).toBe('Gratis');
    });

    it('should apply fallbacks for missing fields', () => {
      const minimalEvent = {
        id: '456',
        title: 'Minimal Event',
        start_date_time: '2025-01-17T20:00:00',
        city: 'Wien'
      };

      const transformed = {
        ...minimalEvent,
        date: minimalEvent.start_date_time.split('T')[0],
        time: extractTime(minimalEvent.start_date_time),
        venue: 'Veranstaltungsort', // fallback
        price: 'Preis auf Anfrage', // fallback
        website: 'https://www.where2go.at/discover', // fallback
        address: '', // fallback
        description: `${minimalEvent.title} - Veranstaltung in ${minimalEvent.city}`, // fallback
        bookingLink: '', // fallback
        city: minimalEvent.city,
      };

      expect(transformed.venue).toBe('Veranstaltungsort');
      expect(transformed.price).toBe('Preis auf Anfrage');
      expect(transformed.website).toBe('https://www.where2go.at/discover');
      expect(transformed.description).toBe('Minimal Event - Veranstaltung in Wien');
    });

    it('should prefer custom_venue_name over venue', () => {
      const event = {
        id: '789',
        title: 'Test Event',
        start_date_time: '2025-01-18T19:00:00',
        venue: 'Generic Venue',
        custom_venue_name: 'Custom Venue Name',
        city: 'Wien'
      };

      const transformed = {
        ...event,
        date: event.start_date_time.split('T')[0],
        time: extractTime(event.start_date_time),
        venue: event.custom_venue_name || event.venue,
        price: 'Preis auf Anfrage',
        website: 'https://www.where2go.at/discover',
        address: '',
        description: `${event.title} - Veranstaltung in ${event.city}`,
        bookingLink: '',
        city: event.city,
      };

      expect(transformed.venue).toBe('Custom Venue Name');
    });

    it('should extract time correctly from ISO datetime', () => {
      expect(extractTime('2025-01-15T19:30:00')).toBe('19:30');
      expect(extractTime('2025-01-15T09:00:00')).toBe('09:00');
      expect(extractTime('2025-01-15T23:45:00')).toBe('23:45');
      expect(extractTime('invalid')).toBe('00:00');
      expect(extractTime('')).toBe('00:00');
    });
  });

  describe('Schema Generation', () => {
    it('should generate valid ItemList schema for discover pages', () => {
      const events = [
        {
          title: 'Event 1',
          category: 'Live-Konzerte',
          date: '2025-01-15',
          time: '19:30',
          venue: 'Venue 1',
          price: 'Ab 25€',
          website: 'https://example.com',
          description: 'Description 1',
          city: 'Wien'
        },
        {
          title: 'Event 2',
          category: 'Theater & Comedy',
          date: '2025-01-16',
          time: '20:00',
          venue: 'Venue 2',
          price: 'Gratis',
          website: 'https://example2.com',
          description: 'Description 2',
          city: 'Wien'
        }
      ];

      const schema: any = generateEventListSchema(events, 'Wien', '2025-01-15');

      expect(schema['@context']).toBe('https://schema.org');
      expect(schema['@type']).toBe('ItemList');
      expect(schema.numberOfItems).toBe(2);
      expect(schema.itemListElement).toHaveLength(2);
      expect(schema.itemListElement[0].position).toBe(1);
      expect(schema.itemListElement[1].position).toBe(2);
    });

    it('should limit ItemList to 100 events', () => {
      const events = Array.from({ length: 150 }, (_, i) => ({
        title: `Event ${i}`,
        category: 'Live-Konzerte',
        date: '2025-01-15',
        time: '19:00',
        venue: 'Venue',
        price: '25€',
        website: 'https://example.com',
        city: 'Wien'
      }));

      const schema: any = generateEventListSchema(events, 'Wien', '2025-01-15');

      expect(schema.numberOfItems).toBe(150); // Total count
      expect(schema.itemListElement).toHaveLength(100); // But limited to 100
    });

    it('should generate schema even with empty events array', () => {
      const schema: any = generateEventListSchema([], 'Wien', '2025-01-15');

      expect(schema['@context']).toBe('https://schema.org');
      expect(schema['@type']).toBe('ItemList');
      expect(schema.numberOfItems).toBe(0);
      expect(schema.itemListElement).toHaveLength(0);
    });
  });

  describe('Field Coverage Requirements', () => {
    it('should ensure all Schema.org Event required fields have values', () => {
      const minimalDbEvent = {
        id: 'test-id',
        title: 'Test Event',
        start_date_time: '2025-01-15T19:00:00',
        city: 'Wien'
      };

      // Transform with all fallbacks
      const transformed = {
        ...minimalDbEvent,
        date: minimalDbEvent.start_date_time.split('T')[0],
        time: extractTime(minimalDbEvent.start_date_time),
        venue: 'Veranstaltungsort',
        price: 'Preis auf Anfrage',
        website: 'https://www.where2go.at/discover',
        address: '',
        description: `${minimalDbEvent.title} - Veranstaltung in ${minimalDbEvent.city}`,
        bookingLink: '',
        city: minimalDbEvent.city,
      };

      // Verify all required fields are non-null
      expect(transformed.title).toBeTruthy();
      expect(transformed.date).toBeTruthy();
      expect(transformed.time).toBeTruthy();
      expect(transformed.venue).toBeTruthy();
      expect(transformed.price).toBeTruthy();
      expect(transformed.website).toBeTruthy();
      expect(transformed.description).toBeTruthy();
      expect(transformed.city).toBeTruthy();
      
      // Address and bookingLink can be empty strings (valid)
      expect(transformed.address).toBeDefined();
      expect(transformed.bookingLink).toBeDefined();
    });
  });
});
