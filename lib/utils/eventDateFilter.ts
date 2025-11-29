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
        const weekEnd = new Date(today);
        weekEnd.setDate(weekEnd.getDate() + 7);
        return eventDateOnly >= today && eventDateOnly < weekEnd;
      }
        
      case 'weekend':
      case 'this-weekend': {
        // Calculate next weekend (Friday, Saturday, and Sunday)
        const dayOfWeek = today.getDay();
        let daysUntilFriday: number;
        
        if (dayOfWeek === 5) {
          // Today is Friday - include today, tomorrow, and day after
          daysUntilFriday = 0;
        } else if (dayOfWeek === 6) {
          // Today is Saturday - include today and tomorrow
          daysUntilFriday = -1;
        } else if (dayOfWeek === 0) {
          // Today is Sunday - go back to Friday to include all weekend days
          daysUntilFriday = -2;
        } else {
          // Monday to Thursday - calculate days until Friday
          daysUntilFriday = 5 - dayOfWeek;
        }
        
        const nextFriday = new Date(today);
        nextFriday.setDate(today.getDate() + daysUntilFriday);
        
        const nextMonday = new Date(nextFriday);
        nextMonday.setDate(nextFriday.getDate() + 3);
        
        return eventDateOnly >= nextFriday && eventDateOnly < nextMonday;
      }
        
      case 'next-week': {
        const nextWeekStart = new Date(today);
        nextWeekStart.setDate(nextWeekStart.getDate() + 7);
        const nextWeekEnd = new Date(nextWeekStart);
        nextWeekEnd.setDate(nextWeekEnd.getDate() + 7);
        return eventDateOnly >= nextWeekStart && eventDateOnly < nextWeekEnd;
      }
        
      default:
        return true;
    }
  });
}
