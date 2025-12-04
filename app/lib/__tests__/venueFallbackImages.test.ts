/**
 * Tests for Venue Fallback Images functionality
 */

import { describe, it, expect } from 'vitest';
import { 
  getVenueFallbackImage, 
  getVenuesWithFallbackImages,
  VENUE_FALLBACK_IMAGES 
} from '../venueFallbackImages';

describe('venueFallbackImages', () => {
  describe('getVenueFallbackImage', () => {
    it('should return null for undefined venue', () => {
      expect(getVenueFallbackImage(undefined)).toBeNull();
    });

    it('should return null for empty string venue', () => {
      expect(getVenueFallbackImage('')).toBeNull();
    });

    it('should return null for unknown venue', () => {
      expect(getVenueFallbackImage('Unknown Venue XYZ')).toBeNull();
    });

    it('should find venue by exact name', () => {
      const result = getVenueFallbackImage('Grelle Forelle');
      expect(result).toBe(VENUE_FALLBACK_IMAGES['grelle-forelle'].imageUrl);
    });

    it('should find venue by alias', () => {
      const result = getVenueFallbackImage('grelleforelle');
      expect(result).toBe(VENUE_FALLBACK_IMAGES['grelle-forelle'].imageUrl);
    });

    it('should be case insensitive', () => {
      const result = getVenueFallbackImage('GRELLE FORELLE');
      expect(result).toBe(VENUE_FALLBACK_IMAGES['grelle-forelle'].imageUrl);
    });

    it('should find Flex by name', () => {
      const result = getVenueFallbackImage('Flex');
      expect(result).toBe(VENUE_FALLBACK_IMAGES['flex'].imageUrl);
    });

    it('should find Pratersauna by name', () => {
      const result = getVenueFallbackImage('Pratersauna');
      expect(result).toBe(VENUE_FALLBACK_IMAGES['pratersauna'].imageUrl);
    });

    it('should find U4 by alias with qualifier', () => {
      const result = getVenueFallbackImage('U4 Wien');
      expect(result).toBe(VENUE_FALLBACK_IMAGES['u4'].imageUrl);
    });

    it('should find Das WERK by alias', () => {
      const result = getVenueFallbackImage('Das Werk');
      expect(result).toBe(VENUE_FALLBACK_IMAGES['das-werk'].imageUrl);
    });

    it('should find Volksgarten by name', () => {
      const result = getVenueFallbackImage('Volksgarten');
      expect(result).toBe(VENUE_FALLBACK_IMAGES['volksgarten'].imageUrl);
    });

    it('should find Prater DOME by alias', () => {
      const result = getVenueFallbackImage('Praterdome');
      expect(result).toBe(VENUE_FALLBACK_IMAGES['prater-dome'].imageUrl);
    });

    it('should find SASS Music Club', () => {
      const result = getVenueFallbackImage('SASS Music Club');
      expect(result).toBe(VENUE_FALLBACK_IMAGES['sass-music-club'].imageUrl);
    });

    it('should find venue by partial match for longer names', () => {
      // "flucc" should match "Flucc / Flucc Wanne"
      const result = getVenueFallbackImage('Flucc');
      expect(result).toBe(VENUE_FALLBACK_IMAGES['flucc'].imageUrl);
    });

    it('should NOT match short venue names with partial matching to avoid false positives', () => {
      // Single letter "U" should not match U4 (would cause too many false positives)
      const result = getVenueFallbackImage('U');
      expect(result).toBeNull();
    });

    it('should return null for short generic words that could cause false positives', () => {
      // "O" could match many things, should not match "O - der Klub"
      const result = getVenueFallbackImage('O');
      expect(result).toBeNull();
    });

    it('should find O der Klub by specific alias', () => {
      const result = getVenueFallbackImage('O der Klub');
      expect(result).toBe(VENUE_FALLBACK_IMAGES['o-der-klub'].imageUrl);
    });
  });

  describe('getVenuesWithFallbackImages', () => {
    it('should return array of venue IDs', () => {
      const venues = getVenuesWithFallbackImages();
      expect(Array.isArray(venues)).toBe(true);
      expect(venues.length).toBeGreaterThan(0);
    });

    it('should include known venues', () => {
      const venues = getVenuesWithFallbackImages();
      expect(venues).toContain('grelle-forelle');
      expect(venues).toContain('flex');
      expect(venues).toContain('pratersauna');
      expect(venues).toContain('u4');
    });
  });

  describe('VENUE_FALLBACK_IMAGES configuration', () => {
    it('should have valid structure for all entries', () => {
      for (const [key, config] of Object.entries(VENUE_FALLBACK_IMAGES)) {
        expect(config.name).toBeDefined();
        expect(typeof config.name).toBe('string');
        expect(config.name.length).toBeGreaterThan(0);

        expect(config.aliases).toBeDefined();
        expect(Array.isArray(config.aliases)).toBe(true);

        expect(config.imageUrl).toBeDefined();
        expect(typeof config.imageUrl).toBe('string');
        expect(config.imageUrl.startsWith('http')).toBe(true);

        expect(config.source).toBeDefined();
        expect(typeof config.source).toBe('string');
      }
    });

    it('should have at least 10 venues configured', () => {
      const venueCount = Object.keys(VENUE_FALLBACK_IMAGES).length;
      expect(venueCount).toBeGreaterThanOrEqual(10);
    });

    it('should use official venue sources (not third-party logo sites)', () => {
      for (const [key, config] of Object.entries(VENUE_FALLBACK_IMAGES)) {
        // Ensure we're not using third-party logo aggregator sites
        expect(config.source).not.toContain('seeklogo');
        expect(config.source).not.toContain('brandsoftheworld');
        expect(config.source).not.toContain('freepng');
      }
    });
  });
});
