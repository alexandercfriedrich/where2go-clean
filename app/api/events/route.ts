import { NextRequest, NextResponse } from 'next/server';
import { RequestBody, EventData, JobStatus, DebugInfo, DebugStep } from '@/lib/types';
import { eventsCache } from '@/lib/cache';
import InMemoryCache from '@/lib/cache';
import { createPerplexityService } from '@/lib/perplexity';
import { eventAggregator } from '@/lib/aggregator';
import { computeTTLSecondsForEvents } from '@/lib/cacheTtl';
import { getJobStore } from '@/lib/jobStore';

// Default categories used when request.categories is empty/missing
const DEFAULT_CATEGORIES = [
  'DJ Sets/Electronic',
  'Clubs/Discos',
  'Live-Konzerte',
  'Open Air',
  'Museen',
  'LGBTQ+',
  'Comedy/Kabarett',
  'Theater/Performance',
  'Film',
  'Food/Culinary',
  'Sport',
  'Familien/Kids',
  'Kunst/Design',
  'Wellness/Spirituell',
  'Networking/Business',
  'Natur/Outdoor'
];

// Default Perplexity options
const DEFAULT_PPLX_OPTIONS = {
  temperature: 0.2,
  max_tokens: 5000
};

// TODO: Ideas to get more events from raw data
// - Loosen prompt/parsing (e.g. make parser more tolerant of partial data; fallback rules for missing times)
// - Increase max_tokens or paginated follow-up queries per category (currently kept at 1000, optionally configurable via options)  
// - Add iterative subgenre queries per category (e.g. the listed subcategories)
// - Adjust deduplication (fuzzy match with Levenshtein instead of hard equality)
// - Optional: second aggregation pass with "loose" heuristics to not discard entries without website/price

