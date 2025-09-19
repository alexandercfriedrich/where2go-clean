import { NextRequest, NextResponse } from 'next/server';
import { eventsCache } from '@/lib/cache';
import { createPerplexityService } from '@/lib/perplexity';
import { eventAggregator } from '@/lib/aggregator';
import { computeTTLSecondsForEvents } from '@/lib/cacheTtl';
import type { EventData } from '@/lib/types';
import { EVENT_CATEGORIES } from '@/lib/eventCategories';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const { city, date, categories, options } = await request.json();

    if (!city || !date) {
      return NextResponse.json({ error: 'Stadt und Datum sind erforderlich' }, { status: 400 });
    }

    const requestedCategories: string[] = (categories && categories.length > 0)
      ? categories
      : EVENT_CATEGORIES;

    let cachedEvents: EventData[] = [];
    let missingCategories: string[] = [];
    let cacheInfo: { [category: string]: { fromCache: boolean; eventCount: number } } = {};

    if (requestedCategories.length > 0) {
      const cacheResult = eventsCache.getEventsByCategories(city, date, requestedCategories);
      const cachedCategories = Object.keys(cacheResult.cachedEvents);
      cachedEvents = cachedCategories
        .flatMap(cat => cacheResult.cachedEvents[cat])
        .map(e => ({ ...e, source: (e as any).source || 'cache' }));
      missingCategories = cacheResult.missingCategories;
      cacheInfo = cacheResult.cacheInfo;
    }

    if (missingCategories.length === 0 && requestedCategories.length > 0) {
      const dedup = eventAggregator.deduplicateEvents(cachedEvents);
      return NextResponse.json({
        status: 'completed',
        events: dedup,
        cached: true,
        message: `${dedup.length} Events aus dem Cache`,
        cacheInfo: {
          fromCache: true,
          totalEvents: dedup.length,
          cachedEvents: dedup.length,
          cacheBreakdown: cacheInfo
        }
      });
    }

    const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
    if (!PERPLEXITY_API_KEY) {
      return NextResponse.json({ error: 'Perplexity API Key fehlt' }, { status: 500 });
    }

    const service = createPerplexityService(PERPLEXITY_API_KEY);
    const pplxResults = await service.executeMultiQuery(
      city,
      date,
      missingCategories,
      options
    );

    const newParsedRaw = eventAggregator.aggregateResults(pplxResults);
    const newParsed: EventData[] = newParsedRaw.map(e => ({ ...e, source: (e as any).source || 'ai' }));

    const ttlSeconds = computeTTLSecondsForEvents(newParsed);
    const perCategoryGroups: Record<string, EventData[]> = {};
    for (const ev of newParsed) {
      if (!ev.category) continue;
      if (!perCategoryGroups[ev.category]) perCategoryGroups[ev.category] = [];
      perCategoryGroups[ev.category].push(ev);
    }
    for (const cat of Object.keys(perCategoryGroups)) {
      eventsCache.setEventsByCategory(city, date, cat, perCategoryGroups[cat], ttlSeconds);
      cacheInfo[cat] = { fromCache: false, eventCount: perCategoryGroups[cat].length };
    }

    const combined = eventAggregator.deduplicateEvents([...cachedEvents, ...newParsed]);

    return NextResponse.json({
      status: 'completed',
      events: combined,
      cached: cachedEvents.length > 0,
      message: `${combined.length} Events`,
      cacheInfo: {
        fromCache: cachedEvents.length > 0,
        totalEvents: combined.length,
        cachedEvents: cachedEvents.length,
        cacheBreakdown: cacheInfo
      }
    });

  } catch (error) {
    console.error('Events route error:', error);
    return NextResponse.json({ error: 'Unerwarteter Fehler' }, { status: 500 });
  }
}
