/**
 * SmartEventFetcher - Optimized 4-phase event search pipeline
 * 
 * Reduces AI API calls from 30+ to maximum 5 per search while maintaining coverage.
 * 
 * Architecture:
 * Phase 1: Cache + Local APIs (0 AI calls)
 * Phase 2: Hot-City prioritized venues (max 2 AI calls)
 * Phase 3: Smart Category Search (max 3 AI calls, batched)
 * Phase 4: Finalize and deduplicate
 */

import { EventData } from './types';
import { eventsCache } from './cache';
import { getDayEvents, upsertDayEvents } from './dayCache';
import { fetchWienInfoEvents } from './sources/wienInfo';
import { eventAggregator } from './aggregator';
import { createPerplexityService } from './perplexity';
import { computeTTLSecondsForEvents } from './cacheTtl';
import { getHotCity } from './hotCityStore';

/**
 * Optimized category set - 12 compact categories for efficient AI querying
 */
export const OPTIMIZED_CATEGORIES = [
  'DJ Sets/Electronic',
  'Clubs/Discos',
  'Live-Konzerte',
  'Theater/Performance',
  'Open Air',
  'Museen',
  'Comedy/Kabarett',
  'Film',
  'Food/Culinary',
  'Sport',
  'Kultur/Traditionen',
  'Workshops'
] as const;

/**
 * Search terms for AI prompting - optimized for maximum event discovery
 */
export const SEARCH_TERMS = {
  general: [
    'events tonight today',
    'things to do',
    'what\'s happening',
    'veranstaltungen heute',
    'was läuft'
  ],
  venue: [
    'event calendar',
    'schedule',
    'programm',
    'veranstaltungen'
  ]
} as const;

export interface SmartFetcherOptions {
  apiKey: string;
  categories?: string[];
  debug?: boolean;
  temperature?: number;
  maxTokens?: number;
}

export type PhaseUpdateCallback = (
  phase: number,
  events: EventData[],
  totalEvents: number,
  message: string
) => void | Promise<void>;

export class SmartEventFetcher {
  private apiKey: string;
  private categories: string[];
  private debug: boolean;
  private temperature: number;
  private maxTokens: number;

  constructor(options: SmartFetcherOptions) {
    this.apiKey = options.apiKey;
    this.categories = options.categories && options.categories.length > 0
      ? options.categories
      : Array.from(OPTIMIZED_CATEGORIES);
    this.debug = options.debug ?? false;
    this.temperature = options.temperature ?? 0.1;
    this.maxTokens = options.maxTokens ?? 8000;
  }

  /**
   * Main entry point - executes 4-phase optimized search
   */
  async fetchEventsOptimized(
    city: string,
    date: string,
    onPhaseUpdate?: PhaseUpdateCallback
  ): Promise<EventData[]> {
    const allEvents: EventData[] = [];
    let totalEvents = 0;
    let aiCallsUsed = 0;
    const maxAiCalls = 5;

    // Helper to update and track progress
    const updatePhase = async (phase: number, newEvents: EventData[], message: string) => {
      allEvents.push(...newEvents);
      totalEvents = allEvents.length;
      
      if (this.debug) {
        console.log(`[SmartFetcher] Phase ${phase}: ${message} (${newEvents.length} new, ${totalEvents} total)`);
      }
      
      if (onPhaseUpdate) {
        await onPhaseUpdate(phase, newEvents, totalEvents, message);
      }
    };

    // ========== PHASE 1: Cache + Local APIs (0 AI calls) ==========
    const phase1Events = await this.phase1CacheAndLocalAPIs(city, date);
    await updatePhase(1, phase1Events, `Found ${phase1Events.length} events from cache and local APIs`);

    // ========== PHASE 2: Hot-City prioritized venues (max 2 AI calls) ==========
    if (aiCallsUsed < maxAiCalls && totalEvents < 20) {
      const availableCalls = Math.min(2, maxAiCalls - aiCallsUsed);
      const phase2Events = await this.phase2HotCityVenues(city, date, availableCalls);
      aiCallsUsed += Math.min(phase2Events.length > 0 ? 2 : 0, availableCalls);
      await updatePhase(2, phase2Events, `Found ${phase2Events.length} events from prioritized venues (${aiCallsUsed} AI calls used)`);
    } else {
      await updatePhase(2, [], `Skipped - sufficient events or no AI calls remaining`);
    }

    // ========== PHASE 3: Smart Category Search (max 3 AI calls, batched) ==========
    if (aiCallsUsed < maxAiCalls) {
      const availableCalls = Math.min(3, maxAiCalls - aiCallsUsed);
      const phase3Events = await this.phase3SmartCategorySearch(city, date, availableCalls);
      aiCallsUsed += availableCalls;
      await updatePhase(3, phase3Events, `Found ${phase3Events.length} events from category search (${aiCallsUsed} AI calls used)`);
    } else {
      await updatePhase(3, [], `Skipped - AI call budget exhausted`);
    }

    // ========== PHASE 4: Finalize and deduplicate ==========
    const dedupedEvents = eventAggregator.deduplicateEvents(allEvents);
    await updatePhase(4, [], `Finalized ${dedupedEvents.length} unique events (${aiCallsUsed}/${maxAiCalls} AI calls used)`);

    if (this.debug) {
      console.log(`[SmartFetcher] Complete: ${dedupedEvents.length} events, ${aiCallsUsed}/${maxAiCalls} AI calls`);
    }

    return dedupedEvents;
  }

