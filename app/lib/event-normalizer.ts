// Event normalization utility for mapping various field names to UI expected format

import { EventData } from './types';

/**
 * Normalizes a single event object by mapping common synonyms to expected field names
 * and ensuring proper data formatting.
 */
export function normalizeEvent(rawEvent: any): EventData {
  // Helper to get first available value from array of possible field names
  const getField = (fieldNames: string[]): string => {
    for (const name of fieldNames) {
      const value = rawEvent[name];
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        return String(value).trim();
      }
    }
    return '';
  };

  // Helper to normalize URLs - ensure they have a protocol
  const normalizeUrl = (url: string): string => {
    if (!url) return '';
    const trimmed = url.trim();
    if (!trimmed) return '';
    
    // Add https:// if no protocol is present
    if (!trimmed.match(/^https?:\/\//i)) {
      return `https://${trimmed}`;
    }
    return trimmed;
  };

  // Map fields using common synonyms
  const normalized: EventData = {
    // Required fields
    title: getField(['title', 'name', 'eventTitle', 'event_name', 'eventName']),
    category: getField(['category', 'type', 'categories', 'eventType']) || 'Event',
    date: getField(['date', 'dateISO', 'date_str', 'startDate', 'eventDate']),
    time: getField(['time', 'start_time', 'startTime', 'eventTime']),
    venue: getField(['venue', 'location', 'place', 'venueName', 'eventVenue']),
    price: getField(['price', 'ticketPrice', 'cost', 'eventPrice']) || 'Preis auf Anfrage',
    website: normalizeUrl(getField(['website', 'url', 'link', 'source', 'source_url', 'eventUrl'])),

    // Optional fields
    endTime: getField(['endTime', 'end_time', 'endingTime']),
    address: getField(['address', 'address_line', 'fullAddress', 'venueAddress']),
    ticketPrice: getField(['ticketPrice', 'ticket_price', 'tickets_price']),
    eventType: getField(['eventType', 'type', 'categoryType', 'event_type']),
    description: getField(['description', 'summary', 'shortDescription', 'desc']),
    bookingLink: normalizeUrl(getField(['bookingLink', 'tickets_url', 'ticket', 'ticket_url', 'ticketLink', 'booking_url'])),
    ageRestrictions: getField(['ageRestrictions', 'age', 'minimum_age', 'age_restriction'])
  };

  return normalized;
}

/**
 * Normalizes an array of event objects
 */
export function normalizeEvents(rawEvents: any[]): EventData[] {
  if (!Array.isArray(rawEvents)) {
    return [];
  }

  return rawEvents.map(normalizeEvent);
}