import { describe, it, expect } from 'vitest';
import { buildCategoryListForPrompt, EVENT_CATEGORIES } from '../eventCategories';

describe('Prompt Invariants', () => {
  it('buildCategoryListForPrompt returns one numbered line per category', () => {
    const list = buildCategoryListForPrompt();
    const lines = list.trim().split('\n');
    expect(lines).toHaveLength(EVENT_CATEGORIES.length);
    lines.forEach((line, idx) => {
      expect(line.startsWith(`${idx + 1}. `)).toBe(true);
    });
  });
});