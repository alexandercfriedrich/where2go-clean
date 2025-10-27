import { EventData } from './types';

/**
 * Normalizes a string for consistent event ID generation.
 * Applies lowercase, NFKD normalization, strips punctuation, and collapses whitespace.
 * 
 * This matches the normalization used in EventAggregator.deduplicateEvents
 * to ensure consistent event identification.
 */
export function normalizeForEventId(s: string): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Generates a stable event ID from an event's key attributes.
 * 
 * The eventId is constructed from:
 * - Normalized title
 * - Date (first 10 chars, typically YYYY-MM-DD)
 * - Normalized venue (or time if venue is empty to differentiate events)
 * 
 * This creates a deterministic key that's consistent across multiple ingestions
 * of the same event from different sources.
 * 
 * NOTE: When venue is empty, we include time to avoid false duplicates
 * for events with same title on same day but different times.
 * 
 * @param event The event to generate an ID for
 * @returns A stable string identifier
 */
export function generateEventId(event: EventData): string {
  const title = normalizeForEventId(event.title);
  const date = (event.date || '').slice(0, 10);
  const venue = normalizeForEventId(event.venue);
  
  // If venue is empty or very short, include time to differentiate events
  // This prevents false duplicates like "Concert" on same day at different venues
  if (!venue || venue.length < 3) {
    const time = normalizeForEventId(event.time || '');
    return `${title}|${date}|${time}`;
  }
  
  return `${title}|${date}|${venue}`;
}
