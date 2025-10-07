// Schema.org structured data utilities for SEO
import { EventData } from './types';

/**
 * Generates Schema.org WebSite structured data
 */
export function generateWebSiteSchema(url: string = 'https://where2go.example.com') {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Where2Go',
    url: url,
    description: 'Entdecke Events in deiner Stadt - Alle Events. Weltweit. Eine Plattform.',
    inLanguage: 'de',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${url}?city={city}&date={date}`
      },
      'query-input': 'required name=city name=date'
    }
  };
}

/**
 * Generates Schema.org Event structured data for a single event
 */
export function generateEventSchema(event: EventData, baseUrl: string = 'https://where2go.example.com'): object {
  const schema: any = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title,
    startDate: combineDateTime(event.date, event.time),
    location: {
      '@type': 'Place',
      name: event.venue
    }
  };

  // Add endDate if endTime is available
  if (event.endTime) {
    schema.endDate = combineDateTime(event.date, event.endTime);
  }

  // Add address if available
  if (event.address) {
    schema.location.address = {
      '@type': 'PostalAddress',
      streetAddress: event.address
    };
  }

  // Add description if available
  if (event.description) {
    schema.description = event.description;
  }

  // Add offers (pricing) if available
  if (event.price || event.ticketPrice) {
    const priceText = event.ticketPrice || event.price;
    schema.offers = {
      '@type': 'Offer',
      price: extractNumericPrice(priceText),
      priceCurrency: 'EUR',
      availability: 'https://schema.org/InStock',
      url: event.bookingLink || event.website
    };
  }

  // Add event type/category
  if (event.eventType) {
    schema.eventAttendanceMode = 'https://schema.org/OfflineEventAttendanceMode';
    schema.eventStatus = 'https://schema.org/EventScheduled';
  }

  // Add image if available
  if (event.imageUrl) {
    schema.image = event.imageUrl;
  }

  // Add organizer/website info
  if (event.website) {
    schema.url = event.website;
  }

  return schema;
}

/**
 * Generates Schema.org ItemList for event listings
 */
export function generateEventListSchema(
  events: EventData[],
  city: string,
  date: string,
  baseUrl: string = 'https://where2go.example.com'
): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Events in ${city} am ${formatGermanDate(date)}`,
    description: `Liste von ${events.length} Events in ${city}`,
    numberOfItems: events.length,
    itemListElement: events.slice(0, 100).map((event, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: generateEventSchema(event, baseUrl)
    }))
  };
}

/**
 * Combines date (YYYY-MM-DD) and time (HH:mm) into ISO 8601 format
 */
function combineDateTime(date: string, time?: string): string {
  if (!time) {
    return `${date}T00:00:00`;
  }
  return `${date}T${time}:00`;
}

/**
 * Extracts numeric price from text like "Ab 25€" or "25€ - 45€"
 * Returns the lowest price found, or "0" if free/no price
 */
function extractNumericPrice(priceText: string): string {
  if (!priceText) return '0';
  
  // Check for "free" indicators
  if (priceText.toLowerCase().includes('frei') || 
      priceText.toLowerCase().includes('gratis') ||
      priceText.toLowerCase() === 'free') {
    return '0';
  }
  
  // Extract first number from price text
  const match = priceText.match(/(\d+(?:[.,]\d+)?)/);
  return match ? match[1].replace(',', '.') : '0';
}

/**
 * Formats date from YYYY-MM-DD to German format
 */
function formatGermanDate(date: string): string {
  try {
    const [year, month, day] = date.split('-');
    return `${day}.${month}.${year}`;
  } catch {
    return date;
  }
}

/**
 * Generates JSON-LD script tag content for embedding in HTML
 */
export function generateJsonLdScript(schema: object): string {
  return JSON.stringify(schema);
}
