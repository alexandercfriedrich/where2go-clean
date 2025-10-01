/**
 * Integration test for Wien.info date normalization with multi-day events
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchWienInfoEvents } from '../sources/wienInfo';

describe('Wien.info Date Normalization Integration', () => {
  let fetchMock: any;

  beforeEach(() => {
    // Store original fetch
    fetchMock = global.fetch;
  });

  afterEach(() => {
    // Restore original fetch
    global.fetch = fetchMock;
  });

  it('should set date to searched day for multi-day exhibition within window', async () => {
    // Mock the Wien.info API response with a multi-day exhibition
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        type: 'events',
        teaserTextMarkup: '',
        items: [
          {
            id: 'exhibition-1',
            title: 'Long Running Exhibition',
            subtitle: 'A great exhibition',
            category: 'Ausstellungen',
            location: 'Museum Wien',
            startDate: '2025-01-01T10:00:00+01:00',
            endDate: '2025-12-31T18:00:00+01:00',
            dates: [], // No specific dates, just a range
            url: '/event/exhibition-1',
            tags: [896982] // Ausstellungen tag
          }
        ]
      })
    });

    const result = await fetchWienInfoEvents({
      fromISO: '2025-09-30',
      toISO: '2025-09-30',
      categories: ['Museen'],
      limit: 100,
      debug: false
    });

    expect(result.events.length).toBe(1);
    // The date should be set to the searched day (2025-09-30)
    // not to the startDate (2025-01-01)
    expect(result.events[0].date).toBe('2025-09-30');
    expect(result.events[0].title).toBe('Long Running Exhibition');
  });

  it('should use specific date from dates array if within window', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        type: 'events',
        teaserTextMarkup: '',
        items: [
          {
            id: 'concert-1',
            title: 'Concert with specific dates',
            category: 'Klassisch',
            location: 'Musikverein',
            startDate: '2025-09-30T20:00:00+01:00',
            endDate: '2025-09-30T22:00:00+01:00',
            dates: ['2025-09-30T20:00:00+01:00', '2025-10-01T20:00:00+01:00'],
            url: '/event/concert-1',
            tags: [896980] // Rock, Pop, Jazz und mehr - matches Live-Konzerte
          }
        ]
      })
    });

    const result = await fetchWienInfoEvents({
      fromISO: '2025-09-30',
      toISO: '2025-09-30',
      categories: ['Live-Konzerte'],
      limit: 100,
      debug: false
    });

    expect(result.events.length).toBe(1);
    // Should use the date from dates array that's within the window
    expect(result.events[0].date).toBe('2025-09-30');
  });

  it('should fallback to startDate for single-day events', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        type: 'events',
        teaserTextMarkup: '',
        items: [
          {
            id: 'event-1',
            title: 'Single Day Event',
            category: 'Theater und Kabarett',
            location: 'Theater Wien',
            startDate: '2025-09-30T19:00:00+01:00',
            dates: ['2025-09-30T19:00:00+01:00'],
            url: '/event/event-1',
            tags: [896988] // Musical, Tanz und Performance - matches Theater/Performance
          }
        ]
      })
    });

    const result = await fetchWienInfoEvents({
      fromISO: '2025-09-30',
      toISO: '2025-09-30',
      categories: ['Theater/Performance'],
      limit: 100,
      debug: false
    });

    expect(result.events.length).toBe(1);
    expect(result.events[0].date).toBe('2025-09-30');
  });

  it('should handle events with no dates array but valid range', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        type: 'events',
        teaserTextMarkup: '',
        items: [
          {
            id: 'festival-1',
            title: 'Summer Festival',
            category: 'Märkte und Messen',
            location: 'Rathausplatz',
            startDate: '2025-09-28T10:00:00+01:00',
            endDate: '2025-10-05T22:00:00+01:00',
            url: '/event/festival-1',
            tags: [896974]
          }
        ]
      })
    });

    const result = await fetchWienInfoEvents({
      fromISO: '2025-09-30',
      toISO: '2025-09-30',
      categories: ['Open Air'],
      limit: 100,
      debug: false
    });

    expect(result.events.length).toBe(1);
    // Should use the searched day since the range intersects
    expect(result.events[0].date).toBe('2025-09-30');
  });

  it('should correctly count and canonicalize categories in debug info', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        type: 'events',
        teaserTextMarkup: '',
        items: [
          {
            id: 'e1',
            title: 'Concert 1',
            category: 'Konzerte klassisch', // Variant
            location: 'Musikverein',
            startDate: '2025-09-30T20:00:00+01:00',
            dates: ['2025-09-30T20:00:00+01:00'],
            url: '/event/e1',
            tags: [896980] // Rock, Pop, Jazz und mehr - matches Live-Konzerte
          },
          {
            id: 'e2',
            title: 'Concert 2',
            category: 'Klassisch', // Canonical
            location: 'Konzerthaus',
            startDate: '2025-09-30T19:00:00+01:00',
            dates: ['2025-09-30T19:00:00+01:00'],
            url: '/event/e2',
            tags: [896980] // Rock, Pop, Jazz und mehr - matches Live-Konzerte
          },
          {
            id: 'e3',
            title: 'Rock Concert',
            category: 'Rock, Pop, Jazz und mehr',
            location: 'Arena',
            startDate: '2025-09-30T21:00:00+01:00',
            dates: ['2025-09-30T21:00:00+01:00'],
            url: '/event/e3',
            tags: [896980] // Rock, Pop, Jazz und mehr - matches Live-Konzerte
          }
        ]
      })
    });

    const result = await fetchWienInfoEvents({
      fromISO: '2025-09-30',
      toISO: '2025-09-30',
      categories: ['Live-Konzerte'],
      limit: 100,
      debug: true
    });

    expect(result.events.length).toBe(3);
    expect(result.debugInfo).toBeDefined();
    
    // Check that categories were canonicalized
    expect(result.debugInfo?.rawCategoryCounts).toBeDefined();
    expect(result.debugInfo?.rawCategoryCounts?.['Klassisch']).toBe(2); // Both variants should be counted under canonical
    expect(result.debugInfo?.rawCategoryCounts?.['Rock, Pop, Jazz und mehr']).toBe(1);
    
    // Check mapped categories
    expect(result.debugInfo?.mappedCategoryCounts).toBeDefined();
    expect(result.debugInfo?.mappedCategoryCounts?.['Live-Konzerte']).toBe(3); // All should map to Live-Konzerte
    
    // Unknown categories should be empty or not include our known categories
    expect(result.debugInfo?.unknownRawCategories).toBeDefined();
    expect(result.debugInfo?.unknownRawCategories?.includes('Klassisch')).toBe(false);
    expect(result.debugInfo?.unknownRawCategories?.includes('Rock, Pop, Jazz und mehr')).toBe(false);
  });

  it('should identify truly unknown categories after canonicalization', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        type: 'events',
        teaserTextMarkup: '',
        items: [
          {
            id: 'e1',
            title: 'Known Event',
            category: 'Klassisch',
            location: 'Musikverein',
            startDate: '2025-09-30T20:00:00+01:00',
            dates: ['2025-09-30T20:00:00+01:00'],
            url: '/event/e1',
            tags: [896980] // Rock, Pop, Jazz und mehr - matches Live-Konzerte
          },
          {
            id: 'e2',
            title: 'Unknown Event',
            category: 'Some Unknown Category',
            location: 'Somewhere',
            startDate: '2025-09-30T20:00:00+01:00',
            dates: ['2025-09-30T20:00:00+01:00'],
            url: '/event/e2',
            tags: [896980] // Rock, Pop, Jazz und mehr - matches Live-Konzerte
          }
        ]
      })
    });

    const result = await fetchWienInfoEvents({
      fromISO: '2025-09-30',
      toISO: '2025-09-30',
      categories: ['Live-Konzerte'],
      limit: 100,
      debug: true
    });

    expect(result.events.length).toBe(2);
    expect(result.debugInfo?.unknownRawCategories).toBeDefined();
    expect(result.debugInfo?.unknownRawCategories?.includes('Some Unknown Category')).toBe(true);
    expect(result.debugInfo?.unknownRawCategories?.includes('Klassisch')).toBe(false);
  });
});
