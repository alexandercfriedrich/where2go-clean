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

export async function POST(req: NextRequest) {
  const isBackground = req.headers.get('x-vercel-background') === '1';
  const internalSecret = process.env.INTERNAL_API_SECRET;
  const hasInternalSecret = internalSecret && req.headers.get('x-internal-secret') === internalSecret;
  const hasBypass = !!req.headers.get('x-vercel-protection-bypass');

  if (!isBackground && !hasInternalSecret && !hasBypass) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body: ProcessingRequest = await req.json();
    const { jobId, city, date, categories, options } = body;

    if (!jobId || !city || !date) {
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
  let overallTimeoutId: NodeJS.Timeout | undefined;
  
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
    
    // Extract options with defaults - increased timeouts to prevent 30s cutoff
    const categoryConcurrency = options?.categoryConcurrency || 5;
    
    // Default categoryTimeoutMs to 90s (90000ms), minimum 60s on Vercel to reduce flakiness
    const isVercel = process.env.VERCEL === '1';
    const defaultCategoryTimeout = isVercel ? Math.max(options?.categoryTimeoutMs || 90000, 60000) : (options?.categoryTimeoutMs || 90000);
    const categoryTimeoutMs = defaultCategoryTimeout;
    
    // Overall timeout defaults to 4 minutes (240000ms), configurable via env var
    const defaultOverallTimeout = parseInt(process.env.OVERALL_TIMEOUT_MS || '240000', 10);
    const overallTimeoutMs = options?.overallTimeoutMs || defaultOverallTimeout;
    
    const maxAttempts = options?.maxAttempts || 5;
    
    console.log('Background job starting for:', jobId, city, date, effectiveCategories);
    console.log('Parallelization config:', { categoryConcurrency, categoryTimeoutMs, overallTimeoutMs, maxAttempts });

    // Set up overall timeout using AbortController to prevent jobs from running indefinitely
    const overallAbortController = new AbortController();
    overallTimeoutId = setTimeout(() => {
      console.log(`Overall timeout of ${overallTimeoutMs}ms reached for job ${jobId}`);
      overallAbortController.abort();
    }, overallTimeoutMs);

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
      let results: any[] = [];
      let attempts = 0;
      
      while (attempts < maxAttempts && results.length === 0) {
        attempts++;
        
        try {
          console.log(`Processing category ${categoryIndex + 1}/${effectiveCategories.length}: ${category} (attempt ${attempts}/${maxAttempts})`);
          
          // Execute query for single category with timeout - remove 45s fallback, enforce min 60s default 90s
          const categoryTimeout = typeof categoryTimeoutMs === 'object' ? 
            Math.max(categoryTimeoutMs[category] || 90000, 60000) : categoryTimeoutMs;
          
          const queryPromise = perplexityService.executeMultiQuery(city, date, [category], options);
          results = await withTimeout(queryPromise, categoryTimeout);
          
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
      
      // Process ALL results for this category, not just the first one
      if (results.length > 0) {
        try {
          for (let subResultIndex = 0; subResultIndex < results.length; subResultIndex++) {
            const r = results[subResultIndex];
            let parsedCount = 0;
            let addedCount = 0;
            
            try {
              // Check if result has error (from retry failure)
              const isErrorResult = r.response.startsWith('Error after');
              
              if (!isErrorResult) {
                // Parse events from this sub-result
                r.events = eventAggregator.parseEventsFromResponse(r.response);
                parsedCount = r.events.length;
                
                // Aggregate new events with existing ones
                const newResults = [{ ...r, events: r.events }];
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
                
                console.log(`Category ${category} sub-result ${subResultIndex + 1}/${results.length}: ${parsedCount} parsed, ${addedCount} added, ${allEvents.length} total`);
              }
              
              // Push debug step with actual query and progressive step counter
              await jobStore.pushDebugStep(jobId, {
                category,
                query: r.query, // Use actual query instead of hardcoded string
                response: r.response,
                parsedCount,
                addedCount,
                totalAfter: allEvents.length
              });
              
            } catch (processingError: any) {
              console.error(`Error processing sub-result ${subResultIndex + 1} for category ${category}:`, processingError.message);
              
              // Push debug step for processing error
              await jobStore.pushDebugStep(jobId, {
                category,
                query: r.query || `Events in ${category} for ${city} on ${date}`,
                response: `Processing error: ${processingError.message}`,
                parsedCount: 0,
                addedCount: 0,
                totalAfter: allEvents.length
              });
            }
          }
        } catch (debugError: any) {
          // Even debug step pushing failed, but don't let this crash the worker
          console.error(`Failed to push debug step for category ${category}:`, debugError.message);
        }
      } else {
        // All attempts failed for this category, add final debug step and continue
        console.error(`All ${maxAttempts} attempts failed for category ${category}, continuing with other categories`);
        
        try {
          await jobStore.pushDebugStep(jobId, {
            category,
            query: `Events in ${category} for ${city} on ${date}`,
            response: `Error: All ${maxAttempts} attempts failed`,
            parsedCount: 0,
            addedCount: 0,
            totalAfter: allEvents.length
          });
        } catch (debugError: any) {
          console.error(`Failed to push debug step for category ${category}:`, debugError.message);
        }
      }
      
      completedCategories++;
    };

    // Process categories in parallel with controlled concurrency, respecting overall timeout
    const processingPromises: Promise<void>[] = [];
    let currentIndex = 0;

    // Create worker function that processes categories from the queue
    const worker = async (): Promise<void> => {
      while (currentIndex < effectiveCategories.length && !overallAbortController.signal.aborted) {
        const categoryIndex = currentIndex++;
        if (categoryIndex >= effectiveCategories.length) break;
        
        const category = effectiveCategories[categoryIndex];
        
        // Check if overall timeout was reached before processing each category
        if (overallAbortController.signal.aborted) {
          console.log(`Overall timeout reached, skipping category: ${category}`);
          break;
        }
        
        await processCategory(category, categoryIndex);
      }
    };

    // Start workers (up to concurrency limit)
    for (let i = 0; i < Math.min(categoryConcurrency, effectiveCategories.length); i++) {
      processingPromises.push(worker());
    }

    try {
      // Wait for all workers to complete or overall timeout
      await Promise.race([
        Promise.all(processingPromises),
        new Promise<void>((_, reject) => {
          overallAbortController.signal.addEventListener('abort', () => {
            reject(new Error(`Overall timeout of ${overallTimeoutMs}ms exceeded`));
          });
        })
      ]);
      
      console.log(`Background job complete: found ${allEvents.length} events total`);
    } catch (timeoutError: any) {
      if (timeoutError.message.includes('Overall timeout')) {
        console.log(`Job ${jobId} stopped due to overall timeout of ${overallTimeoutMs}ms. Found ${allEvents.length} events so far.`);
        // Continue to finalization with partial results
      } else {
        throw timeoutError; // Re-throw other errors
      }
    } finally {
      // Clean up overall timeout
      clearTimeout(overallTimeoutId);
    }

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
    
    // Clean up overall timeout in case of error
    try {
      if (overallTimeoutId) {
        clearTimeout(overallTimeoutId);
      }
    } catch {
      // Ignore cleanup errors
    }
    
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
