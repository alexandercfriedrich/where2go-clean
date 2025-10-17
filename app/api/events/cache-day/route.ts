import { NextRequest, NextResponse } from 'next/server';
import { getDayEvents, isEventValidNow } from '@/lib/dayCache';
import { eventsCache } from '@/lib/cache';
import { EventData } from '@/lib/types';
import { eventAggregator } from '@/lib/aggregator';
import { EVENT_CATEGORIES, normalizeCategory } from '@/lib/eventCategories';
import { getHotCity, getHotCityBySlug } from '@/lib/hotCityStore';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * GET /api/events/cache-day
 * 
 * Read-only endpoint for retrieving cached events for a city+date.
 * 
 * Query parameters:
 * - city (required): City name
 * - date (required): Date in YYYY-MM-DD format
 * - category (optional): CSV of categories to filter by
 * 
 * Returns all valid (non-expired) events from the day-bucket cache.
 * Falls back to per-category shards if day-bucket doesn't exist.
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const cityParam = url.searchParams.get('city');
    const date = url.searchParams.get('date');
    const categoryParam = url.searchParams.get('category');

    // Validate required parameters
    if (!cityParam || !date) {
      return NextResponse.json(
        { error: 'Missing required parameters: city and date' },
        { status: 400 }
      );
    }

    // Map city parameter to canonical Hot City name (case-insensitive)
    let city = cityParam;
    const hotCityByName = await getHotCity(cityParam);
    if (hotCityByName) {
      city = hotCityByName.name;
    } else {
      const hotCityBySlug = await getHotCityBySlug(cityParam.toLowerCase());
      if (hotCityBySlug) {
        city = hotCityBySlug.name;
      }
    }

    // Parse category filter (optional) and normalize
    const requestedCategories = categoryParam
      ? Array.from(new Set(
          categoryParam.split(',')
            .map(c => c.trim())
            .filter(Boolean)
            .map(c => normalizeCategory(c))
        ))
      : null;

    let allEvents: EventData[] = [];
    let fromDayBucket = false;
    let updatedAt: string | null = null;

    // Try to load from day-bucket first
    const dayBucket = await getDayEvents(city, date);
    
    if (dayBucket && dayBucket.events.length > 0) {
      // Day-bucket exists
      allEvents = dayBucket.events;
      fromDayBucket = true;
      updatedAt = dayBucket.updatedAt;
    } else {
      // Fallback: Load from per-category shards
      const categoriesToLoad = requestedCategories || EVENT_CATEGORIES;
      const cacheResult = await eventsCache.getEventsByCategories(city, date, categoriesToLoad);
      
      const cachedEventsList: EventData[] = [];
      for (const category in cacheResult.cachedEvents) {
        cachedEventsList.push(...cacheResult.cachedEvents[category]);
      }
      
      // Deduplicate events from different category shards
      allEvents = eventAggregator.deduplicateEvents(cachedEventsList);
    }

    // Filter: Only return valid (non-expired) events
    const now = new Date();
    const validEvents = allEvents.filter(event => isEventValidNow(event, now));

    // Filter by requested categories if specified (normalize both sides for comparison)
    let filteredEvents = validEvents;
    if (requestedCategories && requestedCategories.length > 0) {
      filteredEvents = validEvents.filter(event => {
        if (!event.category) return false;
        const normalizedEventCategory = normalizeCategory(event.category);
        return requestedCategories.includes(normalizedEventCategory);
      });
    }

    // Count events by category
    const categoryCounts: Record<string, number> = {};
    for (const event of filteredEvents) {
      if (event.category) {
        categoryCounts[event.category] = (categoryCounts[event.category] || 0) + 1;
      }
    }

    // Compute TTL hint (time until oldest event expires, capped at 5 minutes)
    let ttlHint = 300; // Default 5 minutes
    if (filteredEvents.length > 0) {
      // Find earliest expiry time
      let earliestExpiry: Date | null = null;
      for (const event of filteredEvents) {
        if (event.cacheUntil) {
          try {
            const expiry = new Date(event.cacheUntil);
            if (!isNaN(expiry.getTime()) && (!earliestExpiry || expiry < earliestExpiry)) {
              earliestExpiry = expiry;
            }
          } catch {
            // Ignore invalid dates
          }
        }
      }
      
      if (earliestExpiry) {
        const secondsUntilExpiry = Math.floor((earliestExpiry.getTime() - now.getTime()) / 1000);
        ttlHint = Math.max(60, Math.min(secondsUntilExpiry, 300));
      }
    }

    const response = {
      city,
      date,
      events: filteredEvents,
      categories: categoryCounts,
      cached: fromDayBucket || allEvents.length > 0,
      status: 'completed',
      updatedAt: updatedAt || new Date().toISOString(),
      ttlHint
    };

    // Always set Cache-Control: no-store (as per requirements)
    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'no-store'
      }
    });

  } catch (error) {
    console.error('[cache-day] Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
