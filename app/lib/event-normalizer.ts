// Event normalization utility (Phase 2A adjusted)
// Aufgabe: Feld-Synonyme vereinheitlichen + URLs säubern.
// Kategorie-Kanonisierung erfolgt über eventCategories.validateAndNormalizeEvents später im Aggregator.
// Hier führen wir nur eine weiche Normalisierung (Lowercase Tokens → Roh-Kategorie bleibt stehen).

import { EventData } from './types';
import { normalizeCategory } from './eventCategories';

function ensureProtocol(url: string): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (!/^https?:\/\//i.test(trimmed)) return `https://${trimmed}`;
  return trimmed;
}

// Normalisiert ein einzelnes Event (Feldsynonyme)
export function normalizeEvent(rawEvent: any): EventData {
  const getField = (names: string[]): string => {
    for (const n of names) {
      const val = rawEvent?.[n];
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        return String(val).trim();
      }
    }
    return '';
  };

  const categoryRaw = getField(['category', 'type', 'categories', 'eventType']);
  const categorySoft = categoryRaw || 'Event'; // Wird später kanonisiert/gefiltert

  const normalized: EventData = {
    title: getField(['title', 'name', 'eventTitle', 'event_name', 'eventName']),
    category: categorySoft,
    date: getField(['date', 'dateISO', 'date_str', 'startDate', 'eventDate']),
    time: getField(['time', 'start_time', 'startTime', 'eventTime']),
    venue: getField(['venue', 'location', 'place', 'venueName', 'eventVenue']),
    price: getField(['price', 'ticketPrice', 'cost', 'eventPrice']) || 'Preis auf Anfrage',
    website: ensureProtocol(getField(['website', 'url', 'link', 'source', 'source_url', 'eventUrl'])),

    endTime: getField(['endTime', 'end_time', 'endingTime']),
    address: getField(['address', 'address_line', 'fullAddress', 'venueAddress']),
    ticketPrice: getField(['ticketPrice', 'ticket_price', 'tickets_price']),
    eventType: getField(['eventType', 'type', 'categoryType', 'event_type']),
    description: getField(['description', 'summary', 'shortDescription', 'desc']),
    bookingLink: ensureProtocol(getField(['bookingLink', 'tickets_url', 'ticket', 'ticket_url', 'ticketLink', 'booking_url'])),
    ageRestrictions: getField(['ageRestrictions', 'age', 'minimum_age', 'age_restriction'])
  };

  return normalized;
}

// Array-Normalisierung
export function normalizeEvents(rawEvents: any[]): EventData[] {
  if (!Array.isArray(rawEvents)) return [];
  return rawEvents.map(normalizeEvent);
}
