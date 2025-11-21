import { describe, it, expect } from 'vitest';
import { EventAggregator } from '../aggregator';

describe('Image URL Integration Test', () => {
  const aggregator = new EventAggregator();

  it('should handle complete AI response with imageUrl and store in EventData', () => {
    // Simulate a realistic AI response with image URLs
    const aiResponse = `[
      {
        "title": "Vienna Jazz Festival",
        "category": "Live-Konzerte",
        "date": "2025-12-01",
        "time": "20:00",
        "endTime": "23:00",
        "venue": "Porgy & Bess",
        "address": "Riemergasse 11, 1010 Wien",
        "price": "€25-40",
        "ticketPrice": "€25",
        "website": "https://porgy.at",
        "bookingLink": "https://porgy.at/tickets",
        "description": "International jazz artists performing",
        "imageUrl": "https://porgy.at/images/jazz-festival.jpg",
        "eventType": "Concert",
        "ageRestrictions": "16+"
      },
      {
        "title": "Electronic Music Night",
        "category": "DJ Sets/Electronic",
        "date": "2025-12-01",
        "time": "22:00",
        "venue": "Grelle Forelle",
        "address": "Spittelauer Lände 12, 1090 Wien",
        "price": "€15",
        "website": "https://grelleforelle.com",
        "image_url": "https://grelleforelle.com/event-poster.jpg",
        "description": "Techno and house music"
      },
      {
        "title": "Theater Performance",
        "category": "Theater/Performance",
        "date": "2025-12-01",
        "time": "19:30",
        "venue": "Burgtheater",
        "price": "€30-50",
        "website": "https://burgtheater.at",
        "description": "Classic theater show"
      }
    ]`;

    const events = aggregator.parseEventsFromResponse(aiResponse);

    // Verify we got all 3 events
    expect(events).toHaveLength(3);

    // Check first event has imageUrl (using "imageUrl" field)
    expect(events[0]).toMatchObject({
      title: 'Vienna Jazz Festival',
      category: 'Live-Konzerte',
      venue: 'Porgy & Bess',
      imageUrl: 'https://porgy.at/images/jazz-festival.jpg'
    });

    // Check second event has imageUrl (using "image_url" field)
    expect(events[1]).toMatchObject({
      title: 'Electronic Music Night',
      category: 'DJ Sets/Electronic',
      venue: 'Grelle Forelle',
      imageUrl: 'https://grelleforelle.com/event-poster.jpg'
    });

    // Check third event has no imageUrl (missing in response)
    expect(events[2]).toMatchObject({
      title: 'Theater Performance',
      category: 'Theater/Performance',
      venue: 'Burgtheater'
    });
    expect(events[2].imageUrl).toBeUndefined();
  });

  it('should preserve imageUrl through aggregateResults workflow', () => {
    const mockPerplexityResults = [
      {
        query: 'Find events in Wien on 2025-12-05',
        response: `[
          {
            "title": "Christmas Market",
            "category": "Märkte/Shopping",
            "date": "2025-12-05",
            "time": "10:00",
            "venue": "Rathausplatz",
            "price": "Free",
            "website": "https://christmasmarkt.at",
            "imageUrl": "https://christmasmarkt.at/market.jpg"
          }
        ]`,
        events: [],
        timestamp: Date.now()
      },
      {
        query: 'Find concerts in Wien on 2025-12-05',
        response: `[
          {
            "title": "Classical Concert",
            "category": "Live-Konzerte",
            "date": "2025-12-05",
            "time": "19:00",
            "venue": "Musikverein",
            "price": "€45",
            "website": "https://musikverein.at",
            "poster": "https://musikverein.at/concert-poster.jpg"
          }
        ]`,
        events: [],
        timestamp: Date.now()
      }
    ];

    const aggregatedEvents = aggregator.aggregateResults(mockPerplexityResults, '2025-12-05');

    // Should have 2 distinct events
    expect(aggregatedEvents).toHaveLength(2);

    // Find events by title
    const marketEvent = aggregatedEvents.find(e => e.title === 'Christmas Market');
    const concertEvent = aggregatedEvents.find(e => e.title === 'Classical Concert');

    // Verify imageUrls are preserved
    expect(marketEvent?.imageUrl).toBe('https://christmasmarkt.at/market.jpg');
    expect(concertEvent?.imageUrl).toBe('https://musikverein.at/concert-poster.jpg');
  });

  it('should handle deduplication while preserving imageUrl from first occurrence', () => {
    const mockPerplexityResults = [
      {
        query: 'Query 1',
        response: `[
          {
            "title": "Rock Concert",
            "category": "Live-Konzerte",
            "date": "2025-12-10",
            "time": "20:00",
            "venue": "Arena Wien",
            "price": "€30",
            "website": "https://arena.wien",
            "imageUrl": "https://arena.wien/rock-concert-1.jpg"
          }
        ]`,
        events: [],
        timestamp: Date.now()
      },
      {
        query: 'Query 2',
        response: `[
          {
            "title": "Rock Concert",
            "category": "Live-Konzerte",
            "date": "2025-12-10",
            "time": "20:00",
            "venue": "Arena Wien",
            "price": "€30",
            "website": "https://arena.wien",
            "imageUrl": "https://arena.wien/rock-concert-2.jpg"
          }
        ]`,
        events: [],
        timestamp: Date.now()
      }
    ];

    const aggregatedEvents = aggregator.aggregateResults(mockPerplexityResults, '2025-12-10');

    // Should deduplicate to 1 event
    expect(aggregatedEvents).toHaveLength(1);

    // Should preserve the first imageUrl
    expect(aggregatedEvents[0].imageUrl).toBe('https://arena.wien/rock-concert-1.jpg');
  });

  it('should fill missing imageUrl during deduplication', () => {
    const mockPerplexityResults = [
      {
        query: 'Query without image',
        response: `[
          {
            "title": "Film Screening",
            "category": "Film/Kino",
            "date": "2025-12-15",
            "time": "18:00",
            "venue": "Gartenbaukino",
            "price": "€12",
            "website": "https://gartenbaukino.at"
          }
        ]`,
        events: [],
        timestamp: Date.now()
      },
      {
        query: 'Query with image',
        response: `[
          {
            "title": "Film Screening",
            "category": "Film/Kino",
            "date": "2025-12-15",
            "time": "18:00",
            "venue": "Gartenbaukino",
            "price": "€12",
            "website": "https://gartenbaukino.at",
            "imageUrl": "https://gartenbaukino.at/screening.jpg"
          }
        ]`,
        events: [],
        timestamp: Date.now()
      }
    ];

    const aggregatedEvents = aggregator.aggregateResults(mockPerplexityResults, '2025-12-15');

    // Should deduplicate to 1 event
    expect(aggregatedEvents).toHaveLength(1);

    // Should have the imageUrl from second query
    expect(aggregatedEvents[0].imageUrl).toBe('https://gartenbaukino.at/screening.jpg');
  });
});
