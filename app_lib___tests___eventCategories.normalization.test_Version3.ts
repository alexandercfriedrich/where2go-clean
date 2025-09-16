import { describe, it, expect } from 'vitest';
import {
  EVENT_CATEGORIES,
  normalizeCategory,
  isValidCategory,
  validateAndNormalizeEvents,
  NORMALIZATION_TOKEN_MAP
} from '../eventCategories';

describe('Event Category Normalization & Invariants', () => {
  it('should expose exactly 20 main categories (unique)', () => {
    expect(EVENT_CATEGORIES).toHaveLength(20);
    expect(new Set(EVENT_CATEGORIES).size).toBe(20);
  });

  it('token map baseline mappings', () => {
    expect(normalizeCategory('techno')).toBe('DJ Sets/Electronic');
    expect(normalizeCategory('festival')).toBe('Open Air');
    expect(normalizeCategory('queer')).toBe('LGBTQ+');
    expect(normalizeCategory('rave')).toBe('Clubs/Discos');
    expect(normalizeCategory('wein')).toBe('Food/Culinary');
    expect(normalizeCategory('workshop')).toBe('Bildung/Lernen');
    expect(normalizeCategory('startup')).toBe('Networking/Business');
    expect(normalizeCategory('hiking')).toBe('Natur/Outdoor');
    expect(normalizeCategory('kultur')).toBe('Kultur/Traditionen');
    expect(normalizeCategory('markt')).toBe('Märkte/Shopping');
    expect(normalizeCategory('volunteer')).toBe('Soziales/Community');
  });

  it('subcategory resolution (existing definition)', () => {
    // Provided we listed "Techno/House/EDM" as subcategory for DJ Sets/Electronic
    expect(normalizeCategory('Techno/House/EDM')).toBe('DJ Sets/Electronic');
    expect(normalizeCategory('Nightclubs')).toBe('Clubs/Discos');
    expect(normalizeCategory('Rock/Pop/Alternative')).toBe('Live-Konzerte');
  });

  it('case-insensitive main category matching', () => {
    expect(normalizeCategory('dj sets/electronic')).toBe('DJ Sets/Electronic');
    expect(normalizeCategory('live-konzerte')).toBe('Live-Konzerte');
  });

  it('unknown tokens return original and are invalid', () => {
    const unknown = 'unicorn-x';
    const norm = normalizeCategory(unknown);
    expect(norm).toBe(unknown); // returned unchanged
    expect(isValidCategory(norm)).toBe(false);
  });

  it('validateAndNormalizeEvents filters invalid + normalizes valid', () => {
    const raw = [
      { title: 'Techno Night', category: 'techno' },
      { title: 'Pride Parade', category: 'pride' },
      { title: 'Mystery', category: 'unicorn' }
    ];
    const out = validateAndNormalizeEvents(raw);
    expect(out).toHaveLength(2);
    const cats = out.map(e => e.category).sort();
    expect(cats).toEqual(['DJ Sets/Electronic','LGBTQ+'].sort());
  });

  it('isValidCategory only accepts canonical main categories', () => {
    expect(isValidCategory('DJ Sets/Electronic')).toBe(true);
    expect(isValidCategory('techno')).toBe(false);
  });

  it('NORMALIZATION_TOKEN_MAP size sanity', () => {
    expect(Object.keys(NORMALIZATION_TOKEN_MAP).length).toBeGreaterThan(40);
  });
});