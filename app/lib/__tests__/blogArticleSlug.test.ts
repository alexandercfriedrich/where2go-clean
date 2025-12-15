/**
 * Tests for Blog Article Slug Generation
 * Validates that multiple articles can exist for the same city-category with different slugs
 */

import { describe, it, expect } from 'vitest';
import { generateBlogSlug } from '../utils/blogSlugGenerator';

describe('Blog Article Slug Generation', () => {
  describe('generateBlogSlug', () => {
    it('should validate required parameters', () => {
      expect(() => generateBlogSlug('', 'Live-Konzerte', 'Test')).toThrow('City parameter is required');
      expect(() => generateBlogSlug('   ', 'Live-Konzerte', 'Test')).toThrow('City parameter is required');
      expect(() => generateBlogSlug('wien', '', 'Test')).toThrow('Category parameter is required');
      expect(() => generateBlogSlug('wien', '   ', 'Test')).toThrow('Category parameter is required');
      expect(() => generateBlogSlug('wien', 'Live-Konzerte', '')).toThrow('Title parameter is required');
      expect(() => generateBlogSlug('wien', 'Live-Konzerte', '   ')).toThrow('Title parameter is required');
    });

    it('should generate unique slugs for different titles in same city-category', () => {
      const city = 'wien';
      const category = 'Clubs & Nachtleben';
      
      const slug1 = generateBlogSlug(city, category, 'Die besten Clubs in Wien');
      const slug2 = generateBlogSlug(city, category, 'Nachtleben Guide für Wien');
      
      // Slugs should be different
      expect(slug1).not.toBe(slug2);
      
      // Both should start with the same city-category prefix
      expect(slug1).toContain('wien-clubs-nachtleben');
      expect(slug2).toContain('wien-clubs-nachtleben');
      
      // But have different title parts
      expect(slug1).toContain('die-besten-clubs-in-wien');
      expect(slug2).toContain('nachtleben-guide-fur-wien');
    });

    it('should generate identical slugs for identical titles', () => {
      const city = 'wien';
      const category = 'Live-Konzerte';
      const title = 'Die besten Konzerte im Dezember';
      
      const slug1 = generateBlogSlug(city, category, title);
      const slug2 = generateBlogSlug(city, category, title);
      
      // Same title should generate same slug (for upsert behavior)
      expect(slug1).toBe(slug2);
    });

    it('should handle special characters in category names', () => {
      const slug = generateBlogSlug('wien', 'Clubs & Nachtleben', 'Party Guide');
      
      // Ampersand should be converted to dash
      expect(slug).toContain('clubs-nachtleben');
      expect(slug).not.toContain('&');
      expect(slug).not.toContain('amp;');
    });

    it('should handle long titles by truncating', () => {
      const longTitle = 'A'.repeat(200) + ' - Long Article Title';
      const slug = generateBlogSlug('wien', 'Live-Konzerte', longTitle);
      
      // Total slug length should be reasonable
      expect(slug.length).toBeLessThan(200);
      
      // Should still contain city and category
      expect(slug).toContain('wien-live-konzerte');
    });

    it('should normalize city to lowercase', () => {
      const slug1 = generateBlogSlug('Wien', 'Live-Konzerte', 'Test Title');
      const slug2 = generateBlogSlug('wien', 'Live-Konzerte', 'Test Title');
      
      // Should generate same slug regardless of city case
      expect(slug1).toBe(slug2);
    });

    it('should handle all valid cities', () => {
      const validCities = ['wien', 'berlin', 'linz', 'ibiza'];
      const category = 'Live-Konzerte';
      const title = 'Test Article';
      
      validCities.forEach(city => {
        const slug = generateBlogSlug(city, category, title);
        expect(slug).toContain(city.toLowerCase());
        expect(slug).toContain('live-konzerte');
      });
    });

    it('should handle all event categories', () => {
      const categories = [
        'Clubs & Nachtleben',
        'Live-Konzerte',
        'Klassik & Oper',
        'Theater & Comedy',
        'Museen & Ausstellungen',
        'Film & Kino',
        'Open Air & Festivals',
        'Kulinarik & Märkte',
        'Sport & Fitness',
        'Bildung & Workshops',
        'Familie & Kinder',
        'LGBTQ+'
      ];
      
      categories.forEach(category => {
        const slug = generateBlogSlug('wien', category, 'Test Article');
        
        // Should not contain any non-slug characters
        expect(slug).toMatch(/^[a-z0-9-]+$/);
        
        // Should not have consecutive dashes
        expect(slug).not.toMatch(/--/);
        
        // Should not start or end with dash
        expect(slug).not.toMatch(/^-/);
        expect(slug).not.toMatch(/-$/);
      });
    });

    it('should demonstrate multiple articles scenario', () => {
      // Scenario: Daily cron job creates articles for same city-category
      const city = 'wien';
      const category = 'Clubs & Nachtleben';
      
      const articleTitles = [
        'Die besten Techno Clubs in Wien',
        'House Music Hotspots in Wien',
        'Underground Partys in Wien',
        'Wochenend-Party Guide'
      ];
      
      const slugs = articleTitles.map(title => 
        generateBlogSlug(city, category, title)
      );
      
      // All slugs should be unique
      const uniqueSlugs = new Set(slugs);
      expect(uniqueSlugs.size).toBe(articleTitles.length);
      
      // All should start with same city-category prefix
      slugs.forEach(slug => {
        expect(slug).toContain('wien-clubs-nachtleben');
      });
    });
  });

  describe('Constraint Behavior', () => {
    it('should allow different slugs for same city-category', () => {
      // This test documents the expected database constraint behavior
      // The constraint is: UNIQUE (city, category, slug)
      // NOT: UNIQUE (city, category) <- This was the bug!
      
      const testCases = [
        {
          city: 'wien',
          category: 'Clubs & Nachtleben',
          title: 'Article 1',
          shouldBeAllowed: true
        },
        {
          city: 'wien',
          category: 'Clubs & Nachtleben',
          title: 'Article 2', // Different title = different slug
          shouldBeAllowed: true
        },
        {
          city: 'wien',
          category: 'Clubs & Nachtleben',
          title: 'Article 1', // Same title = same slug = update existing
          shouldBeAllowed: true // Allowed as update, not insert
        }
      ];
      
      const slugs = testCases.map(tc => ({
        ...tc,
        slug: generateBlogSlug(tc.city, tc.category, tc.title)
      }));
      
      // First two should have different slugs
      expect(slugs[0].slug).not.toBe(slugs[1].slug);
      
      // First and third should have same slug (same title)
      expect(slugs[0].slug).toBe(slugs[2].slug);
      
      // All should be allowed by the constraint
      slugs.forEach(item => {
        expect(item.shouldBeAllowed).toBe(true);
      });
    });
  });
});
