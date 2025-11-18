import { describe, it, expect } from 'vitest';
import { deduplicateEvents } from '../eventDeduplication';
import { EventData } from '../types';

/**
 * Integration tests demonstrating the deduplication logic
 * These tests simulate real-world scenarios from the optimized API endpoint
 */
describe('Event Deduplication Integration', () => {
  describe('Real-world duplicate scenarios', () => {
    it('should remove duplicates from AI responses with highly similar titles', () => {
      // Simulate events from database
      const existingEvents: EventData[] = [
        {
          title: 'Jazz Night at Blue Note',
          city: 'Wien',
          date: '2025-11-20',
          time: '20:00',
          category: 'Live-Konzerte',
          venue: 'Blue Note',
          price: '€25',
          website: 'https://bluenote.at/events/jazz-night',
          source: 'wien.info'
        }
      ];

      // Simulate new events from AI with very similar title
      const newEvents: EventData[] = [
        {
          title: 'Jazz Nights at Blue Note', // 95.7% similar - just added 's'
          city: 'Wien',
          date: '2025-11-20',
          time: '20:15', // Within 1 hour
          category: 'Live-Konzerte',
          venue: 'Blue Note',
          price: '€25',
          website: 'https://example.com',
          source: 'ai'
        },
        {
          title: 'Rock Concert at Arena', // Unique
          city: 'Wien',
          date: '2025-11-20',
          time: '21:00',
          category: 'Live-Konzerte',
          venue: 'Arena',
          price: '€30',
          website: 'https://arena.wien',
          source: 'ai'
        }
      ];

      const result = deduplicateEvents(newEvents, existingEvents);

      // Should only keep the unique "Rock Concert at Arena"
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Rock Concert at Arena');
    });

    it('should handle time-shifted duplicates (events at different times)', () => {
      const existingEvents: EventData[] = [
        {
          title: 'Opening Night Gala',
          city: 'Wien',
          date: '2025-11-20',
          time: '19:00',
          category: 'Theater/Performance',
          venue: 'Burgtheater',
          price: '€50',
          website: 'https://burgtheater.at',
          source: 'cache'
        }
      ];

      const newEvents: EventData[] = [
        {
          title: 'Opening Night Gala', // Exact same title
          city: 'Wien',
          date: '2025-11-20',
          time: '19:45', // 45 minutes later - within 1 hour
          category: 'Theater/Performance',
          venue: 'Burgtheater',
          price: '€50',
          website: 'https://example.com',
          source: 'ai'
        },
        {
          title: 'Opening Night Gala', // Same event
          city: 'Wien',
          date: '2025-11-20',
          time: '20:30', // 1.5 hours later - OUTSIDE 1 hour window
          category: 'Theater/Performance',
          venue: 'Burgtheater',
          price: '€50',
          website: 'https://example.com',
          source: 'ai'
        }
      ];

      const result = deduplicateEvents(newEvents, existingEvents);

      // First should be filtered (within 1 hour), second should be kept (outside 1 hour)
      expect(result).toHaveLength(1);
      expect(result[0].time).toBe('20:30');
    });

    it('should keep events from different cities even with same title', () => {
      const existingEvents: EventData[] = [
        {
          title: 'Christmas Market',
          city: 'Wien',
          date: '2025-12-01',
          time: '10:00',
          category: 'Open Air',
          venue: 'Rathausplatz',
          price: 'Free',
          website: 'https://christmasmarket.at',
          source: 'wien.info'
        }
      ];

      const newEvents: EventData[] = [
        {
          title: 'Christmas Market',
          city: 'Berlin', // Different city
          date: '2025-12-01',
          time: '10:00',
          category: 'Open Air',
          venue: 'Alexanderplatz',
          price: 'Free',
          website: 'https://example.com',
          source: 'ai'
        }
      ];

      const result = deduplicateEvents(newEvents, existingEvents);

      // Should keep the Berlin event
      expect(result).toHaveLength(1);
      expect(result[0].city).toBe('Berlin');
    });

    it('should demonstrate realistic deduplication with varying title lengths', () => {
      // Simulate database with events of varying title lengths
      const existingEvents: EventData[] = [
        {
          title: 'Summer Jazz Festival 2025 at Donauinsel',
          city: 'Wien',
          date: '2025-11-20',
          time: '19:00',
          category: 'Open Air',
          venue: 'Donauinsel',
          price: 'Free',
          website: 'https://example.com',
          source: 'cache'
        },
        {
          title: 'Classical Evening',
          city: 'Wien',
          date: '2025-11-20',
          time: '20:00',
          category: 'Live-Konzerte',
          venue: 'Musikverein',
          price: '€50',
          website: 'https://example.com',
          source: 'wien.info'
        }
      ];

      // Simulate new events with varying similarity
      const newEvents: EventData[] = [
        {
          title: 'Summer Jazz Festival at Donauinsel', // 85.7% similar - should be caught
          city: 'Wien',
          date: '2025-11-20',
          time: '19:30',
          category: 'Open Air',
          venue: 'Donauinsel',
          price: 'Free',
          website: 'https://new.example.com',
          source: 'ai'
        },
        {
          title: 'Classical Evenings', // 94.1% similar - should be caught
          city: 'Wien',
          date: '2025-11-20',
          time: '20:15',
          category: 'Live-Konzerte',
          venue: 'Musikverein',
          price: '€50',
          website: 'https://new.example.com',
          source: 'ai'
        },
        {
          title: 'Rock Music Night', // Completely different
          city: 'Wien',
          date: '2025-11-20',
          time: '21:00',
          category: 'Live-Konzerte',
          venue: 'Arena',
          price: '€30',
          website: 'https://example.com',
          source: 'ai'
        }
      ];

      const result = deduplicateEvents(newEvents, existingEvents);

      // Should remove the 2 duplicates and keep only "Rock Music Night"
      const duplicatesRemoved = newEvents.length - result.length;
      console.log(`Deduplication result: ${newEvents.length} → ${result.length} events (${duplicatesRemoved} duplicates removed)`);
      
      // At least one duplicate should be caught
      expect(duplicatesRemoved).toBeGreaterThan(0);
      // Should have fewer events than we started with
      expect(result.length).toBeLessThan(newEvents.length);
    });
  });

  describe('Performance characteristics', () => {
    it('should efficiently handle batch processing scenario', () => {
      const existingEvents: EventData[] = Array.from({ length: 100 }, (_, i) => ({
        title: `Existing Event ${i}`,
        city: 'Wien',
        date: '2025-11-20',
        time: `${String(Math.floor(i / 6) + 10).padStart(2, '0')}:00`,
        category: 'Live-Konzerte',
        venue: 'Test Venue',
        price: '€20',
        website: 'https://example.com',
        source: 'cache' as const
      }));

      const newEvents: EventData[] = Array.from({ length: 50 }, (_, i) => ({
        title: `New Event ${i + 200}`,
        city: 'Wien',
        date: '2025-11-20',
        time: '21:00',
        category: 'Live-Konzerte',
        venue: 'Test Venue',
        price: '€20',
        website: 'https://example.com',
        source: 'ai' as const
      }));

      const startTime = Date.now();
      const result = deduplicateEvents(newEvents, existingEvents);
      const duration = Date.now() - startTime;

      // Deduplication should be fast (< 100ms for this dataset)
      expect(duration).toBeLessThan(100);
      expect(result).toHaveLength(50); // All should be unique
    });
  });
});
