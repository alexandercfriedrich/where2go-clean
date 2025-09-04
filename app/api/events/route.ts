import { NextRequest, NextResponse } from 'next/server';
import { RequestBody, EventData, JobStatus, DebugInfo, DebugStep } from '@/lib/types';
import { eventsCache } from '@/lib/cache';
import InMemoryCache from '@/lib/cache';
import { createPerplexityService } from '@/lib/perplexity';
import { eventAggregator } from '@/lib/aggregator';
import { computeTTLSecondsForEvents } from '@/lib/cacheTtl';
import { getJobStore } from '@/lib/jobStore';
import { getHotCity, getCityWebsitesForCategories } from '@/lib/hotCityStore';
import { getMainCategoriesForAICalls } from '@/categories';

// Serverless configuration  
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

// Default Perplexity options
const DEFAULT_PPLX_OPTIONS = {
  temperature: 0.2,
  max_tokens: 10000
};

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

// Schedule background processing using Vercel Background Functions or local fallback
async function scheduleBackgroundProcessing(
  request: NextRequest,
  jobId: string,
  city: string,
  date: string,
  categories: string[],
  options: any
) {
  // Determine if we're running on Vercel
  const isVercel = process.env.VERCEL === '1';
  
  if (isVercel) {
    // Prefer exact deployment URL to ensure we hit the same deployment in preview
    const deploymentUrl = request.headers.get('x-vercel-deployment-url');
    const host = deploymentUrl || request.headers.get('x-forwarded-host') || request.headers.get('host');
    const protocol = 'https'; // Vercel preview/prod are https
    
    if (!host) {
      throw new Error('Unable to determine host for background processing');
    }
    
    const backgroundUrl = `${protocol}://${host}/api/events/process`;
    
    console.log('Scheduling background processing via Vercel Background Functions:', backgroundUrl);

    // Optional protection bypass for Preview Deployments Protection
    // Set PROTECTION_BYPASS_TOKEN in Vercel Project Settings > Environment Variables
    const protectionBypass = process.env.PROTECTION_BYPASS_TOKEN;

    // Optional internal secret if your worker route expects it
    const internalSecret = process.env.INTERNAL_API_SECRET;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-vercel-background': '1',
    };
    if (protectionBypass) {
      headers['x-vercel-protection-bypass'] = protectionBypass;
    }
    if (internalSecret) {
      headers['x-internal-secret'] = internalSecret;
    }
    
    // Make internal HTTP request to background processor with special header
    console.log(`Scheduling background processing: ${backgroundUrl}`);
    
    // Add timeout to the background scheduling request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      const response = await fetch(backgroundUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          jobId,
          city,
          date,
          categories,
          options
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const responseText = await response.text().catch(() => 'Unknown error');
        throw new Error(`Background scheduling failed: ${response.status} ${response.statusText} - ${responseText}`);
      }
      
      console.log('Background processing scheduled successfully');
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        throw new Error('Background scheduling timed out after 10 seconds');
      }
      throw fetchError;
    }
    
  } else {
    // Local development fallback - make local HTTP request with better error handling
    const localUrl = 'http://localhost:3000/api/events/process';
    console.log(`Running in local development, making async request to background processor: ${localUrl}`);
    
    // Add timeout and better error handling for local development
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      const response = await fetch(localUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-vercel-background': '1', // Add auth header for local dev
        },
        body: JSON.stringify({
          jobId,
          city,
          date,
          categories,
          options
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const responseText = await response.text().catch(() => 'Unknown error');
        console.error(`Local background processing failed: ${response.status} ${response.statusText} - ${responseText}`);
        throw new Error(`Local background processing failed: ${response.status} ${response.statusText} - ${responseText}`);
      } else {
        console.log('Local background processing scheduled successfully');
      }
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        console.error('Local development background request timed out after 10 seconds');
        throw new Error('Local development background request timed out after 10 seconds');
      } else {
        console.error('Local development background request failed:', fetchError);
        throw fetchError;
      }
    }
  }
}

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
    
    // Check for Hot City and resolve additional sources
    let hotCityData: any = null;
    let additionalSources: any[] = [];
    try {
      hotCityData = await getHotCity(city);
      if (hotCityData) {
        console.log(`Found Hot City data for: ${city}`);
        // Get websites for the requested categories
        additionalSources = await getCityWebsitesForCategories(city, effectiveCategories);
        console.log(`Found ${additionalSources.length} additional sources for ${city}`);
      }
    } catch (error) {
      console.error('Error fetching Hot City data:', error);
      // Continue without Hot City data - don't fail the entire request
    }

    // Merge options with Hot City data and defaults
    const mergedOptions = { 
      ...DEFAULT_PPLX_OPTIONS, 
      ...options,
      hotCity: hotCityData,
      additionalSources
    };

    // Determine if cache should be bypassed
    const disableCache = mergedOptions?.disableCache === true || mergedOptions?.debug === true;

    // Check cache per-category for intelligent cache usage - unless cache is disabled
    let allCachedEvents: EventData[] = [];
    let missingCategories: string[] = [];
    let cacheInfo: { [category: string]: { fromCache: boolean; eventCount: number } } = {};

    if (!disableCache) {
      const cacheResult = eventsCache.getEventsByCategories(city, date, effectiveCategories);
      
      // Combine all cached events and deduplicate immediately
      const cachedEventsList: EventData[] = [];
      for (const category in cacheResult.cachedEvents) {
        cachedEventsList.push(...cacheResult.cachedEvents[category]);
      }
      allCachedEvents = eventAggregator.deduplicateEvents(cachedEventsList);
      
      missingCategories = cacheResult.missingCategories;
      cacheInfo = cacheResult.cacheInfo;
      
      console.log(`Cache analysis: ${Object.keys(cacheResult.cachedEvents).length}/${effectiveCategories.length} categories cached, ${allCachedEvents.length} events from cache`);
      console.log('Cached categories:', Object.keys(cacheResult.cachedEvents));
      console.log('Missing categories:', missingCategories);
    } else {
      console.log('Cache bypass enabled (debug mode or disableCache flag)');
      missingCategories = effectiveCategories;
      // Initialize cacheInfo for all categories as not from cache
      effectiveCategories.forEach(category => {
        cacheInfo[category] = { fromCache: false, eventCount: 0 };
      });
    }

    // If all categories are cached, return events directly without job polling
    if (missingCategories.length === 0) {
      console.log('All categories cached - returning events directly');
      return NextResponse.json({
        events: allCachedEvents,
        status: 'completed',
        cached: true,
        cacheInfo: {
          fromCache: true,
          totalEvents: allCachedEvents.length,
          cachedEvents: allCachedEvents.length,
          cacheBreakdown: cacheInfo
        },
        message: allCachedEvents.length > 0 
          ? `${allCachedEvents.length} Events aus dem Cache geladen`
          : 'Keine Events gefunden'
      });
    }

    // For mixed scenarios (some cached, some not), return cached events immediately
    // and start background processing for missing categories
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create job entry with cached events
    const job: JobStatus = {
      id: jobId,
      status: 'pending',
      events: allCachedEvents,
      createdAt: new Date(),
      cacheInfo: {
        fromCache: allCachedEvents.length > 0,
        totalEvents: allCachedEvents.length,
        cachedEvents: allCachedEvents.length,
        cacheBreakdown: cacheInfo
      },
      progress: {
        completedCategories: effectiveCategories.length - missingCategories.length,
        totalCategories: effectiveCategories.length
      }
    };

    await jobStore.setJob(jobId, job);
    console.log(`Job created successfully with ID: ${jobId}, status: ${job.status}, events: ${job.events?.length || 0}`);

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

    // Schedule background processing for missing categories only
    // IMPORTANT: Map subcategories to main categories for AI calls
    // The cache logic checks subcategories, but AI calls should only be made for main categories
    const mainCategoriesForAI = getMainCategoriesForAICalls(missingCategories);
    
    // Check if category mapping failed - this was causing the infinite loop
    if (missingCategories.length > 0 && mainCategoriesForAI.length === 0) {
      console.error('❌ Category mapping failed: No main categories found for missing categories');
      console.error('Missing categories:', missingCategories);
      await jobStore.updateJob(jobId, {
        status: 'error',
        error: 'Kategorie-Mapping fehlgeschlagen: Unbekannte Kategorien können nicht verarbeitet werden'
      });
      return NextResponse.json(
        { error: 'Kategorie-Mapping fehlgeschlagen' },
        { status: 400 }
      );
    }
    
    try {
      console.log(`Original missing categories (subcategories): ${missingCategories.length} - [${missingCategories.join(', ')}]`);
      console.log(`Mapped to main categories for AI calls: ${mainCategoriesForAI.length} - [${mainCategoriesForAI.join(', ')}]`);
      
      await scheduleBackgroundProcessing(request, jobId, city, date, mainCategoriesForAI, mergedOptions);
      
      // Add reasonable timeout protection for stalled jobs
      // If background processing doesn't start within 2 minutes, fail the job
      setTimeout(async () => {
        try {
          const currentJob = await jobStore.getJob(jobId);
          if (currentJob && currentJob.status === 'pending' && currentJob.progress?.completedCategories === 0) {
            console.error(`🚨 STALLED JOB DETECTED: Job ${jobId} has been pending for 2 minutes with no progress - marking as error`);
            await jobStore.updateJob(jobId, {
              status: 'error',
              error: 'Background processing failed to start - job stalled (2 min timeout)',
              lastUpdateAt: new Date().toISOString()
            });
          }
        } catch (timeoutError) {
          console.error('Error in stalled job timeout handler:', timeoutError);
        }
      }, 120000); // 2 minutes timeout for stalled jobs
      
    } catch (scheduleError) {
      console.error('Failed to schedule background processing:', scheduleError);
      // Update job to error state
      await jobStore.updateJob(jobId, {
        status: 'error',
        error: 'Failed to schedule background processing: ' + (scheduleError instanceof Error ? scheduleError.message : String(scheduleError)),
        lastUpdateAt: new Date().toISOString()
      });
      return NextResponse.json(
        { error: 'Failed to schedule background processing' },
        { status: 500 }
      );
    }

    // Return immediate results with job ID for polling remaining categories
    return NextResponse.json({
      jobId,
      status: 'partial',
      events: allCachedEvents,
      cached: allCachedEvents.length > 0,
      processing: missingCategories.length > 0,
      cacheInfo: {
        fromCache: allCachedEvents.length > 0,
        totalEvents: allCachedEvents.length,
        cachedEvents: allCachedEvents.length,
        cacheBreakdown: cacheInfo
      },
      progress: {
        completedCategories: effectiveCategories.length - missingCategories.length,
        totalCategories: effectiveCategories.length,
        missingCategories: missingCategories
      },
      message: allCachedEvents.length > 0 
        ? `${allCachedEvents.length} Events aus dem Cache geladen, ${missingCategories.length} Kategorien werden verarbeitet...`
        : `${missingCategories.length} Kategorien werden verarbeitet...`
    });

  } catch (error) {
    console.error('Events API Error:', error);
    return NextResponse.json(
      { error: 'Unerwarteter Fehler beim Verarbeiten der Anfrage' },
      { status: 500 }
    );
  }
}
