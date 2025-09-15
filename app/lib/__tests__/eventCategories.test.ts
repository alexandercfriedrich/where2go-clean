import { describe, it, expect } from 'vitest';
import { 
  EVENT_CATEGORY_SUBCATEGORIES,
  buildCategoryListForPrompt,
  allowedCategoriesForSchema,
  getAllowedCategories,
  isValidCategory,
  isValidSubcategory 
} from '../eventCategories';

describe('Event Categories Module', () => {
  describe('EVENT_CATEGORY_SUBCATEGORIES', () => {
    it('should have exactly 20 main categories', () => {
      const categories = Object.keys(EVENT_CATEGORY_SUBCATEGORIES);
      expect(categories).toHaveLength(20);
    });

    it('should include all expected main categories', () => {
      const categories = Object.keys(EVENT_CATEGORY_SUBCATEGORIES);
      expect(categories).toContain('DJ Sets/Electronic');
      expect(categories).toContain('Clubs/Discos');
      expect(categories).toContain('Live-Konzerte');
      expect(categories).toContain('LGBTQ+');
      expect(categories).toContain('Comedy/Kabarett');
      expect(categories).toContain('Theater/Performance');
      expect(categories).toContain('Familien/Kids');
      expect(categories).toContain('Soziales/Community');
    });

    it('should have each main category as first element in its subcategories', () => {
      for (const [mainCategory, subcategories] of Object.entries(EVENT_CATEGORY_SUBCATEGORIES)) {
        expect(subcategories[0]).toBe(mainCategory);
      }
    });
  });

  describe('buildCategoryListForPrompt', () => {
    it('should return numbered list of all categories', () => {
      const categoryList = buildCategoryListForPrompt();
      expect(categoryList).toContain('1. DJ Sets & Electronic Music Events');
      expect(categoryList).toContain('3. Konzerte & Musik (Klassik, Rock, Pop, Jazz, Elektronik)');
      expect(categoryList).toContain('6. LGBT+ Events & Queer Events & Pride Events');
      expect(categoryList.split('\n')).toHaveLength(20);
    });

    it('should work with subset of categories', () => {
      const subset = ['DJ Sets/Electronic', 'Live-Konzerte'];
      const categoryList = buildCategoryListForPrompt(subset);
      expect(categoryList).toContain('1. DJ Sets & Electronic Music Events');
      expect(categoryList).toContain('2. Konzerte & Musik (Klassik, Rock, Pop, Jazz, Elektronik)');
      expect(categoryList.split('\n')).toHaveLength(2);
    });
  });

  describe('allowedCategoriesForSchema', () => {
    it('should return all main category names', () => {
      const allowed = allowedCategoriesForSchema();
      expect(allowed).toHaveLength(20);
      expect(allowed).toContain('DJ Sets/Electronic');
      expect(allowed).toContain('Soziales/Community');
    });
  });

  describe('getAllowedCategories', () => {
    it('should be alias for allowedCategoriesForSchema', () => {
      const allowed1 = allowedCategoriesForSchema();
      const allowed2 = getAllowedCategories();
      expect(allowed1).toEqual(allowed2);
    });
  });

  describe('isValidCategory', () => {
    it('should validate main categories correctly', () => {
      expect(isValidCategory('DJ Sets/Electronic')).toBe(true);
      expect(isValidCategory('Live-Konzerte')).toBe(true);
      expect(isValidCategory('LGBTQ+')).toBe(true);
      expect(isValidCategory('Invalid Category')).toBe(false);
      expect(isValidCategory('')).toBe(false);
    });
  });

  describe('isValidSubcategory', () => {
    it('should validate subcategories correctly', () => {
      // Main categories should also be valid subcategories
      expect(isValidSubcategory('DJ Sets/Electronic')).toBe(true);
      expect(isValidSubcategory('Live-Konzerte')).toBe(true);
      
      // Subcategories should be valid
      expect(isValidSubcategory('Techno/House/EDM')).toBe(true);
      expect(isValidSubcategory('Jazz/Blues')).toBe(true);
      expect(isValidSubcategory('Pride Event')).toBe(true);
      
      // Invalid subcategories should return false
      expect(isValidSubcategory('Invalid Subcategory')).toBe(false);
      expect(isValidSubcategory('')).toBe(false);
    });
  });
});