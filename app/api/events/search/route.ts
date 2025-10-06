import { NextRequest, NextResponse } from 'next/server';
import { EventData } from '@/lib/types';
import { eventsCache } from '@/lib/cache';
import { createPerplexityService } from '@/lib/perplexity';
import { eventAggregator } from '@/lib/aggregator';
import { computeTTLSecondsForEvents } from '@/lib/cacheTtl';
import { EVENT_CATEGORIES, normalizeCategory } from '@/lib/eventCategories';
import { upsertDayEvents } from '@/lib/dayCache';

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

    const cacheResult = await eventsCache.getEventsByCategories(city, date, effectiveCategories);
    const cachedEventsFlat: EventData[] = [];
    for (const cat of Object.keys(cacheResult.cachedEvents)) {
      cachedEventsFlat.push(...cacheResult.cachedEvents[cat]);
    }

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

    // KI-Ergebnisse normalisieren: Quelle + kanonische Kategorie
    const newEventsRaw = eventAggregator.aggregateResults(results).map(e => ({ ...e, source: e.source ?? 'ai' as const }));
    const newEvents = newEventsRaw.map(e => ({ ...e, category: normalizeCategory(e.category || '') }));

    const combined = eventAggregator.deduplicateEvents([...dedupCached, ...newEvents]);

    const disableCache = (options?.disableCache === true);
    if (!disableCache && newEvents.length > 0) {
      const ttlSeconds = computeTTLSecondsForEvents(newEvents);
      const grouped: Record<string, EventData[]> = {};
      for (const ev of newEvents) {
        if (!ev.category) continue;
        (grouped[ev.category] ||= []).push(ev);
      }
      for (const cat of Object.keys(grouped)) {
        await eventsCache.setEventsByCategory(city, date, cat, grouped[cat], ttlSeconds);
      }
      
      // Also upsert into day-bucket cache
      await upsertDayEvents(city, date, newEvents);
    }

    const cacheBreakdown = { ...cacheResult.cacheInfo };
    for (const cat of new Set(newEvents.map(e => e.category))) {
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
      ttlApplied: computeTTLSecondsForEvents(newEvents)
    });

  } catch (error) {
    console.error('Search route error:', error);
    return NextResponse.json({ error: 'Unerwarteter Fehler' }, { status: 500 });
  }
}