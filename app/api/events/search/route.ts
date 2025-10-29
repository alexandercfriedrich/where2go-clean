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
  const requestId = `search-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    console.log(`[DEBUG Search API ${requestId}] === REQUEST START ===`);
    
    const url = new URL(request.url);
    const qDebug = url.searchParams.get('debug') === '1';
    const qVerbose = url.searchParams.get('verbose') === '1';

    const { city, date, categories, options } = await request.json();
    
    console.log(`[DEBUG Search API ${requestId}] Request params:`, { city, date, categories, options, qDebug, qVerbose });
    
    if (!city || !date) {
      console.log(`[DEBUG Search API ${requestId}] ❌ Missing required params`);
      return NextResponse.json({ error: 'Stadt und Datum sind erforderlich' }, { status: 400 });
    }

    const effectiveCategories: string[] = (categories && categories.length > 0) ? categories : DEFAULT_CATEGORIES;
    console.log(`[DEBUG Search API ${requestId}] Effective categories:`, effectiveCategories);

    // Try cache first
    console.log(`[DEBUG Search API ${requestId}] Checking cache for categories:`, effectiveCategories);
    const cacheResult = await eventsCache.getEventsByCategories(city, date, effectiveCategories);
    
    const cachedEventsFlat: EventData[] = [];
    for (const cat of Object.keys(cacheResult.cachedEvents)) {
      cachedEventsFlat.push(...cacheResult.cachedEvents[cat]);
    }
    
    console.log(`[DEBUG Search API ${requestId}] Cache results:`, {
      totalCached: cachedEventsFlat.length,
      missingCategories: cacheResult.missingCategories.length,
      cacheBreakdown: Object.fromEntries(
        Object.entries(cacheResult.cacheInfo).map(([k, v]) => [k, v.eventCount])
      )
    });

    const dedupCached = eventAggregator.deduplicateEvents(
      cachedEventsFlat.map(e => ({ ...e, source: e.source ?? 'cache' as const }))
    );
    
    console.log(`[DEBUG Search API ${requestId}] After deduplication:`, dedupCached.length, 'cached events');

    const missingCategories = cacheResult.missingCategories;
    if (missingCategories.length === 0) {
      console.log(`[DEBUG Search API ${requestId}] ✅ All data from cache, no AI needed`);
      
      // Even when all data is from cache, opportunistically fill day-bucket if it doesn't exist
      if (dedupCached.length > 0) {
        try {
          await upsertDayEvents(city, date, dedupCached);
          console.log(`[DEBUG Search API ${requestId}] Day-bucket updated with cached events`);
        } catch (error) {
          console.error(`[DEBUG Search API ${requestId}] Failed to upsert day events from cache:`, error);
          // Don't fail the request if day-bucket update fails
        }
      }
      
      console.log(`[DEBUG Search API ${requestId}] === REQUEST END === (cache hit)`);
      
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

    console.log(`[DEBUG Search API ${requestId}] 🤖 AI fetch needed for missing categories:`, missingCategories);

    const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
    if (!PERPLEXITY_API_KEY) {
      console.log(`[DEBUG Search API ${requestId}] ❌ Perplexity API key not configured`);
      return NextResponse.json({ error: 'Perplexity API Key ist nicht konfiguriert' }, { status: 500 });
    }

    const service = createPerplexityService(PERPLEXITY_API_KEY);
    const mergedOptions = {
      ...(options || {}),
      debug: (options?.debug === true) || qDebug,
      debugVerbose: (options?.debugVerbose === true) || qVerbose,
      categoryConcurrency: options?.categoryConcurrency ?? 10
    };

    console.log(`[DEBUG Search API ${requestId}] Executing AI queries with options:`, mergedOptions);
    const results = await service.executeMultiQuery(city, date, missingCategories, mergedOptions);
    console.log(`[DEBUG Search API ${requestId}] AI queries completed, processing results`);

    // KI-Ergebnisse normalisieren: Quelle + kanonische Kategorie
    const newEventsRaw = eventAggregator.aggregateResults(results).map(e => ({ ...e, source: e.source ?? 'ai' as const }));
    const newEvents = newEventsRaw.map(e => ({ ...e, category: normalizeCategory(e.category || '') }));
    
    console.log(`[DEBUG Search API ${requestId}] AI returned ${newEvents.length} new events`);

    const combined = eventAggregator.deduplicateEvents([...dedupCached, ...newEvents]);
    
    console.log(`[DEBUG Search API ${requestId}] Combined and deduplicated:`, combined.length, 'total events');

    const disableCache = (options?.disableCache === true);
    if (!disableCache && newEvents.length > 0) {
      const ttlSeconds = computeTTLSecondsForEvents(newEvents);
      console.log(`[DEBUG Search API ${requestId}] Caching new events with TTL:`, ttlSeconds, 'seconds');
      
      const grouped: Record<string, EventData[]> = {};
      for (const ev of newEvents) {
        if (!ev.category) continue;
        (grouped[ev.category] ||= []).push(ev);
      }
      for (const cat of Object.keys(grouped)) {
        await eventsCache.setEventsByCategory(city, date, cat, grouped[cat], ttlSeconds);
        // Sanitize category name for logging
        const sanitizedCat = String(cat).replace(/[^\w\s&/-]/g, '');
        console.log(`[DEBUG Search API ${requestId}] Cached ${grouped[cat].length} events for category "${sanitizedCat}"`);
      }
      
      // Also upsert into day-bucket cache (combined events, not just new ones)
      await upsertDayEvents(city, date, combined);
      console.log(`[DEBUG Search API ${requestId}] Day-bucket updated with combined events`);
    } else if (!disableCache && combined.length > 0) {
      // If no new events but we have combined events, still update day-bucket
      try {
        await upsertDayEvents(city, date, combined);
        console.log(`[DEBUG Search API ${requestId}] Day-bucket updated (no new AI events)`);
      } catch (error) {
        console.error(`[DEBUG Search API ${requestId}] Failed to upsert combined events to day-bucket:`, error);
      }
    }

    const cacheBreakdown = { ...cacheResult.cacheInfo };
    for (const cat of new Set(newEvents.map(e => e.category))) {
      const catEvents = newEvents.filter(e => e.category === cat);
      cacheBreakdown[cat] = { fromCache: false, eventCount: catEvents.length };
    }

    console.log(`[DEBUG Search API ${requestId}] === REQUEST END === (success)`);
    console.log(`[DEBUG Search API ${requestId}] Final summary:`, {
      totalEvents: combined.length,
      cachedEvents: dedupCached.length,
      newAIEvents: newEvents.length
    });

    // Build debug info for development
    const debugInfo = qDebug || qVerbose ? {
      requestId,
      missingCategories,
      aiQueries: missingCategories.length,
      cacheHits: Object.keys(cacheResult.cachedEvents).length,
      cacheMisses: missingCategories.length,
      beforeDedup: {
        cached: cachedEventsFlat.length,
        ai: newEventsRaw.length,
        total: cachedEventsFlat.length + newEventsRaw.length
      },
      afterDedup: {
        cached: dedupCached.length,
        ai: newEvents.length,
        combined: combined.length,
        duplicatesRemoved: (cachedEventsFlat.length + newEventsRaw.length) - combined.length
      },
      ttlSeconds: computeTTLSecondsForEvents(newEvents),
      cacheBreakdown
    } : undefined;

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
      ttlApplied: computeTTLSecondsForEvents(newEvents),
      debug: debugInfo
    });

  } catch (error) {
    console.error(`[DEBUG Search API ${requestId}] ❌ === REQUEST ERROR ===`, error);
    return NextResponse.json({ error: 'Unerwarteter Fehler' }, { status: 500 });
  }
}