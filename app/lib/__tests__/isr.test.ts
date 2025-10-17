import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getRevalidateFor } from '../isr';

// Mock the hotCityStore module
vi.mock('@/lib/hotCityStore', () => ({
  getHotCity: vi.fn((name: string) => {
    // Return a mock hot city for Wien, null for others
    if (name.toLowerCase() === 'wien') {
      return Promise.resolve({
        id: '1',
        name: 'Wien',
        isActive: true,
        websites: [],
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    return Promise.resolve(null);
  })
}));

describe('ISR Utils', () => {
  describe('getRevalidateFor', () => {
    it('should return shorter revalidate time for "heute"', async () => {
      const result = await getRevalidateFor('SomeCity', 'heute');
      expect(result).toBeLessThanOrEqual(900); // 15min or less
      expect(result).toBeGreaterThanOrEqual(600); // min 10min
    });

    it('should return medium revalidate time for "morgen"', async () => {
      const result = await getRevalidateFor('SomeCity', 'morgen');
      expect(result).toBeLessThanOrEqual(1800); // 30min or less
      expect(result).toBeGreaterThanOrEqual(900); // min 15min
    });

    it('should return longer revalidate time for "wochenende"', async () => {
      const result = await getRevalidateFor('SomeCity', 'wochenende');
      expect(result).toBeLessThanOrEqual(3600); // 60min or less
      expect(result).toBeGreaterThanOrEqual(900); // min 15min
    });

    it('should return longer revalidate time for ISO dates', async () => {
      const result = await getRevalidateFor('SomeCity', '2025-12-31');
      expect(result).toBeLessThanOrEqual(3600); // 60min or less
      expect(result).toBeGreaterThanOrEqual(900); // min 15min
    });

    it('should return faster revalidation for hot cities', async () => {
      const hotCityResult = await getRevalidateFor('Wien', 'heute');
      const normalCityResult = await getRevalidateFor('SomeCity', 'heute');
      
      // Hot cities should have faster (lower) revalidation times
      expect(hotCityResult).toBeLessThan(normalCityResult);
      expect(hotCityResult).toBeGreaterThanOrEqual(600); // min 10min for hot cities
    });

    it('should have minimum revalidate time of 10min for hot cities', async () => {
      const result = await getRevalidateFor('Wien', 'heute');
      expect(result).toBeGreaterThanOrEqual(600);
    });

    it('should have minimum revalidate time of 15min for normal cities', async () => {
      const result = await getRevalidateFor('SomeCity', 'heute');
      expect(result).toBeGreaterThanOrEqual(900);
    });
  });
});
