import { describe, it, expect } from 'vitest';
import { EventAggregator } from '../aggregator';

describe('JSON-First Event Parsing', () => {
  const aggregator = new EventAggregator();

  describe('JSON Array Parsing', () => {
    it('should parse valid JSON array with all fields', () => {
      const jsonResponse = `[
        {
          "title": "Jazz Night",
          "date": "2025-01-20",
          "time": "20:00",
          "endTime": "23:00",
          "venue": "Blue Note",
          "address": "Musterstraße 12, 10115 Berlin, Deutschland",
          "category": "Live-Konzerte",
          "eventType": "Jazz Concert",
          "price": "15€",
          "ticketPrice": "15€",
          "ageRestrictions": "18+",
          "description": "Eine Nacht voller Jazz",
          "website": "https://bluenote.com",
          "bookingLink": "https://tickets.bluenote.com"
        }
      ]`;

      const events = aggregator.parseEventsFromResponse(jsonResponse);
      
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        title: 'Jazz Night',
        date: '2025-01-20',
        time: '20:00',
        endTime: '23:00',
        venue: 'Blue Note',
        address: 'Musterstraße 12, 10115 Berlin, Deutschland',
        category: 'Live-Konzerte',
        eventType: 'Jazz Concert',
        price: '15€',
        ticketPrice: '15€',
        ageRestrictions: '18+',
        description: 'Eine Nacht voller Jazz',
        website: 'https://bluenote.com',
        bookingLink: 'https://tickets.bluenote.com'
      });
    });

    it('should handle empty JSON array', () => {
      const events = aggregator.parseEventsFromResponse('[]');
      expect(events).toHaveLength(0);
    });

    it('should handle empty response as empty array', () => {
      const events = aggregator.parseEventsFromResponse('');
      expect(events).toHaveLength(0);
    });

    it('should handle "no events found" message as empty array', () => {
      const responses = [
        'Keine passenden Events gefunden',
        'keine events gefunden',
        'No events found',
        'KEINE EVENTS GEFUNDEN'
      ];

      responses.forEach(response => {
        const events = aggregator.parseEventsFromResponse(response);
        expect(events).toHaveLength(0);
      });
    });
  });

  describe('Context-aware parsing', () => {
    it('should use request category and date when fields are missing', () => {
      const jsonResponse = `[
        {
          "title": "Mystery Event",
          "venue": "Unknown Venue",
          "website": "https://example.com"
        }
      ]`;

      const events = aggregator.parseEventsFromResponse(jsonResponse, 'DJ Sets/Electronic', '2025-01-20');
      
      expect(events).toHaveLength(1);
      expect(events[0].category).toBe('DJ Sets/Electronic');
      expect(events[0].date).toBe('2025-01-20');
    });

    it('should prefer JSON fields over request context', () => {
      const jsonResponse = `[
        {
          "title": "Rock Concert",
          "category": "Live-Konzerte",
          "date": "2025-01-21",
          "venue": "Rock Club",
          "website": "https://example.com"
        }
      ]`;

      const events = aggregator.parseEventsFromResponse(jsonResponse, 'DJ Sets/Electronic', '2025-01-20');
      
      expect(events).toHaveLength(1);
      expect(events[0].category).toBe('Live-Konzerte'); // From JSON, not request
      expect(events[0].date).toBe('2025-01-21'); // From JSON, not request
    });
  });

  describe('Fallback parsing with pipe-delimited tables', () => {
    it('should fallback to table parsing when JSON fails', () => {
      const tableResponse = `
|Title|Category|Date|Time|Venue|Price|Website|
|Rock Show|Live-Konzerte|2025-01-20|20:00|Rock Club|20€|https://rockclub.com|
|Jazz Night|Live-Konzerte|2025-01-20|21:00|Jazz Bar|15€|https://jazzbar.com|
      `;

      const events = aggregator.parseEventsFromResponse(tableResponse, 'Live-Konzerte', '2025-01-20');
      
      expect(events).toHaveLength(2);
      expect(events[0].title).toBe('Rock Show');
      expect(events[1].title).toBe('Jazz Night');
    });

    it('should use request context for missing table fields', () => {
      const tableResponse = `
|Title|Time|Venue|
|Mystery Event|20:00|Unknown Club|
      `;

      const events = aggregator.parseEventsFromResponse(tableResponse, 'Clubs/Discos', '2025-01-20');
      
      expect(events).toHaveLength(1);
      expect(events[0].category).toBe('Clubs/Discos');
      expect(events[0].date).toBe('2025-01-20');
    });
  });

  describe('JSON line-by-line parsing', () => {
    it('should parse multiple JSON objects on separate lines', () => {
      const jsonLinesResponse = `
{"title": "Event 1", "venue": "Venue 1", "category": "Live-Konzerte", "website": "https://event1.com"}
{"title": "Event 2", "venue": "Venue 2", "category": "Theater/Performance", "website": "https://event2.com"}
      `;

      const events = aggregator.parseEventsFromResponse(jsonLinesResponse);
      
      expect(events).toHaveLength(2);
      expect(events[0].title).toBe('Event 1');
      expect(events[1].title).toBe('Event 2');
    });
  });

  describe('Field mapping and extraction', () => {
    it('should map various field synonyms correctly', () => {
      const jsonResponse = `[
        {
          "name": "Concert Event",
          "location": "Music Hall",
          "url": "https://example.com",
          "ticketLink": "https://tickets.com",
          "startTime": "19:30",
          "end": "22:00",
          "cost": "25€",
          "details": "Great concert",
          "venueAddress": "Concert Street 1, Berlin"
        }
      ]`;

      const events = aggregator.parseEventsFromResponse(jsonResponse);
      
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        title: 'Concert Event',
        venue: 'Music Hall',
        website: 'https://example.com',
        bookingLink: 'https://tickets.com',
        time: '19:30',
        endTime: '22:00',
        price: '25€',
        description: 'Great concert',
        address: 'Concert Street 1, Berlin'
      });
    });
  });

  describe('Category extraction from query', () => {
    it('should extract category from Perplexity query result', () => {
      const results = [
        {
          query: 'Search for all DJ Sets/Electronic events in Berlin',
          response: '[{"title": "Techno Night", "venue": "Club Berlin", "website": "https://club.com"}]',
          events: [],
          timestamp: Date.now()
        }
      ];

      const events = aggregator.aggregateResults(results);
      
      expect(events).toHaveLength(1);
      expect(events[0].category).toBe('DJ Sets/Electronic');
    });
  });
});