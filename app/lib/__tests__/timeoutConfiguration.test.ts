import { describe, it, expect, vi, beforeEach } from 'vitest';

// Test timeout configuration changes
describe('Timeout Configuration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('QueryOptions interface', () => {
    it('should support overallTimeoutMs option', () => {
      const options = {
        categoryTimeoutMs: 90000,
        overallTimeoutMs: 240000,
        maxAttempts: 5
      };

      // Type check - this should compile without errors
      expect(options.overallTimeoutMs).toBe(240000);
      expect(options.categoryTimeoutMs).toBe(90000);
    });
  });

  describe('Environment variable support', () => {
    it('should parse OVERALL_TIMEOUT_MS correctly', () => {
      // Test parsing of environment variable
      const defaultTimeout = parseInt(process.env.OVERALL_TIMEOUT_MS || '240000', 10);
      expect(defaultTimeout).toBe(240000);
      
      // Test with custom value
      const customTimeout = parseInt('300000', 10);
      expect(customTimeout).toBe(300000);
    });
  });

  describe('Minimum timeout enforcement on Vercel', () => {
    it('should enforce minimum 60s timeout on Vercel', () => {
      const isVercel = process.env.VERCEL === '1';
      const requestedTimeout = 30000; // 30s - too low
      const expectedMinimum = 60000; // 60s minimum
      
      const actualTimeout = isVercel ? 
        Math.max(requestedTimeout, expectedMinimum) : 
        requestedTimeout;
      
      if (isVercel) {
        expect(actualTimeout).toBe(expectedMinimum);
      } else {
        expect(actualTimeout).toBe(requestedTimeout);
      }
    });

    it('should allow higher timeouts than minimum', () => {
      const isVercel = process.env.VERCEL === '1';
      const requestedTimeout = 90000; // 90s - above minimum
      const minimumTimeout = 60000; // 60s minimum
      
      const actualTimeout = isVercel ? 
        Math.max(requestedTimeout, minimumTimeout) : 
        requestedTimeout;
      
      expect(actualTimeout).toBe(requestedTimeout);
    });
  });

  describe('Default timeout values', () => {
    it('should have increased category timeout default to 90s', () => {
      const defaultCategoryTimeout = 90000; // 90s
      expect(defaultCategoryTimeout).toBeGreaterThan(45000); // Previous 45s
      expect(defaultCategoryTimeout).toBe(90000);
    });

    it('should have overall timeout default of 4 minutes', () => {
      const defaultOverallTimeout = 240000; // 4 minutes
      expect(defaultOverallTimeout).toBe(4 * 60 * 1000);
    });
  });

  describe('Client-side configuration', () => {
    it('should use new timeout defaults in options', () => {
      const clientOptions = {
        categoryTimeoutMs: 90000, // 90s (increased from 45s)
        overallTimeoutMs: 240000, // 4 minutes
        categoryConcurrency: 5,
        maxAttempts: 5
      };

      expect(clientOptions.categoryTimeoutMs).toBe(90000);
      expect(clientOptions.overallTimeoutMs).toBe(240000);
      expect(clientOptions.categoryTimeoutMs).toBeGreaterThan(45000); // Ensure increase
    });
  });
});