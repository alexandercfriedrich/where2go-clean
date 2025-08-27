import { NextRequest, NextResponse } from 'next/server';
import { EventData, DebugStep } from '@/lib/types';
import { eventsCache } from '@/lib/cache';
import InMemoryCache from '@/lib/cache';
import { createPerplexityService } from '@/lib/perplexity';
import { eventAggregator } from '@/lib/aggregator';
import { computeTTLSecondsForEvents } from '@/lib/cacheTtl';
import { getJobStore } from '@/lib/jobStore';

// Serverless configuration for background processing
export const runtime = 'nodejs';
export const maxDuration = 300;

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

// Get JobStore instance for persisting job state
const jobStore = getJobStore();

// Helper function to add timeout to any promise
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
    )
  ]);
}

interface ProcessingRequest {
  jobId: string;
  city: string;
  date: string;
  categories?: string[];
  options?: any;
}

export async function POST(request: NextRequest) {
  try {
    console.log('Background processing started');
    
    const body: ProcessingRequest = await request.json();
    const { jobId, city, date, categories, options } = body;

    // Validate required inputs
    if (!jobId || !city || !date) {
      console.error('Missing required parameters:', { jobId, city, date });
      return NextResponse.json(
        { error: 'Missing required parameters: jobId, city, date' },
        { status: 400 }
      );
    }

    console.log('Processing job:', { jobId, city, date, categories: categories?.length || 0 });

    // Run the background processing
    await processJobInBackground(jobId, city, date, categories, options);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Background processing route error:', error);
    return NextResponse.json(
      { error: 'Background processing failed' },
      { status: 500 }
    );
  }
}

