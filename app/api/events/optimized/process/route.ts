/**
 * Background Worker for Optimized Event Search
 * 
 * POST /api/events/optimized/process
 * - Processes the event search job using SmartEventFetcher
 * - Updates JobStore with progress on each phase
 * - Updates cache (category shards + day-bucket) as events are found
 * - Returns final result when complete
 */

import { NextRequest, NextResponse } from 'next/server';
import { getJobStore } from '@/lib/jobStore';
import { createSmartEventFetcher } from '@/lib/smartEventFetcher';
import { eventsCache } from '@/lib/cache';
import { upsertDayEvents } from '@/lib/dayCache';
import { computeTTLSecondsForEvents } from '@/lib/cacheTtl';
import { normalizeCategory } from '@/lib/eventCategories';
import { EventData } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 120;

interface ProcessRequest {
  jobId: string;
  city: string;
  date: string;
  categories?: string[];
  options?: {
    debug?: boolean;
    temperature?: number;
    maxTokens?: number;
  };
}

export async function POST(request: NextRequest) {
  try {
    // Parse request
    const body: ProcessRequest = await request.json();
    const { jobId, city, date, categories = [], options = {} } = body;

    if (!jobId || !city || !date) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Get job from store
    const jobStore = getJobStore();
    const job = await jobStore.getJob(jobId);

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    // Verify API key
    const apiKey = process.env.PERPLEXITY_API_KEY;
    if (!apiKey) {
      await jobStore.updateJob(jobId, {
        status: 'error',
        error: 'Perplexity API key not configured'
      });
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500 }
      );
    }

    // Update job to processing status
    await jobStore.updateJob(jobId, {
      status: 'processing',
      lastUpdateAt: new Date().toISOString()
    });

    console.log(`[OptimizedWorker] Processing job ${jobId} for ${city} on ${date}`);

    // Create SmartEventFetcher
    const fetcher = createSmartEventFetcher({
      apiKey,
      categories: categories.length > 0 ? categories : undefined,
      debug: options.debug ?? false,
      temperature: options.temperature,
      maxTokens: options.maxTokens
    });

    // Track all events from all phases
    let allEvents: EventData[] = [];

    // Progress callback - updates job and cache incrementally
    const onPhaseUpdate = async (
      phase: number,
      newEvents: EventData[],
      totalEvents: number,
      message: string
    ) => {
      try {
        // Add new events to running total
        allEvents.push(...newEvents);

        // Normalize categories
        const normalizedEvents = allEvents.map(e => ({
          ...e,
          category: normalizeCategory(e.category || '')
        }));

        // Update job with progress
        await jobStore.updateJob(jobId, {
          status: 'processing',
          events: normalizedEvents,
          progress: {
            completedCategories: phase,
            totalCategories: 4,
            phase,
            completedPhases: phase,
            totalPhases: 4,
            message
          },
          lastUpdateAt: new Date().toISOString()
        });

        console.log(`[OptimizedWorker] Phase ${phase}: ${message} (${newEvents.length} new, ${totalEvents} total)`);

        // Update cache immediately when we have events
        if (normalizedEvents.length > 0) {
          const ttlSeconds = computeTTLSecondsForEvents(normalizedEvents);

          // Update day-bucket cache (aggregated view)
          await upsertDayEvents(city, date, normalizedEvents);

          // Update per-category shards (for efficient partial cache hits)
          const grouped: Record<string, EventData[]> = {};
          for (const event of normalizedEvents) {
            if (!event.category) continue;
            if (!grouped[event.category]) {
              grouped[event.category] = [];
            }
            grouped[event.category].push(event);
          }

          for (const [category, categoryEvents] of Object.entries(grouped)) {
            await eventsCache.setEventsByCategory(city, date, category, categoryEvents, ttlSeconds);
          }

          if (options.debug) {
            console.log(`[OptimizedWorker] Updated cache: ${Object.keys(grouped).length} categories, TTL ${ttlSeconds}s`);
          }
        }
      } catch (error) {
        console.error(`[OptimizedWorker] Error in phase update:`, error);
        // Don't throw - continue processing
      }
    };

    // Execute the optimized search
    let finalEvents: EventData[];
    try {
      finalEvents = await fetcher.fetchEventsOptimized(city, date, onPhaseUpdate);
    } catch (error) {
      console.error(`[OptimizedWorker] Search failed:`, error);
      await jobStore.updateJob(jobId, {
        status: 'error',
        error: error instanceof Error ? error.message : 'Search failed',
        lastUpdateAt: new Date().toISOString()
      });
      return NextResponse.json(
        { error: 'Search failed' },
        { status: 500 }
      );
    }

    // Normalize final events
    const normalizedFinal = finalEvents.map(e => ({
      ...e,
      category: normalizeCategory(e.category || '')
    }));

    // Mark job as done
    await jobStore.updateJob(jobId, {
      status: 'done',
      events: normalizedFinal,
      progress: {
        completedCategories: 4,
        totalCategories: 4,
        phase: 4,
        completedPhases: 4,
        totalPhases: 4,
        message: `Complete! Found ${normalizedFinal.length} unique events`
      },
      lastUpdateAt: new Date().toISOString()
    });

    console.log(`[OptimizedWorker] Job ${jobId} complete: ${normalizedFinal.length} events`);

    // Return success
    return NextResponse.json({
      jobId,
      status: 'done',
      events: normalizedFinal,
      totalEvents: normalizedFinal.length
    });

  } catch (error) {
    console.error('[OptimizedWorker] Unexpected error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