  /**
   * Phase 1: Try cache (day-bucket + category shards) and Wien.info JSON API
   * All operations run in parallel for maximum speed
   */
  private async phase1CacheAndLocalAPIs(city: string, date: string): Promise<EventData[]> {
    const events: EventData[] = [];

    try {
      // Run all Phase 1 operations in parallel for speed
      const [dayBucket, categoryCache, wienInfoEvents] = await Promise.all([
        // 1a. Try day-bucket cache first (fastest)
        getDayEvents(city, date).catch(err => {
          console.warn('[Phase1] Day-bucket error:', err);
          return null;
        }),
        
        // 1b. Try per-category shards
        eventsCache.getEventsByCategories(city, date, this.categories).catch(err => {
          console.warn('[Phase1] Category cache error:', err);
          return { cachedEvents: {}, missingCategories: [], cacheInfo: {} };
        }),
        
        // 1c. Wien.info JSON API for Vienna (0 AI calls) - runs in parallel
        (async () => {
          if (city.toLowerCase() === 'wien' || city.toLowerCase() === 'vienna') {
            try {
              const wienResult = await fetchWienInfoEvents({
                fromISO: date,
                toISO: date,
                categories: this.categories,
                limit: 100,
                debug: this.debug
              });
              return wienResult.events || [];
            } catch (error) {
              console.warn('[Phase1] Wien.info API error:', error);
              return [];
            }
          }
          return [];
        })()
      ]);

      // Process day-bucket results
      if (dayBucket && dayBucket.events.length > 0) {
        if (this.debug) {
          console.log(`[Phase1] Day-bucket hit: ${dayBucket.events.length} events`);
        }
        events.push(...dayBucket.events);
      }

      // Process per-category cache results (only if day-bucket was empty)
      if (events.length === 0 && categoryCache) {
        for (const [category, categoryEvents] of Object.entries(categoryCache.cachedEvents)) {
          if (this.debug) {
            console.log(`[Phase1] Category cache hit for ${category}: ${categoryEvents.length} events`);
          }
          events.push(...categoryEvents);
        }
      }

      // Add Wien.info results
      if (wienInfoEvents.length > 0) {
        if (this.debug) {
          console.log(`[Phase1] Wien.info API: ${wienInfoEvents.length} events`);
        }
        events.push(...wienInfoEvents);
      }

      // Deduplicate events from multiple sources
      const deduped = eventAggregator.deduplicateEvents(events);

      // Upsert to day-bucket cache for fast future reads (non-blocking)
      if (deduped.length > 0) {
        upsertDayEvents(city, date, deduped).catch(err => 
          console.warn('[Phase1] Cache upsert error:', err)
        );
      }

      return deduped;
    } catch (error) {
      console.error('[Phase1] Error:', error);
      return events;
    }
  }

  /**
   * Phase 2: Query top prioritized venues from Hot Cities (max 2 AI calls)
   */
  private async phase2HotCityVenues(
    city: string,
    date: string,
    maxCalls: number
  ): Promise<EventData[]> {
    if (maxCalls === 0) return [];

    try {
      const hotCity = await getHotCity(city);
      if (!hotCity) {
        if (this.debug) {
          console.log(`[Phase2] No hot city config for ${city}`);
        }
        return [];
      }

      const service = createPerplexityService(this.apiKey);

      // Use multi-query with venue queries enabled, but limit to top 2 venues
      const results = await service.executeMultiQuery(city, date, [], {
        debug: this.debug,
        temperature: this.temperature,
        max_tokens: this.maxTokens,
        enableVenueQueries: true,
        venueQueryLimit: 2, // Only query top 2 prioritized venues
        categoryConcurrency: 1,
        hotCity
      });

      const events = eventAggregator.aggregateResults(results, date);

      if (this.debug) {
        console.log(`[Phase2] Venue queries returned ${events.length} events`);
      }

      return events;
    } catch (error) {
      console.error('[Phase2] Error:', error);
      return [];
    }
  }

  /**
   * Phase 3: Smart batched category search (max 3 AI calls)
   * Groups categories intelligently to maximize coverage with minimal calls
   */
  private async phase3SmartCategorySearch(
    city: string,
    date: string,
    maxCalls: number
  ): Promise<EventData[]> {
    if (maxCalls === 0) return [];

    try {
      const service = createPerplexityService(this.apiKey);

      // Select up to 6 main categories (user-provided or defaults)
      const selectedCategories = this.categories.slice(0, 6);

      // Batch categories into groups for parallel querying
      // With 3 AI calls, we can query ~2 categories per call
      const batchSize = Math.ceil(selectedCategories.length / maxCalls);
      const batches: string[][] = [];
      for (let i = 0; i < selectedCategories.length; i += batchSize) {
        batches.push(selectedCategories.slice(i, i + batchSize));
      }

      if (this.debug) {
        console.log(`[Phase3] Querying ${selectedCategories.length} categories in ${batches.length} batches`);
      }

      const allEvents: EventData[] = [];

      // Execute each batch as a single multi-category call
      for (const batch of batches) {
        try {
          const results = await service.executeMultiQuery(city, date, batch, {
            debug: this.debug,
            temperature: this.temperature,
            max_tokens: this.maxTokens,
            enableVenueQueries: false, // Disable venue queries to avoid duplicates
            categoryConcurrency: batch.length // Process all categories in batch simultaneously
          });

          const batchEvents = eventAggregator.aggregateResults(results, date);
          allEvents.push(...batchEvents);

          if (this.debug) {
            console.log(`[Phase3] Batch ${batch.join(', ')}: ${batchEvents.length} events`);
          }
        } catch (error) {
          console.warn(`[Phase3] Batch error for ${batch.join(', ')}:`, error);
        }
      }

      return allEvents;
    } catch (error) {
      console.error('[Phase3] Error:', error);
      return [];
    }
  }
}

/**
 * Factory function to create SmartEventFetcher instance
 */
export function createSmartEventFetcher(options: SmartFetcherOptions): SmartEventFetcher {
  return new SmartEventFetcher(options);
}
