/**
 * Unit tests for category normalization functionality.
 * Tests the normalization logic including fuzzy matching and alias resolution.
 * 
 * @fileoverview Category normalization test suite.
 */

import { describe, it, expect } from 'vitest';
import { 
  normalizeCategory, 
  normalizeCategories, 
  isRecognizedCategory,
  getCategoryNormalizationStats
} from '../../../lib/new-backend/categories/normalize';
import { MAIN_CATEGORIES } from '../../../lib/new-backend/categories/categoryMap';

describe('Category Normalization', () => {
  describe('normalizeCategory', () => {
    it('should handle exact matches for main categories', () => {
      expect(normalizeCategory('DJ Sets/Electronic')).toBe('DJ Sets/Electronic');
      expect(normalizeCategory('Clubs/Discos')).toBe('Clubs/Discos');
      expect(normalizeCategory('Live-Konzerte')).toBe('Live-Konzerte');
    });

    it('should handle case-insensitive matches', () => {
      expect(normalizeCategory('dj sets/electronic')).toBe('DJ Sets/Electronic');
      expect(normalizeCategory('CLUBS/DISCOS')).toBe('Clubs/Discos');
      expect(normalizeCategory('live-konzerte')).toBe('Live-Konzerte');
    });

    it('should handle exact alias matches', () => {
      expect(normalizeCategory('electronic')).toBe('DJ Sets/Electronic');
      expect(normalizeCategory('techno')).toBe('DJ Sets/Electronic');
      expect(normalizeCategory('clubs')).toBe('Clubs/Discos');
      expect(normalizeCategory('nightclub')).toBe('Clubs/Discos');
      expect(normalizeCategory('concerts')).toBe('Live-Konzerte');
      expect(normalizeCategory('museum')).toBe('Museen');
    });

    it('should handle fuzzy matching within threshold', () => {
      expect(normalizeCategory('Clubs/Disco')).toBe('Clubs/Discos'); // 1 char diff
      expect(normalizeCategory('DJ Set/Electronic')).toBe('DJ Sets/Electronic'); // 1 char diff
      expect(normalizeCategory('Konzerte')).toBe('Live-Konzerte'); // substring match
    });

    it('should preserve original for unrecognized categories', () => {
      expect(normalizeCategory('Unknown Category')).toBe('Unknown Category');
      expect(normalizeCategory('Random Text')).toBe('Random Text');
      expect(normalizeCategory('VerySpecificCustomCategory')).toBe('VerySpecificCustomCategory');
    });

    it('should handle empty and whitespace inputs', () => {
      expect(normalizeCategory('')).toBe('');
      expect(normalizeCategory('   ')).toBe('');
      expect(normalizeCategory('  valid  ')).toBe('valid');
    });

    it('should handle special characters', () => {
      expect(normalizeCategory('LGBTQ+')).toBe('LGBTQ+');
      expect(normalizeCategory('lgbtq+')).toBe('LGBTQ+');
      expect(normalizeCategory('Comedy/Kabarett')).toBe('Comedy/Kabarett');
    });
  });

  describe('normalizeCategories', () => {
    it('should normalize array of categories', () => {
      const input = ['electronic', 'clubs', 'museums', 'Unknown'];
      const expected = ['DJ Sets/Electronic', 'Clubs/Discos', 'Museen', 'Unknown'];
      expect(normalizeCategories(input)).toEqual(expected);
    });

    it('should remove duplicates after normalization', () => {
      const input = ['electronic', 'dj sets/electronic', 'techno', 'house'];
      const result = normalizeCategories(input);
      expect(result).toEqual(['DJ Sets/Electronic']);
    });

    it('should handle empty arrays', () => {
      expect(normalizeCategories([])).toEqual([]);
    });

    it('should filter out empty strings', () => {
      const input = ['electronic', '', '   ', 'clubs'];
      const expected = ['DJ Sets/Electronic', 'Clubs/Discos'];
      expect(normalizeCategories(input)).toEqual(expected);
    });

    it('should handle non-array inputs gracefully', () => {
      expect(normalizeCategories(null as any)).toEqual([]);
      expect(normalizeCategories(undefined as any)).toEqual([]);
      expect(normalizeCategories('not an array' as any)).toEqual([]);
    });

    it('should preserve order while removing duplicates', () => {
      const input = ['clubs', 'electronic', 'clubs', 'museums'];
      const expected = ['Clubs/Discos', 'DJ Sets/Electronic', 'Museen'];
      expect(normalizeCategories(input)).toEqual(expected);
    });
  });

  describe('isRecognizedCategory', () => {
    it('should recognize main categories', () => {
      MAIN_CATEGORIES.forEach(category => {
        expect(isRecognizedCategory(category)).toBe(true);
      });
    });

    it('should recognize normalized aliases', () => {
      expect(isRecognizedCategory('electronic')).toBe(true);
      expect(isRecognizedCategory('clubs')).toBe(true);
      expect(isRecognizedCategory('concerts')).toBe(true);
    });

    it('should not recognize unknown categories', () => {
      expect(isRecognizedCategory('Unknown Category')).toBe(false);
      expect(isRecognizedCategory('Random Text')).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(isRecognizedCategory('')).toBe(false);
      expect(isRecognizedCategory('   ')).toBe(false);
    });
  });

  describe('getCategoryNormalizationStats', () => {
    it('should provide accurate statistics for mixed input', () => {
      const input = ['electronic', 'clubs', 'Unknown1', 'techno', 'Unknown2', ''];
      const stats = getCategoryNormalizationStats(input);
      
      expect(stats.total).toBe(5); // Empty string filtered out
      expect(stats.recognized).toBe(2); // 'DJ Sets/Electronic' and 'Clubs/Discos' 
      expect(stats.unrecognized).toBe(2); // Unknown1, Unknown2
      expect(stats.duplicatesRemoved).toBe(1); // electronic and techno both -> DJ Sets/Electronic
      
      expect(stats.mappings['electronic']).toBe('DJ Sets/Electronic');
      expect(stats.mappings['clubs']).toBe('Clubs/Discos');
      expect(stats.mappings['techno']).toBe('DJ Sets/Electronic');
      expect(stats.mappings['Unknown1']).toBe('Unknown1');
    });

    it('should handle empty input', () => {
      const stats = getCategoryNormalizationStats([]);
      expect(stats.total).toBe(0);
      expect(stats.recognized).toBe(0);
      expect(stats.unrecognized).toBe(0);
      expect(stats.duplicatesRemoved).toBe(0);
      expect(Object.keys(stats.mappings)).toHaveLength(0);
    });

    it('should handle all recognized categories', () => {
      const input = ['electronic', 'clubs', 'concerts'];
      const stats = getCategoryNormalizationStats(input);
      
      expect(stats.total).toBe(3);
      expect(stats.recognized).toBe(3);
      expect(stats.unrecognized).toBe(0);
      expect(stats.duplicatesRemoved).toBe(0);
    });

    it('should handle all unrecognized categories', () => {
      const input = ['Unknown1', 'Unknown2', 'Unknown3'];
      const stats = getCategoryNormalizationStats(input);
      
      expect(stats.total).toBe(3);
      expect(stats.recognized).toBe(0);
      expect(stats.unrecognized).toBe(3);
      expect(stats.duplicatesRemoved).toBe(0);
    });
  });

  describe('Fuzzy Matching Edge Cases', () => {
    it('should handle different fuzzy match scenarios', () => {
      // Test cases that should match within threshold (≤ 1)  
      expect(normalizeCategory('Clubss')).toBe('Clubs/Discos'); // 1 insertion  
      expect(normalizeCategory('Sporta')).toBe('Sport'); // 1 insertion
      
      // Test cases that should NOT match (> threshold)
      expect(normalizeCategory('electr')).toBe('electr'); // too many changes
      expect(normalizeCategory('xyz')).toBe('xyz'); // completely different
    });

    it('should prioritize exact matches over fuzzy matches', () => {
      // Even if fuzzy matching might work, exact alias match should take precedence
      expect(normalizeCategory('electronic')).toBe('DJ Sets/Electronic');
      expect(normalizeCategory('clubs')).toBe('Clubs/Discos');
    });
  });

  describe('Real-world Category Examples', () => {
    it('should handle common user input variations', () => {
      // Common variations users might enter
      expect(normalizeCategory('DJ')).toBe('DJ Sets/Electronic');
      expect(normalizeCategory('club')).toBe('Clubs/Discos');
      expect(normalizeCategory('party')).toBe('Clubs/Discos');
      expect(normalizeCategory('concert')).toBe('Live-Konzerte');
      expect(normalizeCategory('music')).toBe('Live-Konzerte');
      expect(normalizeCategory('festival')).toBe('Open Air');
      expect(normalizeCategory('art')).toBe('Kunst/Design');
      expect(normalizeCategory('theater')).toBe('Theater/Performance');
      expect(normalizeCategory('comedy')).toBe('Comedy/Kabarett');
      expect(normalizeCategory('film')).toBe('Film');
      expect(normalizeCategory('food')).toBe('Food/Culinary');
      expect(normalizeCategory('sport')).toBe('Sport');
      expect(normalizeCategory('family')).toBe('Familien/Kids');
      expect(normalizeCategory('business')).toBe('Networking/Business');
      expect(normalizeCategory('outdoor')).toBe('Open Air');
      expect(normalizeCategory('shopping')).toBe('Märkte/Shopping');
    });

    it('should handle German variations', () => {
      expect(normalizeCategory('Musik')).toBe('Live-Konzerte');
      expect(normalizeCategory('Kunst')).toBe('Kunst/Design');
      expect(normalizeCategory('Theater')).toBe('Theater/Performance');
      expect(normalizeCategory('Kino')).toBe('Film');
      // Note: 'Essen' -> 'Food/Culinary' mapping now added
      expect(normalizeCategory('Essen')).toBe('Food/Culinary');
      expect(normalizeCategory('Familie')).toBe('Familien/Kids');
      expect(normalizeCategory('Natur')).toBe('Natur/Outdoor');
    });
  });
});