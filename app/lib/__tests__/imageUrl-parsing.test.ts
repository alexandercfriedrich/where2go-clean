import { describe, it, expect } from 'vitest';
import { EventAggregator } from '../aggregator';

describe('Image URL Parsing from AI Responses', () => {
  const aggregator = new EventAggregator();

  describe('imageUrl field extraction', () => {
    it('should parse imageUrl from JSON response', () => {
      const jsonResponse = `[
        {
          "title": "Summer Festival",
          "date": "2025-07-15",
          "time": "18:00",
          "venue": "Central Park",
          "category": "Open Air",
          "price": "Free",
          "website": "https://summerfest.com",
          "imageUrl": "https://example.com/images/summer-fest.jpg"
        }
      ]`;

      const events = aggregator.parseEventsFromResponse(jsonResponse);
      
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        title: 'Summer Festival',
        imageUrl: 'https://example.com/images/summer-fest.jpg'
      });
    });

    it('should handle alternative imageUrl field names', () => {
      const testCases = [
        { field: 'imageUrl', value: 'https://example.com/img1.jpg' },
        { field: 'image_url', value: 'https://example.com/img2.jpg' },
        { field: 'imageURL', value: 'https://example.com/img3.jpg' },
        { field: 'image', value: 'https://example.com/img4.jpg' },
        { field: 'poster', value: 'https://example.com/img5.jpg' },
        { field: 'thumbnail', value: 'https://example.com/img6.jpg' }
      ];

      testCases.forEach(({ field, value }) => {
        const jsonResponse = `[
          {
            "title": "Test Event",
            "date": "2025-07-15",
            "time": "19:00",
            "venue": "Test Venue",
            "category": "Live-Konzerte",
            "price": "€20",
            "website": "https://test.com",
            "${field}": "${value}"
          }
        ]`;

        const events = aggregator.parseEventsFromResponse(jsonResponse);
        
        expect(events).toHaveLength(1);
        expect(events[0].imageUrl).toBe(value);
      });
    });

    it('should handle missing imageUrl gracefully', () => {
      const jsonResponse = `[
        {
          "title": "Concert Without Image",
          "date": "2025-08-01",
          "time": "20:00",
          "venue": "Music Hall",
          "category": "Live-Konzerte",
          "price": "€25",
          "website": "https://concert.com"
        }
      ]`;

      const events = aggregator.parseEventsFromResponse(jsonResponse);
      
      expect(events).toHaveLength(1);
      expect(events[0].imageUrl).toBeUndefined();
    });

    it('should preserve imageUrl during deduplication', () => {
      const events = [
        {
          title: 'Jazz Night',
          category: 'Live-Konzerte',
          date: '2025-09-01',
          time: '20:00',
          venue: 'Blue Note',
          price: '€15',
          website: 'https://bluenote.com',
          imageUrl: 'https://example.com/jazz-night.jpg'
        },
        {
          title: 'Jazz Night',
          category: 'Live-Konzerte',
          date: '2025-09-01',
          time: '20:00',
          venue: 'Blue Note',
          price: '€15',
          website: 'https://bluenote.com'
          // No imageUrl in duplicate
        }
      ];

      const deduped = aggregator.deduplicateEvents(events);
      
      expect(deduped).toHaveLength(1);
      expect(deduped[0].imageUrl).toBe('https://example.com/jazz-night.jpg');
    });

    it('should prefer first non-empty imageUrl during deduplication', () => {
      const events = [
        {
          title: 'Rock Concert',
          category: 'Live-Konzerte',
          date: '2025-09-10',
          time: '19:00',
          venue: 'Arena',
          price: '€30',
          website: 'https://arena.com',
          imageUrl: 'https://example.com/rock1.jpg'
        },
        {
          title: 'Rock Concert',
          category: 'Live-Konzerte',
          date: '2025-09-10',
          time: '19:00',
          venue: 'Arena',
          price: '€30',
          website: 'https://arena.com',
          imageUrl: 'https://example.com/rock2.jpg'
        }
      ];

      const deduped = aggregator.deduplicateEvents(events);
      
      expect(deduped).toHaveLength(1);
      // Should keep the first imageUrl
      expect(deduped[0].imageUrl).toBe('https://example.com/rock1.jpg');
    });

    it('should handle events with partial imageUrl data during fuzzy dedup', () => {
      const events = [
        {
          title: 'Electronic Music Festival',
          category: 'DJ Sets/Electronic',
          date: '2025-10-15',
          time: '22:00',
          venue: 'Warehouse Club',
          price: '€20',
          website: 'https://emf.com',
          imageUrl: 'https://cdn.example.com/emf-2025.jpg'
        },
        {
          title: 'Electronic Music Festival',
          category: 'DJ Sets/Electronic',
          date: '2025-10-15',
          time: '22:00',
          venue: 'Warehouse Club',
          price: '€20',
          website: 'https://emf.com'
          // Exact title but missing imageUrl - should merge and preserve imageUrl
        }
      ];

      const deduped = aggregator.deduplicateEvents(events);
      
      expect(deduped).toHaveLength(1);
      expect(deduped[0].imageUrl).toBe('https://cdn.example.com/emf-2025.jpg');
    });

    it('should extract imageUrl from embedded JSON in text', () => {
      const mixedResponse = `Here are the events I found:
      
      [
        {
          "title": "Theater Show",
          "date": "2025-11-20",
          "time": "19:30",
          "venue": "City Theater",
          "category": "Theater/Performance",
          "price": "€35",
          "website": "https://citytheater.com",
          "imageUrl": "https://citytheater.com/images/show.jpg",
          "description": "A dramatic performance"
        }
      ]
      
      Hope this helps!`;

      const events = aggregator.parseEventsFromResponse(mixedResponse);
      
      expect(events).toHaveLength(1);
      expect(events[0].imageUrl).toBe('https://citytheater.com/images/show.jpg');
    });
  });

  describe('Edge cases', () => {
    it('should handle empty string imageUrl', () => {
      const jsonResponse = `[
        {
          "title": "Event With Empty Image",
          "date": "2025-12-01",
          "time": "20:00",
          "venue": "Venue",
          "category": "Live-Konzerte",
          "price": "€10",
          "website": "https://event.com",
          "imageUrl": ""
        }
      ]`;

      const events = aggregator.parseEventsFromResponse(jsonResponse);
      
      expect(events).toHaveLength(1);
      // Empty string should be handled as no imageUrl
      expect(events[0].imageUrl).toBeFalsy();
    });

    it('should handle null imageUrl', () => {
      const jsonResponse = `[
        {
          "title": "Event With Null Image",
          "date": "2025-12-01",
          "time": "20:00",
          "venue": "Venue",
          "category": "Live-Konzerte",
          "price": "€10",
          "website": "https://event.com",
          "imageUrl": null
        }
      ]`;

      const events = aggregator.parseEventsFromResponse(jsonResponse);
      
      expect(events).toHaveLength(1);
      expect(events[0].imageUrl).toBeUndefined();
    });

    it('should handle multiple events with mixed imageUrl data', () => {
      const jsonResponse = `[
        {
          "title": "Event One",
          "date": "2025-12-15",
          "time": "18:00",
          "venue": "Venue A",
          "category": "Live-Konzerte",
          "price": "€15",
          "website": "https://event1.com",
          "imageUrl": "https://cdn.example.com/event1.jpg"
        },
        {
          "title": "Event Two",
          "date": "2025-12-15",
          "time": "20:00",
          "venue": "Venue B",
          "category": "Theater/Performance",
          "price": "€20",
          "website": "https://event2.com"
        },
        {
          "title": "Event Three",
          "date": "2025-12-15",
          "time": "22:00",
          "venue": "Venue C",
          "category": "DJ Sets/Electronic",
          "price": "€25",
          "website": "https://event3.com",
          "imageUrl": "https://cdn.example.com/event3.jpg"
        }
      ]`;

      const events = aggregator.parseEventsFromResponse(jsonResponse);
      
      expect(events).toHaveLength(3);
      expect(events[0].imageUrl).toBe('https://cdn.example.com/event1.jpg');
      expect(events[1].imageUrl).toBeUndefined();
      expect(events[2].imageUrl).toBe('https://cdn.example.com/event3.jpg');
    });
  });
});
