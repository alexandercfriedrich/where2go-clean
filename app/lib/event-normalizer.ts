import { EventData } from './types';

function ensureProtocol(url: string): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (!/^https?:\/\//i.test(trimmed)) return `https://${trimmed}`;
  return trimmed;
}

// Normalize a single event (field synonyms)
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
  const categorySoft = categoryRaw || 'Event'; // Will be canonicalized/filtered later

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
    ageRestrictions: getField(['ageRestrictions', 'age', 'minimum_age', 'age_restriction']),
    source: rawEvent.source
  };

  return normalized;
}

// Normalizer that preserves 'source' field
export function normalizeEvents(events: any): EventData[] {
  if (!Array.isArray(events)) {
    return [];
  }
  
  return events.map((e) => {
    if (!e || typeof e !== 'object') {
      return {
        title: '',
        category: '',
        date: '',
        time: '',
        venue: '',
        price: '',
        website: ''
      };
    }
    
    return normalizeEvent(e);
  });
}
