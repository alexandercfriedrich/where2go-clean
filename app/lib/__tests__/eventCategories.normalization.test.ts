import { describe, it, expect } from 'vitest';
import { 
  normalizeCategory, 
  isValidCategory,
  validateAndNormalizeEvents,
  NORMALIZATION_TOKEN_MAP
} from '../eventCategories';

describe('Event Category Normalization', () => {
  describe('NORMALIZATION_TOKEN_MAP', () => {
    it('should map techno variants to DJ Sets/Electronic', () => {
      expect(normalizeCategory('techno')).toBe('DJ Sets/Electronic');
      expect(normalizeCategory('edm')).toBe('DJ Sets/Electronic');
      expect(normalizeCategory('house')).toBe('DJ Sets/Electronic');
      expect(normalizeCategory('trance')).toBe('DJ Sets/Electronic');
      expect(normalizeCategory('minimal')).toBe('DJ Sets/Electronic');
      expect(normalizeCategory('hardstyle')).toBe('DJ Sets/Electronic');
    });

    it('should map festival variants to Open Air', () => {
      expect(normalizeCategory('festival')).toBe('Open Air');
      expect(normalizeCategory('festivals')).toBe('Open Air');
      expect(normalizeCategory('openair')).toBe('Open Air');
      expect(normalizeCategory('open-air')).toBe('Open Air');
    });

    it('should map queer/pride variants to LGBTQ+', () => {
      expect(normalizeCategory('queer')).toBe('LGBTQ+');
      expect(normalizeCategory('pride')).toBe('LGBTQ+');
      expect(normalizeCategory('gay')).toBe('LGBTQ+');
      expect(normalizeCategory('lesbian')).toBe('LGBTQ+');
      expect(normalizeCategory('lgbt')).toBe('LGBTQ+');
      expect(normalizeCategory('lgbtq')).toBe('LGBTQ+');
    });

    it('should map club/party variants to Clubs/Discos', () => {
      expect(normalizeCategory('after-hour')).toBe('Clubs/Discos');
      expect(normalizeCategory('afterhours')).toBe('Clubs/Discos');
      expect(normalizeCategory('rave')).toBe('Clubs/Discos');
      expect(normalizeCategory('club')).toBe('Clubs/Discos');
      expect(normalizeCategory('disco')).toBe('Clubs/Discos');
      expect(normalizeCategory('party')).toBe('Clubs/Discos');
    });

    it('should map wine/food variants to Food/Culinary', () => {
      expect(normalizeCategory('wein')).toBe('Food/Culinary');
      expect(normalizeCategory('wine')).toBe('Food/Culinary');
      expect(normalizeCategory('beer')).toBe('Food/Culinary');
      expect(normalizeCategory('cocktail')).toBe('Food/Culinary');
      expect(normalizeCategory('food')).toBe('Food/Culinary');
    });

    it('should map workshop/seminar variants to Bildung/Lernen', () => {
      expect(normalizeCategory('workshop')).toBe('Bildung/Lernen');
      expect(normalizeCategory('seminar')).toBe('Bildung/Lernen');
      expect(normalizeCategory('hackathon')).toBe('Bildung/Lernen');
      expect(normalizeCategory('learning')).toBe('Bildung/Lernen');
      expect(normalizeCategory('bildung')).toBe('Bildung/Lernen');
    });

    it('should map startup/business variants to Networking/Business', () => {
      expect(normalizeCategory('startup')).toBe('Networking/Business');
      expect(normalizeCategory('business')).toBe('Networking/Business');
      expect(normalizeCategory('networking')).toBe('Networking/Business');
      expect(normalizeCategory('meetup')).toBe('Networking/Business');
    });

    it('should map hiking/nature variants to Natur/Outdoor', () => {
      expect(normalizeCategory('hiking')).toBe('Natur/Outdoor');
      expect(normalizeCategory('wandern')).toBe('Natur/Outdoor');
      expect(normalizeCategory('nature')).toBe('Natur/Outdoor');
      expect(normalizeCategory('natur')).toBe('Natur/Outdoor');
      expect(normalizeCategory('outdoor')).toBe('Natur/Outdoor');
    });

    it('should map culture/tradition variants to Kultur/Traditionen', () => {
      expect(normalizeCategory('kultur')).toBe('Kultur/Traditionen');
      expect(normalizeCategory('culture')).toBe('Kultur/Traditionen');
      expect(normalizeCategory('tradition')).toBe('Kultur/Traditionen');
      expect(normalizeCategory('heritage')).toBe('Kultur/Traditionen');
    });

    it('should map market/shopping variants to Märkte/Shopping', () => {
      expect(normalizeCategory('markt')).toBe('Märkte/Shopping');
      expect(normalizeCategory('market')).toBe('Märkte/Shopping');
      expect(normalizeCategory('shopping')).toBe('Märkte/Shopping');
      expect(normalizeCategory('flohmarkt')).toBe('Märkte/Shopping');
      expect(normalizeCategory('vintage')).toBe('Märkte/Shopping');
    });

    it('should map social/community variants to Soziales/Community', () => {
      expect(normalizeCategory('sozial')).toBe('Soziales/Community');
      expect(normalizeCategory('social')).toBe('Soziales/Community');
      expect(normalizeCategory('community')).toBe('Soziales/Community');
      expect(normalizeCategory('volunteer')).toBe('Soziales/Community');
      expect(normalizeCategory('charity')).toBe('Soziales/Community');
    });
  });

  describe('normalizeCategory logic order', () => {
    it('should handle direct main category exact match first', () => {
      expect(normalizeCategory('DJ Sets/Electronic')).toBe('DJ Sets/Electronic');
      expect(normalizeCategory('Live-Konzerte')).toBe('Live-Konzerte');
      expect(normalizeCategory('LGBTQ+')).toBe('LGBTQ+');
    });

    it('should handle token map (lowercased) second', () => {
      expect(normalizeCategory('TECHNO')).toBe('DJ Sets/Electronic');
      expect(normalizeCategory('Festival')).toBe('Open Air');
      expect(normalizeCategory('QUEER')).toBe('LGBTQ+');
    });

    it('should handle subcategory scan third', () => {
      // These should be mapped by the subcategory logic from categories.ts
      expect(normalizeCategory('Techno/House/EDM')).toBe('DJ Sets/Electronic');
      expect(normalizeCategory('Nightclubs')).toBe('Clubs/Discos');
      expect(normalizeCategory('Rock/Pop/Alternative')).toBe('Live-Konzerte');
    });

    it('should handle lowercase main category match fourth', () => {
      expect(normalizeCategory('dj sets/electronic')).toBe('DJ Sets/Electronic');
      expect(normalizeCategory('live-konzerte')).toBe('Live-Konzerte');
      expect(normalizeCategory('lgbtq+')).toBe('LGBTQ+');
    });

    it('should return original input if no match found', () => {
      expect(normalizeCategory('unicorn')).toBe('unicorn');
      expect(normalizeCategory('unknown-category')).toBe('unknown-category');
      expect(normalizeCategory('random-text')).toBe('random-text');
    });
  });

  describe('isValidCategory', () => {
    it('should return true for valid categories', () => {
      expect(isValidCategory('DJ Sets/Electronic')).toBe(true);
      expect(isValidCategory('Clubs/Discos')).toBe(true);
      expect(isValidCategory('Live-Konzerte')).toBe(true);
      expect(isValidCategory('LGBTQ+')).toBe(true);
      expect(isValidCategory('Food/Culinary')).toBe(true);
    });

    it('should return false for invalid categories', () => {
      expect(isValidCategory('unicorn')).toBe(false);
      expect(isValidCategory('unknown-category')).toBe(false);
      expect(isValidCategory('techno')).toBe(false); // Raw token, not normalized
      expect(isValidCategory('')).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(isValidCategory(null as any)).toBe(false);
      expect(isValidCategory(undefined as any)).toBe(false);
      expect(isValidCategory(123 as any)).toBe(false);
      expect(isValidCategory({}  as any)).toBe(false);
    });
  });

  describe('validateAndNormalizeEvents', () => {
    it('should normalize and validate events correctly', () => {
      const rawEvents = [
        { title: 'Techno Night', category: 'techno', venue: 'Club X' },
        { title: 'Jazz Concert', category: 'jazz', venue: 'Concert Hall' },
        { title: 'Art Exhibition', category: 'art', venue: 'Gallery Y' },
        { title: 'Invalid Event', category: 'unicorn', venue: 'Unknown' }
      ];

      const result = validateAndNormalizeEvents(rawEvents);

      expect(result).toHaveLength(3); // unicorn category should be filtered out
      expect(result[0].category).toBe('DJ Sets/Electronic'); // techno → DJ Sets/Electronic
      expect(result[1].category).toBe('Live-Konzerte'); // jazz → Live-Konzerte
      expect(result[2].category).toBe('Kunst/Design'); // art → Kunst/Design
    });

    it('should filter out events with invalid categories', () => {
      const rawEvents = [
        { title: 'Valid Event', category: 'techno', venue: 'Club' },
        { title: 'Invalid Event 1', category: 'unicorn', venue: 'Unknown' },
        { title: 'Invalid Event 2', category: 'nonexistent', venue: 'Nowhere' }
      ];

      const result = validateAndNormalizeEvents(rawEvents);

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Valid Event');
      expect(result[0].category).toBe('DJ Sets/Electronic');
    });

    it('should handle edge cases', () => {
      expect(validateAndNormalizeEvents([])).toEqual([]);
      expect(validateAndNormalizeEvents(null as any)).toEqual([]);
      expect(validateAndNormalizeEvents(undefined as any)).toEqual([]);
      expect(validateAndNormalizeEvents('not-an-array' as any)).toEqual([]);
    });

    it('should filter out invalid event objects', () => {
      const rawEvents = [
        { title: 'Valid Event', category: 'techno', venue: 'Club' },
        null,
        undefined,
        'not-an-object',
        {},
        { title: 'No category event', venue: 'Some venue' }
      ];

      const result = validateAndNormalizeEvents(rawEvents);

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Valid Event');
    });
  });

  describe('Complete token set from problem statement', () => {
    const requiredTokenMappings = [
      ['techno', 'DJ Sets/Electronic'],
      ['edm', 'DJ Sets/Electronic'],
      ['house', 'DJ Sets/Electronic'],
      ['festival', 'Open Air'],
      ['queer', 'LGBTQ+'],
      ['pride', 'LGBTQ+'],
      ['after-hour', 'Clubs/Discos'],
      ['afterhours', 'Clubs/Discos'],
      ['rave', 'Clubs/Discos'],
      ['wein', 'Food/Culinary'],
      ['wine', 'Food/Culinary'],
      ['workshop', 'Bildung/Lernen'],
      ['seminar', 'Bildung/Lernen'],
      ['hackathon', 'Bildung/Lernen'],
      ['startup', 'Networking/Business'],
      ['hiking', 'Natur/Outdoor'],
      ['wandern', 'Natur/Outdoor'],
      ['kultur', 'Kultur/Traditionen'],
      ['tradition', 'Kultur/Traditionen'],
      ['markt', 'Märkte/Shopping'],
      ['shopping', 'Märkte/Shopping'],
      ['flohmarkt', 'Märkte/Shopping'],
      ['bildung', 'Bildung/Lernen'],
      ['learning', 'Bildung/Lernen'],
      ['sozial', 'Soziales/Community'],
      ['community', 'Soziales/Community'],
      ['volunteer', 'Soziales/Community'],
      ['charity', 'Soziales/Community']
    ];

    it('should map all required tokens to their canonical categories', () => {
      requiredTokenMappings.forEach(([token, expectedCategory]) => {
        expect(normalizeCategory(token)).toBe(expectedCategory);
      });
    });

    it('should validate that unknown token returns itself and would NOT validate', () => {
      const unknownToken = 'unicorn';
      const normalized = normalizeCategory(unknownToken);
      
      // Should return the original token
      expect(normalized).toBe(unknownToken);
      
      // Should NOT be valid when checked
      expect(isValidCategory(normalized)).toBe(false);
    });
  });
});