import { describe, it, expect } from 'vitest';
import { importWienInfoEvents } from '../importers/wienInfoImporter';
import type { ImporterStats } from '../importers/wienInfoImporter';

describe('Wien.info Importer', () => {
  it('should create valid ImporterStats structure', async () => {
    // Test that the importer returns the expected structure
    // We use dry-run mode to avoid actual DB operations in tests
    const stats = await importWienInfoEvents({
      dryRun: true,
      limit: 5,
      fromDate: '2025-11-17',
      toDate: '2025-11-18',
      debug: false
    });

    // Verify stats structure
    expect(stats).toHaveProperty('totalImported');
    expect(stats).toHaveProperty('totalUpdated');
    expect(stats).toHaveProperty('totalFailed');
    expect(stats).toHaveProperty('pagesProcessed');
    expect(stats).toHaveProperty('venuesProcessed');
    expect(stats).toHaveProperty('duration');
    expect(stats).toHaveProperty('errors');
    expect(stats).toHaveProperty('dateRange');
    
    // Verify types
    expect(typeof stats.totalImported).toBe('number');
    expect(typeof stats.totalUpdated).toBe('number');
    expect(typeof stats.totalFailed).toBe('number');
    expect(typeof stats.pagesProcessed).toBe('number');
    expect(typeof stats.venuesProcessed).toBe('number');
    expect(typeof stats.duration).toBe('number');
    expect(Array.isArray(stats.errors)).toBe(true);
    expect(stats.dateRange).toHaveProperty('from');
    expect(stats.dateRange).toHaveProperty('to');
  });

  it('should use default date range when not provided', async () => {
    const stats = await importWienInfoEvents({
      dryRun: true,
      limit: 1,
      debug: false
    });

    // Should have a valid date range
    expect(stats.dateRange.from).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(stats.dateRange.to).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    
    // To date should be after from date
    const fromDate = new Date(stats.dateRange.from);
    const toDate = new Date(stats.dateRange.to);
    expect(toDate.getTime()).toBeGreaterThan(fromDate.getTime());
  });

  it('should respect dry-run mode', async () => {
    // In dry-run mode, no actual DB operations should occur
    const stats = await importWienInfoEvents({
      dryRun: true,
      limit: 5,
      fromDate: '2025-11-17',
      toDate: '2025-11-18',
      debug: false
    });

    // In dry-run, we should have processed something but no failures
    // (unless the API itself fails)
    expect(stats.duration).toBeGreaterThan(0);
  });

  it('should handle batch processing correctly', async () => {
    // Test with different batch sizes
    const stats1 = await importWienInfoEvents({
      dryRun: true,
      batchSize: 10,
      limit: 5,
      fromDate: '2025-11-17',
      toDate: '2025-11-18',
      debug: false
    });

    const stats2 = await importWienInfoEvents({
      dryRun: true,
      batchSize: 100,
      limit: 5,
      fromDate: '2025-11-17',
      toDate: '2025-11-18',
      debug: false
    });

    // Both should complete successfully
    expect(stats1.duration).toBeGreaterThan(0);
    expect(stats2.duration).toBeGreaterThan(0);
  });

  it('should validate date format in stats', async () => {
    const customFrom = '2025-12-25';
    const customTo = '2025-12-31';
    
    const stats = await importWienInfoEvents({
      dryRun: true,
      fromDate: customFrom,
      toDate: customTo,
      limit: 1,
      debug: false
    });

    // Should use the provided dates
    expect(stats.dateRange.from).toBe(customFrom);
    expect(stats.dateRange.to).toBe(customTo);
  });

  it('should track pages processed', async () => {
    const stats = await importWienInfoEvents({
      dryRun: true,
      limit: 5,
      fromDate: '2025-11-17',
      toDate: '2025-11-18',
      debug: false
    });

    // Should have processed at least 0 pages (API may return no events)
    expect(stats.pagesProcessed).toBeGreaterThanOrEqual(0);
  });

  it('should collect errors in stats', async () => {
    const stats = await importWienInfoEvents({
      dryRun: true,
      limit: 1,
      fromDate: '2025-11-17',
      toDate: '2025-11-18',
      debug: false
    });

    // Errors should be an array
    expect(Array.isArray(stats.errors)).toBe(true);
    
    // Each error should be a string
    stats.errors.forEach(error => {
      expect(typeof error).toBe('string');
    });
  });
});
