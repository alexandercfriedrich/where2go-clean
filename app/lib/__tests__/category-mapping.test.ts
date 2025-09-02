import { describe, it, expect } from 'vitest';
import { 
  getMainCategories, 
  getMainCategoryForSubcategory, 
  getMainCategoriesForAICalls,
  getSubcategoriesForMainCategory,
  CATEGORY_MAP 
} from '../../categories';

describe('Category Mapping Functions', () => {
  describe('getMainCategories', () => {
    it('should return all 20 main categories', () => {
      const mainCategories = getMainCategories();
      expect(mainCategories).toHaveLength(20);
      expect(mainCategories).toContain('DJ Sets/Electronic');
      expect(mainCategories).toContain('Clubs/Discos');
      expect(mainCategories).toContain('Live-Konzerte');
    });
  });

  describe('getMainCategoryForSubcategory', () => {
    it('should return main category if input is already a main category', () => {
      expect(getMainCategoryForSubcategory('DJ Sets/Electronic')).toBe('DJ Sets/Electronic');
      expect(getMainCategoryForSubcategory('Clubs/Discos')).toBe('Clubs/Discos');
    });

    it('should map subcategories to their main categories', () => {
      expect(getMainCategoryForSubcategory('Techno/House/EDM')).toBe('DJ Sets/Electronic');
      expect(getMainCategoryForSubcategory('Nightclubs')).toBe('Clubs/Discos');
      expect(getMainCategoryForSubcategory('Rock/Pop/Alternative')).toBe('Live-Konzerte');
    });

    it('should handle case insensitive matching', () => {
      expect(getMainCategoryForSubcategory('techno/house/edm')).toBe('DJ Sets/Electronic');
      expect(getMainCategoryForSubcategory('NIGHTCLUBS')).toBe('Clubs/Discos');
    });

    it('should return null for non-existent subcategories', () => {
      expect(getMainCategoryForSubcategory('Non-existent Category')).toBeNull();
      expect(getMainCategoryForSubcategory('')).toBeNull();
    });
  });

  describe('getMainCategoriesForAICalls', () => {
    it('should handle the problem statement scenario correctly', () => {
      // Test the exact scenario from the problem: subcategories should map to main categories for AI calls
      const subcategories = ['Techno/House/EDM', 'Nightclubs', 'Rock/Pop/Alternative'];
      const mainCategoriesForAI = getMainCategoriesForAICalls(subcategories);
      
      expect(mainCategoriesForAI).toContain('DJ Sets/Electronic');
      expect(mainCategoriesForAI).toContain('Clubs/Discos');
      expect(mainCategoriesForAI).toContain('Live-Konzerte');
      expect(mainCategoriesForAI).toHaveLength(3);
    });

    it('should eliminate duplicates when multiple subcategories belong to same main category', () => {
      const subcategories = ['Techno/House/EDM', 'Drum & Bass', 'Trance/Progressive']; // All belong to DJ Sets/Electronic
      const mainCategoriesForAI = getMainCategoriesForAICalls(subcategories);
      
      expect(mainCategoriesForAI).toEqual(['DJ Sets/Electronic']);
      expect(mainCategoriesForAI).toHaveLength(1);
    });

    it('should handle mixed main categories and subcategories', () => {
      const mixed = ['DJ Sets/Electronic', 'Nightclubs', 'Live-Konzerte']; // Main + subcategory + main
      const mainCategoriesForAI = getMainCategoriesForAICalls(mixed);
      
      expect(mainCategoriesForAI).toContain('DJ Sets/Electronic');
      expect(mainCategoriesForAI).toContain('Clubs/Discos');
      expect(mainCategoriesForAI).toContain('Live-Konzerte');
      expect(mainCategoriesForAI).toHaveLength(3);
    });

    it('should filter out invalid categories', () => {
      const withInvalid = ['DJ Sets/Electronic', 'Invalid Category', 'Nightclubs'];
      const mainCategoriesForAI = getMainCategoriesForAICalls(withInvalid);
      
      expect(mainCategoriesForAI).toContain('DJ Sets/Electronic');
      expect(mainCategoriesForAI).toContain('Clubs/Discos');
      expect(mainCategoriesForAI).toHaveLength(2);
    });
  });

  describe('getSubcategoriesForMainCategory', () => {
    it('should return all subcategories for a main category', () => {
      const djSubcategories = getSubcategoriesForMainCategory('DJ Sets/Electronic');
      expect(djSubcategories).toContain('DJ Sets/Electronic');
      expect(djSubcategories).toContain('Techno/House/EDM');
      expect(djSubcategories).toContain('Drum & Bass');
    });

    it('should return empty array for non-existent main category', () => {
      const result = getSubcategoriesForMainCategory('Non-existent');
      expect(result).toEqual([]);
    });
  });

  describe('CATEGORY_MAP validation', () => {
    it('should have exactly 20 main categories', () => {
      expect(Object.keys(CATEGORY_MAP)).toHaveLength(20);
    });

    it('should have each main category as first element in its subcategories', () => {
      for (const [mainCategory, subcategories] of Object.entries(CATEGORY_MAP)) {
        expect(subcategories[0]).toBe(mainCategory);
      }
    });
  });
});