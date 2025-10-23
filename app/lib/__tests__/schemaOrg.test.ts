import { describe, it, expect } from 'vitest';
import {
  generateWebSiteSchema,
  generateEventSchema,
  generateEventListSchema,
  generateJsonLdScript,
  generateEventMicrodata,
  generateCanonicalUrl,
  generateEventJsonLd
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
        website: 'https://example.com'
      };

      const url = generateCanonicalUrl(event, 'https://where2go.com');
      
      expect(url).toBe('https://where2go.com/berlin/event/2025-06-15/summer-festival-2025');
    });

    it('should normalize title correctly', () => {
      const event: EventData = {
        title: 'Rock & Roll Night!!!',
        category: 'Music',
        date: '2025-01-20',
        time: '19:00',
        venue: 'Music Hall',
        city: 'Wien',
        price: '10€',
        website: 'https://example.com'
      };

      const url = generateCanonicalUrl(event);
      
      expect(url).toContain('/wien/event/');
      expect(url).toContain('rock-roll-night');
      expect(url).not.toContain('&');
      expect(url).not.toContain('!');
    });

    it('should handle missing city', () => {
      const event: EventData = {
        title: 'Test Event',
        category: 'Music',
        date: '2025-01-20',
        time: '19:00',
        venue: 'The Venue Name',
        price: '10€',
        website: 'https://example.com'
      };

      const url = generateCanonicalUrl(event);
      
      expect(url).toContain('/the-venue-name/event/');
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
        website: 'https://example.com'
      };

      const url = generateCanonicalUrl(event);
      
      expect(url).toContain('www.where2go.at');
    });

    it('should normalize diacritics in city and title', () => {
      const event: EventData = {
        title: 'Fête de la Musique – Café Français',
        category: 'Music',
        date: '2025-06-21',
        time: '20:00',
        venue: 'Café',
        city: 'Zürich',
        price: '15€',
        website: 'https://example.com'
      };

      const url = generateCanonicalUrl(event, 'https://where2go.com');
      
      expect(url).toBe('https://where2go.com/zurich/event/2025-06-21/fete-de-la-musique-cafe-francais');
      expect(url).not.toContain('é');
      expect(url).not.toContain('ü');
      expect(url).not.toContain('–');
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
