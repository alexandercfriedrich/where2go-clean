/**
 * Event Date Filtering Utilities
 * Shared logic for filtering events by date across all discovery pages
 * 
 * IMPORTANT: All date comparisons use UTC to avoid timezone issues.
 * Event dates are extracted from ISO strings as-is (the date portion is used directly).
 */

/**
 * Get today's date normalized to midnight UTC
 * Uses the server's local date but converts to UTC for consistent comparison
 */
export function getToday(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

/**
 * Parse event date from various formats and normalize to midnight
 * Uses UTC dates to avoid timezone issues when comparing dates
 */
export function parseEventDate(event: { start_date_time?: string; date?: string }): Date | null {
  const dateString = event.start_date_time || event.date;
  if (!dateString) return null;
  
  // For ISO datetime strings, extract the date part directly to avoid timezone issues
  // Format: "2025-12-05T23:00:00.000Z" - we want to extract "2025-12-05" as the event date
  const isoMatch = dateString.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    // Create date at midnight UTC
    return new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day), 0, 0, 0));
  }
  
  // Fallback for other date formats
  const eventDate = new Date(dateString);
  if (isNaN(eventDate.getTime())) return null;
  
  // Normalize to midnight UTC for date-only comparison
  return new Date(Date.UTC(eventDate.getUTCFullYear(), eventDate.getUTCMonth(), eventDate.getUTCDate()));
}

/**
 * Check if an event is in the future (today or later)
 */
export function isEventInFuture(event: { start_date_time?: string; date?: string }): boolean {
  const eventDateOnly = parseEventDate(event);
  if (!eventDateOnly) return false;
  
  const today = getToday();
  return eventDateOnly >= today;
}

/**
 * Filter out past events from an array
 */
export function filterOutPastEvents<T extends { start_date_time?: string; date?: string }>(
  events: T[]
): T[] {
  return events.filter(isEventInFuture);
}

/**
 * Get Sunday of the current week (end of week)
 * Uses UTC for consistent date calculations
 */
export function getSundayOfWeek(date: Date): Date {
  const dayOfWeek = date.getUTCDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
  const sunday = new Date(date);
  sunday.setUTCDate(date.getUTCDate() + daysUntilSunday);
  return sunday;
}

/**
 * Get Monday of next week
 * Uses UTC for consistent date calculations
 */
export function getNextMonday(date: Date): Date {
  const dayOfWeek = date.getUTCDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const daysUntilNextMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
  const nextMonday = new Date(date);
  nextMonday.setUTCDate(date.getUTCDate() + daysUntilNextMonday);
  return nextMonday;
}

/**
 * Filter events by specific date range
 * Uses UTC for consistent date comparisons
 */
export function filterEventsByDateRange<T extends { start_date_time?: string; date?: string }>(
  events: T[],
  filter: string
): T[] {
  // First, always filter out past events
  const futureEvents = filterOutPastEvents(events);
  
  // If filter is 'all', just return future events
  if (filter === 'all') return futureEvents;
  
  const today = getToday();
  const dayOfWeek = today.getUTCDay(); // 0=Sun, 1=Mon, ..., 6=Sat (UTC)
  
  return futureEvents.filter((event) => {
    const eventDateOnly = parseEventDate(event);
    if (!eventDateOnly) return false;
    
    switch (filter) {
      case 'today':
        return eventDateOnly.getTime() === today.getTime();
      
      case 'tomorrow': {
        const tomorrow = new Date(today);
        tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
        return eventDateOnly.getTime() === tomorrow.getTime();
      }
        
      case 'this-week': {
        // From today until end of Sunday (inclusive)
        // "Diese Woche" = alle events bis inkl. kommenden Sonntag
        const sunday = getSundayOfWeek(today);
        const mondayAfter = new Date(sunday);
        mondayAfter.setUTCDate(sunday.getUTCDate() + 1);
        return eventDateOnly >= today && eventDateOnly < mondayAfter;
      }
        
      case 'weekend':
      case 'this-weekend': {
        // Weekend behavior based on current day (UTC):
        // - If Friday (5): show Fr, Sa, So
        // - If Saturday (6): show Sa, So  
        // - If Sunday (0): show only So
        // - If Mon-Thu: show next Fr, Sa, So
        
        let weekendStart: Date;
        let weekendEnd: Date; // Exclusive (Monday after weekend)
        
        if (dayOfWeek === 5) {
          // Today is Friday - show Fr, Sa, So
          weekendStart = new Date(today);
          weekendEnd = new Date(today);
          weekendEnd.setUTCDate(today.getUTCDate() + 3); // Monday
        } else if (dayOfWeek === 6) {
          // Today is Saturday - show Sa, So only
          weekendStart = new Date(today);
          weekendEnd = new Date(today);
          weekendEnd.setUTCDate(today.getUTCDate() + 2); // Monday
        } else if (dayOfWeek === 0) {
          // Today is Sunday - show only Sunday
          weekendStart = new Date(today);
          weekendEnd = new Date(today);
          weekendEnd.setUTCDate(today.getUTCDate() + 1); // Monday
        } else {
          // Monday (1) to Thursday (4) - show next Friday, Saturday, Sunday
          const daysUntilFriday = 5 - dayOfWeek;
          weekendStart = new Date(today);
          weekendStart.setUTCDate(today.getUTCDate() + daysUntilFriday);
          weekendEnd = new Date(weekendStart);
          weekendEnd.setUTCDate(weekendStart.getUTCDate() + 3); // Monday after weekend
        }
        
        return eventDateOnly >= weekendStart && eventDateOnly < weekendEnd;
      }
        
      case 'next-week': {
        // From next Monday to next Sunday (inclusive)
        // "Nächste Woche" = Mo-So der nächsten Woche
        const nextMonday = getNextMonday(today);
        const sundayAfterNextWeek = new Date(nextMonday);
        sundayAfterNextWeek.setUTCDate(nextMonday.getUTCDate() + 7); // Monday after next Sunday
        return eventDateOnly >= nextMonday && eventDateOnly < sundayAfterNextWeek;
      }
        
      default:
        return true;
    }
  });
}
