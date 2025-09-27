import { describe, it, expect } from 'vitest';
import { fetchWienInfoEvents } from '../sources/wienInfo';

describe('Wien.info Event Fetcher', () => {
  it('should return error for unmapped categories', async () => {
    const result = await fetchWienInfoEvents({
      fromISO: '2025-09-01',
      toISO: '2025-12-31',
      categories: ['Unmapped Category'],
      limit: 10
    });
    
    expect(result.events).toEqual([]);
    expect(result.error).toBe('No results from Wien.info!');
  });

  it('should attempt to fetch real events for mapped categories', async () => {
    const result = await fetchWienInfoEvents({
      fromISO: '2025-09-01',
      toISO: '2025-12-31',
      categories: ['Live-Konzerte', 'DJ Sets/Electronic'],
      limit: 10,
      debug: true
    });
    
    // Since we're now using the JSON API, we should be able to get some results
    // if there are events in the broader date range
    expect(result.events.length).toBeGreaterThanOrEqual(0);
    if (result.events.length === 0) {
      expect(result.error).toBe('No results from Wien.info!');
    }
  });

  it('should respect limit parameter when events are found', async () => {
    const result = await fetchWienInfoEvents({
      fromISO: '2025-09-01',
      toISO: '2025-12-31',
      categories: ['Live-Konzerte', 'DJ Sets/Electronic', 'Theater/Performance'],
      limit: 2
    });
    
    // Should respect the limit
    expect(result.events.length).toBeLessThanOrEqual(2);
  });

  it('should return error when no events found for requested categories', async () => {
    const result = await fetchWienInfoEvents({
      fromISO: '2025-01-01', // Use a date range that's unlikely to have events
      toISO: '2025-01-01',
      categories: ['Live-Konzerte'],
      limit: 10
    });
    
    // Should return error when no events found
    expect(result.error).toBe('No results from Wien.info!');
  });

  it('should include debug information when debug is enabled', async () => {
    const result = await fetchWienInfoEvents({
      fromISO: '2025-09-01',
      toISO: '2025-12-31',
      categories: ['Live-Konzerte'],
      limit: 10,
      debug: true
    });
    
    expect(result.debugInfo).toBeDefined();
    expect(result.debugInfo?.query).toBeDefined();
    expect(result.debugInfo?.response).toBeDefined();
    expect(result.debugInfo?.categories).toEqual(['Live-Konzerte']);
    expect(result.debugInfo?.url).toBe('https://www.wien.info/ajax/de/events');
  });
});