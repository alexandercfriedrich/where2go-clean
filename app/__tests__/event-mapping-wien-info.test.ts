import { describe, it, expect } from 'vitest';
import {
  WIEN_INFO_F1_BY_LABEL,
  WHERE2GO_TO_WIENINFO,
  WIENINFO_TO_WHERE2GO_PREFERRED,
  mapWienInfoCategoryLabelToWhereToGo,
  getWienInfoF1IdsForCategories
} from '../event_mapping_wien_info';

describe('Wien.info Event Mapping SSOT', () => {
  describe('mapWienInfoCategoryLabelToWhereToGo', () => {
    it('should map official wien.info labels to where2go categories', () => {
      expect(mapWienInfoCategoryLabelToWhereToGo('Rock, Pop, Jazz und mehr')).toBe('Live-Konzerte');
      expect(mapWienInfoCategoryLabelToWhereToGo('Klassisch')).toBe('Live-Konzerte');
      expect(mapWienInfoCategoryLabelToWhereToGo('Theater und Kabarett')).toBe('Theater/Performance');
      expect(mapWienInfoCategoryLabelToWhereToGo('Ausstellungen')).toBe('Museen');
      expect(mapWienInfoCategoryLabelToWhereToGo('Familien, Kids')).toBe('Familien/Kids');
    });

    it('should handle variant spellings', () => {
      expect(mapWienInfoCategoryLabelToWhereToGo('Konzerte klassisch')).toBe('Live-Konzerte');
      expect(mapWienInfoCategoryLabelToWhereToGo('Film und Sommerkinos')).toBe('Film');
      expect(mapWienInfoCategoryLabelToWhereToGo('LGBTIQ+')).toBe('LGBTQ+');
    });

    it('should be case-insensitive', () => {
      expect(mapWienInfoCategoryLabelToWhereToGo('rock, pop, jazz und mehr')).toBe('Live-Konzerte');
      expect(mapWienInfoCategoryLabelToWhereToGo('KLASSISCH')).toBe('Live-Konzerte');
    });

    it('should return null for unmapped categories', () => {
      expect(mapWienInfoCategoryLabelToWhereToGo('Unknown Category')).toBe(null);
      expect(mapWienInfoCategoryLabelToWhereToGo('')).toBe(null);
    });
  });

  describe('getWienInfoF1IdsForCategories', () => {
    it('should return unique F1 IDs for given categories', () => {
      const ids = getWienInfoF1IdsForCategories(['Live-Konzerte', 'DJ Sets/Electronic']);
      expect(ids).toContain(896980); // Rock, Pop, Jazz
      expect(ids).toContain(896984); // Klassisch
      expect(ids.length).toBe(2);
    });

    it('should deduplicate F1 IDs when multiple categories map to same ID', () => {
      const ids = getWienInfoF1IdsForCategories(['DJ Sets/Electronic', 'Clubs/Discos', 'Live-Konzerte']);
      expect(ids).toContain(896980);
      expect(ids).toContain(896984);
      // Should not have duplicates even though all three map to 896980
      expect(ids.length).toBe(2);
    });

    it('should return empty array for unmapped categories', () => {
      const ids = getWienInfoF1IdsForCategories(['Sonstiges/Other']);
      expect(ids).toEqual([]);
    });

    it('should handle multiple categories with different F1 IDs', () => {
      const ids = getWienInfoF1IdsForCategories(['Film', 'Sport', 'Museen']);
      expect(ids).toContain(896992); // Film
      expect(ids).toContain(896994); // Sport
      expect(ids).toContain(896982); // Ausstellungen
      expect(ids.length).toBe(3);
    });
  });

  describe('SSOT data integrity', () => {
    it('should have all F1 IDs defined in WIEN_INFO_F1_BY_LABEL', () => {
      const labels = Object.keys(WIEN_INFO_F1_BY_LABEL);
      expect(labels.length).toBeGreaterThan(0);
      
      // Verify all IDs are numbers
      Object.values(WIEN_INFO_F1_BY_LABEL).forEach(id => {
        expect(typeof id).toBe('number');
        expect(id).toBeGreaterThan(0);
      });
    });

    it('should have reverse mapping for all F1 labels', () => {
      const f1Labels = Object.keys(WIEN_INFO_F1_BY_LABEL);
      const reverseLabels = Object.keys(WIENINFO_TO_WHERE2GO_PREFERRED);
      
      // Every label in F1_BY_LABEL should have a reverse mapping
      f1Labels.forEach(label => {
        expect(reverseLabels).toContain(label);
      });
    });

    it('should have WHERE2GO_TO_WIENINFO reference only valid wien.info labels', () => {
      const validLabels = Object.keys(WIEN_INFO_F1_BY_LABEL);
      
      Object.values(WHERE2GO_TO_WIENINFO).forEach(labels => {
        labels.forEach(label => {
          expect(validLabels).toContain(label);
        });
      });
    });

    it('should cover all 21 where2go categories', () => {
      const categories = Object.keys(WHERE2GO_TO_WIENINFO);
      expect(categories).toContain('DJ Sets/Electronic');
      expect(categories).toContain('Clubs/Discos');
      expect(categories).toContain('Live-Konzerte');
      expect(categories).toContain('Theater/Performance');
      expect(categories).toContain('Open Air');
      expect(categories).toContain('Museen');
      expect(categories).toContain('Comedy/Kabarett');
      expect(categories).toContain('Film');
      expect(categories).toContain('Kunst/Design');
      expect(categories).toContain('Kultur/Traditionen');
      expect(categories).toContain('LGBTQ+');
      expect(categories).toContain('Bildung/Lernen');
      expect(categories).toContain('Networking/Business');
      expect(categories).toContain('Sport');
      expect(categories).toContain('Natur/Outdoor');
      expect(categories).toContain('Wellness/Spirituell');
      expect(categories).toContain('Soziales/Community');
      expect(categories).toContain('Märkte/Shopping');
      expect(categories).toContain('Food/Culinary');
      expect(categories).toContain('Familien/Kids');
      expect(categories).toContain('Sonstiges/Other');
      expect(categories.length).toBe(21);
    });
  });
});
