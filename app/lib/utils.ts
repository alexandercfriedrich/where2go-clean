/**
 * Utility functions for the application
 */

export const generateId = () => `city-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
export const generateWebsiteId = () => `website-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

/**
 * Format a date string for display in German locale
 * @param date - ISO date string or date object
 * @returns Formatted date string (e.g., "Fr, 20.11.2025")
 */
export const formatEventDate = (date: string | Date): string => {
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('de-DE', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return typeof date === 'string' ? date : date.toString();
  }
};

/**
 * Check if a time string represents an all-day event
 * All-day events are marked as "ganztags", "00:00", "00:01", or "01:00"
 * Supabase uses 00:00:01 as the marker for all-day events
 * 
 * @param timeStr - Time string to check
 * @returns true if the time represents an all-day event
 */
export const isAllDayTime = (timeStr: string | undefined | null): boolean => {
  if (!timeStr) return true;
  const normalizedTime = timeStr.trim().toLowerCase();
  return (
    normalizedTime === '00:00' ||
    normalizedTime === '00:01' ||
    normalizedTime === '01:00' ||
    /ganztags|all[- ]?day|ganztagig|fullday/i.test(normalizedTime)
  );
};

/**
 * Create an ISO timestamp from date and time, handling all-day events
 * All-day events use 00:00:01 as the marker to distinguish from midnight events
 * 
 * @param dateStr - Date string in YYYY-MM-DD format
 * @param timeStr - Time string in HH:mm format or all-day indicator
 * @returns ISO 8601 timestamp
 */
export const createEventTimestamp = (dateStr: string | undefined, timeStr: string | undefined): string => {
  if (!dateStr) {
    return new Date().toISOString();
  }
  
  // Handle all-day events with 00:00:01 marker
  if (!timeStr || isAllDayTime(timeStr)) {
    return `${dateStr}T00:00:01.000Z`;
  }
  
  // Validate time format (HH:mm)
  if (/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(timeStr)) {
    return `${dateStr}T${timeStr}:00.000Z`;
  }
  
  // Fallback for invalid time format - treat as all-day
  return `${dateStr}T00:00:01.000Z`;
};

/**
 * Transform venue event data to EventCard format
 * @param event - Raw event data from venue query
 * @param venue - Venue information
 * @returns Transformed event data compatible with EventCard component
 */
export const transformVenueEventToEventData = (event: any, venue: any) => {
  return {
    ...event,
    // Ensure slug is included for proper event detail page navigation
    slug: event.slug,
    date: event.start_date_time
      ? new Date(event.start_date_time).toISOString().split('T')[0]
      : event.date || '',
    time: event.start_date_time
      ? new Date(event.start_date_time).toTimeString().slice(0, 5)
      : event.time || '00:00',
    venue: venue.name,
    address: venue.full_address,
    price: event.price_info || 'Preis auf Anfrage',
    website: event.ticket_url || venue.website || '',
    imageUrl: event.image_urls?.[0] || event.imageUrl,
  };
};