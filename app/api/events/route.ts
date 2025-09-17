import { NextRequest, NextResponse } from 'next/server';
import { RequestBody, EventData } from '@/lib/types';
import { eventsCache } from '@/lib/cache';
import { createPerplexityService } from '@/lib/perplexity';
import { eventAggregator } from '@/lib/aggregator';
import { computeTTLSecondsForEvents } from '@/lib/cacheTtl';
import { getJobStore } from '@/lib/jobStore';
import { getHotCity, getCityWebsitesForCategories } from '@/lib/hotCityStore';
import {
  EVENT_CATEGORIES,
  mapToMainCategories
} from '@/lib/eventCategories';

export const runtime = 'nodejs';
export const maxDuration = 300;

const DEFAULT_CATEGORIES = EVENT_CATEGORIES;
const DEFAULT_PPLX_OPTIONS = {
  temperature: 0.2,
  max_tokens: 10000,
  expandedSubcategories: true
};

const jobStore = getJobStore();

export async function POST(request: NextRequest) {
  try {
    const body: RequestBody & { options?: any } = await request.json();
    const { city, date, categories = [], options = {} } = body;

    if (!city || !date) {
      return NextResponse.json({ error: 'Stadt und Datum sind erforderlich' }, { status: 400 });
    }

    // Merge defaults first (Fix: options used earlier previously)
    const mergedOptions = {
      ...DEFAULT_PPLX_OPTIONS,
      ...options
    };

    // Compute requested categories
    let requestedCategories = mergedOptions.forceAllCategories
      ? EVENT_CATEGORIES
      : mapToMainCategories(categories);

    if (requestedCategories.length === 0 && !mergedOptions.forceAllCategories) {
      requestedCategories = []; // will trigger general query mode below
    }

    // Hot city enrichment
    let hotCityData: any = null;
    let additionalSources: any[] = [];
    try {
      hotCityData = await getHotCity(city);
      if (hotCityData) {
        additionalSources = await getCityWebsitesForCategories(
          city,
          requestedCategories.length ? requestedCategories : EVENT_CATEGORIES
        );
      }
    } catch (e) {
      console.error('Hot city enrichment failed:', e);
    }

    mergedOptions.hotCity = hotCityData;
    mergedOptions.additionalSources = additionalSources;

    const disableCache = mergedOptions.disableCache === true || mergedOptions.debug === true;

    let cachedEvents: EventData[] = [];
    let missingCategories: string[] = [];
    let cacheInfo: { [category: string]: { fromCache: boolean; eventCount: number } } = {};

    if (!disableCache && requestedCategories.length > 0) {
      const cacheResult = eventsCache.getEventsByCategories(city, date, requestedCategories);
      for (const cat in cacheResult.cachedEvents) {
        cachedEvents.push(...cacheResult.cachedEvents[cat]);
      }
      cachedEvents = eventAggregator.deduplicateEvents(cachedEvents);
      missingCategories = cacheResult.missingCategories;
      cacheInfo = cacheResult.cacheInfo;
    } else if (requestedCategories.length > 0) {
      missingCategories = requestedCategories;
      requestedCategories.forEach(c => {
        cacheInfo[c] = { fromCache: false, eventCount: 0 };
      });
    }

    if (missingCategories.length === 0 && requestedCategories.length > 0) {
      return NextResponse.json({
        status: 'completed',
        events: cachedEvents,
        cached: true,
        message: `${cachedEvents.length} Events aus dem Cache`,
        cacheInfo: {
          fromCache: true,
          totalEvents: cachedEvents.length,
          cachedEvents: cachedEvents.length,
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
      mergedOptions
    );

    const newParsed = eventAggregator.aggregateResults(pplxResults);

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
      newlyFetched: Object.keys(perCategoryGroups),
      cacheInfo: {
        fromCache: cachedEvents.length > 0,
        totalEvents: combined.length,
        cachedEvents: cachedEvents.length,
        cacheBreakdown: cacheInfo
      },
      queryCategories: missingCategories,
      optionsUsed: {
        expandedSubcategories: mergedOptions.expandedSubcategories,
        forceAllCategories: mergedOptions.forceAllCategories
      },
      ttlApplied: ttlSeconds
    });

  } catch (error) {
    console.error('Events API Error:', error);
    return NextResponse.json({ error: 'Unerwarteter Fehler beim Verarbeiten der Anfrage' }, { status: 500 });
  }
}
