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

    if (!city || !date) {
      return NextResponse.json(
        { error: 'Stadt und Datum sind erforderlich' },
        { status: 400 }
      );
    }

    // Check cache first with same key as the background job endpoint
    const cacheKey = InMemoryCache.createKey(city, date, categories);
    const cachedEvents = eventsCache.get<EventData[]>(cacheKey);
    
    if (cachedEvents) {
      console.log('Cache hit for search endpoint:', cacheKey);
      return NextResponse.json({
        events: cachedEvents,
        cached: true,
        timestamp: new Date().toISOString()
      });
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

    const perplexityService = createPerplexityService(PERPLEXITY_API_KEY);
    if (!perplexityService) {
      return NextResponse.json(
        { error: 'Failed to create Perplexity service' },
        { status: 500 }
      );
    }

    let events: EventData[] = [];

    if (categories && categories.length > 0) {
      // Use multi-query approach for specific categories
      const results = await perplexityService.executeMultiQuery(city, date, categories, options);
      
      // Parse events from all results and aggregate them
      for (const result of results) {
        result.events = eventAggregator.parseEventsFromResponse(result.response);
      }
      
      events = eventAggregator.aggregateResults(results);
    } else {
      // Use single query for general search (backward compatibility)
      const result = await perplexityService.executeSingleQuery(city, date);
      events = eventAggregator.parseEventsFromResponse(result.response);
    }

    // Categorize events
    events = eventAggregator.categorizeEvents(events);

    // Cache the results with dynamic TTL based on event timings
    const ttlSeconds = computeTTLSecondsForEvents(events);
    eventsCache.set(cacheKey, events, ttlSeconds);

    console.log(`Cached ${events.length} events with TTL: ${ttlSeconds} seconds`);

    return NextResponse.json({
      events,
      cached: false,
      timestamp: new Date().toISOString(),
      ttl: ttlSeconds
    });

  } catch (error) {
    console.error('Search API Error:', error);
    return NextResponse.json(
      { error: 'Unerwarteter Fehler beim Verarbeiten der Anfrage' },
      { status: 500 }
    );
  }
}