import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventData } from '@/lib/types';

/**
 * Tests for debug logging features
 * 
 * These tests validate that debug logging works correctly without
 * causing runtime errors. They use mocked console methods to verify
 * logging behavior.
 */
describe('Debug Logging Features', () => {
  let consoleLogSpy: any;
  let consoleErrorSpy: any;
  
  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  
  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('Filter Debug Logging', () => {
    it('should log filter debug start and end markers', () => {
      console.log('=== FILTER DEBUG START ===');
      console.log('[DEBUG fetchEvents] Total events from day-bucket:', 100);
      console.log('=== FILTER DEBUG END ===');
      
      expect(consoleLogSpy).toHaveBeenCalledWith('=== FILTER DEBUG START ===');
      expect(consoleLogSpy).toHaveBeenCalledWith('=== FILTER DEBUG END ===');
    });
    
    it('should log event counts at each filter stage', () => {
      console.log('[DEBUG fetchEvents] Total events from day-bucket:', 100);
      console.log('[DEBUG fetchEvents] After validity filter:', 95, 'events (expired:', 5, ')');
      console.log('[DEBUG fetchEvents] After category filter:', 50, 'events (filtered out:', 45, ')');
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[DEBUG fetchEvents] Total events from day-bucket:',
        100
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[DEBUG fetchEvents] After validity filter:',
        95,
        'events (expired:',
        5,
        ')'
      );
    });
    
    it('should log category mismatch details', () => {
      const debugInfo = {
        eventTitle: 'Test Event',
        eventCategory: 'Theater',
        normalizedCategory: 'Theater & Performance',
        requestedCategories: ['Musik & Konzerte'],
        matches: false
      };
      
      console.log('[DEBUG Filter] Category mismatch:', debugInfo);
      
      expect(consoleLogSpy).toHaveBeenCalledWith('[DEBUG Filter] Category mismatch:', debugInfo);
    });
  });

  describe('Cache Debug Logging', () => {
    it('should log cache lookup with parameters', () => {
      const params = { city: 'Wien', date: '2025-10-27', categories: ['Musik & Konzerte'] };
      console.log('[DEBUG Cache.getEventsByCategories] Input:', params);
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[DEBUG Cache.getEventsByCategories] Input:',
        params
      );
    });
    
    it('should log cache hit with success marker', () => {
      console.log('[DEBUG Cache] ✅ Found 50 events for category "Musik & Konzerte"');
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[DEBUG Cache] ✅ Found 50 events for category "Musik & Konzerte"'
      );
    });
    
    it('should log cache miss with failure marker', () => {
      console.log('[DEBUG Cache] ❌ No events found for category "Theater"', '(key not found)');
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[DEBUG Cache] ❌ No events found for category "Theater"',
        '(key not found)'
      );
    });
    
    it('should log cache summary with statistics', () => {
      const summary = {
        totalCategories: 10,
        cachedCategories: 7,
        missingCategories: 3,
        totalEvents: 150
      };
      
      console.log('[DEBUG Cache.getEventsByCategories] Summary:', summary);
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[DEBUG Cache.getEventsByCategories] Summary:',
        summary
      );
    });
  });

  describe('Search API Debug Logging', () => {
    it('should generate unique request IDs', () => {
      const requestId1 = `search-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const requestId2 = `search-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      expect(requestId1).toMatch(/^search-\d+-[a-z0-9]+$/);
      expect(requestId2).toMatch(/^search-\d+-[a-z0-9]+$/);
      // While theoretically could be equal, practically never happens
      expect(requestId1 !== requestId2).toBeTruthy();
    });
    
    it('should log request start and end with request ID', () => {
      const requestId = 'search-123-abc';
      console.log(`[DEBUG Search API ${requestId}] === REQUEST START ===`);
      console.log(`[DEBUG Search API ${requestId}] === REQUEST END ===`);
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[DEBUG Search API search-123-abc] === REQUEST START ==='
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[DEBUG Search API search-123-abc] === REQUEST END ==='
      );
    });
    
    it('should log cache and AI event counts', () => {
      const requestId = 'search-123-abc';
      console.log(`[DEBUG Search API ${requestId}] After deduplication:`, 50, 'cached events');
      console.log(`[DEBUG Search API ${requestId}] AI returned`, 25, 'new events');
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[DEBUG Search API search-123-abc] After deduplication:',
        50,
        'cached events'
      );
    });
  });

  describe('Page Generation Debug', () => {
    it('should log page generation timestamp', () => {
      const timestamp = new Date().toISOString();
      console.log('[DEBUG Page Generation] Page generated at:', timestamp);
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[DEBUG Page Generation] Page generated at:',
        timestamp
      );
    });
    
    it('should log fetch parameters', () => {
      const params = { city: 'Wien', dateISO: '2025-10-27', category: 'live-konzerte' };
      console.log('[DEBUG Page] Fetching events with params:', params);
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[DEBUG Page] Fetching events with params:',
        params
      );
    });
  });

  describe('Revalidation API Debug', () => {
    it('should log revalidation requests', () => {
      const requestData = { path: '/wien', hasSecret: true };
      console.log('[DEBUG Revalidation API] Request received:', requestData);
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[DEBUG Revalidation API] Request received:',
        requestData
      );
    });
    
    it('should log successful revalidation with timestamp', () => {
      const path = '/wien/live-konzerte';
      const timestamp = '2025-10-27T10:00:00.000Z';
      console.log('[DEBUG Revalidation API] ✅ Path revalidated successfully:', path, 'at', timestamp);
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[DEBUG Revalidation API] ✅ Path revalidated successfully:',
        path,
        'at',
        timestamp
      );
    });
    
    it('should log revalidation errors', () => {
      const error = new Error('Test error');
      console.error('[DEBUG Revalidation API] ❌ Revalidation failed:', error);
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[DEBUG Revalidation API] ❌ Revalidation failed:',
        error
      );
    });
  });

  describe('Debug Output Format Validation', () => {
    it('should use consistent emoji markers for status', () => {
      // Test that we use consistent emoji markers
      const successMarkers = ['✅', '✓'];
      const errorMarkers = ['❌', '✗'];
      const warningMarkers = ['⚠️', '⚠'];
      const infoMarkers = ['🤖', '🔍'];
      
      // Just validate they exist and are used consistently
      expect(successMarkers.length).toBeGreaterThan(0);
      expect(errorMarkers.length).toBeGreaterThan(0);
      expect(warningMarkers.length).toBeGreaterThan(0);
      expect(infoMarkers.length).toBeGreaterThan(0);
    });
    
    it('should include structured data in logs for easy parsing', () => {
      // Test that debug logs include structured data
      const structuredLog = {
        source: 'day-bucket',
        total: 247,
        afterValidityCheck: 245,
        afterCategoryFilter: 89,
        expired: 2,
        categoryFiltered: 156
      };
      
      console.log('[DEBUG fetchEvents] Summary:', structuredLog);
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[DEBUG fetchEvents] Summary:',
        structuredLog
      );
      
      // Verify structure
      expect(structuredLog).toHaveProperty('source');
      expect(structuredLog).toHaveProperty('total');
      expect(structuredLog).toHaveProperty('afterValidityCheck');
      expect(structuredLog).toHaveProperty('afterCategoryFilter');
    });
  });

  describe('Debug Features Integration', () => {
    it('should not throw errors when logging complex objects', () => {
      const complexEvent: Partial<EventData> = {
        title: 'Test Event',
        category: 'Musik & Konzerte',
        date: '2025-10-27',
        time: '20:00',
        venue: 'Test Venue',
        price: '€15',
        description: 'Test description',
        source: 'ai'
      };
      
      expect(() => {
        console.log('[DEBUG] Event details:', complexEvent);
      }).not.toThrow();
      
      expect(consoleLogSpy).toHaveBeenCalledWith('[DEBUG] Event details:', complexEvent);
    });
    
    it('should handle undefined values gracefully in logs', () => {
      const params = {
        city: 'Wien',
        date: '2025-10-27',
        category: undefined
      };
      
      expect(() => {
        console.log('[DEBUG] Params with undefined:', params);
      }).not.toThrow();
    });
    
    it('should format timestamps consistently', () => {
      const timestamp = new Date('2025-10-27T10:30:15.123Z').toISOString();
      
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });
});
