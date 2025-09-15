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

    // If no categories specified or empty array, use legacy cache behavior
    if (!categories || categories.length === 0) {
      // Check legacy cache for general search
      const cacheKey = InMemoryCache.createKey(city, date, categories);
      const cachedEvents = eventsCache.get<EventData[]>(cacheKey);
      
      if (cachedEvents) {
        console.log('Legacy cache hit for search endpoint:', cacheKey);
        return NextResponse.json({
          events: cachedEvents,
          cached: true,
          timestamp: new Date().toISOString(),
          cacheInfo: {
            fromCache: true,
            totalEvents: cachedEvents.length,
            cachedEvents: cachedEvents.length
          }
        });
      }
    } else {
      // Use per-category cache system for specific categories
      if (debugMode) {
        console.log('DEBUG: Checking per-category cache for:', city, date, categories);
        console.log('DEBUG: Cache size before check:', eventsCache.size());
      } else {
        console.log('Checking per-category cache for:', city, date, categories);
      }
      
      // First check if we have complete legacy cache for this exact combination
      const legacyCacheKey = InMemoryCache.createKey(city, date, categories);
      const legacyCachedEvents = eventsCache.get<EventData[]>(legacyCacheKey);
      
      if (debugMode) {
        console.log('DEBUG: Legacy cache key:', legacyCacheKey);
        console.log('DEBUG: Legacy cache result:', legacyCachedEvents ? `${legacyCachedEvents.length} events` : 'NOT FOUND');
      }
      
      if (legacyCachedEvents) {
        console.log('Legacy cache hit for exact category combination:', legacyCacheKey);
        return NextResponse.json({
          events: legacyCachedEvents,
          cached: true,
          timestamp: new Date().toISOString(),
          cacheInfo: {
            fromCache: true,
            totalEvents: legacyCachedEvents.length,
            cachedEvents: legacyCachedEvents.length,
            categoriesFromCache: categories,
            categoriesSearched: [],
            cacheBreakdown: Object.fromEntries(categories.map(cat => [cat, { fromCache: true, eventCount: 0 }]))
          }
        });
      }

      // Check per-category cache
      const cacheResult = eventsCache.getEventsByCategories(city, date, categories);
      
      if (debugMode) {
        console.log('DEBUG: Per-category cache result:');
        console.log('  - Cached events per category:', Object.keys(cacheResult.cachedEvents));
        console.log('  - Missing categories:', cacheResult.missingCategories);
        console.log('  - Cache info:', cacheResult.cacheInfo);
        
        // Show actual cache keys that were checked
        console.log('DEBUG: Cache keys checked:');
        for (const category of categories) {
          const key = InMemoryCache.createKeyForCategory(city, date, category);
          const exists = eventsCache.has(key);
          console.log(`  - "${key}": ${exists ? 'EXISTS' : 'MISSING'}`);
        }
      }
      
      // If all categories are cached, return combined results
      if (cacheResult.missingCategories.length === 0) {
        console.log('Complete per-category cache hit for:', categories);
        
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
            categoriesFromCache: categories,
            categoriesSearched: [],
            cacheBreakdown: cacheResult.cacheInfo
          }
        });
      }

      // Removed unused progressive streaming placeholder block.
      // NOTE: If future streaming is required, integrate SSE/WebSocket here when options.progressive is true.

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
    }

    // Fetch events synchronously
    const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
    if (!PERPLEXITY_API_KEY) {
      return NextResponse.json(
        { error: 'Perplexity API Key ist nicht konfiguriert' },
        { status: 500 }
      );
    }

    console.log('Synchronous search starting for:', city, date, categories);
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

    if (categories && categories.length > 0) {
      // For per-category approach, get partial cache results
      const cacheResult = eventsCache.getEventsByCategories(city, date, categories);
      
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
    } else {
      // Use single query for general search (backward compatibility)
      const result = await perplexityService.executeSingleQuery(city, date);
      newEvents = eventAggregator.parseEventsFromResponse(result.response);
      searchedCategories = ['all'];
      
      // Categorize events
      newEvents = eventAggregator.categorizeEvents(newEvents);
      
      cacheInfo = {
        fromCache: false,
        totalEvents: newEvents.length,
        cachedEvents: 0,
        categoriesFromCache: [],
        categoriesSearched: ['all']
      };
    }

    // Combine cached and new events
    const allEvents = [...cachedEventsFromPartialHit, ...newEvents];

    // Cache the complete result using legacy method for backward compatibility
    const legacyCacheKey = InMemoryCache.createKey(city, date, categories);
    const ttlSeconds = computeTTLSecondsForEvents(allEvents);
    eventsCache.set(legacyCacheKey, allEvents, ttlSeconds);

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