// Get JobStore instance for persisting job state
const jobStore = getJobStore();

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

    // Compute effective categories and merge options with defaults
    const effectiveCategories = categories && categories.length > 0 ? categories : DEFAULT_CATEGORIES;
    const mergedOptions = { ...DEFAULT_PPLX_OPTIONS, ...options };

    // Check cache first (dynamic TTL based on event timing)
    const cacheKey = InMemoryCache.createKey(city, date, effectiveCategories);
    const cachedEvents = eventsCache.get<EventData[]>(cacheKey);
    
    if (cachedEvents) {
      console.log('Cache hit for:', cacheKey);
      // Return cached results immediately as a completed job
      const jobId = `job_cached_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const job: JobStatus = {
        id: jobId,
        status: 'done',
        events: cachedEvents,
        createdAt: new Date()
      };
      await jobStore.setJob(jobId, job);
      
      return NextResponse.json({
        jobId,
        status: 'pending' // Still return pending to maintain API compatibility
      });
    }

    // Generate unique job ID
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create job entry with pending status
    const job: JobStatus = {
      id: jobId,
      status: 'pending',
      createdAt: new Date()
    };

    await jobStore.setJob(jobId, job);

    // Initialize debug info if debug mode is enabled
    if (options?.debug) {
      const debugInfo: DebugInfo = {
        createdAt: new Date(),
        city,
        date,
        categories: effectiveCategories,
        options: mergedOptions,
        steps: []
      };
      await jobStore.setDebugInfo(jobId, debugInfo);
    }

    // Start background job (don't await)
    fetchPerplexityInBackground(jobId, city, date, effectiveCategories, mergedOptions);

    // Return job ID immediately
    return NextResponse.json({
      jobId,
      status: 'pending'
    });

  } catch (error) {
    console.error('Events API Error:', error);
    return NextResponse.json(
      { error: 'Unerwarteter Fehler beim Verarbeiten der Anfrage' },
      { status: 500 }
    );
  }
}

// Background function to fetch from Perplexity with progressive updates
async function fetchPerplexityInBackground(
  jobId: string, 
  city: string, 
  date: string, 
  categories?: string[], 
  options?: any
) {
  try {
    const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
    if (!PERPLEXITY_API_KEY) {
      await jobStore.updateJob(jobId, {
        status: 'error',
        error: 'Perplexity API Key ist nicht konfiguriert'
      });
      return;
    }

    // Default to DEFAULT_CATEGORIES when categories is missing or empty
    const effectiveCategories = categories && categories.length > 0 ? categories : DEFAULT_CATEGORIES;
    
    console.log('Background job starting for:', jobId, city, date, effectiveCategories);

    const perplexityService = createPerplexityService(PERPLEXITY_API_KEY);
    if (!perplexityService) {
      await jobStore.updateJob(jobId, {
        status: 'error',
        error: 'Failed to create Perplexity service'
      });
      return;
    }

    const job = await jobStore.getJob(jobId);
    if (!job) return; // Job might have been cleaned up

    let allEvents: EventData[] = [];

    // Process categories one by one (progressive updates)
    for (let i = 0; i < effectiveCategories.length; i++) {
      const category = effectiveCategories[i];
      
      // Add retry logic with exponential backoff for each category
      let categoryResult = null;
      let attempts = 0;
      const maxAttempts = 3;
      
      while (attempts < maxAttempts && !categoryResult) {
        attempts++;
        
        try {
          console.log(`Processing category ${i + 1}/${effectiveCategories.length}: ${category} (attempt ${attempts}/${maxAttempts})`);
          
          // Execute query for single category
          const results = await perplexityService.executeMultiQuery(city, date, [category], options);
          
          if (results.length > 0) {
            categoryResult = results[0];
          }
          
        } catch (categoryError: any) {
          console.error(`Category ${category} attempt ${attempts}/${maxAttempts} failed:`, categoryError.message);
          
          // Add debug step for failed attempt
          await jobStore.pushDebugStep(jobId, {
            category,
            query: `Events in ${category} for ${city} on ${date} (attempt ${attempts})`,
            response: `Error: ${categoryError.message}`,
            parsedCount: 0
          });
          
          // If not the last attempt, wait with exponential backoff
          if (attempts < maxAttempts) {
            const delay = 1000 * Math.pow(2, attempts - 1); // 1s, 2s, 4s
            console.log(`Retrying category ${category} in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
      
      // Process the result if we got one
      if (categoryResult) {
        // Check if result has error (from retry failure)
        const isErrorResult = categoryResult.response.startsWith('Error after');
        
        if (!isErrorResult) {
          // Parse events from this category result
          categoryResult.events = eventAggregator.parseEventsFromResponse(categoryResult.response);
          
          // Aggregate new events with existing ones
          const newResults = [{ ...categoryResult, events: categoryResult.events }];
          const categoryEvents = eventAggregator.aggregateResults(newResults);
          
          // Merge with existing events and deduplicate
          const combinedEvents = [...allEvents, ...categoryEvents];
          allEvents = eventAggregator.deduplicateEvents(combinedEvents);
          
          // Categorize all events
          allEvents = eventAggregator.categorizeEvents(allEvents);
          
          // Update job with current results (status remains 'pending') - progressive updates
          await jobStore.updateJob(jobId, { events: allEvents });
          
          console.log(`Category ${category} complete: ${categoryResult.events.length} new events, ${allEvents.length} total`);
        }
        
        // Add to debug info (even for errors)
        await jobStore.pushDebugStep(jobId, {
          category,
          query: `Find ALL events happening on ${date} in ${city} of the category: ${category}. also check all venues of category ${category}. also check relevant webpages of ${category}. Also expand the query to find aditional events of category ${category}. the goal is to return a comprehensive list of all events of the category ${category} happening on ${date} in ${city}. `, // Transparent query description
          response: categoryResult.response,
          parsedCount: isErrorResult ? 0 : categoryResult.events.length
        });
      } else {
        // All attempts failed for this category, add final debug step and continue
        console.error(`All ${maxAttempts} attempts failed for category ${category}, continuing with other categories`);
        
        await jobStore.pushDebugStep(jobId, {
          category,
          query: `Events in ${category} for ${city} on ${date}`,
          response: `Error: All ${maxAttempts} attempts failed`,
          parsedCount: 0
        });
        
        // Continue with other categories instead of failing entire job
        continue;
      }
    }

    // Cache the final results with dynamic TTL based on event timings
    const cacheKey = InMemoryCache.createKey(city, date, effectiveCategories);
    const ttlSeconds = computeTTLSecondsForEvents(allEvents);
    eventsCache.set(cacheKey, allEvents, ttlSeconds);

    console.log(`Background job complete: cached ${allEvents.length} events with TTL: ${ttlSeconds} seconds`);

    // Update job with final status
    await jobStore.updateJob(jobId, {
      status: 'done',
      events: allEvents
    });

  } catch (error) {
    console.error('Background job error for:', jobId, error);
    await jobStore.updateJob(jobId, {
      status: 'error',
      error: 'Fehler beim Verarbeiten der Anfrage'
    });
  }
}
