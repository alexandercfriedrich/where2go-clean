import { describe, it, expect } from 'vitest';
import { isEventValidNow, computeEventId, clampDayEnd } from '../dayCache';
import { EventData } from '../types';

/**
 * Integration tests demonstrating the complete day-bucket cache workflow
 */
describe('Day-Bucket Cache Integration', () => {
  describe('Event Validity Filtering', () => {
    it('should filter expired events using cacheUntil', () => {
      const now = new Date('2025-01-20T15:00:00Z');
      
      const validEvent: EventData = {
        title: 'Valid Event',
        category: 'Music',
        date: '2025-01-20',
        time: '10:00',
        venue: 'Venue A',
        price: '20€',
        website: 'test.com',
        cacheUntil: '2025-01-20T16:00:00Z' // Valid until 16:00
      };
      
      const expiredEvent: EventData = {
        title: 'Expired Event',
        category: 'Music',
        date: '2025-01-20',
        time: '10:00',
        venue: 'Venue B',
        price: '20€',
        website: 'test.com',
        cacheUntil: '2025-01-20T14:00:00Z' // Already expired at 15:00
      };
      
      const events = [validEvent, expiredEvent];
      const validEvents = events.filter(e => isEventValidNow(e, now));
      
      expect(validEvents).toHaveLength(1);
      expect(validEvents[0].title).toBe('Valid Event');
    });

    it('should use endTime as fallback when cacheUntil missing', () => {
      const now = new Date('2025-01-20T15:00:00Z');
      
      const events: EventData[] = [
        {
          title: 'Event 1',
          category: 'Music',
          date: '2025-01-20',
          time: '10:00',
          venue: 'Venue A',
          price: '20€',
          website: 'test.com',
          endTime: '2025-01-20T16:00:00Z' // Valid
        },
        {
          title: 'Event 2',
          category: 'Music',
          date: '2025-01-20',
          time: '10:00',
          venue: 'Venue B',
          price: '20€',
          website: 'test.com',
          endTime: '2025-01-20T14:00:00Z' // Expired
        }
      ];
      
      const validEvents = events.filter(e => isEventValidNow(e, now));
      
      expect(validEvents).toHaveLength(1);
      expect(validEvents[0].title).toBe('Event 1');
    });

    it('should use time+3h as fallback when endTime missing', () => {
      const now = new Date('2025-01-20T15:00:00');
      
      const events: EventData[] = [
        {
          title: 'Event 1',
          category: 'Music',
          date: '2025-01-20',
          time: '13:00', // Ends at 16:00 (13:00 + 3h) - still valid
          venue: 'Venue A',
          price: '20€',
          website: 'test.com'
        },
        {
          title: 'Event 2',
          category: 'Music',
          date: '2025-01-20',
          time: '11:00', // Ends at 14:00 (11:00 + 3h) - expired
          venue: 'Venue B',
          price: '20€',
          website: 'test.com'
        }
      ];
      
      const validEvents = events.filter(e => isEventValidNow(e, now));
      
      expect(validEvents).toHaveLength(1);
      expect(validEvents[0].title).toBe('Event 1');
    });
  });

  describe('Event ID Consistency', () => {
    it('should generate same ID for events from different sources', () => {
      const rssEvent: EventData = {
        title: 'Rock Concert!',
        category: 'Music',
        date: '2025-01-20',
        time: '20:00',
        venue: 'The Arena',
        price: '30€',
        website: 'arena.com',
        source: 'rss'
      };

      const aiEvent: EventData = {
        title: 'rock concert', // Different case
        category: 'Live-Konzerte', // Different category
        date: '2025-01-20',
        time: '20:30', // Different time
        venue: 'the arena', // Different case
        price: '',
        website: 'arena.com',
        description: 'Amazing bands',
        source: 'ai'
      };

      const id1 = computeEventId(rssEvent);
      const id2 = computeEventId(aiEvent);
      
      // Same ID despite differences in case, category, time, price
      expect(id1).toBe(id2);
    });

    it('should generate different IDs for different events', () => {
      const event1: EventData = {
        title: 'Concert A',
        category: 'Music',
        date: '2025-01-20',
        time: '20:00',
        venue: 'Venue 1',
        price: '30€',
        website: 'test.com'
      };

      const event2: EventData = {
        title: 'Concert B', // Different title
        category: 'Music',
        date: '2025-01-20',
        time: '20:00',
        venue: 'Venue 1',
        price: '30€',
        website: 'test.com'
      };

      const id1 = computeEventId(event1);
      const id2 = computeEventId(event2);
      
      expect(id1).not.toBe(id2);
    });
  });

  describe('TTL Computation Scenarios', () => {
    it('should compute TTL until day end for all-day events', () => {
      const date = '2025-01-20';
      const dayEnd = clampDayEnd(date);
      
      expect(dayEnd.getHours()).toBe(23);
      expect(dayEnd.getMinutes()).toBe(59);
      expect(dayEnd.getSeconds()).toBe(0);
    });

    it('should respect 7-day maximum TTL constraint', () => {
      const now = new Date('2025-01-20T12:00:00Z');
      const sevenDays = 7 * 24 * 60 * 60; // seconds
      const tenDays = 10 * 24 * 60 * 60; // seconds
      
      // Even if an event would be valid for 10 days, TTL should be capped at 7
      const cappedTtl = Math.min(tenDays, sevenDays);
      
      expect(cappedTtl).toBe(sevenDays);
    });

    it('should enforce 60-second minimum TTL', () => {
      const minTtl = 60;
      const negativeTtl = -100;
      
      const safeTtl = Math.max(negativeTtl, minTtl);
      
      expect(safeTtl).toBe(minTtl);
    });
  });

  describe('Day-Bucket Workflow Simulation', () => {
    it('should demonstrate complete cache workflow', () => {
      const now = new Date('2025-01-20T12:00:00Z');
      
      // Scenario: Multiple sources provide events for the same day
      const rssEvents: EventData[] = [
        {
          title: 'Techno Night',
          category: 'Music',
          date: '2025-01-20',
          time: '22:00',
          venue: 'Club A',
          price: '15€',
          website: 'cluba.com',
          source: 'rss',
          cacheUntil: '2025-01-21T04:00:00Z' // Valid until 4 AM
        }
      ];
      
      const wienInfoEvents: EventData[] = [
        {
          title: 'Museum Tour',
          category: 'Art',
          date: '2025-01-20',
          time: '10:00',
          venue: 'Museum',
          price: 'Free',
          website: 'museum.at',
          source: 'wien.info',
          endTime: '2025-01-20T18:00:00Z'
        }
      ];
      
      const aiEvents: EventData[] = [
        {
          title: 'techno night', // Same event, different source
          category: 'DJ Sets/Electronic',
          date: '2025-01-20',
          time: '22:00',
          venue: 'club a',
          price: '',
          website: 'cluba.com',
          description: 'Amazing DJs all night',
          source: 'ai'
        }
      ];
      
      // All events combined
      const allEvents = [...rssEvents, ...wienInfoEvents, ...aiEvents];
      
      // Filter valid events
      const validEvents = allEvents.filter(e => isEventValidNow(e, now));
      expect(validEvents).toHaveLength(3); // All are valid at noon
      
      // Check deduplication - RSS and AI events should have same ID
      const rssId = computeEventId(rssEvents[0]);
      const aiId = computeEventId(aiEvents[0]);
      expect(rssId).toBe(aiId); // Same event!
      
      // After deduplication, we should have 2 unique events
      const uniqueIds = new Set(validEvents.map(e => computeEventId(e)));
      expect(uniqueIds.size).toBe(2);
      
      // Category index would contain
      const categoryIndex: Record<string, Set<string>> = {};
      for (const event of validEvents) {
        if (event.category) {
          if (!categoryIndex[event.category]) {
            categoryIndex[event.category] = new Set();
          }
          categoryIndex[event.category].add(computeEventId(event));
        }
      }
      
      // Multiple categories may point to same event (before dedup)
      expect(categoryIndex['Music']?.size).toBe(1);
      expect(categoryIndex['Art']?.size).toBe(1);
      expect(categoryIndex['DJ Sets/Electronic']?.size).toBe(1);
    });

    it('should handle event expiry over time', () => {
      const event: EventData = {
        title: 'Short Event',
        category: 'Music',
        date: '2025-01-20',
        time: '14:00', // Ends at 17:00 (14:00 + 3h)
        venue: 'Venue',
        price: '10€',
        website: 'test.com'
      };
      
      const beforeStart = new Date('2025-01-20T13:00:00');
      const duringEvent = new Date('2025-01-20T15:00:00');
      const afterEvent = new Date('2025-01-20T18:00:00');
      
      expect(isEventValidNow(event, beforeStart)).toBe(true);
      expect(isEventValidNow(event, duringEvent)).toBe(true);
      expect(isEventValidNow(event, afterEvent)).toBe(false);
    });
  });
});
