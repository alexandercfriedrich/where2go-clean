import { describe, it, expect } from 'vitest';
import { EventAggregator } from '../aggregator';
import { EventData } from '../types';

describe('Deduplication tuning (conservative fuzzy)', () => {
  const aggr = new EventAggregator();

  const base = (over: Partial<EventData> = {}): EventData => ({
    title: 'Same Title',
    category: 'Live-Konzerte',
    date: '2025-01-20',
    time: '20:00',
    venue: 'Venue A',
    price: '€20',
    website: 'https://x',
    ...over,
  });

  it('does not fuzzy-dedup when dates differ', () => {
    const res = aggr.deduplicateEvents([
      base({ date: '2025-01-20' }),
      base({ date: '2025-01-21' }),
    ]);
    expect(res.length).toBe(2);
  });

  it('keeps events when venue strings differ significantly', () => {
    const res = aggr.deduplicateEvents([
      base({ venue: 'Venue Alpha' }),
      base({ venue: 'Venue Beta' }),
    ]);
    expect(res.length).toBe(2);
  });

  it('keeps both when descriptions differ a lot', () => {
    const res = aggr.deduplicateEvents([
      base({ description: 'Short desc' }),
      base({ description: 'Completely different long description with many details for differentiation' }),
    ]);
    expect(res.length).toBe(2);
  });

  it('still removes exact duplicates by title+venue+date', () => {
    const res = aggr.deduplicateEvents([base(), base()]);
    expect(res.length).toBe(1);
  });
});
