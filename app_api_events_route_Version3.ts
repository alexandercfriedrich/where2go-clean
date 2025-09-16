import { NextRequest, NextResponse } from 'next/server';
import { RequestBody, EventData, JobStatus, DebugInfo } from '@/lib/types';
import { eventsCache } from '@/lib/cache';
import InMemoryCache from '@/lib/cache';
import { createPerplexityService } from '@/lib/perplexity';
import { eventAggregator } from '@/lib/aggregator';
import { computeTTLSecondsForEvents } from '@/lib/cacheTtl';
import { getJobStore } from '@/lib/jobStore';
import { getHotCity, getCityWebsitesForCategories } from '@/lib/hotCityStore';
import { getMainCategoriesForAICalls } from '@/categories';
import { EVENT_CATEGORIES } from '@/lib/eventCategories';

// Serverless configuration  
export const runtime = 'nodejs';
export const maxDuration = 300;

// Replace giant static default list with canonical 20 main categories
const DEFAULT_CATEGORIES = EVENT_CATEGORIES;

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
  const isVercel = process.env.VERCEL === '1';
  
  if (isVercel) {
    const deploymentUrl = request.headers.get('x-vercel-deployment-url');
    const host = deploymentUrl || request.headers.get('x-forwarded-host') || request.headers.get('host');
    const protocol = 'https';
    
    if (!host) {
      throw new Error('Unable to determine host for background processing');
    }
    
    const backgroundUrl = `${protocol}://${host}/api/events/process`;
    console.log('Scheduling background processing via Vercel Background Functions:', backgroundUrl);

    const protectionBypass = process.env.PROTECTION_BYPASS_TOKEN;
    const internalSecret = process.env.INTERNAL_API_SECRET;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-vercel-background': '1',
    };
    if (protectionBypass) headers['x-vercel-protection-bypass'] = protectionBypass;
    if (internalSecret) headers['x-internal-secret'] = internalSecret;
    
    console.log(`Scheduling background processing: ${backgroundUrl}`);
    const response = await fetch(backgroundUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        jobId,
        city,
        date,
        categories,
        options
      })
    });
    
    if (!response.ok) {
      throw new Error(`Background scheduling failed: ${response.status} ${response.statusText}`);
    }
    
    console.log('Background processing scheduled successfully');
    
  } else {
    const localUrl = 'http://localhost:3000/api/events/process';
    console.log(`Running in local development, making async request to background processor: ${localUrl}`);
    
    fetch(localUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-vercel-background': '1',
      },
      body: JSON.stringify({
        jobId,
        city,
        date,
        categories,
        options
      })
    }).then(response => {
      if (!response.ok) {
        console.error(`Local background processing failed: ${response.status} ${response.statusText}`);
      } else {
        console.log('Local background processing scheduled successfully');
      }
    }).catch(error => {
      console.error('Local development background request failed:', error);
    });
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

    const effectiveCategories = categories && categories.length > 0 ? categories : DEFAULT_CATEGORIES;
    
    let hotCityData: any = null;
    let additionalSources: any[] = [];
    try {
      hotCityData = await getHotCity(city);
      if (hotCityData) {
        console.log(`Found Hot City data for: ${city}`);
        additionalSources = await getCityWebsitesForCategories(city, effectiveCategories);
        console.log(`Found ${additionalSources.length} additional sources for ${city}`);
      }
    } catch (error) {
      console.error('Error fetching Hot City data:', error);
    }

    const mergedOptions = { 
      ...DEFAULT_PPLX_OPTIONS, 
      ...options,
      hotCity: hotCityData,
      additionalSources
    };

    const disableCache = mergedOptions?.disableCache === true || mergedOptions?.debug === true;

    let allCachedEvents: EventData[] = [];
    let missingCategories: string[] = [];
    let cacheInfo: { [category: string]: { fromCache: boolean; eventCount: number } } = {};

    if (!disableCache) {
      const cacheResult = eventsCache.getEventsByCategories(city, date, effectiveCategories);
      
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
      effectiveCategories.forEach(category => {
        cacheInfo[category] = { fromCache: false, eventCount: 0 };
      });
    }

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

    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const job: JobStatus = {
      id: jobId,
      status: 'processing',
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

    const mainCategoriesForAI = getMainCategoriesForAICalls(missingCategories);
    
    try {
      console.log(`Original missing categories (subcategories): ${missingCategories.length} - [${missingCategories.join(', ')}]`);
      console.log(`Mapped to main categories for AI calls: ${mainCategoriesForAI.length} - [${mainCategoriesForAI.join(', ')}]`);
      
      await scheduleBackgroundProcessing(request, jobId, city, date, mainCategoriesForAI, mergedOptions);
    } catch (scheduleError) {
      console.error('Failed to schedule background processing:', scheduleError);
      await jobStore.updateJob(jobId, {
        status: 'error',
        error: 'Failed to schedule background processing'
      });
      return NextResponse.json(
        { error: 'Failed to schedule background processing' },
        { status: 500 }
      );
    }

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