import { EventData } from './types';

/**
 * Computes TTL in seconds for caching events based on how long they remain current.
 * TTL is set to the time until the earliest event ends.
 * 
 * @param events Array of EventData objects
 * @returns TTL in seconds, minimum 1 hour (3600s), maximum 24 hours
 */
export function computeTTLSecondsForEvents(events: EventData[]): number {
  if (!events || events.length === 0) {
    return 3600; // Default 1 hour for empty events
  }

  const now = new Date();
  let earliestEndTime: Date | null = null;

  for (const event of events) {
    let endTime: Date | null = null;

    // Check if event has explicit cacheUntil
    if (event.cacheUntil) {
      try {
        endTime = new Date(event.cacheUntil);
        if (isNaN(endTime.getTime())) {
          endTime = null;
        }
      } catch {
        endTime = null;
      }
    }

    // If no cacheUntil, derive from date/time
    if (!endTime) {
      endTime = deriveEventEndTime(event.date, event.time);
    }

    // Track the earliest end time
    if (endTime && (!earliestEndTime || endTime < earliestEndTime)) {
      earliestEndTime = endTime;
    }
  }

  // If we found an end time, calculate TTL
  if (earliestEndTime) {
    const ttlMs = earliestEndTime.getTime() - now.getTime();
    const ttlSeconds = Math.floor(ttlMs / 1000);
    
    // Ensure minimum 1 hour (prevents rapid expiration), maximum 24 hours
    // This prevents category cache entries from disappearing too quickly
    return Math.max(3600, Math.min(ttlSeconds, 24 * 60 * 60));
  }

  // Fallback to 1 hour if we can't determine end times
  return 3600;
}

/**
 * Derives event end time from date and time strings
 * 
 * @param dateStr Date string (e.g., "2025-01-20" or "20.01.2025")
 * @param timeStr Time string (e.g., "19:30" or "7:30 PM" or empty)
 * @returns Estimated end time of the event
 */
function deriveEventEndTime(dateStr: string, timeStr: string): Date | null {
  if (!dateStr) {
    return null;
  }

  try {
    // Parse the date
    const eventDate = parseEventDate(dateStr);
    if (!eventDate) {
      return null;
    }

    // Parse the time if provided
    if (timeStr && timeStr.trim()) {
      const eventTime = parseEventTime(timeStr.trim());
      if (eventTime) {
        eventDate.setHours(eventTime.hours, eventTime.minutes, 0, 0);
        // Add 3 hours as default event duration
        eventDate.setHours(eventDate.getHours() + 3);
        return eventDate;
      }
    }

    // For date-only entries, set to 23:59 of that day
    eventDate.setHours(23, 59, 0, 0);
    return eventDate;
  } catch {
    return null;
  }
}

/**
 * Parses various date formats
 */
function parseEventDate(dateStr: string): Date | null {
  // Try ISO format first (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return new Date(dateStr + 'T00:00:00');
  }

  // Try DD.MM.YYYY format
  const ddmmyyyyMatch = dateStr.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (ddmmyyyyMatch) {
    const [, day, month, year] = ddmmyyyyMatch;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }

  // Try MM/DD/YYYY format
  const mmddyyyyMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mmddyyyyMatch) {
    const [, month, day, year] = mmddyyyyMatch;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }

  // Try direct Date parsing as fallback
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Parses various time formats
 */
function parseEventTime(timeStr: string): { hours: number; minutes: number } | null {
  // Try HH:MM format (24-hour)
  const hhmmMatch = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (hhmmMatch) {
    const hours = parseInt(hhmmMatch[1]);
    const minutes = parseInt(hhmmMatch[2]);
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      return { hours, minutes };
    }
  }

  // Try HH:MM AM/PM format
  const ampmMatch = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (ampmMatch) {
    let hours = parseInt(ampmMatch[1]);
    const minutes = parseInt(ampmMatch[2]);
    const isPM = ampmMatch[3].toUpperCase() === 'PM';
    
    if (hours === 12 && !isPM) hours = 0; // 12 AM = 0 hours
    if (hours !== 12 && isPM) hours += 12; // PM hours except 12 PM
    
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      return { hours, minutes };
    }
  }

  // Try H AM/PM format (no minutes)
  const ampmNoMinMatch = timeStr.match(/^(\d{1,2})\s*(AM|PM)$/i);
  if (ampmNoMinMatch) {
    let hours = parseInt(ampmNoMinMatch[1]);
    const isPM = ampmNoMinMatch[2].toUpperCase() === 'PM';
    
    if (hours === 12 && !isPM) hours = 0;
    if (hours !== 12 && isPM) hours += 12;
    
    if (hours >= 0 && hours <= 23) {
      return { hours, minutes: 0 };
    }
  }

  return null;
}