import { describe, it, expect } from 'vitest';
import { fetchWienInfoEvents } from '../sources/wienInfo';

describe('Wien.info Event Fetcher', () => {
  it('should return empty array for unmapped categories', async () => {
    const events = await fetchWienInfoEvents({
      fromISO: '2025-01-20',
      toISO: '2025-01-20',
      categories: ['Unmapped Category'],
      limit: 10
    });
    
    expect(events).toEqual([]);
  });

  it('should return mock events for mapped categories', async () => {
    const events = await fetchWienInfoEvents({
      fromISO: '2025-01-20',
      toISO: '2025-01-20',
      categories: ['Live-Konzerte', 'DJ Sets/Electronic'],
      limit: 10
    });
    
    expect(events.length).toBeGreaterThan(0);
    expect(events[0]).toHaveProperty('title');
    expect(events[0]).toHaveProperty('category');
    expect(events[0]).toHaveProperty('date');
    expect(events[0]).toHaveProperty('venue');
    expect(events[0]).toHaveProperty('source');
    expect(events[0].source).toBe('wien.info');
    expect(events[0].city).toBe('Wien');
  });

  it('should respect limit parameter', async () => {
    const events = await fetchWienInfoEvents({
      fromISO: '2025-01-20',
      toISO: '2025-01-20',
      categories: ['Live-Konzerte', 'DJ Sets/Electronic', 'Theater/Performance'],
      limit: 2
    });
    
    expect(events.length).toBeLessThanOrEqual(2);
  });

  it('should filter events by requested categories', async () => {
    const events = await fetchWienInfoEvents({
      fromISO: '2025-01-20',
      toISO: '2025-01-20',
      categories: ['Live-Konzerte'],
      limit: 10
    });
    
    // All returned events should match the requested category
    events.forEach(event => {
      expect(['Live-Konzerte']).toContain(event.category);
    });
  });
});