// Background function to fetch from Perplexity with progressive updates
async function processJobInBackground(
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
    
    // Extract options with defaults
    const categoryConcurrency = options?.categoryConcurrency || 5;
    const categoryTimeoutMs = options?.categoryTimeoutMs || 45000; // 45 seconds default
    const maxAttempts = options?.maxAttempts || 5;
    
    console.log('Background job starting for:', jobId, city, date, effectiveCategories);
    console.log('Parallelization config:', { categoryConcurrency, categoryTimeoutMs, maxAttempts });

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
    let completedCategories = 0;

    // Create a worker function for processing a single category
    const processCategory = async (category: string, categoryIndex: number): Promise<void> => {
      let categoryResult = null;
      let attempts = 0;
      
      while (attempts < maxAttempts && !categoryResult) {
        attempts++;
        
        try {
          console.log(`Processing category ${categoryIndex + 1}/${effectiveCategories.length}: ${category} (attempt ${attempts}/${maxAttempts})`);
          
          // Execute query for single category with timeout
          const categoryTimeout = typeof categoryTimeoutMs === 'object' ? 
            categoryTimeoutMs[category] || 45000 : categoryTimeoutMs;
          
          const queryPromise = perplexityService.executeMultiQuery(city, date, [category], options);
          const results = await withTimeout(queryPromise, categoryTimeout);
          
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
            parsedCount: 0,
            addedCount: 0,
            totalAfter: allEvents.length
          });
          
          // If not the last attempt, wait with exponential backoff + jitter
          if (attempts < maxAttempts) {
            const baseDelay = 1000 * Math.pow(2, attempts - 1); // 1s, 2s, 4s, 8s
            const jitter = Math.random() * 1000; // 0-1s random jitter
            const delay = baseDelay + jitter;
            console.log(`Retrying category ${category} in ${Math.round(delay)}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
      
      // Process the result if we got one - wrap everything in try/catch to prevent escaping exceptions
      let parsedCount = 0;
      let addedCount = 0;
      let processedSuccessfully = false;
      
      try {
        if (categoryResult) {
          // Check if result has error (from retry failure)
          const isErrorResult = categoryResult.response.startsWith('Error after');
          
          if (!isErrorResult) {
            try {
              // Parse events from this category result
              categoryResult.events = eventAggregator.parseEventsFromResponse(categoryResult.response);
              parsedCount = categoryResult.events.length;
              
              // Aggregate new events with existing ones
              const newResults = [{ ...categoryResult, events: categoryResult.events }];
              const categoryEvents = eventAggregator.aggregateResults(newResults);
              
              // Merge with existing events and deduplicate
              const beforeCount = allEvents.length;
              const combinedEvents = [...allEvents, ...categoryEvents];
              allEvents = eventAggregator.deduplicateEvents(combinedEvents);
              
              // Categorize all events
              allEvents = eventAggregator.categorizeEvents(allEvents);
              
              addedCount = allEvents.length - beforeCount;
              
              // Update job with current results (status remains 'pending') - progressive updates
              await jobStore.updateJob(jobId, { events: allEvents });
              
              console.log(`Category ${category} complete: ${parsedCount} parsed, ${addedCount} added, ${allEvents.length} total`);
              processedSuccessfully = true;
            } catch (processingError: any) {
              console.error(`Error processing results for category ${category}:`, processingError.message);
              // Keep parsedCount from successful parsing, but reset addedCount
              addedCount = 0;
              // Update categoryResult to reflect the error
              categoryResult.response = `Processing error: ${processingError.message}`;
            }
          }
        }
        
        // Always push debug step, even for processing errors
        if (categoryResult) {
          await jobStore.pushDebugStep(jobId, {
            category,
            query: `Find ALL events happening on ${date} in ${city} of the category: ${category}. also check all venues of category ${category}. also check relevant webpages of ${category}. Also expand the query to find aditional events of category ${category}. the goal is to return a comprehensive list of all events of the category ${category} happening on ${date} in ${city}. `,
            response: categoryResult.response,
            parsedCount,
            addedCount,
            totalAfter: allEvents.length
          });
        } else {
          // All attempts failed for this category, add final debug step and continue
          console.error(`All ${maxAttempts} attempts failed for category ${category}, continuing with other categories`);
          
          await jobStore.pushDebugStep(jobId, {
            category,
            query: `Events in ${category} for ${city} on ${date}`,
            response: `Error: All ${maxAttempts} attempts failed`,
            parsedCount: 0,
            addedCount: 0,
            totalAfter: allEvents.length
          });
        }
      } catch (debugError: any) {
        // Even debug step pushing failed, but don't let this crash the worker
        console.error(`Failed to push debug step for category ${category}:`, debugError.message);
      }
      
      completedCategories++;
    };

    // Process categories in parallel with controlled concurrency
    const processingPromises: Promise<void>[] = [];
    let currentIndex = 0;

    // Create worker function that processes categories from the queue
    const worker = async (): Promise<void> => {
      while (currentIndex < effectiveCategories.length) {
        const categoryIndex = currentIndex++;
        if (categoryIndex >= effectiveCategories.length) break;
        
        const category = effectiveCategories[categoryIndex];
        await processCategory(category, categoryIndex);
      }
    };

    // Start workers (up to concurrency limit)
    for (let i = 0; i < Math.min(categoryConcurrency, effectiveCategories.length); i++) {
      processingPromises.push(worker());
    }

    // Wait for all workers to complete
    await Promise.all(processingPromises);

    console.log(`Background job complete: found ${allEvents.length} events total`);

    // Always finalize the job with status 'done', even if we have 0 events
    try {
      // Cache the final results with dynamic TTL based on event timings
      const cacheKey = InMemoryCache.createKey(city, date, effectiveCategories);
      const ttlSeconds = computeTTLSecondsForEvents(allEvents);
      eventsCache.set(cacheKey, allEvents, ttlSeconds);
      console.log(`Cached ${allEvents.length} events with TTL: ${ttlSeconds} seconds`);
    } catch (cacheError) {
      console.error('Failed to cache results, but continuing:', cacheError);
    }

    // Update job with final status - this must succeed to prevent UI timeout
    await jobStore.updateJob(jobId, {
      status: 'done',
      events: allEvents
    });

  } catch (error) {
    console.error('Background job error for:', jobId, error);
    // Ensure job is always finalized, even on error
    try {
      await jobStore.updateJob(jobId, {
        status: 'error',
        error: 'Fehler beim Verarbeiten der Anfrage'
      });
    } catch (updateError) {
      console.error('Failed to update job status to error - this may cause UI timeout:', updateError);
    }
  }
}