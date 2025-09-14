/**
 * Cache utility functions for the new backend system.
 * This module provides TTL computation and cache management utilities.
 * 
 * @fileoverview Cache utilities with smart TTL computation based on event timing.
 */

import { EventData } from '../types/events';

/**
 * Computes TTL in seconds for caching events based on how long they remain current.
 * TTL is set to the time until the earliest event ends.
 * 
 * @param events Array of EventData objects
 * @returns TTL in seconds, minimum 60 seconds, maximum 24 hours
 */
export function computeTTLSecondsForEvents(events: EventData[]): number {
  if (!events || events.length === 0) {
    return 300; // Default 5 minutes for empty events
  }

  const now = new Date();
  let earliestEndTime: Date | null = null;

  for (const event of events) {
    let endTime: Date | null = null;

    // Try to parse event date and time
    try {
      const eventDate = new Date(event.date);
      if (!isNaN(eventDate.getTime())) {
        // Use end time if available, otherwise add 3 hours to start time
        if (event.endTime) {
          const [endHours, endMinutes] = event.endTime.split(':').map(Number);
          if (!isNaN(endHours) && !isNaN(endMinutes)) {
            endTime = new Date(eventDate);
            endTime.setHours(endHours, endMinutes, 0, 0);
          }
        } else if (event.time) {
          const [startHours, startMinutes] = event.time.split(':').map(Number);
          if (!isNaN(startHours) && !isNaN(startMinutes)) {
            endTime = new Date(eventDate);
            endTime.setHours(startHours + 3, startMinutes, 0, 0); // Assume 3-hour duration
          }
        }
      }
    } catch {
      // Ignore parsing errors
    }

    if (endTime && (earliestEndTime === null || endTime < earliestEndTime)) {
      earliestEndTime = endTime;
    }
  }

  if (earliestEndTime && earliestEndTime > now) {
    const ttlMs = earliestEndTime.getTime() - now.getTime();
    const ttlSeconds = Math.floor(ttlMs / 1000);
    
    // Clamp between 60 seconds and 24 hours
    return Math.max(60, Math.min(ttlSeconds, 86400));
  }

  // Default TTL if no valid end times found
  return 3600; // 1 hour
}

/**
 * Generate a cache key for event search results.
 */
export function generateEventsCacheKey(city: string, date: string, categories: string[]): string {
  const normalizedCity = city.toLowerCase().trim();
  const sortedCategories = [...categories].sort().join(',');
  return `events:${normalizedCity}:${date}:${sortedCategories}`;
}

/**
 * Check if a cache entry is still valid based on TTL.
 */
export function isCacheEntryValid(timestamp: number, ttlSeconds: number): boolean {
  const now = Date.now();
  const age = (now - timestamp) / 1000;
  return age < ttlSeconds;
}