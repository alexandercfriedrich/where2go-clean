import { describe, it, expect } from 'vitest';
import { generateCanonicalUrl } from '../schemaOrg';
import type { EventData } from '../types';

describe('Canonical URL Migration', () => {
  describe('New city-first routing format', () => {
    it('should generate URLs with city-first pattern', () => {
      const event: EventData = {
        title: 'Rock Concert',
        category: 'Live-Konzerte',
        date: '2025-01-20',
        time: '19:30',
        venue: 'Arena',
        city: 'Wien',
        price: '25€',
        website: 'https://example.com'
      };

      const url = generateCanonicalUrl(event, 'https://www.where2go.at');
      
      // Should follow pattern: /{city}/event/{date}/{title-slug}
      expect(url).toBe('https://www.where2go.at/wien/event/2025-01-20/rock-concert');
      expect(url).toMatch(/^https:\/\/www\.where2go\.at\/[^\/]+\/event\/\d{4}-\d{2}-\d{2}\/[^\/]+$/);
    });

    it('should be compatible with Next.js dynamic routes', () => {
      const event: EventData = {
        title: 'Jazz Night',
        category: 'Music',
        date: '2025-02-14',
        time: '20:00',
        venue: 'Club',
        city: 'Berlin',
        price: '15€',
        website: 'https://example.com'
      };

      const url = generateCanonicalUrl(event, 'https://www.where2go.at');
      const path = url.replace('https://www.where2go.at', '');
      
      // Path should be: /berlin/event/2025-02-14/jazz-night
      const segments = path.split('/').filter(Boolean);
      
      expect(segments).toHaveLength(4);
      expect(segments[0]).toBe('berlin'); // [city]
      expect(segments[1]).toBe('event'); // literal 'event'
      expect(segments[2]).toBe('2025-02-14'); // date
      expect(segments[3]).toBe('jazz-night'); // title slug
    });

    it('should handle complex titles with special characters', () => {
      const event: EventData = {
        title: 'König & Kaiser: Die große Show!!!',
        category: 'Theater',
        date: '2025-03-15',
        time: '19:00',
        venue: 'Theater',
        city: 'München',
        price: '30€',
        website: 'https://example.com'
      };

      const url = generateCanonicalUrl(event, 'https://www.where2go.at');
      
      // Should normalize diacritics and special chars (note: ß is not normalized by NFKD)
      expect(url).toBe('https://www.where2go.at/munchen/event/2025-03-15/konig-kaiser-die-groe-show');
      
      // Check that the path portion (after domain) has no special chars
      const path = url.replace('https://www.where2go.at', '');
      expect(path).not.toContain('ü');
      expect(path).not.toContain('ö');
      expect(path).not.toContain('&');
      expect(path).not.toContain('!');
      expect(path).not.toContain(':');
    });

    it('should handle fallback to venue when city is missing', () => {
      const event: EventData = {
        title: 'Gallery Opening',
        category: 'Art',
        date: '2025-04-10',
        time: '18:00',
        venue: 'Kunsthalle Zürich',
        price: 'Frei',
        website: 'https://example.com'
      };

      const url = generateCanonicalUrl(event, 'https://www.where2go.at');
      
      // Should use venue as city slug
      expect(url).toBe('https://www.where2go.at/kunsthalle-zurich/event/2025-04-10/gallery-opening');
    });

    it('should handle ultimate fallback to "event"', () => {
      const event: EventData = {
        title: 'Mystery Event',
        category: 'Other',
        date: '2025-05-20',
        time: '19:00',
        venue: '', // Empty venue
        price: '10€',
        website: 'https://example.com'
      };

      const url = generateCanonicalUrl(event, 'https://www.where2go.at');
      
      // Should use 'event' as fallback
      expect(url).toBe('https://www.where2go.at/event/event/2025-05-20/mystery-event');
    });
  });

  describe('Legacy URL compatibility', () => {
    it('should recognize old /event/{city}/{date}/{title} pattern would need redirect', () => {
      // Old pattern: /event/wien/2025-01-20/rock-concert
      // New pattern: /wien/event/2025-01-20/rock-concert
      
      const event: EventData = {
        title: 'Rock Concert',
        category: 'Music',
        date: '2025-01-20',
        time: '19:30',
        venue: 'Arena',
        city: 'Wien',
        price: '25€',
        website: 'https://example.com'
      };

      const newUrl = generateCanonicalUrl(event, 'https://www.where2go.at');
      const oldUrl = 'https://www.where2go.at/event/wien/2025-01-20/rock-concert';
      
      // URLs should be different (old vs new format)
      expect(newUrl).not.toBe(oldUrl);
      
      // New URL should follow city-first pattern
      expect(newUrl).toBe('https://www.where2go.at/wien/event/2025-01-20/rock-concert');
    });

    it('should generate consistent slugs for matching in fallback route', () => {
      const event: EventData = {
        title: 'Electronic Music Festival',
        category: 'Music',
        date: '2025-06-15',
        time: '22:00',
        venue: 'Club',
        city: 'Berlin',
        price: '20€',
        website: 'https://example.com'
      };

      const url = generateCanonicalUrl(event, 'https://www.where2go.at');
      const titleSlug = url.split('/').pop();
      
      // Title slug should be consistently generated
      expect(titleSlug).toBe('electronic-music-festival');
      
      // Regenerating should produce same slug
      const url2 = generateCanonicalUrl(event, 'https://www.where2go.at');
      const titleSlug2 = url2.split('/').pop();
      
      expect(titleSlug).toBe(titleSlug2);
    });
  });

  describe('URL normalization edge cases', () => {
    it('should handle multiple consecutive spaces', () => {
      const event: EventData = {
        title: 'Event   with    spaces',
        category: 'Music',
        date: '2025-01-20',
        time: '19:00',
        venue: 'Venue',
        city: 'City',
        price: '10€',
        website: 'https://example.com'
      };

      const url = generateCanonicalUrl(event);
      
      expect(url).toContain('/event-with-spaces');
      expect(url).not.toContain('  ');
    });

    it('should handle multiple consecutive hyphens', () => {
      const event: EventData = {
        title: 'Event - - - Title',
        category: 'Music',
        date: '2025-01-20',
        time: '19:00',
        venue: 'Venue',
        city: 'City',
        price: '10€',
        website: 'https://example.com'
      };

      const url = generateCanonicalUrl(event);
      
      expect(url).toContain('/event-title');
      expect(url).not.toContain('--');
    });

    it('should trim leading and trailing hyphens', () => {
      const event: EventData = {
        title: '!!!Event!!!',
        category: 'Music',
        date: '2025-01-20',
        time: '19:00',
        venue: 'Venue',
        city: 'City',
        price: '10€',
        website: 'https://example.com'
      };

      const url = generateCanonicalUrl(event);
      
      expect(url).toContain('/event');
      expect(url).not.toMatch(/-$/);
      expect(url).not.toMatch(/\/-/);
    });

    it('should ensure date is always 10 characters (YYYY-MM-DD)', () => {
      const event: EventData = {
        title: 'Event',
        category: 'Music',
        date: '2025-01-20T19:00:00Z', // ISO datetime
        time: '19:00',
        venue: 'Venue',
        city: 'City',
        price: '10€',
        website: 'https://example.com'
      };

      const url = generateCanonicalUrl(event);
      
      // Should extract just YYYY-MM-DD part
      expect(url).toContain('/2025-01-20/');
      expect(url).not.toContain('T19:00');
    });
  });
});
