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
const DEFAULT_CATEGORIES = [
 
'DJ Sets/Electronic: DJ Sets/Electronic, Techno/House/EDM, Drum & Bass, Trance/Progressive, Ambient/Downtempo, Experimental Electronic, Disco/Nu-Disco, Minimal/Deep House, Hardstyle/Hardcore, Breakbeat/Breaks, Dubstep/Bass Music, Industrial/EBM, Synthwave/Retro, Acid/Acid House, Psytrance/Goa, Future Bass, Garage/UK Garage',

'Clubs/Discos: Clubs/Discos, Nightclubs, Dance Clubs, Underground Venues, Rooftop Parties, Beach Clubs, After-Hours, Club Nights, Party Events, Rave Culture, Social Dancing, Singles Events, VIP Events, Themed Parties, Cocktail Lounges',

'Live-Konzerte: Live-Konzerte, Klassische Musik/Classical, Rock/Pop/Alternative, Jazz/Blues, Folk/Singer-Songwriter, Hip-Hop/Rap, Metal/Hardcore, Indie/Alternative, World Music, Country/Americana, R&B/Soul, Experimental/Avant-garde, Chamber Music, Orchestra/Symphony, Band Performances, Solo Artists, Album Release Shows, Tribute Bands, Open Mic Nights, Acoustic Sessions, Choral Music, New Age/Ambient',

'Open Air: Open Air, Music Festivals, Outdoor Concerts, Beach Events, Park Gatherings, Rooftop Events, Garden Parties, Street Festivals, Market Events, Outdoor Cinema, Picnic Events, Nature Events, Camping/Glamping Events, Adventure Tours, Food Truck Festivals, Craft Fairs (Outdoor), Sports Festivals',

'Museen: Museen, Kunstgalerien/Art Galleries, Ausstellungen/Exhibitions, Kulturelle Institutionen, Historische Stätten, Architektur Tours, Science Museums, Interactive Exhibitions, Private Collections, Art Fairs, Museum Nights, Educational Tours, Virtual Reality Experiences, Photography Exhibitions, Natural History, Technology Museums, Local History',

'LGBTQ+: LGBTQ+, Pride Events, Queer Parties, Drag Shows, LGBTQ+ Clubs, Community Events, Support Groups, Diversity Celebrations, Inclusive Events, Rainbow Events, Trans Events, Lesbian Events, Gay Events, Bisexual Events, Non-binary Events, Coming Out Support, LGBTQ+ Film Screenings',

'Comedy/Kabarett: Comedy/Kabarett, Stand-up Comedy, Improvisational Theater, Satirical Shows, Variety Shows, Comedy Clubs, Humor Events, Roast Shows, Open Mic Comedy, Political Satire, Musical Comedy, Sketch Shows, Comedy Festivals, Story Slam, Comedy Workshops',

'Theater/Performance: Theater/Performance, Drama/Schauspiel, Musicals, Opera/Operette, Ballet/Dance, Contemporary Dance, Performance Art, Experimental Theater, Children Theater, Street Performance, Mime/Physical Theater, Puppet Theater, Immersive Theater, Site-specific Performance, Cabaret Shows, Burlesque, Circus Arts, Storytelling, Poetry Slams, Spoken Word',

'Film: Film, Cinema/Movie Screenings, Film Festivals, Documentary Screenings, Independent Films, Foreign Films, Classic Cinema, Outdoor Cinema, Silent Films, Animation/Animated Films, Short Films, Film Premieres, Director Q&As, Film Discussions, Video Art, Experimental Film, Horror Film Nights, Cult Cinema',

'Food/Culinary: Food/Culinary, Wine Tasting, Beer Events/Beer Festivals, Cooking Classes, Food Markets, Restaurant Events, Culinary Festivals, Food Tours, Pop-up Restaurants, Cocktail Events, Coffee Culture, Whiskey/Spirits Tastings, Vegan/Vegetarian Events, International Cuisine, Local Specialties, Food & Music Pairings, Farmers Markets, Gourmet Events, Street Food, Chef Demonstrations',

'Sport: Sport, Football/Soccer, Basketball, Tennis, Fitness Events, Running/Marathon, Cycling Events, Swimming, Martial Arts, Yoga/Pilates, Extreme Sports, Winter Sports, Team Building Sports, Amateur Leagues, Sports Viewing Parties, Health & Wellness, Outdoor Sports, Indoor Sports, E-Sports, Adventure Racing',

'Familien/Kids: Familien/Kids, Children Events, Family Festivals, Kids Workshops, Educational Activities, Interactive Shows, Children Theater, Puppet Shows, Magic Shows, Storytelling for Kids, Arts & Crafts, Science for Kids, Music for Families, Outdoor Adventures, Birthday Parties, Holiday Events, Baby/Toddler Events, Teen Programs',

'Kunst/Design: Kunst/Design, Art Exhibitions, Design Markets, Craft Fairs, Artist Studios, Creative Workshops, Fashion Shows, Photography, Sculpture, Painting, Digital Art, Street Art, Installation Art, Textile Arts, Ceramics/Pottery, Jewelry Making, Architecture Events, Interior Design, Graphic Design, Art Auctions',

'Wellness/Spirituell: Wellness/Spirituell, Meditation Events, Yoga Classes, Spa Events, Mindfulness Workshops, Spiritual Retreats, Healing Sessions, Wellness Festivals, Breathwork, Sound Healing, Crystal Healing, Reiki Sessions, Holistic Health, Mental Health Support, Self-Care Events, Nature Therapy, Life Coaching, Nutrition Workshops',

'Networking/Business: Networking/Business, Business Meetups, Professional Development, Industry Conferences, Startup Events, Entrepreneurship, Career Fairs, Leadership Events, Trade Shows, B2B Events, Corporate Events, Innovation Hubs, Tech Meetups, Skills Workshops, Mentorship Programs, Investment Events, Coworking Events, Industry Mixers',

'Natur/Outdoor: Natur/Outdoor, Hiking/Walking Tours, Nature Tours, Wildlife Watching, Botanical Gardens, Park Events, Outdoor Adventures, Camping Events, Environmental Education, Eco-Tours, Outdoor Yoga, Nature Photography, Geocaching, Bird Watching, Gardening Workshops, Sustainability Events, Green Living, Conservation Events, Outdoor Fitness, Stargazing',

'Kultur/Traditionen: Lokale Traditionen, Kulturelle Feste, Historische Reenactments, Volksfeste, Religiöse Feiern, Seasonal Celebrations, Cultural Heritage, Traditional Crafts, Folk Music/Dance, Local Legends Tours',

'Märkte/Shopping: Flohmarkt/Flea Markets, Vintage Markets, Handmade Markets, Antique Fairs, Shopping Events, Pop-up Shops, Designer Markets, Book Markets, Record Fairs, Seasonal Markets',

'Bildung/Lernen: Workshops, Kurse/Classes, Seminare/Seminars, Lectures/Vorträge, Language Exchange, Book Clubs, Study Groups, Academic Conferences, Skill Sharing, DIY Workshops',

'Soziales/Community: Community Events, Volunteer Activities, Charity Events, Social Causes, Neighborhood Meetings, Cultural Exchange, Senior Events, Singles Meetups, Expat Events, Local Initiatives'

];

