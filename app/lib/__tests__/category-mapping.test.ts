import { describe, it, expect } from 'vitest';
import {
  EVENT_CATEGORIES,
  EVENT_CATEGORY_SUBCATEGORIES,
  normalizeCategory,
  mapToMainCategories,
  getSubcategories
} from '../../lib/eventCategories';

describe('Category Mapping (SSOT)', () => {
  it('has 20 main categories', () => {
    expect(EVENT_CATEGORIES).toHaveLength(20);
  });

  it('each main category present as key', () => {
    EVENT_CATEGORIES.forEach(c => {
      expect(Object.prototype.hasOwnProperty.call(EVENT_CATEGORY_SUBCATEGORIES, c)).toBe(true);
    });
  });

  it('normalizeCategory collapses subcategories to main', () => {
    const techno = normalizeCategory('techno');
    expect(techno).toBe('DJ Sets/Electronic');
  });

  it('mapToMainCategories deduplicates', () => {
    const list = ['Techno/House/EDM','Drum & Bass','DJ Sets/Electronic'];
    const mapped = mapToMainCategories(list);
    expect(mapped).toEqual(['DJ Sets/Electronic']);
  });

  it('getSubcategories returns list including main first', () => {
    const subs = getSubcategories('DJ Sets/Electronic');
    expect(subs[0]).toBe('DJ Sets/Electronic');
    expect(subs).toContain('Trance/Progressive');
  });
});
