import { describe, it, expect, vi } from 'vitest';
import { generateSeoPaths } from '../seoPaths';

// Mock the dependencies
vi.mock('@/lib/hotCityStore', () => ({
  getActiveHotCities: vi.fn(() => {
    return Promise.resolve([
      {
        id: '1',
        name: 'Wien',
        isActive: true,
        websites: [],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '2',
        name: 'Berlin',
        isActive: true,
        websites: [],
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
  }),
  slugify: (text: string) => text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-').replace(/--+/g, '-').replace(/^-|-$/g, '')
}));

describe('SEO Paths Generator', () => {
  describe('generateSeoPaths', () => {
    it('should generate paths for multiple cities', async () => {
      const paths = await generateSeoPaths();
      
      // Should include both Wien and Berlin
      expect(paths.some(p => p.includes('/wien'))).toBe(true);
      expect(paths.some(p => p.includes('/berlin'))).toBe(true);
    });

    it('should include core date tokens', async () => {
      const paths = await generateSeoPaths();
      
      // Should include heute, morgen, wochenende
      expect(paths.some(p => p === '/wien/heute')).toBe(true);
      expect(paths.some(p => p === '/wien/morgen')).toBe(true);
      expect(paths.some(p => p === '/wien/wochenende')).toBe(true);
    });

    it('should include category paths', async () => {
      const paths = await generateSeoPaths();
      
      // Should include some category paths
      expect(paths.some(p => p.match(/\/wien\/[a-z-]+$/) && !p.match(/\/(heute|morgen|wochenende)$/))).toBe(true);
    });

    it('should include category + date combinations', async () => {
      const paths = await generateSeoPaths();
      
      // Should have paths with category and date
      expect(paths.some(p => {
        const parts = p.split('/').filter(Boolean);
        return parts.length === 3; // city, category, date
      })).toBe(true);
    });

    it('should include next 14 days as ISO dates', async () => {
      const paths = await generateSeoPaths();
      
      // Should have some ISO date paths
      expect(paths.some(p => p.match(/\/wien\/\d{4}-\d{2}-\d{2}$/))).toBe(true);
    });

    it('should respect limit parameter', async () => {
      const limitedPaths = await generateSeoPaths(50);
      expect(limitedPaths.length).toBeLessThanOrEqual(50);
    });

    it('should generate unique paths (no duplicates)', async () => {
      const paths = await generateSeoPaths();
      const uniquePaths = new Set(paths);
      expect(paths.length).toBe(uniquePaths.size);
    });

    it('should generate a reasonable number of paths', async () => {
      const paths = await generateSeoPaths();
      
      // Should generate a substantial number of paths but not excessive
      expect(paths.length).toBeGreaterThan(50);
      expect(paths.length).toBeLessThan(10000);
    });

    it('should include city-only paths', async () => {
      const paths = await generateSeoPaths();
      
      expect(paths).toContain('/wien');
      expect(paths).toContain('/berlin');
    });
  });
});