// Get JobStore instance for persisting job state
const jobStore = getJobStore();

// Helper function to add timeout to any promise with better cleanup
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutId: NodeJS.Timeout;
  
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`Operation timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });
  
  return Promise.race([
    promise.finally(() => {
      if (timeoutId) clearTimeout(timeoutId);
    }),
    timeoutPromise
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

    // Start background processing asynchronously - DO NOT AWAIT
    // This allows the HTTP response to return immediately while processing continues
    
    // Set up a deadman's switch to automatically fail jobs that take too long
    // Set to 4.5 minutes to ensure it triggers before Vercel's 5-minute timeout
    const deadmanTimeout = setTimeout(() => {
      console.error(`🚨 DEADMAN SWITCH: Job ${jobId} has been running for more than 4.5 minutes, marking as failed`);
      jobStore.updateJob(jobId, {
        status: 'error',
        error: 'Processing timed out - job took longer than expected (4.5 min limit)',
        lastUpdateAt: new Date().toISOString()
      }).catch(updateError => {
        console.error('Failed to update job status via deadman switch:', updateError);
      });
    }, 4.5 * 60 * 1000); // 4.5 minutes - before Vercel's 5 minute timeout
    
    // BULLETPROOF: Set up an absolute guarantee that this job will complete
    // This acts as the final safeguard - if NOTHING else works, this will ensure job completion
    const absoluteFailsafeTimeout = setTimeout(async () => {
      console.error(`🚨 ABSOLUTE FAILSAFE: Job ${jobId} exceeded 4 minutes - forcing completion`);
      try {
        const currentJob = await jobStore.getJob(jobId);
        if (currentJob && currentJob.status === 'pending') {
          console.error(`🚨 FAILSAFE: Job ${jobId} still pending after 4 min, forcing to done with empty results`);
          await jobStore.updateJob(jobId, {
            status: 'done',
            events: [],
            error: 'Processing timed out - no events found within time limit',
            lastUpdateAt: new Date().toISOString()
          });
          console.error(`🚨 FAILSAFE: Job ${jobId} forced to completion`);
        }
      } catch (failsafeError) {
        console.error(`🚨 FAILSAFE ERROR for job ${jobId}:`, failsafeError);
      }
    }, 4 * 60 * 1000); // 4 minutes absolute maximum

    processJobInBackground(jobId, city, date, categories, options)
      .then(() => {
        // Job completed successfully
        clearTimeout(deadmanTimeout);
        clearTimeout(absoluteFailsafeTimeout);
        console.log(`✅ Background processing completed successfully for job: ${jobId}`);
      })
      .catch(error => {
        // Job failed with error
        clearTimeout(deadmanTimeout);
        clearTimeout(absoluteFailsafeTimeout);
        console.error('❌ Async background processing error for job', jobId, ':', error);
        
        // Update job status to error to prevent infinite polling
        jobStore.updateJob(jobId, {
          status: 'error',
          error: 'Background processing failed to complete',
          lastUpdateAt: new Date().toISOString()
        }).catch(updateError => {
          console.error('Failed to update job status after background error:', updateError);
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

// Background function to fetch from Perplexity with enhanced progressive updates
async function processJobInBackground(
  jobId: string, 
  city: string, 
  date: string, 
  categories?: string[], 
  options?: any
) {
  let overallTimeoutId: NodeJS.Timeout | undefined;
  let progressCheckInterval: NodeJS.Timeout | undefined;
  
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

    // Default to DEFAULT_CATEGORIES when categories is missing or empty
    const effectiveCategories = categories && categories.length > 0 ? categories : DEFAULT_CATEGORIES;
    
    // Enhanced options extraction with smart defaults
    const categoryConcurrency = Math.min(options?.categoryConcurrency || 5, effectiveCategories.length);
    
    // Dynamic timeout calculation based on category count and complexity
    const isVercel = process.env.VERCEL === '1';
    const requestedCategoryTimeout = typeof options?.categoryTimeoutMs === 'number' ? options.categoryTimeoutMs : 90000;
    const baseCategoryTimeout = isVercel ? Math.max(requestedCategoryTimeout, 60000) : requestedCategoryTimeout;
    
    // Adaptive timeout based on concurrency - higher concurrency might need slightly more time per category
    const adaptiveTimeoutMultiplier = categoryConcurrency > 3 ? 1.2 : 1.0;
    const categoryTimeoutMs = Math.floor(baseCategoryTimeout * adaptiveTimeoutMultiplier);
    
    // Overall timeout - adaptive based on job size
    const defaultOverallTimeout = parseInt(process.env.OVERALL_TIMEOUT_MS || '240000', 10); // 4 minutes default
    const adaptiveOverallTimeout = Math.min(
      defaultOverallTimeout + (effectiveCategories.length * 10000), // Extra 10s per category
      280000 // Max 4.67 minutes to stay under Vercel's 5-minute limit
    );
    const overallTimeoutMs = options?.overallTimeoutMs || adaptiveOverallTimeout;
    
    const maxAttempts = Math.min(options?.maxAttempts || 5, 8); // Cap retry attempts
    
    console.log('Enhanced background job starting:', {
      jobId, city, date, 
      categoryCount: effectiveCategories.length,
      config: { categoryConcurrency, categoryTimeoutMs, overallTimeoutMs, maxAttempts }
    });

    // Initialize job metrics for performance tracking
    await jobStore.incrementJobMetric(jobId, 'processing_started', 1);
    await jobStore.incrementJobMetric(jobId, 'categories_to_process', effectiveCategories.length);
    
    // Enhanced progress monitoring
    let lastProgressUpdate = Date.now();
    const maxProgressStaleTime = 2 * 60 * 1000; // 2 minutes max between progress updates
    
    // Set up progress monitoring to detect stuck workers
    progressCheckInterval = setInterval(() => {
      const now = Date.now();
      const timeSinceLastProgress = now - lastProgressUpdate;
      
      if (timeSinceLastProgress > 120000) { // 2 minutes without progress
        console.warn(`⚠️ Job ${jobId}: No progress for ${Math.round(timeSinceLastProgress/1000)}s. Completed: ${completedCategories}/${effectiveCategories.length}`);
      }
      
      console.log(`📊 Job ${jobId} progress check: ${completedCategories}/${effectiveCategories.length} categories completed, current index: ${currentIndex}`);
    }, 30000); // Check every 30 seconds

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

    // Process categories in parallel with controlled concurrency, respecting overall timeout
    const processingPromises: Promise<void>[] = [];
    let currentIndex = 0;

    // Enhanced worker function that processes categories from the queue
    const worker = async (): Promise<void> => {
      const workerId = Math.random().toString(36).substr(2, 5);
      console.log(`Worker ${workerId} started`);
      
      try {
        while (currentIndex < effectiveCategories.length && !overallAbortController.signal.aborted) {
          const categoryIndex = currentIndex++;
          if (categoryIndex >= effectiveCategories.length) break;
          
          const category = effectiveCategories[categoryIndex];
          
          // Check for abort signal before each category
          if (overallAbortController.signal.aborted) {
            console.log(`Worker ${workerId}: Overall timeout reached, skipping category: ${category}`);
            break;
          }
          
          console.log(`Worker ${workerId} processing category ${categoryIndex + 1}/${effectiveCategories.length}: ${category}`);
          
          try {
            await processCategory(category, categoryIndex, workerId);
            await jobStore.incrementJobMetric(jobId, 'categories_completed', 1);
            console.log(`Worker ${workerId} completed category ${categoryIndex + 1}/${effectiveCategories.length}: ${category}`);
          } catch (categoryError: any) {
            console.error(`Worker ${workerId} failed to process category ${category}:`, categoryError);
            await jobStore.incrementJobMetric(jobId, 'categories_failed', 1);
            
            // Continue processing other categories even if one fails (graceful degradation)
            await jobStore.pushDebugStep(jobId, {
              category,
              query: `Events in ${category} for ${city} on ${date}`,
              response: `Worker ${workerId} error: ${categoryError.message}`,
              parsedCount: 0,
              addedCount: 0,
              totalAfter: allEvents.length
            });
          }
        }
      } catch (workerError) {
        console.error(`Worker ${workerId} encountered fatal error:`, workerError);
        await jobStore.incrementJobMetric(jobId, 'worker_errors', 1);
        throw workerError;
      } finally {
        console.log(`Worker ${workerId} finished`);
      }
    };

    // Enhanced category processing with adaptive retry and better error categorization
    const processCategory = async (category: string, categoryIndex: number, workerId: string): Promise<void> => {
      let attempts = 0;
      let results: Array<{ query: string; response: string; events: EventData[]; timestamp: number; }> | null = null;
      let lastError: Error | null = null;
      
      console.log(`🔄 Worker ${workerId}: Starting category processing for ${category} (${categoryIndex + 1}/${effectiveCategories.length})`);
      
      // Absolute safeguard - max processing time per category (even beyond retries)
      const categoryAbortController = new AbortController();
      const maxCategoryProcessingTime = Math.max(categoryTimeoutMs * 2, 180000); // 2x timeout or 3 min, whichever is larger
      const categoryDeadmanTimer = setTimeout(() => {
        console.error(`🚨 CATEGORY DEADMAN: Category ${category} has been processing for ${maxCategoryProcessingTime}ms, forcing abort`);
        categoryAbortController.abort();
      }, maxCategoryProcessingTime);
      
      try {
        while (attempts < maxAttempts && !results && !categoryAbortController.signal.aborted && !overallAbortController.signal.aborted) {
          attempts++;
          
          try {
            console.log(`Worker ${workerId}: Processing category ${categoryIndex + 1}/${effectiveCategories.length}: ${category} (attempt ${attempts}/${maxAttempts})`);
            
            // Dynamic timeout calculation based on category complexity and attempt number
            const baseTimeout = typeof categoryTimeoutMs === 'number' ? categoryTimeoutMs : 90000;
            const complexityMultiplier = category.toLowerCase().includes('museen') || category.toLowerCase().includes('theater') ? 1.3 : 1.0;
            const attemptMultiplier = attempts > 1 ? 1.2 : 1.0; // Give more time for retries
            const dynamicTimeout = Math.floor(baseTimeout * complexityMultiplier * attemptMultiplier);
            
            console.log(`🔍 Worker ${workerId}: Category ${category} using dynamic timeout ${dynamicTimeout}ms (base: ${baseTimeout}ms, complexity: ${complexityMultiplier}, attempt: ${attemptMultiplier})`);

            try {
              const startTime = Date.now();
              console.log(`🌐 Worker ${workerId}: Starting Perplexity API call for category ${category} at ${new Date().toISOString()}`);
              
              const queryPromise = perplexityService.executeMultiQuery(city, date, [category], {
                ...options,
                categoryTimeoutMs: dynamicTimeout
              });
              
              console.log(`⏰ Worker ${workerId}: Setting up timeout race for category ${category} with ${dynamicTimeout + 5000}ms limit`);
              
              // Enhanced timeout with both withTimeout wrapper AND abort signal checking
              const res = await Promise.race([
                withTimeout(queryPromise, dynamicTimeout + 5000), // Add 5s buffer to outer timeout
                new Promise<never>((_, reject) => {
                  const checkAbort = () => {
                    if (categoryAbortController.signal.aborted || overallAbortController.signal.aborted) {
                      console.log(`🛑 Worker ${workerId}: Category ${category} aborted by signal`);
                      reject(new Error('Category processing aborted by timeout'));
                    } else {
                      setTimeout(checkAbort, 1000); // Check every second
                    }
                  };
                  checkAbort();
                })
              ]);
              
              const duration = Date.now() - startTime;
              
              console.log(`✅ Worker ${workerId}: Category ${category} query completed in ${duration}ms`);
              await jobStore.incrementJobMetric(jobId, 'api_calls_successful', 1);
              
              if (res && res.length > 0) {
                results = res;
                console.log(`🎉 Category ${category} completed successfully with ${res.length} results`);
              } else {
                console.log(`⚠️ Category ${category} returned no results but completed successfully`);
                results = res; // Still set results to exit loop
              }
              break; // Success, exit retry loop
            } catch (queryError: any) {
              lastError = queryError;
              console.error(`Worker ${workerId}: Category ${category} attempt ${attempts} failed:`, queryError.message);
              await jobStore.incrementJobMetric(jobId, 'api_calls_failed', 1);
              
              // Check if we should abort due to signals
              if (categoryAbortController.signal.aborted || overallAbortController.signal.aborted) {
                console.error(`Worker ${workerId}: Category ${category} aborted by timeout signal`);
                break; // Exit retry loop
              }
              
              // Determine if error is retryable
              const isRetryable = queryError.message.includes('timeout') || 
                                queryError.message.includes('network') ||
                                queryError.message.includes('fetch failed') ||
                                queryError.message.includes('aborted');
              
              if (!isRetryable || attempts >= maxAttempts) {
                console.error(`Worker ${workerId}: Category ${category} failed permanently after ${attempts} attempts: ${queryError.message}`);
                break; // Exit retry loop
              }
              
              // Exponential backoff with jitter for retries
              const baseDelay = 1000 * Math.pow(2, attempts - 1); // 1s, 2s, 4s, 8s
              const jitter = Math.random() * 0.3; // Up to 30% jitter
              const delay = Math.floor(baseDelay * (1 + jitter));
              
              console.log(`Worker ${workerId}: Retrying category ${category} in ${delay}ms...`);
              await new Promise(resolve => setTimeout(resolve, delay));
            }
          } catch (categoryError: any) {
            console.error(`Outer catch - Category ${category} attempt ${attempts}/${maxAttempts} failed:`, categoryError.message);
            lastError = categoryError;
            
            // Add debug step for failed attempt
            await jobStore.pushDebugStep(jobId, {
              category,
              query: `Events in ${category} for ${city} on ${date} (attempt ${attempts})`,
              response: `Error: ${categoryError.message}`,
              parsedCount: 0,
              addedCount: 0,
              totalAfter: allEvents.length
            });
            
            // Check abort signals before retrying
            if (categoryAbortController.signal.aborted || overallAbortController.signal.aborted) {
              console.error(`Worker ${workerId}: Category ${category} processing aborted`);
              break; // Exit retry loop
            }
            
            // If not the last attempt, wait with exponential backoff + jitter
            if (attempts < maxAttempts) {
              const baseDelay = 1000 * Math.pow(2, attempts - 1); // 1s, 2s, 4s, 8s
              const jitter = Math.random() * 1000; // 0-1s random jitter
              const delay = baseDelay + jitter;
              console.log(`Retrying category ${category} in ${Math.round(delay)}ms...`);
              await new Promise(resolve => setTimeout(resolve, delay));
            } else {
              break; // Exit retry loop for outer errors
            }
          }
        }
      } finally {
        // Always clean up the category deadman timer
        clearTimeout(categoryDeadmanTimer);
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
              
              // Push debug step with actual query
              await jobStore.pushDebugStep(jobId, {
                category,
                query: r.query,
                response: r.response,
                parsedCount,
                addedCount,
                totalAfter: finalEvents.length
              });
              
            } catch (processingError: any) {
              console.error(`Error processing sub-result ${i + 1}/${results.length} for category ${category}:`, processingError.message);
              await jobStore.pushDebugStep(jobId, {
                category,
                query: r?.query || `Events in ${category} for ${city} on ${date} (sub-result ${i + 1})`,
                response: `Processing error: ${processingError.message}`,
                parsedCount: 0,
                addedCount: 0,
                totalAfter: allEvents.length
              });
            }
          }
        } else {
          // No results returned after all attempts
          await jobStore.pushDebugStep(jobId, {
            category,
            query: `Events in ${category} for ${city} on ${date}`,
            response: `No results returned`,
            parsedCount: 0,
            addedCount: 0,
            totalAfter: allEvents.length
          });
        }
      } catch (outerProcessingError: any) {
        console.error(`Error processing results array for category ${category}:`, outerProcessingError.message);
        await jobStore.pushDebugStep(jobId, {
          category,
          query: `Events in ${category} for ${city} on ${date}`,
          response: `Processing error: ${outerProcessingError.message}`,
          parsedCount: 0,
          addedCount: 0,
          totalAfter: allEvents.length
        });
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
    // This is CRITICAL to prevent endless frontend polling
    try {
      // Get the final events from the JobStore (they may have been updated by workers)
      const finalJob = await jobStore.getJob(jobId);
      const finalEvents = finalJob?.events || allEvents || [];
      
      // Note: Per-category caching is now done immediately during processing
      // No need for combined caching here as individual categories are already cached
      console.log(`Job finalized with ${finalEvents.length} total events (per-category caching completed during processing)`);

      // Update job with final status - this must succeed to prevent UI timeout
      // Get current events from JobStore to ensure we don't overwrite progressive updates
      console.log(`Updating job ${jobId} to 'done' status...`);
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
    } catch (finalizationError: any) {
      console.error(`❌ CRITICAL: Failed to finalize job ${jobId} with 'done' status:`, finalizationError);
      
      // This is absolutely critical - try a minimal update to prevent infinite polling
      try {
        await jobStore.updateJob(jobId, {
          status: 'done',
          events: allEvents || [],
          lastUpdateAt: new Date().toISOString(),
          message: 'Verarbeitung abgeschlossen (mit Fehlern)'
        });
        console.log(`✅ Job ${jobId} marked as 'done' via minimal update to prevent infinite polling`);
      } catch (criticalError) {
        console.error(`❌ CATASTROPHIC: Cannot finalize job ${jobId} - user will experience infinite polling:`, criticalError);
        // At this point, we can't do anything more
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
