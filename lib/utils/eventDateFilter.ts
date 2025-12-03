/**
 * Event Date Filtering Utilities
 * Shared logic for filtering events by date across all discovery pages
 */

/**
 * Get today's date normalized to midnight in local timezone
 */
export function getToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/**
 * Parse event date from various formats and normalize to midnight
 */
export function parseEventDate(event: { start_date_time?: string; date?: string }): Date | null {
  const eventDate = event.start_date_time 
    ? new Date(event.start_date_time)
    : event.date 
      ? new Date(event.date)
      : null;
  
  if (!eventDate || isNaN(eventDate.getTime())) return null;
  
  // Normalize to midnight for date-only comparison
  return new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
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
 */
export function getSundayOfWeek(date: Date): Date {
  const dayOfWeek = date.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
  const sunday = new Date(date);
  sunday.setDate(date.getDate() + daysUntilSunday);
  return sunday;
}

/**
 * Get Monday of next week
 */
export function getNextMonday(date: Date): Date {
  const dayOfWeek = date.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const daysUntilNextMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
  const nextMonday = new Date(date);
  nextMonday.setDate(date.getDate() + daysUntilNextMonday);
  return nextMonday;
}

/**
 * Filter events by specific date range
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
  const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  
  return futureEvents.filter((event) => {
    const eventDateOnly = parseEventDate(event);
    if (!eventDateOnly) return false;
    
    switch (filter) {
      case 'today':
        return eventDateOnly.getTime() === today.getTime();
      
      case 'tomorrow': {
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        return eventDateOnly.getTime() === tomorrow.getTime();
      }
        
      case 'this-week': {
        // From today until end of Sunday (inclusive)
        // "Diese Woche" = alle events bis inkl. kommenden Sonntag
        const sunday = getSundayOfWeek(today);
        const mondayAfter = new Date(sunday);
        mondayAfter.setDate(sunday.getDate() + 1);
        return eventDateOnly >= today && eventDateOnly < mondayAfter;
      }
        
      case 'weekend':
      case 'this-weekend': {
        // Weekend behavior based on current day:
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
          weekendEnd.setDate(today.getDate() + 3); // Monday
        } else if (dayOfWeek === 6) {
          // Today is Saturday - show Sa, So only
          weekendStart = new Date(today);
          weekendEnd = new Date(today);
          weekendEnd.setDate(today.getDate() + 2); // Monday
        } else if (dayOfWeek === 0) {
          // Today is Sunday - show only Sunday
          weekendStart = new Date(today);
          weekendEnd = new Date(today);
          weekendEnd.setDate(today.getDate() + 1); // Monday
        } else {
          // Monday (1) to Thursday (4) - show next Friday, Saturday, Sunday
          const daysUntilFriday = 5 - dayOfWeek;
          weekendStart = new Date(today);
          weekendStart.setDate(today.getDate() + daysUntilFriday);
          weekendEnd = new Date(weekendStart);
          weekendEnd.setDate(weekendStart.getDate() + 3); // Monday after weekend
        }
        
        return eventDateOnly >= weekendStart && eventDateOnly < weekendEnd;
      }
        
      case 'next-week': {
        // From next Monday to next Sunday (inclusive)
        // "Nächste Woche" = Mo-So der nächsten Woche
        const nextMonday = getNextMonday(today);
        const sundayAfterNextWeek = new Date(nextMonday);
        sundayAfterNextWeek.setDate(nextMonday.getDate() + 7); // Monday after next Sunday
        return eventDateOnly >= nextMonday && eventDateOnly < sundayAfterNextWeek;
      }
        
      default:
        return true;
    }
  });
}
