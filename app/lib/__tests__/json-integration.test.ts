import { describe, it, expect } from 'vitest';
import { EventAggregator } from '../aggregator';

describe('JSON Schema Integration', () => {
  const aggregator = new EventAggregator();

  describe('Real-world JSON response scenarios', () => {
    it('should handle complete JSON response with all UI fields', () => {
      // Simulate a perfect JSON response from Perplexity following the new schema
      const mockJsonResponse = `[
        {
          "title": "Electronic Music Festival",
          "date": "2025-01-20",
          "time": "18:00",
          "endTime": "02:00",
          "venue": "Berghain",
          "address": "Am Wriezener Bahnhof, 10243 Berlin, Deutschland",
          "category": "DJ Sets/Electronic",
          "eventType": "Festival",
          "price": "Ab 25€",
          "ticketPrice": "25€ - 45€",
          "ageRestrictions": "18+",
          "description": "Die größte Electronic Music Party der Stadt",
          "website": "https://berghain.de",
          "bookingLink": "https://tickets.berghain.de"
        },
        {
          "title": "Jazz Night im Blue Note",
          "date": "2025-01-20", 
          "time": "20:00",
          "venue": "Blue Note",
          "address": "Mitte District, 10117 Berlin, Deutschland",
          "category": "Live-Konzerte",
          "eventType": "Live Concert",
          "price": "15€",
          "website": "https://bluenote-berlin.de",
          "description": "Authentische Jazz-Atmosphäre"
        }
      ]`;

      const events = aggregator.parseEventsFromResponse(mockJsonResponse);
      
      expect(events).toHaveLength(2);
      
      // Verify first event has all UI-expected fields
      const electronicEvent = events[0];
      expect(electronicEvent).toMatchObject({
        title: 'Electronic Music Festival',
        date: '2025-01-20',
        time: '18:00',
        endTime: '02:00',
        venue: 'Berghain',
        address: 'Am Wriezener Bahnhof, 10243 Berlin, Deutschland',
        category: 'DJ Sets/Electronic',
        eventType: 'Festival',
        price: 'Ab 25€',
        ticketPrice: '25€ - 45€',
        ageRestrictions: '18+',
        description: 'Die größte Electronic Music Party der Stadt',
        website: 'https://berghain.de',
        bookingLink: 'https://tickets.berghain.de'
      });

      // Verify second event handles optional fields gracefully
      const jazzEvent = events[1];
      expect(jazzEvent.title).toBe('Jazz Night im Blue Note');
      expect(jazzEvent.address).toBe('Mitte District, 10117 Berlin, Deutschland');
      expect(jazzEvent.bookingLink).toBeUndefined(); // No booking link provided
      expect(jazzEvent.endTime).toBeUndefined(); // No end time provided
    });

    it('should handle empty JSON array response gracefully', () => {
      const emptyResponse = '[]';
      const events = aggregator.parseEventsFromResponse(emptyResponse);
      expect(events).toHaveLength(0);
    });

    it('should handle "no events found" text responses', () => {
      const responses = [
        'Keine passenden Events gefunden',
        'keine events gefunden in Berlin',
        'No events found for this date',
        ''
      ];

      responses.forEach(response => {
        const events = aggregator.parseEventsFromResponse(response);
        expect(events).toHaveLength(0);
      });
    });

    it('should populate missing fields with context from request', () => {
      const partialJsonResponse = `[
        {
          "title": "Mystery Concert",
          "venue": "Unknown Venue",
          "website": "https://example.com"
        }
      ]`;

      // Provide context that should fill missing fields
      const events = aggregator.parseEventsFromResponse(
        partialJsonResponse,
        'Live-Konzerte',  // requestCategory
        '2025-01-20'      // requestDate
      );
      
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        title: 'Mystery Concert',
        category: 'Live-Konzerte',  // From request context
        date: '2025-01-20',         // From request context
        venue: 'Unknown Venue',
        website: 'https://example.com'
      });
    });

    it('should prefer JSON fields over request context', () => {
      const explicitJsonResponse = `[
        {
          "title": "Rock Festival",
          "category": "Open Air",
          "date": "2025-01-21",
          "venue": "Olympic Stadium",
          "website": "https://rockfest.com"
        }
      ]`;

      // Provide different context - should be overridden by JSON
      const events = aggregator.parseEventsFromResponse(
        explicitJsonResponse,
        'Live-Konzerte',  // Different category
        '2025-01-20'      // Different date
      );
      
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        title: 'Rock Festival',
        category: 'Open Air',      // From JSON, not request
        date: '2025-01-21',        // From JSON, not request
        venue: 'Olympic Stadium',
        website: 'https://rockfest.com'
      });
    });
  });

  describe('UI compatibility verification', () => {
    it('should provide all fields needed for Maps links', () => {
      const mockResponse = `[
        {
          "title": "Concert with Address",
          "venue": "Berlin Philharmonie",
          "address": "Herbert-von-Karajan-Straße 1, 10785 Berlin, Deutschland",
          "category": "Live-Konzerte",
          "date": "2025-01-20",
          "website": "https://example.com"
        }
      ]`;

      const events = aggregator.parseEventsFromResponse(mockResponse);
      const event = events[0];
      
      // UI can create Maps link with: address (primary) or venue + city fallback
      expect(event.address).toBeTruthy();
      expect(event.venue).toBeTruthy();
    });

    it('should provide all fields needed for Website and Tickets links', () => {
      const mockResponse = `[
        {
          "title": "Concert with Links",
          "venue": "Some Venue",
          "category": "Live-Konzerte",
          "date": "2025-01-20",
          "website": "https://venue-website.com",
          "bookingLink": "https://tickets.venue.com"
        }
      ]`;

      const events = aggregator.parseEventsFromResponse(mockResponse);
      const event = events[0];
      
      // UI can show both Website and Tickets buttons
      expect(event.website).toBe('https://venue-website.com');
      expect(event.bookingLink).toBe('https://tickets.venue.com');
    });

    it('should handle all DEFAULT_CATEGORIES properly', () => {
      const defaultCategories = [
        'DJ Sets/Electronic', 'Clubs/Discos', 'Live-Konzerte', 'Open Air',
        'Museen', 'LGBTQ+', 'Comedy/Kabarett', 'Theater/Performance',
        'Film', 'Food/Culinary', 'Sport', 'Familien/Kids',
        'Kunst/Design', 'Wellness/Spirituell', 'Networking/Business', 'Natur/Outdoor'
      ];

      defaultCategories.forEach(category => {
        const mockResponse = `[
          {
            "title": "Test Event",
            "category": "${category}",
            "venue": "Test Venue",
            "date": "2025-01-20",
            "website": "https://example.com"
          }
        ]`;

        const events = aggregator.parseEventsFromResponse(mockResponse);
        expect(events).toHaveLength(1);
        expect(events[0].category).toBe(category);
      });
    });
  });
});