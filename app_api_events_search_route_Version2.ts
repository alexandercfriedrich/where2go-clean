import { NextRequest, NextResponse } from 'next/server';
import { EventData } from '@/lib/types';
import { eventsCache } from '@/lib/cache';
import { createPerplexityService } from '@/lib/perplexity';
import { eventAggregator } from '@/lib/aggregator';
import { computeTTLSecondsForEvents } from '@/lib/cacheTtl';
import { EVENT_CATEGORIES } from '@/lib/eventCategories';

export const runtime = 'nodejs';
export const maxDuration = 300;

const DEFAULT_CATEGORIES = EVENT_CATEGORIES;

export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const qDebug = url.searchParams.get('debug') === '1';
    const qVerbose = url.searchParams.get('verbose') === '1';

    const { city, date, categories, options } = await request.json();
    if (!city || !date) {
      return NextResponse.json({ error: 'Stadt und Datum sind erforderlich' }, { status: 400 });
    }

    const effectiveCategories: string[] = (categories && categories.length > 0) ? categories : DEFAULT_CATEGORIES;

    const cacheResult = eventsCache.getEventsByCategories(city, date, effectiveCategories);
    const cachedEventsFlat: EventData[] = [];
    for (const cat of Object.keys(cacheResult.cachedEvents)) {
      cachedEventsFlat.push(...cacheResult.cachedEvents[cat]);
    }

    // STAMP: cache provenance
    const dedupCached = eventAggregator.deduplicateEvents(
      cachedEventsFlat.map(e => ({ ...e, source: e.source ?? 'cache' as const }))
    );

    const missingCategories = cacheResult.missingCategories;
    if (missingCategories.length === 0) {
      return NextResponse.json({
        events: dedupCached,
        cached: true,
        status: 'completed',
        cacheInfo: {
          fromCache: true,
          totalEvents: dedupCached.length,
          cachedEvents: dedupCached.length,
          cacheBreakdown: cacheResult.cacheInfo
        },
        message: `${dedupCached.length} Events aus dem Cache`
      });
    }

    const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
    if (!PERPLEXITY_API_KEY) {
      return NextResponse.json({ error: 'Perplexity API Key ist nicht konfiguriert' }, { status: 500 });
    }

    const service = createPerplexityService(PERPLEXITY_API_KEY);
    const mergedOptions = {
      ...(options || {}),
      debug: (options?.debug === true) || qDebug,
      debugVerbose: (options?.debugVerbose === true) || qVerbose,
      categoryConcurrency: options?.categoryConcurrency ?? 3
    };
    const results = await service.executeMultiQuery(city, date, missingCategories, mergedOptions);

    // STAMP: ai provenance
    const newEvents = eventAggregator.aggregateResults(results).map(e => ({ ...e, source: e.source ?? 'ai' as const }));

    const combined = eventAggregator.deduplicateEvents([...dedupCached, ...newEvents]);

    const ttlSeconds = computeTTLSecondsForEvents(newEvents);
    const seen = new Set<string>();
    for (const ev of newEvents) {
      if (ev.category && !seen.has(ev.category)) {
        const catEvents = newEvents.filter(e => e.category === ev.category);
        eventsCache.setEventsByCategory(city, date, ev.category, catEvents, ttlSeconds);
        seen.add(ev.category);
      }
    }

    const cacheBreakdown = { ...cacheResult.cacheInfo };
    for (const cat of seen) {
      const catEvents = newEvents.filter(e => e.category === cat);
      cacheBreakdown[cat] = { fromCache: false, eventCount: catEvents.length };
    }

    return NextResponse.json({
      events: combined,
      cached: dedupCached.length > 0,
      status: 'completed',
      newlyFetched: missingCategories,
      cacheInfo: {
        fromCache: dedupCached.length > 0,
        totalEvents: combined.length,
        cachedEvents: dedupCached.length,
        cacheBreakdown
      },
      ttlApplied: ttlSeconds
    });

  } catch (error) {
    console.error('Search route error:', error);
    return NextResponse.json({ error: 'Unerwarteter Fehler' }, { status: 500 });
  }
}