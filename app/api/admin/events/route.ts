import { NextRequest, NextResponse } from 'next/server';
import { eventsCache } from '@/lib/cache';
import { getMainCategories } from '@/categories';

// Mark this route as dynamic since it uses search params
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const city = searchParams.get('city') || 'Berlin';
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    
    // Get cache status for all main categories
    const mainCategories = getMainCategories();
    const cacheResult = eventsCache.getEventsByCategories(city, date, mainCategories);
    
    // Combine all cached events
    const allCachedEvents = [];
    for (const category in cacheResult.cachedEvents) {
      allCachedEvents.push(...cacheResult.cachedEvents[category]);
    }
    
    return NextResponse.json({
      city,
      date,
      totalEvents: allCachedEvents.length,
      cachedCategories: Object.keys(cacheResult.cachedEvents).length,
      totalCategories: mainCategories.length,
      missingCategories: cacheResult.missingCategories,
      events: allCachedEvents,
      cacheBreakdown: cacheResult.cacheInfo
    });
    
  } catch (error) {
    console.error('Admin events API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events data' },
      { status: 500 }
    );
  }
}