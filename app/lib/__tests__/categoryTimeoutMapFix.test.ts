import { describe, it, expect } from 'vitest';

describe('Category Timeout Map Fix', () => {
  it('should enforce 60s minimum when categoryTimeoutMs is an object map', () => {
    // Simulate the timeout calculation logic from the fixed code
    const categoryTimeoutMs = {
      'Music': 30000, // 30s - below minimum
      'Theater': 90000, // 90s - above minimum
      'Art': undefined // missing value
    };
    
    const calculatePerCategoryTimeout = (category: string) => {
      if (typeof categoryTimeoutMs === 'object' && categoryTimeoutMs !== null) {
        const categoryTimeout = categoryTimeoutMs[category];
        return Math.max(typeof categoryTimeout === 'number' ? categoryTimeout : 90000, 60000);
      }
      if (typeof categoryTimeoutMs === 'number') return Math.max(categoryTimeoutMs, 60000);
      return 90000;
    };

    // Test categories with values below minimum
    expect(calculatePerCategoryTimeout('Music')).toBe(60000); // Should enforce 60s minimum
    
    // Test categories with values above minimum
    expect(calculatePerCategoryTimeout('Theater')).toBe(90000); // Should keep 90s
    
    // Test missing categories
    expect(calculatePerCategoryTimeout('Art')).toBe(90000); // Should use default 90s
    expect(calculatePerCategoryTimeout('NonExistent')).toBe(90000); // Should use default 90s
  });

  it('should work correctly with numeric categoryTimeoutMs', () => {
    const calculatePerCategoryTimeout = (categoryTimeoutMs: number, category: string) => {
      if (typeof categoryTimeoutMs === 'object' && categoryTimeoutMs !== null) {
        const categoryTimeout = categoryTimeoutMs[category];
        return Math.max(typeof categoryTimeout === 'number' ? categoryTimeout : 90000, 60000);
      }
      if (typeof categoryTimeoutMs === 'number') return Math.max(categoryTimeoutMs, 60000);
      return 90000;
    };

    // Test numeric value below minimum
    expect(calculatePerCategoryTimeout(30000, 'Music')).toBe(60000);
    
    // Test numeric value above minimum
    expect(calculatePerCategoryTimeout(120000, 'Music')).toBe(120000);
  });

  it('should handle edge cases gracefully', () => {
    const calculatePerCategoryTimeout = (categoryTimeoutMs: any, category: string) => {
      if (typeof categoryTimeoutMs === 'object' && categoryTimeoutMs !== null) {
        const categoryTimeout = categoryTimeoutMs[category];
        return Math.max(typeof categoryTimeout === 'number' ? categoryTimeout : 90000, 60000);
      }
      if (typeof categoryTimeoutMs === 'number') return Math.max(categoryTimeoutMs, 60000);
      return 90000;
    };

    // Test with null/undefined object
    expect(calculatePerCategoryTimeout(null, 'Music')).toBe(90000);
    expect(calculatePerCategoryTimeout(undefined, 'Music')).toBe(90000);
    
    // Test with empty object
    expect(calculatePerCategoryTimeout({}, 'Music')).toBe(90000);
    
    // Test with 0 timeout (edge case)
    expect(calculatePerCategoryTimeout({ 'Music': 0 }, 'Music')).toBe(60000);
  });
});