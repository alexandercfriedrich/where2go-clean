import { NextRequest, NextResponse } from 'next/server';
import { EventData } from '@/lib/types';
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
    
    // Extract options with defaults - increased timeouts to prevent premature cutoff
    const categoryConcurrency = options?.categoryConcurrency || 5;
    
    // Default categoryTimeoutMs to 90s (90000ms), enforce minimum 60s (esp. on Vercel)
    const isVercel = process.env.VERCEL === '1';
    const requestedCategoryTimeout =
      typeof options?.categoryTimeoutMs === 'number' ? options.categoryTimeoutMs : 90000;
    const defaultCategoryTimeout = isVercel
      ? Math.max(requestedCategoryTimeout, 60000)
      : requestedCategoryTimeout;
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

          const queryPromise = perplexityService.executeMultiQuery(city, date, [category], options);
          const res = await withTimeout(queryPromise, perCategoryTimeout);
          if (res && res.length > 0) {
            results = res;
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
              
              // Merge with current events and deduplicate
              const beforeCount = currentEvents.length;
              const combinedEvents = [...currentEvents, ...categoryEvents];
              const updatedEvents = eventAggregator.deduplicateEvents(combinedEvents);
              
              // Categorize all events
              const finalEvents = eventAggregator.categorizeEvents(updatedEvents);
              
              const addedCount = finalEvents.length - beforeCount;
              
              // Update local tracking variable for this worker
              allEvents = finalEvents;
              
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
    };

    // Start workers (up to concurrency limit)
    const workerCount = Math.min(categoryConcurrency, effectiveCategories.length);
    console.log(`Starting ${workerCount} parallel workers for ${effectiveCategories.length} categories`);
    for (let i = 0; i < workerCount; i++) {
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
        throw timeoutError; // Re-throw other errors
      }
    } finally {
      // Clean up overall timeout
      clearTimeout(overallTimeoutId);
    }

    // Always finalize the job with status 'done', even if we have 0 events
    try {
      // Get the final events from the JobStore (they may have been updated by workers)
      const finalJob = await jobStore.getJob(jobId);
      const finalEvents = finalJob?.events || allEvents || [];
      
      // Cache the final results with dynamic TTL based on event timings
      const cacheKey = InMemoryCache.createKey(city, date, effectiveCategories);
      const ttlSeconds = computeTTLSecondsForEvents(finalEvents);
      eventsCache.set(cacheKey, finalEvents, ttlSeconds);
      console.log(`Cached ${finalEvents.length} events with TTL: ${ttlSeconds} seconds`);
    } catch (cacheError) {
      console.error('Failed to cache results, but continuing:', cacheError);
    }

    // Update job with final status - this must succeed to prevent UI timeout
    // Get current events from JobStore to ensure we don't overwrite progressive updates
    const finalJob = await jobStore.getJob(jobId);
    const finalEvents = finalJob?.events || [];
    
    await jobStore.updateJob(jobId, {
      status: 'done',
      events: finalEvents,
      progress: { 
        completedCategories: effectiveCategories.length, 
        totalCategories: effectiveCategories.length 
      },
      lastUpdateAt: new Date().toISOString()
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
