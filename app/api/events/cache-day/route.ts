import { NextRequest, NextResponse } from 'next/server';
import { EventRepository } from '@/lib/repositories/EventRepository';
import { EventData } from '@/lib/types';
import { normalizeCategory } from '@/lib/eventCategories';
import { getHotCity, getHotCityBySlug } from '@/lib/hotCityStore';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * GET /api/events/cache-day
 * 
 * Endpoint for retrieving events for a city+date directly from Supabase.
 * NOTE: Per new architecture, events are loaded from Supabase (single source of truth).
 * 
 * Query parameters:
 * - city (required): City name
 * - date (required): Date in YYYY-MM-DD format
 * - category (optional): CSV of categories to filter by
 * 
 * Returns all events for the specified city and date.
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

    // Fetch events directly from Supabase (single source of truth)
    const singleCategory = requestedCategories && requestedCategories.length === 1 
      ? requestedCategories[0] 
      : undefined;

    const allEvents = await EventRepository.getEvents({
      city,
      date,
      category: singleCategory,
      limit: 500
    });

    // Filter by multiple requested categories if more than one
    let filteredEvents = allEvents;
    if (requestedCategories && requestedCategories.length > 1) {
      filteredEvents = allEvents.filter(event => {
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

    const response = {
      city,
      date,
      events: filteredEvents,
      categories: categoryCounts,
      cached: false, // Events come directly from Supabase now
      status: 'completed',
      updatedAt: new Date().toISOString(),
      ttlHint: 300 // 5 minutes default
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
