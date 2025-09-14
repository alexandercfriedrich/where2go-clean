/**
 * Event aggregation and deduplication utilities for the new backend system.
 * This module provides functions for combining and deduplicating events from multiple sources.
 * 
 * @fileoverview Event aggregation utilities with deduplication based on event fingerprints.
 */

import { EventData } from '../types/events';

/**
 * Create a unique fingerprint for an event to detect duplicates.
 * Uses title, venue, date, and time to create a normalized identifier.
 */
function createEventFingerprint(event: EventData): string {
  const normalizeText = (text: string): string => 
    text.toLowerCase()
        .replace(/[^\w\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

  const normalizedTitle = normalizeText(event.title);
  const normalizedVenue = normalizeText(event.venue);
  const date = event.date;
  const time = event.time.replace(/[^\d:]/g, ''); // Remove non-time characters

  return `${normalizedTitle}|${normalizedVenue}|${date}|${time}`;
}

/**
 * Deduplicate an array of events based on their fingerprints.
 * Keeps the first occurrence of each unique event.
 */
export function deduplicateEvents(events: EventData[]): EventData[] {
  const seen = new Set<string>();
  const deduplicated: EventData[] = [];

  for (const event of events) {
    const fingerprint = createEventFingerprint(event);
    if (!seen.has(fingerprint)) {
      seen.add(fingerprint);
      deduplicated.push(event);
    }
  }

  return deduplicated;
}

/**
 * Aggregate and deduplicate events from multiple sources.
 * Combines arrays of events and removes duplicates.
 */
export function aggregateAndDeduplicateEvents(eventArrays: EventData[][]): EventData[] {
  const allEvents = eventArrays.flat();
  return deduplicateEvents(allEvents);
}

/**
 * Sort events by date and time.
 */
export function sortEventsByDateTime(events: EventData[]): EventData[] {
  return [...events].sort((a, b) => {
    // Compare by date first
    const dateComparison = a.date.localeCompare(b.date);
    if (dateComparison !== 0) {
      return dateComparison;
    }

    // If dates are equal, compare by time
    const timeA = a.time.replace(/[^\d:]/g, '');
    const timeB = b.time.replace(/[^\d:]/g, '');
    return timeA.localeCompare(timeB);
  });
}