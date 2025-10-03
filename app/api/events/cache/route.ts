import { NextRequest, NextResponse } from 'next/server';
import { eventsCache } from '@/lib/cache';
import { eventAggregator } from '@/lib/aggregator';
import { EVENT_CATEGORIES, normalizeCategory } from '@/lib/eventCategories';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const city = (searchParams.get('city') || '').trim();
    const date = (searchParams.get('date') || '').trim();
    const catsParam = searchParams.get('categories'); // optional CSV: "cat1,cat2,..."

    if (!city || !date) {
      return NextResponse.json(
        { error: 'city und date sind erforderlich' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const effectiveCategories =
      catsParam && catsParam.trim().length
        ? catsParam
            .split(',')
            .map((s) => normalizeCategory(s.trim()))
            .filter(Boolean)
        : EVENT_CATEGORIES;

    const cacheResult = await eventsCache.getEventsByCategories(city, date, effectiveCategories);

    const flat: any[] = [];
    for (const cat of Object.keys(cacheResult.cachedEvents)) {
      flat.push(...cacheResult.cachedEvents[cat].map((e) => ({ ...e, source: e.source ?? 'cache' })));
    }

    const dedup = eventAggregator.deduplicateEvents(flat);

    return NextResponse.json(
      {
        events: dedup,
        status: 'completed',
        cached: dedup.length > 0,
        cacheInfo: {
          fromCache: dedup.length > 0,
          totalEvents: dedup.length,
          cachedEvents: dedup.length,
          cacheBreakdown: cacheResult.cacheInfo
        }
      },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch (error) {
    console.error('Cache-only endpoint error:', error);
    return NextResponse.json(
      { error: 'Unerwarteter Fehler' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}