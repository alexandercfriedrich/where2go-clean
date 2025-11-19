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
 * Transform venue event data to EventCard format
 * @param event - Raw event data from venue query
 * @param venue - Venue information
 * @returns Transformed event data compatible with EventCard component
 */
export const transformVenueEventToEventData = (event: any, venue: any) => {
  return {
    ...event,
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