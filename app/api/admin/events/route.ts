import { NextRequest, NextResponse } from 'next/server';
import { eventsCache } from '@/lib/cache';
import { EVENT_CATEGORIES } from '@/lib/eventCategories';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const city = searchParams.get('city') || 'Berlin';
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const debug = searchParams.get('debug') === '1';

    const mainCategories = EVENT_CATEGORIES;
    const cacheResult = eventsCache.getEventsByCategories(city, date, mainCategories);

    const allCachedEvents: any[] = [];
    for (const cat in cacheResult.cachedEvents) {
      allCachedEvents.push(...cacheResult.cachedEvents[cat]);
    }

    // Debug information to help diagnose cache issues
    let debugInfo = {};
    if (debug) {
      debugInfo = {
        cacheSize: eventsCache.size(),
        searchCity: city,
        searchDate: date,
        requestedCategories: mainCategories,
        foundCategories: Object.keys(cacheResult.cachedEvents),
        cacheKeys: (eventsCache as any).cache ? Array.from((eventsCache as any).cache.keys()) : [],
        cacheEntries: (eventsCache as any).cache ? Array.from((eventsCache as any).cache.entries()).map((entry: any) => {
          const [key, cacheEntry] = entry;
          return {
            key,
            hasData: !!cacheEntry.data,
            dataLength: Array.isArray(cacheEntry.data) ? cacheEntry.data.length : 'not-array',
            timestamp: new Date(cacheEntry.timestamp).toISOString(),
            ttl: cacheEntry.ttl
          };
        }) : []
      };
    }

    return NextResponse.json({
      city,
      date,
      totalEvents: allCachedEvents.length,
      cachedCategories: Object.keys(cacheResult.cachedEvents).length,
      totalCategories: mainCategories.length,
      missingCategories: cacheResult.missingCategories,
      events: allCachedEvents,
      cacheBreakdown: cacheResult.cacheInfo,
      ...(debug && { debug: debugInfo })
    });
  } catch (error) {
    console.error('Admin events API error:', error);
    return NextResponse.json({ error: 'Failed to fetch events data' }, { status: 500 });
  }
}
