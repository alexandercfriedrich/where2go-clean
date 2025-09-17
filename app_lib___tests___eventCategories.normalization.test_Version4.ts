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
  });

  it('validateAndNormalizeEvents filters invalid + normalizes valid', () => {
    const raw = [
      { title: 'Techno Night', category: 'techno' },
      { title: 'Pride Parade', category: 'pride' },
      { title: 'Mystery', category: 'unicorn' }
    ];
    const out = validateAndNormalizeEvents(raw);
    expect(out).toHaveLength(2);
  });

  it('isValidCategory only accepts canonical main categories', () => {
    expect(isValidCategory('DJ Sets/Electronic')).toBe(true);
    expect(isValidCategory('techno')).toBe(false);
  });

  it('NORMALIZATION_TOKEN_MAP size sanity', () => {
    expect(Object.keys(NORMALIZATION_TOKEN_MAP).length).toBeGreaterThan(40);
  });
});