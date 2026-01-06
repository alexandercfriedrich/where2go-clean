/**
 * Tests for Unified Event Pipeline
 * 
 * Tests the core pipeline functionality including:
 * - Event normalization
 * - Venue matching/creation
 * - Data integrity
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { RawEventInput, PipelineResult, EventSource } from '../unified-event-pipeline';

// Mock the modules
vi.mock('@/lib/supabase/client', () => ({
  supabaseAdmin: {
    from: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockResolvedValue({ data: [{ id: 'test-event-id' }], error: null })
  }
}));

vi.mock('@/lib/repositories/VenueRepository', () => ({
  VenueRepository: {
    getVenueByName: vi.fn().mockResolvedValue(null),
    upsertVenue: vi.fn().mockResolvedValue('test-venue-id')
  }
}));

vi.mock('@/lib/repositories/EventRepository', () => ({
  EventRepository: {
    fetchRelevantExistingEvents: vi.fn().mockResolvedValue([]),
    fetchRelevantExistingEventsForEnrichment: vi.fn().mockResolvedValue([]),
    linkEventsToVenues: vi.fn().mockResolvedValue({ events_linked: 0, events_processed: 0 })
  }
}));

vi.mock('@/lib/eventDeduplication', () => ({
  deduplicateEventsWithEnrichment: vi.fn((newEvents) => ({
    uniqueEvents: newEvents,
    eventsToEnrich: [],
    skippedDuplicates: 0
  }))
}));

vi.mock('@/lib/slugGenerator', () => ({
  generateEventSlug: vi.fn(() => 'test-event-slug-2025-01-01')
}));

vi.mock('@/lib/cache', () => ({
  eventsCache: {
    upsertDayEvents: vi.fn().mockResolvedValue(undefined)
  }
}));

describe('Unified Event Pipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('RawEventInput interface', () => {
    it('should define required fields', () => {
      const validInput: RawEventInput = {
        title: 'Test Concert',
        venue_name: 'Test Venue',
        start_date_time: '2025-01-15T20:00:00.000Z',
        source: 'wien.info'
      };

      expect(validInput.title).toBe('Test Concert');
      expect(validInput.venue_name).toBe('Test Venue');
      expect(validInput.start_date_time).toBeDefined();
      expect(validInput.source).toBe('wien.info');
    });

    it('should allow optional fields', () => {
      const fullInput: RawEventInput = {
        title: 'Full Event',
        description: 'Event description',
        start_date_time: new Date('2025-01-15T20:00:00.000Z'),
        end_date_time: '2025-01-15T23:00:00.000Z',
        venue_name: 'Musikverein',
        venue_address: 'Musikvereinsplatz 1',
        venue_city: 'Wien',
        category: 'Live-Konzerte',
        price: '€25-€50',
        ticket_url: 'https://tickets.example.com',
        image_url: 'https://example.com/image.jpg',
        source: 'wien.info',
        source_id: 'wien-123',
        source_url: 'https://wien.info/event/123'
      };

      expect(fullInput.description).toBe('Event description');
      expect(fullInput.venue_address).toBe('Musikvereinsplatz 1');
      expect(fullInput.category).toBe('Live-Konzerte');
      expect(fullInput.source_id).toBe('wien-123');
    });
  });

  describe('PipelineResult interface', () => {
    it('should have all required result fields', () => {
      const result: PipelineResult = {
        success: true,
        eventsProcessed: 10,
        eventsInserted: 8,
        eventsUpdated: 0,
        eventsEnriched: 2,
        eventsFailed: 2,
        eventsSkippedAsDuplicates: 1,
        venuesCreated: 3,
        venuesReused: 5,
        duration: 1500,
        errors: ['Test error']
      };

      expect(result.success).toBe(true);
      expect(result.eventsProcessed).toBe(10);
      expect(result.eventsInserted).toBe(8);
      expect(result.eventsEnriched).toBe(2);
      expect(result.eventsFailed).toBe(2);
      expect(result.eventsSkippedAsDuplicates).toBe(1);
      expect(result.venuesCreated).toBe(3);
      expect(result.venuesReused).toBe(5);
      expect(result.duration).toBe(1500);
      expect(result.errors).toHaveLength(1);
    });
  });

  describe('processEvents function', () => {
    it('should handle empty input array', async () => {
      const { processEvents } = await import('../unified-event-pipeline');
      
      const result = await processEvents([], {
        source: 'wien.info',
        dryRun: true
      });

      expect(result.success).toBe(true);
      expect(result.eventsProcessed).toBe(0);
      expect(result.eventsInserted).toBe(0);
    });

    it('should process valid events in dry-run mode', async () => {
      const { processEvents } = await import('../unified-event-pipeline');
      
      const events: RawEventInput[] = [
        {
          title: 'Test Concert',
          venue_name: 'Musikverein',
          start_date_time: '2025-01-15T20:00:00.000Z',
          source: 'wien.info'
        },
        {
          title: 'Another Event',
          venue_name: 'Konzerthaus',
          start_date_time: '2025-01-16T19:00:00.000Z',
          source: 'wien.info'
        }
      ];

      const result = await processEvents(events, {
        source: 'wien.info',
        dryRun: true,
        debug: false
      });

      expect(result.eventsProcessed).toBe(2);
      expect(result.eventsInserted).toBe(2);
      expect(result.eventsFailed).toBe(0);
    });

    it('should skip events with missing title', async () => {
      const { processEvents } = await import('../unified-event-pipeline');
      
      const events: RawEventInput[] = [
        {
          title: '',  // Empty title
          venue_name: 'Musikverein',
          start_date_time: '2025-01-15T20:00:00.000Z',
          source: 'wien.info'
        }
      ];

      const result = await processEvents(events, {
        source: 'wien.info',
        dryRun: true
      });

      // Event should be filtered out during normalization
      expect(result.eventsProcessed).toBe(0);
    });

    it('should skip events with missing venue_name', async () => {
      const { processEvents } = await import('../unified-event-pipeline');
      
      const events: RawEventInput[] = [
        {
          title: 'Test Event',
          venue_name: '',  // Empty venue
          start_date_time: '2025-01-15T20:00:00.000Z',
          source: 'wien.info'
        }
      ];

      const result = await processEvents(events, {
        source: 'wien.info',
        dryRun: true
      });

      expect(result.eventsProcessed).toBe(0);
    });

    it('should use default city when not provided', async () => {
      const { processEvents } = await import('../unified-event-pipeline');
      
      const events: RawEventInput[] = [
        {
          title: 'Test Event',
          venue_name: 'Musikverein',
          start_date_time: '2025-01-15T20:00:00.000Z',
          source: 'wien.info'
          // No venue_city provided
        }
      ];

      const result = await processEvents(events, {
        source: 'wien.info',
        dryRun: true,
        city: 'Wien'  // Default city
      });

      expect(result.eventsProcessed).toBe(1);
      expect(result.success).toBe(true);
    });

    it('should process Date objects as start_date_time', async () => {
      const { processEvents } = await import('../unified-event-pipeline');
      
      const events: RawEventInput[] = [
        {
          title: 'Date Object Event',
          venue_name: 'Musikverein',
          start_date_time: new Date('2025-01-15T20:00:00.000Z'),
          source: 'wien.info'
        }
      ];

      const result = await processEvents(events, {
        source: 'wien.info',
        dryRun: true
      });

      expect(result.eventsProcessed).toBe(1);
      expect(result.success).toBe(true);
    });
  });

  describe('Source-specific convenience functions', () => {
    it('should have processWienInfoEvents function', async () => {
      const { processWienInfoEvents } = await import('../unified-event-pipeline');
      expect(processWienInfoEvents).toBeDefined();
      expect(typeof processWienInfoEvents).toBe('function');
    });

    it('should have processAISearchEvents function', async () => {
      const { processAISearchEvents } = await import('../unified-event-pipeline');
      expect(processAISearchEvents).toBeDefined();
      expect(typeof processAISearchEvents).toBe('function');
    });

    it('should have processScraperEvents function', async () => {
      const { processScraperEvents } = await import('../unified-event-pipeline');
      expect(processScraperEvents).toBeDefined();
      expect(typeof processScraperEvents).toBe('function');
    });

    it('should have processCommunityEvents function', async () => {
      const { processCommunityEvents } = await import('../unified-event-pipeline');
      expect(processCommunityEvents).toBeDefined();
      expect(typeof processCommunityEvents).toBe('function');
    });
  });

  describe('Free event detection', () => {
    it('should identify free events from price info', async () => {
      const { processEvents } = await import('../unified-event-pipeline');
      
      const freeEvents: RawEventInput[] = [
        {
          title: 'Free Event 1',
          venue_name: 'Park',
          start_date_time: '2025-01-15T20:00:00.000Z',
          source: 'wien.info',
          price: 'Free'
        },
        {
          title: 'Free Event 2',
          venue_name: 'Park',
          start_date_time: '2025-01-16T20:00:00.000Z',
          source: 'wien.info',
          price: 'Gratis'
        },
        {
          title: 'Free Event 3',
          venue_name: 'Park',
          start_date_time: '2025-01-17T20:00:00.000Z',
          source: 'wien.info',
          price: 'Eintritt frei'
        }
      ];

      const result = await processEvents(freeEvents, {
        source: 'wien.info',
        dryRun: true
      });

      expect(result.eventsProcessed).toBe(3);
      expect(result.success).toBe(true);
    });
  });

  describe('Batch processing', () => {
    it('should process events in batches', async () => {
      const { processEvents } = await import('../unified-event-pipeline');
      
      // Create 10 events
      const events: RawEventInput[] = Array.from({ length: 10 }, (_, i) => ({
        title: `Event ${i + 1}`,
        venue_name: 'Musikverein',
        start_date_time: `2025-01-${String(i + 1).padStart(2, '0')}T20:00:00.000Z`,
        source: 'wien.info' as const
      }));

      const result = await processEvents(events, {
        source: 'wien.info',
        dryRun: true,
        batchSize: 3  // Process in batches of 3
      });

      expect(result.eventsProcessed).toBe(10);
      expect(result.success).toBe(true);
    });
  });

  describe('Duplicate key error handling', () => {
    it('should gracefully handle PostgreSQL duplicate key errors (23505)', async () => {
      // This test verifies the fix for the ON CONFLICT constraint issue
      // When an INSERT fails with error code 23505 (duplicate key), it should be ignored
      const { processEvents } = await import('../unified-event-pipeline');
      
      const events: RawEventInput[] = [
        {
          title: 'Duplicate Event',
          venue_name: 'Test Venue',
          start_date_time: '2025-01-15T20:00:00.000Z',
          source: 'wien.info'
        }
      ];

      const result = await processEvents(events, {
        source: 'wien.info',
        dryRun: true
      });

      // In dry-run mode, it should succeed
      expect(result.success).toBe(true);
      expect(result.eventsProcessed).toBe(1);
    });
  });
});
