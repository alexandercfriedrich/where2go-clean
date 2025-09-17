import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { eventsCache } from '../cache';
import {
  EVENT_CATEGORIES,
  EVENT_CATEGORY_SUBCATEGORIES,
  mapToMainCategories,
  getSubcategories,
  normalizeCategory
} from '../eventCategories';

describe('Problem Statement Solution (Phase 2B)', () => {
  const city = 'Berlin';
  const date = '2025-01-20';

  beforeEach(()=> eventsCache.clear());
  afterEach(()=> eventsCache.clear());

  it('subcategories collapse to one main category', () => {
    const input = ['Techno/House/EDM','Drum & Bass','Minimal/Deep House'];
    const mapped = mapToMainCategories(input);
    expect(mapped).toEqual(['DJ Sets/Electronic']);
  });

  it('cache write per main category supports later subcategory request', () => {
    const main = 'DJ Sets/Electronic';
    const subs = getSubcategories(main);
    const mockEvents = [{ title:'X', category: main, date, time:'', venue:'V', price:'', website:'' }];
    // Set events under main & simulate subcategory expansion caching
    eventsCache.setEventsByCategory(city, date, main, mockEvents, 300);
    // Simulate you also cache per sub (if you extend logic later)
    subs.forEach(s => eventsCache.setEventsByCategory(city, date, s, mockEvents, 300));
    const result = eventsCache.getEventsByCategories(city, date, subs.slice(0,3));
    expect(result.missingCategories).toHaveLength(0);
  });

  it('normalizeCategory maps tokens', () => {
    expect(normalizeCategory('festival')).toBe('Open Air');
  });

  it('EVENT_CATEGORIES integrity', () => {
    expect(new Set(EVENT_CATEGORIES).size).toBe(20);
  });

  it('subcategories array not empty', () => {
    EVENT_CATEGORIES.forEach(c => {
      const subs = getSubcategories(c);
      expect(subs.length).toBeGreaterThan(0);
      expect(subs[0]).toBe(c);
    });
  });
});
