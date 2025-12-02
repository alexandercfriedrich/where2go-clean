import { describe, it, expect } from 'vitest';
import {
  generateWebSiteSchema,
  generateEventSchema,
  generateEventListSchema,
  generateJsonLdScript,
  generateEventMicrodata,
  generateCanonicalUrl,
  generateEventJsonLd,
  generateLocalBusinessSchema,
  generateViennaPlaceSchema,
  generateFAQPageSchema,
  generateHowToSchema,
  generateBreadcrumbSchema
} from '../schemaOrg';
import { EventData } from '../types';

describe('Schema.org Utilities', () => {
  describe('generateWebSiteSchema', () => {
    it('should generate valid WebSite schema', () => {
      const schema = generateWebSiteSchema('https://where2go.com');
      
      expect(schema['@context']).toBe('https://schema.org');
      expect(schema['@type']).toBe('WebSite');
      expect(schema.name).toBe('Where2Go');
      expect(schema.url).toBe('https://where2go.com');
      expect(schema.description).toBeTruthy();
      expect(schema.inLanguage).toBe('de');
    });

    it('should include SearchAction for search functionality', () => {
      const schema = generateWebSiteSchema('https://where2go.com');
      
      expect(schema.potentialAction).toBeDefined();
      expect(schema.potentialAction['@type']).toBe('SearchAction');
      expect(schema.potentialAction.target).toBeDefined();
      expect(schema.potentialAction['query-input']).toBeTruthy();
    });

    it('should use default URL if not provided', () => {
      const schema = generateWebSiteSchema();
      
      expect(schema.url).toBe('https://www.where2go.at');
    });
  });

  describe('generateEventSchema', () => {
    it('should generate valid Event schema with required fields', () => {
      const event: EventData = {
        title: 'Test Concert',
        category: 'Live-Konzerte',
        date: '2025-01-20',
        time: '19:30',
        venue: 'Test Arena',
        price: '25€',
        website: 'https://example.com'
      };

      const schema = generateEventSchema(event);
      
      expect(schema['@context']).toBe('https://schema.org');
      expect(schema['@type']).toBe('Event');
      expect(schema.name).toBe('Test Concert');
      expect(schema.startDate).toBe('2025-01-20T19:30:00');
      expect(schema.location).toBeDefined();
      expect(schema.location['@type']).toBe('Place');
      expect(schema.location.name).toBe('Test Arena');
    });

    it('should include endDate when endTime is provided', () => {
      const event: EventData = {
        title: 'Test Event',
        category: 'Music',
        date: '2025-01-20',
        time: '19:00',
        endTime: '23:00',
        venue: 'Test Venue',
        price: '10€',
        website: 'https://example.com'
      };

      const schema = generateEventSchema(event);
      
      expect(schema.endDate).toBe('2025-01-20T23:00:00');
    });

    it('should include address when provided', () => {
      const event: EventData = {
        title: 'Test Event',
        category: 'Music',
        date: '2025-01-20',
        time: '19:00',
        venue: 'Test Venue',
        address: 'Teststraße 123, 1010 Wien',
        price: '10€',
        website: 'https://example.com'
      };

      const schema = generateEventSchema(event);
      
      expect(schema.location.address).toBeDefined();
      expect(schema.location.address['@type']).toBe('PostalAddress');
      expect(schema.location.address.streetAddress).toBe('Teststraße 123, 1010 Wien');
    });

    it('should include description when provided', () => {
      const event: EventData = {
        title: 'Test Event',
        category: 'Music',
        date: '2025-01-20',
        time: '19:00',
        venue: 'Test Venue',
        price: '10€',
        website: 'https://example.com',
        description: 'A great test event'
      };

      const schema = generateEventSchema(event);
      
      expect(schema.description).toBe('A great test event');
    });

    it('should include offers with price information', () => {
      const event: EventData = {
        title: 'Test Event',
        category: 'Music',
        date: '2025-01-20',
        time: '19:00',
        venue: 'Test Venue',
        price: 'Ab 25€',
        website: 'https://example.com'
      };

      const schema = generateEventSchema(event);
      
      expect(schema.offers).toBeDefined();
      expect(schema.offers['@type']).toBe('Offer');
      expect(schema.offers.price).toBe('25');
      expect(schema.offers.priceCurrency).toBe('EUR');
      expect(schema.offers.availability).toBe('https://schema.org/InStock');
    });

    it('should prefer ticketPrice over price for offers', () => {
      const event: EventData = {
        title: 'Test Event',
        category: 'Music',
        date: '2025-01-20',
        time: '19:00',
        venue: 'Test Venue',
        price: 'Ab 25€',
        ticketPrice: '30€',
        website: 'https://example.com'
      };

      const schema = generateEventSchema(event);
      
      expect(schema.offers.price).toBe('30');
    });

    it('should include bookingLink in offers if available', () => {
      const event: EventData = {
        title: 'Test Event',
        category: 'Music',
        date: '2025-01-20',
        time: '19:00',
        venue: 'Test Venue',
        price: '25€',
        website: 'https://example.com',
        bookingLink: 'https://tickets.example.com'
      };

      const schema = generateEventSchema(event);
      
      expect(schema.offers.url).toBe('https://tickets.example.com');
    });

    it('should include image when provided', () => {
      const event: EventData = {
        title: 'Test Event',
        category: 'Music',
        date: '2025-01-20',
        time: '19:00',
        venue: 'Test Venue',
        price: '10€',
        website: 'https://example.com',
        imageUrl: 'https://example.com/image.jpg'
      };

      const schema = generateEventSchema(event);
      
      expect(schema.image).toBe('https://example.com/image.jpg');
    });

    it('should handle free events correctly', () => {
      const event: EventData = {
        title: 'Free Event',
        category: 'Music',
        date: '2025-01-20',
        time: '19:00',
        venue: 'Test Venue',
        price: 'Frei',
        website: 'https://example.com'
      };

      const schema = generateEventSchema(event);
      
      expect(schema.offers.price).toBe('0');
    });
  });

  describe('generateEventListSchema', () => {
    it('should generate valid ItemList schema', () => {
      const events: EventData[] = [
        {
          title: 'Event 1',
          category: 'Music',
          date: '2025-01-20',
          time: '19:00',
          venue: 'Venue 1',
          price: '10€',
          website: 'https://example.com'
        },
        {
          title: 'Event 2',
          category: 'Theater',
          date: '2025-01-20',
          time: '20:00',
          venue: 'Venue 2',
          price: '15€',
          website: 'https://example.com'
        }
      ];

      const schema = generateEventListSchema(events, 'Wien', '2025-01-20');
      
      expect(schema['@context']).toBe('https://schema.org');
      expect(schema['@type']).toBe('ItemList');
      expect(schema.numberOfItems).toBe(2);
      expect(schema.itemListElement).toHaveLength(2);
    });

    it('should include positioned ListItems', () => {
      const events: EventData[] = [
        {
          title: 'Event 1',
          category: 'Music',
          date: '2025-01-20',
          time: '19:00',
          venue: 'Venue 1',
          price: '10€',
          website: 'https://example.com'
        }
      ];

      const schema = generateEventListSchema(events, 'Wien', '2025-01-20');
      
      expect(schema.itemListElement[0]['@type']).toBe('ListItem');
      expect(schema.itemListElement[0].position).toBe(1);
      expect(schema.itemListElement[0].item).toBeDefined();
      expect(schema.itemListElement[0].item['@type']).toBe('Event');
    });

    it('should limit to 100 events maximum', () => {
      const events: EventData[] = Array.from({ length: 150 }, (_, i) => ({
        title: `Event ${i + 1}`,
        category: 'Music',
        date: '2025-01-20',
        time: '19:00',
        venue: 'Venue',
        price: '10€',
        website: 'https://example.com'
      }));

      const schema = generateEventListSchema(events, 'Wien', '2025-01-20');
      
      expect(schema.numberOfItems).toBe(150);
      expect(schema.itemListElement).toHaveLength(100);
    });

    it('should include city and date in name', () => {
      const events: EventData[] = [
        {
          title: 'Event 1',
          category: 'Music',
          date: '2025-01-20',
          time: '19:00',
          venue: 'Venue 1',
          price: '10€',
          website: 'https://example.com'
        }
      ];

      const schema = generateEventListSchema(events, 'Berlin', '2025-02-14');
      
      expect(schema.name).toContain('Berlin');
      expect(schema.name).toContain('14.02.2025');
    });
  });

  describe('generateJsonLdScript', () => {
    it('should convert schema object to JSON string', () => {
      const schema = {
        '@context': 'https://schema.org',
        '@type': 'Event',
        name: 'Test Event'
      };

      const jsonLd = generateJsonLdScript(schema);
      
      expect(typeof jsonLd).toBe('string');
      expect(jsonLd).toContain('"@context":"https://schema.org"');
      expect(jsonLd).toContain('"@type":"Event"');
      expect(jsonLd).toContain('"name":"Test Event"');
    });

    it('should handle complex nested structures', () => {
      const schema = {
        '@context': 'https://schema.org',
        '@type': 'Event',
        location: {
          '@type': 'Place',
          name: 'Venue'
        }
      };

      const jsonLd = generateJsonLdScript(schema);
      const parsed = JSON.parse(jsonLd);
      
      expect(parsed.location['@type']).toBe('Place');
      expect(parsed.location.name).toBe('Venue');
    });
  });

  describe('generateEventMicrodata', () => {
    it('should generate basic microdata attributes', () => {
      const event: EventData = {
        title: 'Test Event',
        category: 'Music',
        date: '2025-01-20',
        time: '19:00',
        venue: 'Test Venue',
        price: '10€',
        website: 'https://example.com'
      };

      const microdata = generateEventMicrodata(event);
      
      expect(microdata.itemScope).toBeDefined();
      expect(microdata.itemType).toBe('https://schema.org/Event');
    });
  });

  describe('generateCanonicalUrl', () => {
    it('should generate valid canonical URL', () => {
      const event: EventData = {
        title: 'Summer Festival 2025',
        category: 'Music',
        date: '2025-06-15',
        time: '18:00',
        venue: 'Central Park',
        city: 'Berlin',
        price: '25€',
        website: 'https://example.com',
        slug: 'summer-festival-2025-central-park-2025-06-15-abc12345' // Database slug with UUID suffix
      };

      const url = generateCanonicalUrl(event, 'https://where2go.com');
      
      expect(url).toBe('https://where2go.com/events/berlin/summer-festival-2025-central-park-2025-06-15-abc12345');
    });

    it('should return null when no database slug is provided', () => {
      const event: EventData = {
        title: 'Rock & Roll Night!!!',
        category: 'Music',
        date: '2025-01-20',
        time: '19:00',
        venue: 'Music Hall',
        city: 'Wien',
        price: '10€',
        website: 'https://example.com'
        // No slug field - should return null
      };

      const url = generateCanonicalUrl(event);
      
      // Should return null when slug is missing to prevent URL mismatch
      expect(url).toBeNull();
    });

    it('should use database slug directly without modification', () => {
      const event: EventData = {
        title: 'Test Event',
        category: 'Music',
        date: '2025-01-20',
        time: '19:00',
        venue: 'The Venue Name',
        city: 'Wien',
        price: '10€',
        website: 'https://example.com',
        slug: 'test-event-the-venue-name-2025-01-20-xyz78901'
      };

      const url = generateCanonicalUrl(event);
      
      expect(url).toContain('/events/wien/test-event-the-venue-name-2025-01-20-xyz78901');
    });

    it('should use default baseUrl if not provided', () => {
      const event: EventData = {
        title: 'Test Event',
        category: 'Music',
        date: '2025-01-20',
        time: '19:00',
        venue: 'Venue',
        city: 'Wien',
        price: '10€',
        website: 'https://example.com',
        slug: 'test-event-venue-2025-01-20-def45678'
      };

      const url = generateCanonicalUrl(event);
      
      expect(url).toContain('www.where2go.at');
    });

    it('should normalize city diacritics but use database slug as-is', () => {
      const event: EventData = {
        title: 'Fête de la Musique – Café Français',
        category: 'Music',
        date: '2025-06-21',
        time: '20:00',
        venue: 'Café',
        city: 'Zürich',
        price: '15€',
        website: 'https://example.com',
        slug: 'fete-de-la-musique-cafe-francais-2025-06-21-ghi23456'
      };

      const url = generateCanonicalUrl(event, 'https://where2go.com');
      
      expect(url).toBe('https://where2go.com/events/zurich/fete-de-la-musique-cafe-francais-2025-06-21-ghi23456');
      expect(url).not.toContain('ü'); // City normalized
    });
  });

  describe('generateEventJsonLd', () => {
    it('should be an alias for generateEventSchema', () => {
      const event: EventData = {
        title: 'Test Event',
        category: 'Music',
        date: '2025-01-20',
        time: '19:00',
        venue: 'Test Venue',
        price: '10€',
        website: 'https://example.com'
      };

      const jsonLd = generateEventJsonLd(event);
      
      expect(jsonLd['@type']).toBe('Event');
      expect(jsonLd.name).toBe('Test Event');
    });
  });
});

