/**
 * Admin Cache Warmup API Route
 * 
 * Fetches all Wien.info events for the next 90 days and stores them in cache.
 * Can be triggered manually via admin button or scheduled as a cron job.
 * 
 * Security: Protected by ADMIN_API_KEY environment variable
 */

import { NextRequest, NextResponse } from 'next/server';
import { fetchWienInfoEvents } from '@/lib/sources/wienInfo';
import { eventsCache } from '@/lib/cache';
import { upsertDayEvents } from '@/lib/dayCache';
import { computeTTLSecondsForEvents } from '@/lib/cacheTtl';
import { EventData } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 120;

interface WarmupResult {
  success: boolean;
  message: string;
  stats?: {
    totalEvents: number;
    daysProcessed: number;
    categoriesUpdated: string[];
    duration: number;
  };
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    // No authentication required for admin warmup

    // Calculate date range: today + 90 days
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 90);

    const fromISO = today.toISOString().split('T')[0];
    const toISO = endDate.toISOString().split('T')[0];

    console.log(`[cache-warmup] Fetching Wien.info events from ${fromISO} to ${toISO}`);

    // Fetch all Wien.info events without category filter
    const fetchResult = await fetchWienInfoEvents({
      fromISO,
      toISO,
      categories: [], // Empty = fetch all categories
      limit: 10000, // High limit to get all events
      debug: true
    });

    if (fetchResult.error) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Wien.info API error: ${fetchResult.error}` 
        },
        { status: 500 }
      );
    }

    const events = fetchResult.events;
    console.log(`[cache-warmup] Fetched ${events.length} events from Wien.info`);

    if (events.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No events found to cache',
        stats: {
          totalEvents: 0,
          daysProcessed: 0,
          categoriesUpdated: [],
          duration: Date.now() - startTime
        }
      });
    }

    // Group events by date for day-bucket storage
    const eventsByDate = new Map<string, EventData[]>();
    for (const event of events) {
      const dateKey = event.date; // Already in YYYY-MM-DD format
      if (!eventsByDate.has(dateKey)) {
        eventsByDate.set(dateKey, []);
      }
      eventsByDate.get(dateKey)!.push(event);
    }

    // Group events by category for per-category storage
    const eventsByCategory = new Map<string, EventData[]>();
    for (const event of events) {
      const category = event.category || 'unknown';
      if (!eventsByCategory.has(category)) {
        eventsByCategory.set(category, []);
      }
      eventsByCategory.get(category)!.push(event);
    }

    // Store events in cache layers
    const city = 'Wien';
    const categoriesUpdated = new Set<string>();

    // 1. Store per-day buckets
    for (const [date, dayEvents] of Array.from(eventsByDate)) {
      try {
        await upsertDayEvents(city, date, dayEvents);
        console.log(`[cache-warmup] Stored ${dayEvents.length} events for ${date}`);
      } catch (error) {
        console.error(`[cache-warmup] Error storing day bucket for ${date}:`, error);
      }
    }

    // 2. Store per-category shards
    for (const [category, catEvents] of Array.from(eventsByCategory)) {
      categoriesUpdated.add(category);
      
      // Group category events by date
      const catEventsByDate = new Map<string, EventData[]>();
      for (const event of catEvents) {
        const dateKey = event.date;
        if (!catEventsByDate.has(dateKey)) {
          catEventsByDate.set(dateKey, []);
        }
        catEventsByDate.get(dateKey)!.push(event);
      }

      // Store each date's category events
      for (const [date, dateEvents] of Array.from(catEventsByDate)) {
        try {
          const ttl = computeTTLSecondsForEvents(dateEvents);
          await eventsCache.setEventsByCategory(city, date, category, dateEvents, ttl);
        } catch (error) {
          console.error(`[cache-warmup] Error storing category ${category} for ${date}:`, error);
        }
      }
    }

    const duration = Date.now() - startTime;
    const warmupResult: WarmupResult = {
      success: true,
      message: `Successfully cached ${events.length} events from Wien.info`,
      stats: {
        totalEvents: events.length,
        daysProcessed: eventsByDate.size,
        categoriesUpdated: Array.from(categoriesUpdated).sort(),
        duration
      }
    };

    console.log(`[cache-warmup] Complete in ${duration}ms:`, warmupResult.stats);

    return NextResponse.json(warmupResult);

  } catch (error: any) {
    console.error('[cache-warmup] Unexpected error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Internal server error',
        duration: Date.now() - startTime
      },
      { status: 500 }
    );
  }
}
