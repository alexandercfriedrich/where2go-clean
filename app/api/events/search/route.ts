import { NextRequest, NextResponse } from 'next/server';
import { RequestBody, EventData } from '@/lib/types';
import { eventsCache } from '@/lib/cache';
import InMemoryCache from '@/lib/cache';
import { createPerplexityService } from '@/lib/perplexity';
import { eventAggregator } from '@/lib/aggregator';
import { computeTTLSecondsForEvents } from '@/lib/cacheTtl';

export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json();
    const { city, date, categories, options } = body;

    // Debug mode - detailed logging when enabled
    const debugMode = options?.debug || false;
    if (debugMode) {
      console.log('\n=== SEARCH DEBUG MODE ENABLED ===');
      console.log('Request:', { city, date, categories, options });
    }

    if (!city || !date) {
      return NextResponse.json(
        { error: 'Stadt und Datum sind erforderlich' },
        { status: 400 }
      );
    }

    // Use per-category cache system for all searches
    if (debugMode) {
      console.log('DEBUG: Checking per-category cache for:', city, date, categories);
      console.log('DEBUG: Cache size before check:', eventsCache.size());
    } else {
      console.log('Checking per-category cache for:', city, date, categories);
    }
    
    // For searches without specific categories, treat as general search
    const searchCategories = categories && categories.length > 0 ? categories : ['all'];

      // Check per-category cache
      const cacheResult = eventsCache.getEventsByCategories(city, date, searchCategories);
      
      if (debugMode) {
        console.log('DEBUG: Per-category cache result:');
        console.log('  - Cached events per category:', Object.keys(cacheResult.cachedEvents));
        console.log('  - Missing categories:', cacheResult.missingCategories);
        console.log('  - Cache info:', cacheResult.cacheInfo);
        
        // Show actual cache keys that were checked
        console.log('DEBUG: Cache keys checked:');
        for (const category of searchCategories) {
          const key = InMemoryCache.createKeyForCategory(city, date, category);
          const exists = eventsCache.has(key);
          console.log(`  - "${key}": ${exists ? 'EXISTS' : 'MISSING'}`);
        }
      }
      
      // If all categories are cached, return combined results
      if (cacheResult.missingCategories.length === 0) {
        console.log('Complete per-category cache hit for:', searchCategories);
        
        // Combine all cached events
        const allCachedEvents = Object.values(cacheResult.cachedEvents).flat();
        const totalCachedEvents = allCachedEvents.length;
        
        if (debugMode) {
          console.log('DEBUG: ✅ Returning cached results - no API calls needed');
          console.log('DEBUG: Total cached events:', totalCachedEvents);
        }
        
        return NextResponse.json({
          events: allCachedEvents,
          cached: true,
          timestamp: new Date().toISOString(),
          cacheInfo: {
            fromCache: true,
            totalEvents: totalCachedEvents,
            cachedEvents: totalCachedEvents,
            categoriesFromCache: searchCategories,
            categoriesSearched: [],
            cacheBreakdown: cacheResult.cacheInfo
          }
        });
      }

      // Progressive results: If enabled and we have partial cache hits, 
      // we could potentially return cached results first
      if (options?.progressive && Object.keys(cacheResult.cachedEvents).length > 0) {
        // For now, just log that progressive mode is requested
        // TODO: Implement actual progressive results with streaming
        if (debugMode) {
          console.log('DEBUG: Progressive mode requested with partial cache hit');
          console.log('DEBUG: Could return cached results first, then add missing categories');
        }
      }

      // Partial cache hit - proceed with searching missing categories
      if (Object.keys(cacheResult.cachedEvents).length > 0) {
        console.log('Partial cache hit. Cached categories:', Object.keys(cacheResult.cachedEvents), 'Missing:', cacheResult.missingCategories);
        if (debugMode) {
          console.log('DEBUG: ⚠️  Will make API calls for missing categories:', cacheResult.missingCategories);
        }
      } else {
        if (debugMode) {
          console.log('DEBUG: ⚠️  No cached categories found - will make API calls for all categories');
        }
      }

    // Fetch events synchronously
    const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
    if (!PERPLEXITY_API_KEY) {
      return NextResponse.json(
        { error: 'Perplexity API Key ist nicht konfiguriert' },
        { status: 500 }
      );
    }

    console.log('Synchronous search starting for:', city, date, searchCategories);
    if (debugMode) {
      console.log('DEBUG: ⚠️  Making API calls - this indicates a cache miss or partial miss');
      console.log('DEBUG: Perplexity API key available:', !!PERPLEXITY_API_KEY);
    }

    const perplexityService = createPerplexityService(PERPLEXITY_API_KEY);
    if (!perplexityService) {
      return NextResponse.json(
        { error: 'Failed to create Perplexity service' },
        { status: 500 }
      );
    }

    let newEvents: EventData[] = [];
    let searchedCategories: string[] = [];
    let cachedEventsFromPartialHit: EventData[] = [];
    let cacheInfo: any = {};

    // For per-category approach, get partial cache results
    // (cacheResult already defined above)
    
    // Collect cached events
    cachedEventsFromPartialHit = Object.values(cacheResult.cachedEvents).flat();
    
    // Only search for missing categories
    const categoriesToSearch = cacheResult.missingCategories;
    searchedCategories = categoriesToSearch;
    
    if (categoriesToSearch.length > 0) {
      // Use multi-query approach for missing categories only
      const results = await perplexityService.executeMultiQuery(city, date, categoriesToSearch, options);
        
        // Parse events from all results and aggregate them
        for (const result of results) {
          result.events = eventAggregator.parseEventsFromResponse(result.response);
        }
        
        newEvents = eventAggregator.aggregateResults(results);
        
        // Categorize new events
        newEvents = eventAggregator.categorizeEvents(newEvents);
        
        // Cache new events per category
        const ttlSeconds = computeTTLSecondsForEvents(newEvents);
        
        // Group events by category and cache each category separately
        const eventsByCategory: { [category: string]: EventData[] } = {};
        for (const event of newEvents) {
          if (!eventsByCategory[event.category]) {
            eventsByCategory[event.category] = [];
          }
          eventsByCategory[event.category].push(event);
        }
        
        for (const category of categoriesToSearch) {
          const categoryEvents = eventsByCategory[category] || [];
          eventsCache.setEventsByCategory(city, date, category, categoryEvents, ttlSeconds);
          console.log(`Cached ${categoryEvents.length} events for category "${category}" with TTL: ${ttlSeconds} seconds`);
        }
    }

    // Build cache info
    cacheInfo = {
      fromCache: cachedEventsFromPartialHit.length > 0,
      totalEvents: cachedEventsFromPartialHit.length + newEvents.length,
      cachedEvents: cachedEventsFromPartialHit.length,
      categoriesFromCache: Object.keys(cacheResult.cachedEvents),
      categoriesSearched: searchedCategories,
      cacheBreakdown: cacheResult.cacheInfo
    };

    // Update cache breakdown with new search results
    for (const category of searchedCategories) {
      const categoryEvents = newEvents.filter(event => event.category === category);
      cacheInfo.cacheBreakdown[category] = {
        fromCache: false,
        eventCount: categoryEvents.length
      };
    }

    // Combine cached and new events
    const allEvents = [...cachedEventsFromPartialHit, ...newEvents];
    const ttlSeconds = computeTTLSecondsForEvents(allEvents);

    console.log(`Total events: ${allEvents.length} (${cachedEventsFromPartialHit.length} from cache, ${newEvents.length} new)`);

    return NextResponse.json({
      events: allEvents,
      cached: false,
      timestamp: new Date().toISOString(),
      ttl: ttlSeconds,
      cacheInfo
    });

  } catch (error) {
    console.error('Search API Error:', error);
    return NextResponse.json(
      { error: 'Unerwarteter Fehler beim Verarbeiten der Anfrage' },
      { status: 500 }
    );
  }
}