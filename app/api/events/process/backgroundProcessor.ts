import { EventData } from '@/lib/types';
import { eventsCache } from '@/lib/cache';
import { createPerplexityService } from '@/lib/perplexity';
import { eventAggregator } from '@/lib/aggregator';
import { computeTTLSecondsForEvents } from '@/lib/cacheTtl';
import { getJobStore } from '@/lib/jobStore';
import { getSubcategoriesForMainCategory } from '@/categories';

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
  'Natur/Outdoor',
  'Kultur/Traditionen',
  'Märkte/Shopping',
  'Bildung/Lernen',
  'Soziales/Community'
];

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

// Background function to fetch from Perplexity with progressive updates
export async function processJobInBackground(
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
      console.error('❌ PERPLEXITY_API_KEY environment variable is not set');
      await jobStore.updateJob(jobId, {
        status: 'error',
        error: 'Perplexity API Key ist nicht konfiguriert. Bitte setze PERPLEXITY_API_KEY in der .env.local Datei.'
      });
      return;
    }

    // Default to DEFAULT_CATEGORIES when categories is missing or empty
    const effectiveCategories = categories && categories.length > 0 ? categories : DEFAULT_CATEGORIES;
    
    // Extract options with defaults - increased timeouts to prevent premature cutoff
    const categoryConcurrency = options?.categoryConcurrency || 5; // Restore original concurrency for performance
    
    // Default categoryTimeoutMs to 90s (90000ms), enforce minimum 60s (esp. on Vercel)
    const isVercel = process.env.VERCEL === '1';
    const requestedCategoryTimeout =
      typeof options?.categoryTimeoutMs === 'number' ? options.categoryTimeoutMs : 90000;
    const defaultCategoryTimeout = isVercel
      ? Math.max(requestedCategoryTimeout, 60000)
      : requestedCategoryTimeout;
    const categoryTimeoutMs = defaultCategoryTimeout;
    
    // Overall timeout defaults to 3 minutes (180000ms) - well under Vercel's 5-minute limit
    const defaultOverallTimeout = parseInt(process.env.OVERALL_TIMEOUT_MS || '180000', 10);
    const overallTimeoutMs = options?.overallTimeoutMs || defaultOverallTimeout;
    
    const maxAttempts = options?.maxAttempts || 5;
    
    console.log('Background job starting for:', jobId, city, date, effectiveCategories);
    console.log('Parallelization config:', { categoryConcurrency, categoryTimeoutMs, overallTimeoutMs, maxAttempts });

    // Add additional logging to track worker progress
    let progressCheckInterval: NodeJS.Timeout | undefined;
    let lastProgressUpdate = Date.now();
    
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
    if (!job) {
      // CRITICAL: Job not found - this means the job was lost between instances
      // In serverless environments, this indicates a serious issue
      console.error(`🚨 FATAL: Job ${jobId} not found in JobStore during background processing`);
      console.error('This likely indicates a Redis connectivity issue or job store misconfiguration in serverless environment');
      
      // Try to create a minimal error job entry so the client can see the error
      try {
        const errorJob: JobStatus = {
          id: jobId,
          status: 'error',
          createdAt: new Date(),
          error: 'Job nicht gefunden - möglicherweise ein Konfigurationsproblem',
          lastUpdateAt: new Date().toISOString()
        };
        await jobStore.setJob(jobId, errorJob);
        console.log(`Created error job entry for missing job ${jobId}`);
      } catch (setError) {
        console.error(`Failed to create error job entry for ${jobId}:`, setError);
        // If we can't even set an error job, there's a fundamental Redis issue
      }
      return;
    }

    let allEvents: EventData[] = [];
    let completedCategories = 0;

    // Process categories in parallel with controlled concurrency, respecting overall timeout
    const processingPromises: Promise<void>[] = [];
    let currentIndex = 0;

    // Create worker function that processes categories from the queue
    const worker = async (): Promise<void> => {
      try {
        while (currentIndex < effectiveCategories.length && !overallAbortController.signal.aborted) {
          const categoryIndex = currentIndex++;
          if (categoryIndex >= effectiveCategories.length) break;
          
          const category = effectiveCategories[categoryIndex];
          
          // Check if overall timeout was reached before processing each category
          if (overallAbortController.signal.aborted) {
            console.log(`Overall timeout reached, skipping category: ${category}`);
            break;
          }
          
          console.log(`Worker starting category ${categoryIndex + 1}/${effectiveCategories.length}: ${category}`);
          
          try {
            await processCategory(category, categoryIndex);
            console.log(`Worker completed category ${categoryIndex + 1}/${effectiveCategories.length}: ${category}`);
          } catch (categoryError: any) {
            console.error(`Worker failed to process category ${category}:`, categoryError);
            // Continue processing other categories even if one fails
          }
        }
      } catch (workerError) {
        console.error(`Worker encountered fatal error:`, workerError);
        throw workerError;
      }
    };

    // Create a worker function for processing a single category
    const processCategory = async (category: string, categoryIndex: number): Promise<void> => {
      let attempts = 0;
      let results: Array<{ query: string; response: string; events: EventData[]; timestamp: number; }> | null = null;
      
      while (attempts < maxAttempts && !results) {
        attempts++;
        
        try {
          console.log(`Processing category ${categoryIndex + 1}/${effectiveCategories.length}: ${category} (attempt ${attempts}/${maxAttempts})`);
          
          // Execute query for single category with robust timeout
          const perCategoryTimeout = (() => {
            if (typeof categoryTimeoutMs === 'object' && categoryTimeoutMs !== null) {
              const categoryTimeout = categoryTimeoutMs[category];
              return Math.max(typeof categoryTimeout === 'number' ? categoryTimeout : 90000, 60000);
            }
            if (typeof categoryTimeoutMs === 'number') return Math.max(categoryTimeoutMs, 60000);
            return 90000;
          })();
          
          console.log(`Category ${category}: using timeout ${perCategoryTimeout}ms`);

          try {
            const queryPromise = perplexityService.executeMultiQuery(city, date, [category], options);
            const res = await withTimeout(queryPromise, perCategoryTimeout);
            
            if (res && res.length > 0) {
              results = res;
              console.log(`✅ Category ${category} completed successfully with ${res.length} results`);
            } else {
              console.log(`⚠️ Category ${category} returned no results`);
            }
          } catch (timeoutError: any) {
            if (timeoutError.message.includes('timed out')) {
              console.error(`⏰ Category ${category} timed out after ${perCategoryTimeout}ms`);
              throw new Error(`Category timeout after ${perCategoryTimeout}ms`);
            } else {
              console.error(`❌ Category ${category} API error:`, timeoutError.message);
              throw timeoutError;
            }
          }
          
        } catch (categoryError: any) {
          console.error(`Category ${category} attempt ${attempts}/${maxAttempts} failed:`, categoryError.message);
          
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
      
      // Process all sub-results if we got some - wrap in try/catch to prevent escaping exceptions
      try {
        if (results && results.length > 0) {
          for (let i = 0; i < results.length; i++) {
            const r = results[i];
            try {
              // Parse events from this sub-result
              r.events = eventAggregator.parseEventsFromResponse(r.response);
              const parsedCount = r.events.length;
              
              // Aggregate new events from this sub-result
              const newResults = [{ ...r, events: r.events }];
              const categoryEvents = eventAggregator.aggregateResults(newResults);
              
              // Get current job state to ensure we have the latest events
              const currentJob = await jobStore.getJob(jobId);
              const currentEvents = currentJob?.events || [];
              
              // Merge with current events and deduplicate properly
              const beforeCount = currentEvents.length;
              const combinedEvents = [...currentEvents, ...categoryEvents];
              const deduplicatedEvents = eventAggregator.deduplicateEvents(combinedEvents);
              
              // Categorize all events
              const finalEvents = eventAggregator.categorizeEvents(deduplicatedEvents);
              
              const addedCount = finalEvents.length - beforeCount;
              
              // Update local tracking variable for this worker
              allEvents = finalEvents;
              
              // Cache this category's events immediately for future requests
              // IMPORTANT: For main categories, cache under all subcategories too
              try {
                const ttlSeconds = computeTTLSecondsForEvents(categoryEvents);
                
                // Always cache under the processed category (whether main or sub)
                eventsCache.setEventsByCategory(city, date, category, categoryEvents, ttlSeconds);
                console.log(`Cached ${categoryEvents.length} events for category '${category}' with TTL: ${ttlSeconds} seconds`);
                
                // If this is a main category, also cache under all its subcategories
                // This implements the problem statement: AI calls for main categories, cache for subcategories
                const subcategories = getSubcategoriesForMainCategory(category);
                if (subcategories.length > 0) {
                  console.log(`Main category '${category}' detected. Caching events under ${subcategories.length} subcategories.`);
                  for (const subcategory of subcategories) {
                    try {
                      eventsCache.setEventsByCategory(city, date, subcategory, categoryEvents, ttlSeconds);
                      console.log(`  → Cached under subcategory: '${subcategory}'`);
                    } catch (subCacheError) {
                      console.error(`Failed to cache under subcategory '${subcategory}':`, subCacheError);
                    }
                  }
                }
              } catch (cacheError) {
                console.error(`Failed to cache category '${category}':`, cacheError);
                // Continue processing even if caching fails
              }
              
              // Progressive update with the latest merged events
              await jobStore.updateJob(jobId, { 
                events: finalEvents,
                progress: { 
                  completedCategories, 
                  totalCategories: effectiveCategories.length 
                },
                lastUpdateAt: new Date().toISOString()
              });
              console.log(`Progressive update: ${finalEvents.length} total events committed for category ${category} (step ${i + 1}/${results.length}), progress: ${completedCategories}/${effectiveCategories.length} categories, parsed: ${parsedCount}, added: ${addedCount}`);
              
            } catch (processingError: any) {
              console.error(`Error processing sub-result ${i + 1}/${results.length} for category ${category}:`, processingError.message);
            }
          }
        } else {
          // No results returned after all attempts
          console.log(`No results returned for category ${category} after ${maxAttempts} attempts`);
        }
      } catch (outerProcessingError: any) {
        console.error(`Error processing results array for category ${category}:`, outerProcessingError.message);
      }

      completedCategories++;
      lastProgressUpdate = Date.now(); // Update progress timestamp
      console.log(`✅ Completed category ${category}. Progress: ${completedCategories}/${effectiveCategories.length} categories`);
    };

    // Start workers (up to concurrency limit)
    const workerCount = Math.min(categoryConcurrency, effectiveCategories.length);
    console.log(`Starting ${workerCount} parallel workers for ${effectiveCategories.length} categories`);
    for (let i = 0; i < workerCount; i++) {
      processingPromises.push(
        worker().catch(workerError => {
          console.error(`Worker ${i + 1} failed:`, workerError);
          // Don't re-throw here, let Promise.all handle it
          throw workerError;
        })
      );
    }

    try {
      // Wait for all workers to complete or overall timeout
      console.log(`Waiting for ${workerCount} workers to process ${effectiveCategories.length} categories...`);
      
      await Promise.race([
        Promise.all(processingPromises).then(() => {
          console.log(`All ${workerCount} workers completed successfully`);
        }),
        new Promise<void>((_, reject) => {
          overallAbortController.signal.addEventListener('abort', () => {
            console.log(`Overall timeout of ${overallTimeoutMs}ms triggered, aborting workers`);
            reject(new Error(`Overall timeout of ${overallTimeoutMs}ms exceeded`));
          });
        })
      ]);
      
      // Get final events count from JobStore for accurate logging
      const finalJob = await jobStore.getJob(jobId);
      const finalEventCount = finalJob?.events?.length || 0;
      console.log(`Background job complete: found ${finalEventCount} events total`);
    } catch (timeoutError: any) {
      if (timeoutError.message.includes('Overall timeout')) {
        // Get current events count from JobStore
        const currentJob = await jobStore.getJob(jobId);
        const currentEventCount = currentJob?.events?.length || 0;
        console.log(`Job ${jobId} stopped due to overall timeout of ${overallTimeoutMs}ms. Found ${currentEventCount} events so far.`);
        // Continue to finalization with partial results
      } else {
        console.error(`Job ${jobId} failed due to worker error:`, timeoutError);
        throw timeoutError; // Re-throw other errors
      }
    } finally {
      // Clean up overall timeout
      if (overallTimeoutId) {
        clearTimeout(overallTimeoutId);
        console.log(`Cleared overall timeout for job ${jobId}`);
      }
      
      // Clean up progress monitoring
      if (progressCheckInterval) {
        clearInterval(progressCheckInterval);
        console.log(`Cleared progress monitoring for job ${jobId}`);
      }
    }

    // Always finalize the job with status 'done', even if we have 0 events
    try {
      // Get the final events from the JobStore (they may have been updated by workers)
      const finalJob = await jobStore.getJob(jobId);
      const finalEvents = finalJob?.events || allEvents || [];
      
      // Note: Per-category caching is now done immediately during processing
      // No need for combined caching here as individual categories are already cached
      console.log(`Job finalized with ${finalEvents.length} total events (per-category caching completed during processing)`);
    } catch (cacheError) {
      console.error('Failed to finalize job, but continuing:', cacheError);
    }

    // Update job with final status - this must succeed to prevent UI timeout
    // Get current events from JobStore to ensure we don't overwrite progressive updates
    console.log(`Updating job ${jobId} to 'done' status...`);
    try {
      const finalJob = await jobStore.getJob(jobId);
      const finalEvents = finalJob?.events || [];
      
      await jobStore.updateJob(jobId, {
        status: 'done',
        events: finalEvents,
        cacheInfo: {
          fromCache: false,
          totalEvents: finalEvents.length,
          cachedEvents: 0
        },
        progress: { 
          completedCategories: effectiveCategories.length, 
          totalCategories: effectiveCategories.length 
        },
        lastUpdateAt: new Date().toISOString(),
        message: `${finalEvents.length} Events gefunden`
      });
      
      console.log(`✅ Job ${jobId} successfully marked as 'done' with ${finalEvents.length} events`);
    } catch (finalUpdateError) {
      console.error(`❌ CRITICAL: Failed to update job ${jobId} to 'done' status - this will cause infinite polling:`, finalUpdateError);
      
      // Try a simpler update as fallback
      try {
        await jobStore.updateJob(jobId, {
          status: 'done',
          lastUpdateAt: new Date().toISOString(),
          message: 'Processing completed (status update had issues)'
        });
        console.log(`✅ Job ${jobId} marked as 'done' via fallback update`);
      } catch (fallbackError) {
        console.error(`❌ CRITICAL: Even fallback update failed for job ${jobId}:`, fallbackError);
        throw fallbackError; // This will trigger the outer catch block
      }
    }

  } catch (error) {
    console.error('❌ Background job error for:', jobId, error);
    
    // Clean up overall timeout in case of error
    try {
      if (overallTimeoutId) {
        clearTimeout(overallTimeoutId);
        console.log(`Cleared timeout after error for job ${jobId}`);
      }
    } catch {
      // Ignore cleanup errors
    }
    
    // Ensure job is always finalized, even on error - this is CRITICAL to prevent infinite polling
    console.log(`Attempting to mark job ${jobId} as 'error' status...`);
    try {
      await jobStore.updateJob(jobId, {
        status: 'error',
        error: 'Fehler beim Verarbeiten der Anfrage',
        lastUpdateAt: new Date().toISOString()
      });
      console.log(`✅ Job ${jobId} successfully marked as 'error'`);
    } catch (updateError) {
      console.error(`❌ CRITICAL: Failed to update job ${jobId} status to error - this WILL cause infinite polling:`, updateError);
      
      // This is critical - try one more time with minimal data
      try {
        await jobStore.updateJob(jobId, {
          status: 'error'
        });
        console.log(`✅ Job ${jobId} marked as 'error' via minimal update`);
      } catch (finalError) {
        console.error(`❌ CATASTROPHIC: Cannot update job ${jobId} status - user will experience infinite polling:`, finalError);
        // At this point, we can't do anything more
      }
    }
  }
}