describe('New Schema.org Utilities', () => {
  describe('generateLocalBusinessSchema', () => {
    it('should generate valid LocalBusiness schema', () => {
      const venue = {
        name: 'Arena Wien',
        address: 'Baumgasse 80, 1030 Wien',
        latitude: 48.1903,
        longitude: 16.4112,
        url: 'https://arena.wien',
        description: 'Legendary concert venue in Vienna'
      };
      
      const schema = generateLocalBusinessSchema(venue) as any;
      
      expect(schema['@context']).toBe('https://schema.org');
      expect(schema['@type']).toBe('LocalBusiness');
      expect(schema.name).toBe('Arena Wien');
      expect(schema.areaServed).toBeDefined();
      expect(schema.areaServed['@type']).toBe('City');
      expect(schema.areaServed.name).toBe('Wien');
      expect(schema.address).toBeDefined();
      expect(schema.address.streetAddress).toBe('Baumgasse 80, 1030 Wien');
      expect(schema.geo).toBeDefined();
      expect(schema.geo.latitude).toBe(48.1903);
      expect(schema.geo.longitude).toBe(16.4112);
    });

    it('should work with minimal venue data', () => {
      
      const venue = {
        name: 'Simple Venue'
      };
      
      const schema = generateLocalBusinessSchema(venue) as any;
      
      expect(schema.name).toBe('Simple Venue');
      expect(schema.areaServed).toBeDefined();
      expect(schema.address).toBeUndefined();
      expect(schema.geo).toBeUndefined();
    });
  });

  describe('generateViennaPlaceSchema', () => {
    it('should generate valid City/Place schema for Vienna', () => {
      
      const schema = generateViennaPlaceSchema() as any;
      
      expect(schema['@context']).toBe('https://schema.org');
      expect(schema['@type']).toBe('City');
      expect(schema.name).toBe('Wien');
      expect(schema.alternateName).toBe('Vienna');
      expect(schema.geo).toBeDefined();
      expect(schema.geo.latitude).toBe(48.2082);
      expect(schema.geo.longitude).toBe(16.3738);
      expect(schema.address.addressCountry).toBe('AT');
    });
  });

  describe('generateFAQPageSchema', () => {
    it('should generate valid FAQPage schema', () => {
      
      const faqs = [
        {
          question: 'What can I do today in Vienna?',
          answer: 'You can find concerts, theater shows, club nights and more on Where2Go.'
        },
        {
          question: 'How do I search for events?',
          answer: 'Use the search bar and filters to find events by category, date, and location.'
        }
      ];
      
      const schema = generateFAQPageSchema(faqs) as any;
      
      expect(schema['@context']).toBe('https://schema.org');
      expect(schema['@type']).toBe('FAQPage');
      expect(schema.mainEntity).toHaveLength(2);
      expect(schema.mainEntity[0]['@type']).toBe('Question');
      expect(schema.mainEntity[0].name).toBe('What can I do today in Vienna?');
      expect(schema.mainEntity[0].acceptedAnswer['@type']).toBe('Answer');
      expect(schema.mainEntity[0].acceptedAnswer.text).toBeTruthy();
    });

    it('should handle empty FAQ list', () => {
      
      const schema = generateFAQPageSchema([]) as any;
      
      expect(schema.mainEntity).toHaveLength(0);
    });
  });

  describe('generateHowToSchema', () => {
    it('should generate valid HowTo schema', () => {
      
      const steps = [
        { name: 'Select your city', text: 'Choose Vienna from the city selector' },
        { name: 'Pick a date', text: 'Select today, tomorrow, or a specific date' },
        { name: 'Browse events', text: 'Scroll through the event listings' }
      ];
      
      const schema = generateHowToSchema('How to find events', steps, 'A guide to finding events') as any;
      
      expect(schema['@context']).toBe('https://schema.org');
      expect(schema['@type']).toBe('HowTo');
      expect(schema.name).toBe('How to find events');
      expect(schema.description).toBe('A guide to finding events');
      expect(schema.step).toHaveLength(3);
      expect(schema.step[0]['@type']).toBe('HowToStep');
      expect(schema.step[0].position).toBe(1);
      expect(schema.step[0].name).toBe('Select your city');
    });

    it('should use title as description if not provided', () => {
      
      const steps = [{ name: 'Step 1', text: 'Do something' }];
      
      const schema = generateHowToSchema('My Guide', steps) as any;
      
      expect(schema.description).toBe('My Guide');
    });
  });

  describe('generateBreadcrumbSchema', () => {
    it('should generate valid BreadcrumbList schema', () => {
      
      const breadcrumbs = [
        { name: 'Home', url: '/' },
        { name: 'Events', url: '/events' },
        { name: 'Vienna', url: '/events/vienna' }
      ];
      
      const schema = generateBreadcrumbSchema(breadcrumbs) as any;
      
      expect(schema['@context']).toBe('https://schema.org');
      expect(schema['@type']).toBe('BreadcrumbList');
      expect(schema.itemListElement).toHaveLength(3);
      expect(schema.itemListElement[0]['@type']).toBe('ListItem');
      expect(schema.itemListElement[0].position).toBe(1);
      expect(schema.itemListElement[0].name).toBe('Home');
      expect(schema.itemListElement[0].item).toBe('https://www.where2go.at/');
    });

    it('should handle absolute URLs', () => {
      
      const breadcrumbs = [
        { name: 'Home', url: 'https://example.com/' }
      ];
      
      const schema = generateBreadcrumbSchema(breadcrumbs) as any;
      
      expect(schema.itemListElement[0].item).toBe('https://example.com/');
    });
  });

  describe('Enhanced Event Schema with GEO', () => {
    it('should include GeoCoordinates in location', () => {
      
      const event: any = {
        title: 'Concert with Location',
        category: 'Music',
        date: '2025-01-20',
        time: '19:30',
        venue: 'Arena Wien',
        price: '25€',
        website: 'https://example.com',
        address: 'Baumgasse 80, 1030 Wien',
        city: 'Wien',
        latitude: 48.1903,
        longitude: 16.4112
      };
      
      const schema = generateEventSchema(event) as any;
      
      expect(schema.location.geo).toBeDefined();
      expect(schema.location.geo['@type']).toBe('GeoCoordinates');
      expect(schema.location.geo.latitude).toBe(48.1903);
      expect(schema.location.geo.longitude).toBe(16.4112);
    });

    it('should include areaServed for local SEO', () => {
      
      const event: EventData = {
        title: 'Local Event',
        category: 'Music',
        date: '2025-01-20',
        time: '19:30',
        venue: 'Test Venue',
        price: '25€',
        website: 'https://example.com',
        city: 'Wien'
      };
      
      const schema = generateEventSchema(event) as any;
      
      expect(schema.location.areaServed).toBeDefined();
      expect(schema.location.areaServed['@type']).toBe('City');
      expect(schema.location.areaServed.name).toBe('Wien');
      expect(schema.location.areaServed.addressCountry).toBe('AT');
    });

    it('should include address with city and country', () => {
      
      const event: EventData = {
        title: 'Event with Address',
        category: 'Music',
        date: '2025-01-20',
        time: '19:30',
        venue: 'Test Venue',
        price: '25€',
        website: 'https://example.com',
        address: 'Test Street 123',
        city: 'Wien'
      };
      
      const schema = generateEventSchema(event) as any;
      
      expect(schema.location.address).toBeDefined();
      expect(schema.location.address.addressLocality).toBe('Wien');
      expect(schema.location.address.addressCountry).toBe('AT');
    });
  });
});
