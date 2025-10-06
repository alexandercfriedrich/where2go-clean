/**
 * Day-Bucket Cache Helpers
 * 
 * Provides utilities for managing day-bucket cache entries including:
 * - Event ID computation
 * - Event validity checking
 * - Cache key generation
 * - Day-bucket read/write operations
 */

import { EventData, DayBucket } from './types';
import { generateEventId } from './eventId';
import { eventsCache } from './cache';

/**
 * Computes a stable event ID for cache lookups.
 * Delegates to the eventId module for consistency.
 */
export function computeEventId(event: EventData): string {
  return generateEventId(event);
}

/**
 * Checks if an event is currently valid (not expired).
 * 
 * Priority order for determining expiry:
 * 1. cacheUntil (if set)
 * 2. endTime (if available as ISO string)
 * 3. time + 3 hours default duration
 * 4. 23:59 on the event day
 * 
 * @param event Event to check
 * @param now Current time (defaults to new Date())
 * @returns true if event is still valid
 */
export function isEventValidNow(event: EventData, now: Date = new Date()): boolean {
  // Try cacheUntil first (highest priority)
  if (event.cacheUntil) {
    try {
      const cacheUntil = new Date(event.cacheUntil);
      if (!isNaN(cacheUntil.getTime())) {
        return now < cacheUntil;
      }
    } catch {
      // Invalid cacheUntil, continue to next check
    }
  }

  // Try endTime (ISO string)
  if (event.endTime) {
    try {
      const endTime = new Date(event.endTime);
      if (!isNaN(endTime.getTime())) {
        return now < endTime;
      }
    } catch {
      // Invalid endTime, continue to next check
    }
  }

  // Try deriving from date + time
  if (event.date) {
    try {
      const eventDate = new Date(event.date.slice(0, 10) + 'T00:00:00');
      
      if (event.time && event.time.trim()) {
        // Parse time (HH:mm format)
        const timeMatch = event.time.match(/^(\d{1,2}):(\d{2})/);
        if (timeMatch) {
          const hours = parseInt(timeMatch[1], 10);
          const minutes = parseInt(timeMatch[2], 10);
          eventDate.setHours(hours, minutes, 0, 0);
          // Add 3 hours default duration
          eventDate.setHours(eventDate.getHours() + 3);
          return now < eventDate;
        }
      }

      // No time specified, valid until end of day (23:59)
      eventDate.setHours(23, 59, 0, 0);
      return now < eventDate;
    } catch {
      // Invalid date format
    }
  }

  // If we can't determine validity, assume valid
  return true;
}

/**
 * Returns the end-of-day timestamp (23:59:00) for a given date.
 * 
 * @param dateISO Date in YYYY-MM-DD format
 * @returns Date object set to 23:59:00 on that day
 */
export function clampDayEnd(dateISO: string): Date {
  const dayEnd = new Date(dateISO.slice(0, 10) + 'T23:59:00');
  return dayEnd;
}

/**
 * Generates the Redis key for a day-bucket.
 * 
 * @param city City name
 * @param dateISO Date in YYYY-MM-DD format
 * @returns Cache key in format: events:v3:day:{city}_{date}
 */
export function getDayKey(city: string, dateISO: string): string {
  return `events:v3:day:${city.toLowerCase().trim()}_${dateISO.slice(0, 10)}`;
}

/**
 * Retrieves all events for a city and date from the day-bucket cache.
 * 
 * @param city City name
 * @param dateISO Date in YYYY-MM-DD format
 * @returns Day-bucket data or null if not cached
 */
export async function getDayEvents(
  city: string,
  dateISO: string
): Promise<{
  events: EventData[];
  index: Record<string, string[]>;
  updatedAt: string;
} | null> {
  const bucket = await eventsCache.getDayEvents(city, dateISO);
  
  if (!bucket) {
    return null;
  }

  const events = Object.values(bucket.eventsById);
  
  return {
    events,
    index: bucket.index,
    updatedAt: bucket.updatedAt
  };
}

/**
 * Upserts events into the day-bucket cache.
 * 
 * Performs intelligent merging:
 * - Non-empty fields win over empty ones
 * - Longer descriptions are preferred
 * - Existing prices/links are preserved
 * - Sources are unioned
 * 
 * @param city City name
 * @param dateISO Date in YYYY-MM-DD format
 * @param events Events to upsert
 */
export async function upsertDayEvents(
  city: string,
  dateISO: string,
  events: EventData[]
): Promise<void> {
  await eventsCache.upsertDayEvents(city, dateISO, events);
}
