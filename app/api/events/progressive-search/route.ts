import { NextRequest, NextResponse } from 'next/server';
import { RequestBody, EventData } from '@/lib/types';
import { eventsCache } from '@/lib/cache';
import InMemoryCache from '@/lib/cache';
import { createPerplexityService } from '@/lib/perplexity';
import { eventAggregator } from '@/lib/aggregator';
import { computeTTLSecondsForEvents } from '@/lib/cacheTtl';

/**
 * Progressive search endpoint that returns results as each category is processed
 * This addresses the user's request for progressive results instead of waiting for all categories
 */
export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json();
    const { city, date, categories, options } = body;

    const debugMode = options?.debug || false;
    if (debugMode) {
      console.log('\n=== PROGRESSIVE SEARCH DEBUG MODE ===');
      console.log('Request:', { city, date, categories, options });
    }

    if (!city || !date) {
      return NextResponse.json(
        { error: 'Stadt und Datum sind erforderlich' },
        { status: 400 }
      );
    }

    if (!categories || categories.length === 0) {
      return NextResponse.json(
        { error: 'Kategorien sind für progressive Suche erforderlich' },
        { status: 400 }
      );
    }

    console.log('Progressive search starting for:', city, date, categories);

    // Initialize streaming response
    const encoder = new TextEncoder();
    const customReadable = new ReadableStream({
      async start(controller) {
        let allEvents: EventData[] = [];
        let processedCategories: string[] = [];
        let totalCategoriesProcessed = 0;

        try {
          // Process each category individually
          for (const category of categories) {
            console.log(`Processing category: ${category}`);
            
            // Check cache for this specific category
            const cacheResult = eventsCache.getEventsByCategories(city, date, [category]);
            let categoryEvents: EventData[] = [];

            if (cacheResult.missingCategories.length === 0) {
              // Category is cached
              categoryEvents = Object.values(cacheResult.cachedEvents).flat();
              console.log(`Category "${category}" found in cache: ${categoryEvents.length} events`);
              
              if (debugMode) {
                console.log(`DEBUG: ✅ Category "${category}" cache hit`);
              }
            } else {
              // Category needs to be fetched
              console.log(`Category "${category}" not in cache, fetching...`);
              
              if (debugMode) {
                console.log(`DEBUG: ⚠️  Making API call for category "${category}"`);
              }

              const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
              if (!PERPLEXITY_API_KEY) {
                controller.error(new Error('Perplexity API Key ist nicht konfiguriert'));
                return;
              }

              const perplexityService = createPerplexityService(PERPLEXITY_API_KEY);
              if (!perplexityService) {
                controller.error(new Error('Failed to create Perplexity service'));
                return;
              }

              // Search for just this category
              const results = await perplexityService.executeMultiQuery(city, date, [category], options);
              
              // Parse events from results
              for (const result of results) {
                result.events = eventAggregator.parseEventsFromResponse(result.response);
              }
              
              categoryEvents = eventAggregator.aggregateResults(results);
              categoryEvents = eventAggregator.categorizeEvents(categoryEvents);

              // Cache the results for this category
              const ttlSeconds = computeTTLSecondsForEvents(categoryEvents);
              eventsCache.setEventsByCategory(city, date, category, categoryEvents, ttlSeconds);
              
              console.log(`Cached ${categoryEvents.length} events for category "${category}"`);
            }

            // Add events to total
            allEvents.push(...categoryEvents);
            processedCategories.push(category);
            totalCategoriesProcessed++;

            // Stream partial results to client
            const progressUpdate = {
              type: 'progress',
              category,
              events: categoryEvents,
              allEvents: allEvents.slice(), // Send copy of all events so far
              progress: {
                categoriesProcessed: totalCategoriesProcessed,
                totalCategories: categories.length,
                currentCategory: category,
                completedCategories: processedCategories.slice(),
                remainingCategories: categories.slice(totalCategoriesProcessed)
              },
              timestamp: new Date().toISOString()
            };

            // Send progress update
            const chunk = encoder.encode(`data: ${JSON.stringify(progressUpdate)}\n\n`);
            controller.enqueue(chunk);

            console.log(`Progress: ${totalCategoriesProcessed}/${categories.length} categories processed`);
          }

          // Send final complete result
          const finalResult = {
            type: 'complete',
            events: allEvents,
            cached: false, // Progressive search always involves some processing
            timestamp: new Date().toISOString(),
            cacheInfo: {
              fromCache: false,
              totalEvents: allEvents.length,
              cachedEvents: 0, // TODO: Track actually cached vs fetched events
              categoriesFromCache: [], // TODO: Track which categories were cached
              categoriesSearched: processedCategories,
              progressiveSearch: true
            },
            progress: {
              categoriesProcessed: totalCategoriesProcessed,
              totalCategories: categories.length,
              completed: true
            }
          };

          const finalChunk = encoder.encode(`data: ${JSON.stringify(finalResult)}\n\n`);
          controller.enqueue(finalChunk);

          console.log(`Progressive search completed: ${allEvents.length} total events from ${totalCategoriesProcessed} categories`);

        } catch (error) {
          console.error('Progressive search error:', error);
          const errorUpdate = {
            type: 'error',
            error: 'Unerwarteter Fehler bei der progressiven Suche',
            timestamp: new Date().toISOString()
          };
          const errorChunk = encoder.encode(`data: ${JSON.stringify(errorUpdate)}\n\n`);
          controller.enqueue(errorChunk);
          controller.error(error);
        } finally {
          controller.close();
        }
      }
    });

    return new NextResponse(customReadable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Progressive Search API Error:', error);
    return NextResponse.json(
      { error: 'Unerwarteter Fehler beim Verarbeiten der progressiven Anfrage' },
      { status: 500 }
    );
  }
}