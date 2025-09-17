import { describe, it, expect } from 'vitest';
import {
  EVENT_CATEGORIES,
  normalizeCategory,
  validateAndNormalizeEvents
} from '../eventCategories';

describe('eventCategories – Normalization & Validation', () => {
  it('should expose exactly 20 unique main categories', () => {
    expect(EVENT_CATEGORIES).toHaveLength(20);
    expect(new Set(EVENT_CATEGORIES).size).toBe(20);
  });

  it('should normalize common tokens', () => {
    expect(normalizeCategory('techno')).toBe('DJ Sets/Electronic');
    expect(normalizeCategory('festival')).toBe('Open Air');
    expect(normalizeCategory('queer')).toBe('LGBTQ+');
    expect(normalizeCategory('kunst')).toBe('Kunst/Design');
  });

  it('should pass through canonical categories unchanged', () => {
    for (const c of EVENT_CATEGORIES) {
      expect(normalizeCategory(c)).toBe(c);
    }
  });

  it('validateAndNormalizeEvents should filter invalid categories', () => {
    const raw = [
      { title: 'Techno Night', category: 'techno' },
      { title: 'Unknown', category: 'galaxy stuff' },
      { title: 'Pride Fest', category: 'pride' }
    ];
    const out = validateAndNormalizeEvents(raw);
    expect(out).toHaveLength(2);
    const cats = out.map(e => e.category);
    expect(cats).toContain('DJ Sets/Electronic');
    expect(cats).toContain('LGBTQ+');
  });

  it('should tolerate events without category gracefully', () => {
    const out = validateAndNormalizeEvents([{ title: 'Mystery Event' }]);
    expect(out).toHaveLength(0);
  });
});