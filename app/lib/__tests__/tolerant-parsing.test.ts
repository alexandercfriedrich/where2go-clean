import { describe, it, expect } from 'vitest';
import { EventAggregator } from '../aggregator';

describe('Tolerant JSON/Event Parsing', () => {
  const aggregator = new EventAggregator();

  it('salvages JSON array embedded in noise', () => {
    const noisy = `
    >>> preface
    [
      {"title":"A","venue":"X","website":"https://a"},
      {"venue":"Y","website":"https://b"}
    ]
    <<< epilogue`;
    const events = aggregator.parseEventsFromResponse(noisy, 'Live-Konzerte', '2025-01-20');
    expect(events.length).toBe(2);
    expect(events.some(e => !e.title && e.parsingWarning)).toBe(true);
  });

  it('extracts JSON objects that do not start at line-begin', () => {
    const mixed = `line text {"title":"Inline 1","website":"https://a"} tail
bullet {"venue":"Club X","website":"https://b"} end`;
    const events = aggregator.parseEventsFromResponse(mixed, 'Clubs/Discos', '2025-01-21');
    expect(events.length).toBe(2);
    expect(events.every(e => e.category === 'Clubs/Discos')).toBe(true);
  });

  it('accepts single-object salvage between braces', () => {
    const single = `random { "title": "One", "website": "https://c" } text`;
    const events = aggregator.parseEventsFromResponse(single, 'Open Air', '2025-07-10');
    expect(events.length).toBe(1);
    expect(events[0].title).toBe('One');
  });

  it('falls back to markdown table parsing', () => {
    const table = `
|Title|Category|Date|Time|Venue|Price|Website|
|---|---|---|---|---|---|---|
|Rock Show|Live-Konzerte|2025-01-20|20:00|Rock Club|20€|https://rockclub.com|
|Jazz Night|Live-Konzerte|2025-01-20|21:00|Jazz Bar|15€|https://jazzbar.com|
`;
    const events = aggregator.parseEventsFromResponse(table);
    expect(events.length).toBe(2);
    expect(events[0].title).toBe('Rock Show');
  });

  it('free-text extraction yields minimal events', () => {
    const free = `Party 20:00 @ Club URL https://tickets.party
Other
21.01.2025 19:30 Jazz @ Blue Note`;
    const events = aggregator.parseEventsFromResponse(free, 'Clubs/Discos', '2025-01-21');
    expect(events.length).toBeGreaterThanOrEqual(2);
    expect(events.every(e => e.category === 'Clubs/Discos')).toBe(true);
  });

  it('adds parsingWarning when title is missing but other fields exist', () => {
    const json = `[{"venue":"Test Venue","website":"https://x"}]`;
    const events = aggregator.parseEventsFromResponse(json, 'Open Air', '2025-07-10');
    expect(events.length).toBe(1);
    expect(events[0].title).toBe('');
    expect(events[0].parsingWarning).toBeTruthy();
  });
});
