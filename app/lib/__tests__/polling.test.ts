import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { deduplicateEvents, startJobPolling } from '../polling';

interface MockEventData {
  title: string;
  category: string;
  date: string;
  time: string;
  venue: string;
  price: string;
  website: string;
}

describe('Polling Utility', () => {
  beforeEach(() => {
    // Mock global fetch
    global.fetch = vi.fn();
    // Clear all previous timers
    vi.clearAllTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('deduplicateEvents', () => {
    it('should deduplicate events based on title+date+venue', () => {
      const existing: MockEventData[] = [
        {
          title: 'Concert A',
          category: 'Live-Konzerte',
          date: '2025-01-20',
          time: '20:00',
          venue: 'Concert Hall',
          price: '25€',
          website: 'https://example.com'
        }
      ];

      const newEvents: MockEventData[] = [
        {
          title: 'Concert A', // Duplicate
          category: 'Live-Konzerte',
          date: '2025-01-20',
          time: '20:00',
          venue: 'Concert Hall',
          price: '30€', // Different price
          website: 'https://different.com' // Different website
        },
        {
          title: 'Concert B', // New event
          category: 'Live-Konzerte',
          date: '2025-01-20',
          time: '21:00',
          venue: 'Other Venue',
          price: '20€',
          website: 'https://other.com'
        }
      ];

      const result = deduplicateEvents(existing, newEvents);
      
      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('Concert A');
      expect(result[0].price).toBe('25€'); // Should keep existing event
      expect(result[1].title).toBe('Concert B');
    });

    it('should handle case-insensitive deduplication', () => {
      const existing: MockEventData[] = [
        {
          title: 'CONCERT A',
          category: 'Live-Konzerte',
          date: '2025-01-20',
          time: '20:00',
          venue: 'CONCERT HALL',
          price: '25€',
          website: 'https://example.com'
        }
      ];

      const newEvents: MockEventData[] = [
        {
          title: 'concert a',
          category: 'Live-Konzerte',
          date: '2025-01-20',
          time: '20:00',
          venue: 'concert hall',
          price: '30€',
          website: 'https://different.com'
        }
      ];

      const result = deduplicateEvents(existing, newEvents);
      
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('CONCERT A'); // Should keep existing
    });

    it('should preserve order with existing events first', () => {
      const existing: MockEventData[] = [
        {
          title: 'Event B',
          category: 'Live-Konzerte',
          date: '2025-01-20',
          time: '20:00',
          venue: 'Venue 1',
          price: '25€',
          website: 'https://example.com'
        }
      ];

      const newEvents: MockEventData[] = [
        {
          title: 'Event A',
          category: 'Live-Konzerte',
          date: '2025-01-20',
          time: '19:00',
          venue: 'Venue 2',
          price: '20€',
          website: 'https://other.com'
        },
        {
          title: 'Event C',
          category: 'Live-Konzerte',
          date: '2025-01-20',
          time: '21:00',
          venue: 'Venue 3',
          price: '30€',
          website: 'https://third.com'
        }
      ];

      const result = deduplicateEvents(existing, newEvents);
      
      expect(result).toHaveLength(3);
      expect(result[0].title).toBe('Event B'); // Existing first
      expect(result[1].title).toBe('Event A'); // New events after
      expect(result[2].title).toBe('Event C');
    });
  });

  describe('startJobPolling', () => {
    it('should perform immediate first poll', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({
          jobId: 'test-job',
          status: 'pending',
          events: []
        })
      };
      
      (global.fetch as any).mockResolvedValue(mockResponse);

      let pollCount = 0;
      const onEvents = vi.fn();
      const getCurrent = vi.fn(() => []);
      const onDone = vi.fn();

      const cleanup = startJobPolling('test-job', onEvents, getCurrent, onDone, 1000, 5);

      // Wait for immediate poll to complete
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(global.fetch).toHaveBeenCalledWith('/api/jobs/test-job');
      expect(global.fetch).toHaveBeenCalledTimes(1);

      cleanup();
    });

    it('should call onDone when job status is done', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({
          jobId: 'test-job',
          status: 'done',
          events: [
            {
              title: 'Final Event',
              category: 'Live-Konzerte',
              date: '2025-01-20',
              time: '20:00',
              venue: 'Venue',
              price: '25€',
              website: 'https://example.com'
            }
          ]
        })
      };
      
      (global.fetch as any).mockResolvedValue(mockResponse);

      const onEvents = vi.fn();
      const getCurrent = vi.fn(() => []);
      const onDone = vi.fn();

      const cleanup = startJobPolling('test-job', onEvents, getCurrent, onDone, 1000, 5);

      // Wait for immediate poll to complete
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(onEvents).toHaveBeenCalledTimes(1);
      expect(onDone).toHaveBeenCalledTimes(1);
      expect(onDone).toHaveBeenCalledWith([], 'done');

      cleanup();
    });

    it('should handle polling errors gracefully', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Network error'));

      const onEvents = vi.fn();
      const getCurrent = vi.fn(() => []);
      const onDone = vi.fn();

      const cleanup = startJobPolling('test-job', onEvents, getCurrent, onDone, 100, 2);

      // Wait for polling attempts to complete
      await new Promise(resolve => setTimeout(resolve, 300));

      expect(onDone).toHaveBeenCalledWith([], 'error');

      cleanup();
    });

    it('should timeout after max polls', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({
          jobId: 'test-job',
          status: 'pending',
          events: []
        })
      };
      
      (global.fetch as any).mockResolvedValue(mockResponse);

      const onEvents = vi.fn();
      const getCurrent = vi.fn(() => []);
      const onDone = vi.fn();

      const cleanup = startJobPolling('test-job', onEvents, getCurrent, onDone, 50, 2);

      // Wait for polling to complete
      await new Promise(resolve => setTimeout(resolve, 200));

      expect(onDone).toHaveBeenCalledWith([], 'timeout');

      cleanup();
    });
  });
});