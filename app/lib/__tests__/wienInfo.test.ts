import { describe, it, expect } from 'vitest';
import { fetchWienInfoEvents } from '../sources/wienInfo';

describe('Wien.info Event Fetcher', () => {
  it('should return empty array for unmapped categories', async () => {
    const result = await fetchWienInfoEvents({
      fromISO: '2025-01-20',
      toISO: '2025-01-20',
      categories: ['Unmapped Category'],
      limit: 10
    });
    
    expect(result.events).toEqual([]);
  });

  it('should return mock events for mapped categories', async () => {
    const result = await fetchWienInfoEvents({
      fromISO: '2025-01-20',
      toISO: '2025-01-20',
      categories: ['Live-Konzerte', 'DJ Sets/Electronic'],
      limit: 10
    });
    
    expect(result.events.length).toBeGreaterThan(0);
    expect(result.events[0]).toHaveProperty('title');
    expect(result.events[0]).toHaveProperty('category');
    expect(result.events[0]).toHaveProperty('date');
    expect(result.events[0]).toHaveProperty('venue');
    expect(result.events[0]).toHaveProperty('source');
    expect(result.events[0].source).toBe('wien.info');
    expect(result.events[0].city).toBe('Wien');
  });

  it('should respect limit parameter', async () => {
    const result = await fetchWienInfoEvents({
      fromISO: '2025-01-20',
      toISO: '2025-01-20',
      categories: ['Live-Konzerte', 'DJ Sets/Electronic', 'Theater/Performance'],
      limit: 2
    });
    
    expect(result.events.length).toBeLessThanOrEqual(2);
  });

  it('should filter events by requested categories', async () => {
    const result = await fetchWienInfoEvents({
      fromISO: '2025-01-20',
      toISO: '2025-01-20',
      categories: ['Live-Konzerte'],
      limit: 10
    });
    
    // All returned events should match the requested category
    result.events.forEach(event => {
      expect(['Live-Konzerte']).toContain(event.category);
    });
  });

  it('should include debug information when debug is enabled', async () => {
    const result = await fetchWienInfoEvents({
      fromISO: '2025-01-20',
      toISO: '2025-01-20',
      categories: ['Live-Konzerte'],
      limit: 10,
      debug: true
    });
    
    expect(result.debugInfo).toBeDefined();
    expect(result.debugInfo?.query).toBeDefined();
    expect(result.debugInfo?.response).toBeDefined();
    expect(result.debugInfo?.categories).toEqual(['Live-Konzerte']);
    expect(result.debugInfo?.url).toContain('wien.info');
  });
});