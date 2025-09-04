import { NextRequest, NextResponse } from 'next/server';
import { EventData } from '@/lib/types';
import { eventsCache } from '@/lib/cache';
import InMemoryCache from '@/lib/cache';
import { createPerplexityService } from '@/lib/perplexity';
import { eventAggregator } from '@/lib/aggregator';
import { computeTTLSecondsForEvents } from '@/lib/cacheTtl';
import { getJobStore } from '@/lib/jobStore';
import { getSubcategoriesForMainCategory } from '@/categories';

// Serverless configuration for background processing
export const runtime = 'nodejs';
export const maxDuration = 300;

// Default categories used when request.categories is empty/missing
// Use only main category names that match CATEGORY_MAP keys
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

  console.log('Background processing endpoint called with headers:', {
    'x-vercel-background': req.headers.get('x-vercel-background'),
    'x-internal-secret': hasInternalSecret ? 'SET' : 'NOT_SET',
    'x-vercel-protection-bypass': hasBypass ? 'SET' : 'NOT_SET',
    host: req.headers.get('host'),
    userAgent: req.headers.get('user-agent')
  });

  if (!isBackground && !hasInternalSecret && !hasBypass) {
    console.error('❌ Background processing endpoint: Unauthorized request');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body: ProcessingRequest = await req.json();
    const { jobId, city, date, categories, options } = body;

    if (!jobId || !city || !date) {
      console.error('❌ Background processing endpoint: Missing required parameters');
      return NextResponse.json(
        { error: 'Missing required parameters: jobId, city, date' },
        { status: 400 }
      );
    }

    console.log('✅ Background processing endpoint: Valid request received');
    console.log('Processing job:', { jobId, city, date, categories: categories?.length || 0 });

    // Start background processing asynchronously - DO NOT AWAIT
    // This allows the HTTP response to return immediately while processing continues
    
    // Set up a deadman's switch to automatically fail jobs that take too long
    // Set to 5 minutes for reasonable timeout protection
    const deadmanTimeout = setTimeout(async () => {
      console.error(`🚨 DEADMAN SWITCH: Job ${jobId} has been running for more than 5 minutes, marking as failed`);
      try {
        await jobStore.updateJob(jobId, {
          status: 'error',
          error: 'Processing timed out - job took longer than expected (5 min limit)',
          lastUpdateAt: new Date().toISOString()
        });
        console.log(`✅ Deadman switch successfully marked job ${jobId} as error`);
      } catch (updateError) {
        console.error('❌ CRITICAL: Deadman switch failed to update job status:', updateError);
      }
    }, 5 * 60 * 1000); // 5 minutes - reasonable timeout
    
    // Add safety net - check job status periodically
    const initialTimeout = setTimeout(async () => {
      console.warn(`⚠️ SAFETY NET: Job ${jobId} has been running for 3 minutes, checking status...`);
      try {
        const currentJob = await jobStore.getJob(jobId);
        if (currentJob && currentJob.status === 'pending') {
          console.warn(`⚠️ Job ${jobId} still pending after 3 minutes - ensuring progress is being made`);
          await jobStore.updateJob(jobId, {
            lastUpdateAt: new Date().toISOString()
          });
        }
      } catch (checkError) {
        console.error('Failed to check job status in safety net:', checkError);
      }
    }, 3 * 60 * 1000); // 3 minutes
    
    processJobInBackground(jobId, city, date, categories, options)
      .then(() => {
        // Job completed successfully
        clearTimeout(deadmanTimeout);
        clearTimeout(initialTimeout);
        console.log(`✅ Background processing completed successfully for job: ${jobId}`);
      })
      .catch(error => {
        // Job failed with error
        clearTimeout(deadmanTimeout);
        clearTimeout(initialTimeout);
        console.error('❌ Async background processing error for job', jobId, ':', error);
        
        // Update job status to error to prevent infinite polling
        jobStore.updateJob(jobId, {
          status: 'error',
          error: 'Background processing failed: ' + (error instanceof Error ? error.message : String(error)),
          lastUpdateAt: new Date().toISOString()
        }).catch(updateError => {
          console.error('❌ CRITICAL: Failed to update job status after background error:', updateError);
          
          // Try a minimal fallback update
          jobStore.updateJob(jobId, { status: 'error' }).catch(fallbackError => {
            console.error('❌ CATASTROPHIC: Even minimal error update failed:', fallbackError);
          });
        });
      });

    console.log('Background processing started successfully for job:', jobId);
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
  let heartbeatInterval: NodeJS.Timeout | undefined;
  let lastHeartbeat = Date.now();
  
  const updateHeartbeat = () => {
    lastHeartbeat = Date.now();
  };
  
  try {
    const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
    if (!PERPLEXITY_API_KEY) {
      console.error('❌ PERPLEXITY_API_KEY environment variable is not set');
      await jobStore.updateJob(jobId, {
        status: 'error',
        error: 'Perplexity API Key ist nicht konfiguriert. Bitte setze PERPLEXITY_API_KEY in der .env.local Datei.',
        lastUpdateAt: new Date().toISOString()
      });
      return;
    }

    // CRITICAL: Update job status immediately to show processing has started
    console.log(`🚀 Background processing starting for job ${jobId}...`);
    updateHeartbeat();
    await jobStore.updateJob(jobId, {
      status: 'pending', // Keep pending but update lastUpdateAt to show activity
      progress: { 
        completedCategories: 0, 
        totalCategories: categories?.length || 0 
      },
      lastUpdateAt: new Date().toISOString()
    });
    console.log(`✅ Job ${jobId} status updated - processing started`);

    // Set up heartbeat to detect stuck processes
    heartbeatInterval = setInterval(() => {
      const now = Date.now();
      const timeSinceLastBeat = now - lastHeartbeat;
      console.log(`💓 Job ${jobId} heartbeat: ${Math.round(timeSinceLastBeat/1000)}s since last activity`);
      
      // If more than 2 minutes without heartbeat update, something is stuck
      if (timeSinceLastBeat > 120000) {
        console.error(`🚨 Job ${jobId} heartbeat timeout! No activity for ${Math.round(timeSinceLastBeat/1000)}s`);
        jobStore.updateJob(jobId, {
          status: 'error',
          error: 'Job wurde aufgrund von Inaktivität abgebrochen (2min Heartbeat-Timeout)',
          lastUpdateAt: new Date().toISOString()
        }).catch(console.error);
      }
    }, 30000); // Check every 30 seconds

    // Simplified connectivity test with aggressive timeout
    console.log('Testing Perplexity API connectivity...');
    updateHeartbeat();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const testResponse = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'sonar',
          messages: [{ role: 'user', content: 'Test' }],
          max_tokens: 1
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      updateHeartbeat();
      
      if (!testResponse.ok && testResponse.status === 401) {
        console.error('❌ Perplexity API Key is invalid');
        await jobStore.updateJob(jobId, {
          status: 'error',
          error: 'Perplexity API Key ist ungültig. Bitte überprüfe PERPLEXITY_API_KEY.'
        });
        return;
      }
      console.log('✅ Perplexity API connectivity test passed');
    } catch (connectivityError: any) {
      updateHeartbeat();
      console.error('❌ Perplexity API connectivity test failed:', connectivityError.message);
      // Fail fast if API is not reachable
      await jobStore.updateJob(jobId, {
        status: 'error',
        error: 'Perplexity API ist nicht erreichbar. Bitte versuche es später erneut.'
      });
      return;
    }

    // Default to DEFAULT_CATEGORIES when categories is missing or empty
    const effectiveCategories = categories && categories.length > 0 ? categories : DEFAULT_CATEGORIES;
    
    // REASONABLE TIMEOUTS to prevent infinite loops but allow proper processing
    const categoryConcurrency = Math.min(options?.categoryConcurrency || 3, 3); // Reasonable concurrency
    const categoryTimeoutMs = 60000; // 60 seconds max per category (increased from 30s)
    const overallTimeoutMs = 300000; // 5 minutes total max (back to reasonable timeout)
    
    const maxAttempts = Math.min(options?.maxAttempts || 2, 2); // Reduced attempts to fail fast
    
    console.log('Background job starting for:', jobId, city, date, effectiveCategories.length, 'categories');
    console.log('Reasonable config:', { categoryConcurrency, categoryTimeoutMs, overallTimeoutMs, maxAttempts });

    // Immediate progress update to prevent early timeouts
    updateHeartbeat();
    await jobStore.updateJob(jobId, {
      progress: { 
        completedCategories: 0, 
        totalCategories: effectiveCategories.length 
      },
      lastUpdateAt: new Date().toISOString()
    });

    // Set up overall timeout - much more aggressive
    const overallAbortController = new AbortController();
    overallTimeoutId = setTimeout(() => {
      console.log(`🚨 OVERALL TIMEOUT: Job ${jobId} exceeded ${overallTimeoutMs}ms limit`);
      overallAbortController.abort();
      jobStore.updateJob(jobId, {
        status: 'error',
        error: `Verarbeitung abgebrochen - Zeitlimit von ${overallTimeoutMs/1000}s überschritten`,
        lastUpdateAt: new Date().toISOString()
      }).catch(console.error);
    }, overallTimeoutMs);

    const perplexityService = createPerplexityService(PERPLEXITY_API_KEY);
    if (!perplexityService) {
      await jobStore.updateJob(jobId, {
        status: 'error',
        error: 'Failed to create Perplexity service'
      });
      return;
    }

    updateHeartbeat();
    const job = await jobStore.getJob(jobId);
    if (!job) {
      console.error(`❌ Job ${jobId} not found during processing`);
      return;
    }

    let allEvents: EventData[] = [];
    let completedCategories = 0;

    // Simplified category processing function
    const processCategory = async (category: string, categoryIndex: number): Promise<void> => {
      let attempts = 0;
      let results: Array<{ query: string; response: string; events: EventData[]; timestamp: number; }> | null = null;
      updateHeartbeat();
      
      while (attempts < maxAttempts && !results) {
        attempts++;
        updateHeartbeat();
        
        try {
          console.log(`Processing category ${categoryIndex + 1}/${effectiveCategories.length}: ${category} (attempt ${attempts}/${maxAttempts})`);
          
          // Simple timeout for this category
          const categoryController = new AbortController();
          const categoryTimeoutId = setTimeout(() => {
            console.log(`⏰ Category ${category} timeout after ${categoryTimeoutMs}ms`);
            categoryController.abort();
          }, categoryTimeoutMs);

          try {
            const queryPromise = perplexityService.executeMultiQuery(city, date, [category], options);
            const res = await Promise.race([
              queryPromise,
              new Promise<never>((_, reject) => {
                categoryController.signal.addEventListener('abort', () => {
                  reject(new Error(`Category ${category} timeout after ${categoryTimeoutMs}ms`));
                });
              })
            ]);
            
            clearTimeout(categoryTimeoutId);
            updateHeartbeat();
            
            if (res && res.length > 0) {
              results = res;
              console.log(`✅ Category ${category} completed with ${res.length} results`);
            } else {
              console.log(`⚠️ Category ${category} returned no results`);
              results = []; // Set empty results to break the retry loop
            }
          } catch (timeoutError: any) {
            clearTimeout(categoryTimeoutId);
            updateHeartbeat();
            
            if (timeoutError.message.includes('timeout')) {
              console.error(`⏰ Category ${category} timed out after ${categoryTimeoutMs}ms`);
              throw new Error(`Category timeout after ${categoryTimeoutMs}ms`);
            } else {
              console.error(`❌ Category ${category} API error:`, timeoutError.message);
              throw timeoutError;
            }
          }
          
        } catch (categoryError: any) {
          updateHeartbeat();
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
          
          // If not the last attempt, wait briefly
          if (attempts < maxAttempts) {
            const delay = 1000; // 1 second delay between retries
            console.log(`Retrying category ${category} in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            updateHeartbeat();
          }
        }
      }
      
      // Process results if we got some
      if (results && results.length > 0) {
        updateHeartbeat();
        for (const r of results) {
          try {
            // Parse events from this result
            r.events = eventAggregator.parseEventsFromResponse(r.response);
            const parsedCount = r.events.length;
            
            // Get current job state and merge events
            const currentJob = await jobStore.getJob(jobId);
            const currentEvents = currentJob?.events || [];
            
            // Merge and deduplicate
            const combinedEvents = [...currentEvents, ...r.events];
            const deduplicatedEvents = eventAggregator.deduplicateEvents(combinedEvents);
            const finalEvents = eventAggregator.categorizeEvents(deduplicatedEvents);
            
            const addedCount = finalEvents.length - currentEvents.length;
            allEvents = finalEvents;
            updateHeartbeat();
            
            // Update job with new events
            await jobStore.updateJob(jobId, { 
              events: finalEvents,
              progress: { 
                completedCategories, 
                totalCategories: effectiveCategories.length 
              },
              lastUpdateAt: new Date().toISOString()
            });
            
            console.log(`Progressive update: ${finalEvents.length} total events for category ${category}, parsed: ${parsedCount}, added: ${addedCount}`);
            
            // Cache events and push debug step
            try {
              const ttlSeconds = computeTTLSecondsForEvents(r.events);
              eventsCache.setEventsByCategory(city, date, category, r.events, ttlSeconds);
              
              // Cache under subcategories if this is a main category
              const subcategories = getSubcategoriesForMainCategory(category);
              for (const subcategory of subcategories) {
                eventsCache.setEventsByCategory(city, date, subcategory, r.events, ttlSeconds);
              }
            } catch (cacheError) {
              console.error(`Failed to cache category '${category}':`, cacheError);
            }
            
            await jobStore.pushDebugStep(jobId, {
              category,
              query: r.query,
              response: r.response,
              parsedCount,
              addedCount,
              totalAfter: finalEvents.length
            });
            
          } catch (processingError: any) {
            updateHeartbeat();
            console.error(`Error processing result for category ${category}:`, processingError.message);
          }
        }
      } else {
        // No results after all attempts
        await jobStore.pushDebugStep(jobId, {
          category,
          query: `Events in ${category} for ${city} on ${date}`,
          response: `No results returned after ${attempts} attempts`,
          parsedCount: 0,
          addedCount: 0,
          totalAfter: allEvents.length
        });
      }
    };

    // Simplified processing - process categories sequentially to avoid complexity
    console.log(`Starting sequential processing of ${effectiveCategories.length} categories...`);
    
    for (let categoryIndex = 0; categoryIndex < effectiveCategories.length; categoryIndex++) {
      if (overallAbortController.signal.aborted) {
        console.log('Overall timeout reached, stopping category processing');
        break;
      }
      
      const category = effectiveCategories[categoryIndex];
      console.log(`Processing category ${categoryIndex + 1}/${effectiveCategories.length}: ${category}`);
      updateHeartbeat();
      
      try {
        await processCategory(category, categoryIndex);
        completedCategories++;
        updateHeartbeat();
        
        // Update progress after each category
        await jobStore.updateJob(jobId, {
          progress: { 
            completedCategories, 
            totalCategories: effectiveCategories.length 
          },
          lastUpdateAt: new Date().toISOString()
        });
        
        console.log(`✅ Completed category ${category}. Progress: ${completedCategories}/${effectiveCategories.length}`);
      } catch (categoryError: any) {
        console.error(`❌ Failed to process category ${category}:`, categoryError.message);
        updateHeartbeat();
        
        // Continue with next category even if one fails
        await jobStore.pushDebugStep(jobId, {
          category,
          query: `Events in ${category} for ${city} on ${date}`,
          response: `Error: ${categoryError.message}`,
          parsedCount: 0,
          addedCount: 0,
          totalAfter: allEvents.length
        });
      }
    }

    // Get final events from JobStore
    updateHeartbeat();
    const finalJob = await jobStore.getJob(jobId);
    const finalEvents = finalJob?.events || allEvents || [];
    console.log(`Sequential processing complete: found ${finalEvents.length} events total`);

    // CRITICAL: Always finalize the job with status 'done'
    console.log(`Updating job ${jobId} to 'done' status...`);
    updateHeartbeat();
    try {
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
      console.error(`❌ CRITICAL: Failed to update job ${jobId} to 'done' status:`, finalUpdateError);
      
      // Try a minimal fallback update
      try {
        await jobStore.updateJob(jobId, {
          status: 'done',
          lastUpdateAt: new Date().toISOString(),
          message: 'Processing completed'
        });
        console.log(`✅ Job ${jobId} marked as 'done' via fallback update`);
      } catch (fallbackError) {
        console.error(`❌ CRITICAL: Even fallback update failed for job ${jobId}:`, fallbackError);
        throw fallbackError;
      }
    }

  } catch (error) {
    console.error('❌ Background job error for:', jobId, error);
    updateHeartbeat();
    
    // Ensure job is always finalized, even on error
    console.log(`Attempting to mark job ${jobId} as 'error' status...`);
    try {
      await jobStore.updateJob(jobId, {
        status: 'error',
        error: 'Fehler beim Verarbeiten der Anfrage',
        lastUpdateAt: new Date().toISOString()
      });
      console.log(`✅ Job ${jobId} successfully marked as 'error'`);
    } catch (updateError) {
      console.error(`❌ CRITICAL: Failed to update job ${jobId} status to error:`, updateError);
      
      // Try minimal update
      try {
        await jobStore.updateJob(jobId, { status: 'error' });
        console.log(`✅ Job ${jobId} marked as 'error' via minimal update`);
      } catch (finalError) {
        console.error(`❌ CATASTROPHIC: Cannot update job ${jobId} status:`, finalError);
      }
    }
  } finally {
    // Clean up all timeouts and intervals
    if (overallTimeoutId) {
      clearTimeout(overallTimeoutId);
      console.log(`Cleared overall timeout for job ${jobId}`);
    }
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      console.log(`Cleared heartbeat for job ${jobId}`);
    }
  }
}
