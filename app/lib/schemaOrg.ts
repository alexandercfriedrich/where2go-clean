// Schema.org structured data utilities for SEO
import { EventData } from './types';

/**
 * Generates Schema.org WebSite structured data
 */
export function generateWebSiteSchema(url: string = 'https://www.where2go.at') {
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
 * Follows Google Rich Results requirements: https://developers.google.com/search/docs/appearance/structured-data/event
 */
export function generateEventSchema(event: EventData, baseUrl: string = 'https://www.where2go.at'): object {
  const schema: any = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title,
    startDate: combineDateTime(event.date, event.time)
  };

  // Add event attendance mode and status
  schema.eventAttendanceMode = event.eventType === 'online' 
    ? 'https://schema.org/OnlineEventAttendanceMode'
    : 'https://schema.org/OfflineEventAttendanceMode';
  
  schema.eventStatus = 'https://schema.org/EventScheduled';

  // Add endDate - use endTime if available, otherwise estimate +3 hours from start
  // NOTE: 3-hour default duration is a reasonable estimate for most events (concerts, shows, etc.)
  if (event.endTime) {
    schema.endDate = combineDateTime(event.date, event.endTime);
  } else if (event.time && event.time !== '00:00') {
    // Estimate end time as 3 hours after start for events with specific start time
    const [hours, minutes] = event.time.split(':').map(Number);
    const endHours = (hours + 3) % 24;
    const endTime = `${endHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    schema.endDate = combineDateTime(event.date, endTime);
  }

  // Location with address (required by Google)
  schema.location = {
    '@type': 'Place',
    name: event.venue || 'Veranstaltungsort',
    address: {
      '@type': 'PostalAddress',
      ...(event.address && { streetAddress: event.address }),
      addressLocality: event.city || 'Wien',
      addressRegion: event.city || 'Wien',
      addressCountry: 'AT'
    }
  };

  // Add GeoCoordinates if available
  if (event.latitude && event.longitude) {
    schema.location.geo = {
      '@type': 'GeoCoordinates',
      latitude: event.latitude,
      longitude: event.longitude
    };
  }

  // Description (required by Google) - use event description or generate from title
  schema.description = event.description || `${event.title} - Veranstaltung in ${event.city || 'Wien'}`;

  // Image (recommended by Google) - use event image or omit if not available
  if (event.imageUrl) {
    schema.image = [event.imageUrl];
  }

  // Offers (pricing) - always include for Google
  const priceText = event.ticketPrice || event.price;
  const numericPrice = extractNumericPrice(priceText || '0');
  schema.offers = {
    '@type': 'Offer',
    price: numericPrice,
    priceCurrency: 'EUR',
    availability: 'https://schema.org/InStock',
    validFrom: new Date().toISOString().split('T')[0],
    url: event.bookingLink || event.website || `${baseUrl}/events`
  };

  // Organizer (recommended by Google)
  schema.organizer = {
    '@type': 'Organization',
    name: event.venue || 'Where2Go',
    url: event.website || baseUrl
  };

  // Performer (optional but recommended for concerts/shows)
  if (event.category && (
    event.category.toLowerCase().includes('musik') || 
    event.category.toLowerCase().includes('konzert') ||
    event.category.toLowerCase().includes('theater') ||
    event.category.toLowerCase().includes('performance')
  )) {
    schema.performer = {
      '@type': 'PerformingGroup',
      name: event.title.split(' - ')[0] || event.title // Extract performer from title if possible
    };
  }

  // Event URL
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
  baseUrl: string = 'https://www.where2go.at'
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

/**
 * Generates microdata attributes for HTML elements
 * Returns a Record of attribute names to values that can be spread onto HTML elements
 */
export function generateEventMicrodata(event: EventData): Record<string, string> {
  const microdata: Record<string, string> = {
    itemScope: '',
    itemType: 'https://schema.org/Event'
  };

  return microdata;
}

/**
 * Generates individual microdata property attributes
 * Used for specific elements within an event card
 */
export function generateMicrodataProps(property: string, content?: string): Record<string, string> {
  if (!content) return {};
  
  return {
    itemprop: property,
    content: content
  };
}

/**
 * Generates a canonical URL for an event
 * Format: {baseUrl}/events/{citySlug}/{slug}
 * Uses the database slug if available, otherwise generates one
 */
export function generateCanonicalUrl(event: EventData, baseUrl: string = 'https://www.where2go.at'): string {
  // Import is at top of file, but we need the function here
  const { generateEventSlug, normalizeCitySlug } = require('./slugGenerator');
  
  // Use database slug if available, otherwise generate from event data
  const eventSlug = event.slug || generateEventSlug({
    title: event.title,
    venue: event.venue,
    date: event.date
  });
  
  const citySlug = normalizeCitySlug(event.city || event.venue || 'unknown');
  
  return `${baseUrl}/events/${citySlug}/${eventSlug}`;
}

/**
 * Alias for generateEventSchema for backwards compatibility with the specification
 */
export function generateEventJsonLd(event: EventData, baseUrl?: string): object {
  return generateEventSchema(event, baseUrl);
}

/**
 * Generates Schema.org LocalBusiness structured data for venues in Vienna
 */
export function generateLocalBusinessSchema(
  venue: {
    name: string;
    address?: string;
    latitude?: number;
    longitude?: number;
    url?: string;
    description?: string;
  },
  baseUrl: string = 'https://www.where2go.at'
): object {
  const schema: any = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: venue.name
  };

  // Add address as PostalAddress (proper Schema.org format)
  schema.address = {
    '@type': 'PostalAddress',
    ...(venue.address && { streetAddress: venue.address }),
    addressLocality: 'Wien',
    addressCountry: 'AT'
  };

  if (venue.latitude && venue.longitude) {
    schema.geo = {
      '@type': 'GeoCoordinates',
      latitude: venue.latitude,
      longitude: venue.longitude
    };
  }

  if (venue.url) {
    schema.url = venue.url;
  }

  if (venue.description) {
    schema.description = venue.description;
  }

  return schema;
}

/**
 * Generates Schema.org Place structured data for Vienna
 */
export function generateViennaPlaceSchema(): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'Place',
    name: 'Wien',
    alternateName: 'Vienna',
    geo: {
      '@type': 'GeoCoordinates',
      latitude: 48.2082,
      longitude: 16.3738
    },
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Wien',
      addressCountry: 'AT'
    }
  };
}

/**
 * Generates Schema.org FAQPage structured data
 */
export function generateFAQPageSchema(faqs: Array<{ question: string; answer: string }>): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer
      }
    }))
  };
}

/**
 * Generates Schema.org HowTo structured data
 */
export function generateHowToSchema(
  title: string,
  steps: Array<{ name: string; text: string }>,
  description?: string
): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: title,
    description: description || title,
    step: steps.map((step, index) => ({
      '@type': 'HowToStep',
      position: index + 1,
      name: step.name,
      text: step.text
    }))
  };
}

/**
 * Generates Schema.org BreadcrumbList structured data
 */
export function generateBreadcrumbSchema(
  breadcrumbs: Array<{ name: string; url: string }>,
  baseUrl: string = 'https://www.where2go.at'
): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: crumb.url.startsWith('http') ? crumb.url : `${baseUrl}${crumb.url}`
    }))
  };
}
