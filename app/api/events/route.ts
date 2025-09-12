import { NextRequest, NextResponse } from 'next/server';
import { RequestBody, JobStatus } from '@/lib/types';
import { eventsCache } from '@/lib/cache';
import { getJobStore } from '@/lib/jobStore';
import { getMainCategoriesForAICalls } from '@/categories';

// Serverless configuration  
export const runtime = 'nodejs';
export const maxDuration = 60; // Reduced to 1 minute

// Default categories - the 20 main categories
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

// Default Perplexity options
const DEFAULT_PPLX_OPTIONS = {
  temperature: 0.2,
  max_tokens: 10000
};

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

    // Build comprehensive authentication headers to ensure internal request validation passes
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-vercel-background': '1',
      'x-internal-call': '1', 
      'User-Agent': 'where2go-internal'
    };
    
    // Add optional authentication tokens if available
    if (protectionBypass) {
      headers['x-vercel-protection-bypass'] = protectionBypass;
    }
    if (internalSecret) {
      headers['x-internal-secret'] = internalSecret;
    }
    
    // Ensure we always have at least the core authentication headers
    console.log('Authentication headers being sent:', {
      'x-vercel-background': headers['x-vercel-background'],
      'x-internal-call': headers['x-internal-call'],
      'User-Agent': headers['User-Agent'],
      'x-vercel-protection-bypass': headers['x-vercel-protection-bypass'] ? 'SET' : 'NOT_SET',
      'x-internal-secret': headers['x-internal-secret'] ? 'SET' : 'NOT_SET'
    });
    
    // Make internal HTTP request to background processor with comprehensive logging
    console.log(`Scheduling background processing: ${backgroundUrl}`);
    console.log('Full request details:', {
      method: 'POST',
      url: backgroundUrl,
      headers: {
        ...headers,
        'x-vercel-protection-bypass': headers['x-vercel-protection-bypass'] ? 'SET' : 'NOT_SET',
        'x-internal-secret': headers['x-internal-secret'] ? 'SET' : 'NOT_SET'
      },
      bodyPreview: { jobId, city, date, categoriesCount: categories.length }
    });
    
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
    
    console.log('Background processing response:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      contentType: response.headers.get('content-type')
    });
    
    if (!response.ok) {
      const responseText = await response.text();
      console.error('Background processing failed response body:', responseText);
      throw new Error(`Background scheduling failed: HTTP ${response.status} ${response.statusText}: ${responseText}`);
    }
    
    const responseData = await response.json().catch(() => null);
    console.log('Background processing success response:', responseData);
    
    console.log('Background processing scheduled successfully');
    
  } else {
    // Local development fallback - make local HTTP request without awaiting
    const localUrl = 'http://localhost:3001/api/events/process';
    console.log(`Running in local development, making async request to background processor: ${localUrl}`);
    
    // Build comprehensive authentication headers for local development
    const localHeaders = {
      'Content-Type': 'application/json',
      'x-vercel-background': '1',
      'x-internal-call': '1',
      'User-Agent': 'where2go-internal'
    };
    
    console.log('Local development authentication headers:', localHeaders);
    
    // Fire and forget request for local development
    fetch(localUrl, {
      method: 'POST',
      headers: localHeaders,
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

    // Check for debug mode from options
    const debugMode = options?.debug || false;
    
    if (debugMode) {
      console.log('\n=== EVENTS API DEBUG MODE ENABLED ===');
      console.log('🔍 DEBUG: Request received:', { city, date, categories, options });
    }

    if (!city || !date) {
      return NextResponse.json(
        { error: 'Stadt und Datum sind erforderlich' },
        { status: 400 }
      );
    }

    // Use provided categories or defaults
    const effectiveCategories = categories && categories.length > 0 ? categories : DEFAULT_CATEGORIES;
    
    // Merge options with defaults, preserving the original options
    const mergedOptions = { 
      ...DEFAULT_PPLX_OPTIONS,
      ...(options || {})
    };
    
    if (debugMode) {
      console.log('🔍 DEBUG: Effective categories:', effectiveCategories);
      console.log('🔍 DEBUG: Merged options:', mergedOptions);
    }

    // Check cache for all categories
    const cacheResult = eventsCache.getEventsByCategories(city, date, effectiveCategories);
    const allCachedEvents = Object.values(cacheResult.cachedEvents).flat();
    const missingCategories = cacheResult.missingCategories;

    if (debugMode) {
      console.log('🔍 DEBUG: Cache analysis results:', {
        totalCategories: effectiveCategories.length,
        cachedCategories: Object.keys(cacheResult.cachedEvents).length,
        cachedEvents: allCachedEvents.length,
        missingCategories: missingCategories.length
      });
      console.log('🔍 DEBUG: Cached categories:', Object.keys(cacheResult.cachedEvents));
      console.log('🔍 DEBUG: Missing categories:', missingCategories);
    } else {
      console.log(`Cache analysis: ${Object.keys(cacheResult.cachedEvents).length}/${effectiveCategories.length} categories cached, ${allCachedEvents.length} events from cache`);
      console.log('Cached categories:', Object.keys(cacheResult.cachedEvents));
      console.log('Missing categories:', missingCategories);
    }

    // If all categories are cached, return immediately
    if (missingCategories.length === 0) {
      if (debugMode) {
        console.log('🔍 DEBUG: ✅ All categories cached - returning directly without background processing');
        console.log('🔍 DEBUG: Total cached events:', allCachedEvents.length);
      } else {
        console.log('✅ All categories cached - returning directly');
      }
      return NextResponse.json({
        events: allCachedEvents,
        status: 'completed',
        cached: true,
        message: allCachedEvents.length > 0 
          ? `${allCachedEvents.length} Events aus dem Cache geladen`
          : 'Keine Events gefunden'
      });
    }

    // Create simple job for missing categories
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    if (debugMode) {
      console.log('🔍 DEBUG: Creating job for missing categories:', {
        jobId,
        missingCategoriesCount: missingCategories.length,
        existingCachedEvents: allCachedEvents.length
      });
    }
    
    const job: JobStatus = {
      id: jobId,
      status: 'pending',
      events: allCachedEvents,
      createdAt: new Date(),
      progress: {
        completedCategories: effectiveCategories.length - missingCategories.length,
        totalCategories: effectiveCategories.length
      }
    };

    try {
      await jobStore.setJob(jobId, job);
      if (debugMode) {
        console.log(`🔍 DEBUG: ✅ Job created successfully:`, {
          jobId,
          status: job.status,
          events: job.events?.length || 0,
          initialProgress: job.progress
        });
      } else {
        console.log(`Job created successfully with ID: ${jobId}, status: ${job.status}, events: ${job.events?.length || 0}`);
      }
    } catch (jobStoreError) {
      console.error('Failed to create job in JobStore:', jobStoreError);
      if (debugMode) {
        console.log('🔍 DEBUG: ❌ Failed to create job in JobStore:', jobStoreError);
      }
      return NextResponse.json(
        { error: 'Service nicht verfügbar - Redis Konfiguration erforderlich' },
        { status: 500 }
      );
    }

    // Map subcategories to main categories for AI calls
    const mainCategoriesForAI = getMainCategoriesForAICalls(missingCategories);
    
    if (debugMode) {
      console.log('🔍 DEBUG: Category mapping for AI calls:', {
        originalMissingCategories: missingCategories,
        mappedMainCategories: mainCategoriesForAI
      });
    } else {
      console.log(`Original missing categories (subcategories): ${missingCategories.length} - [${missingCategories.join(', ')}]`);
      console.log(`Mapped to main categories for AI calls: ${mainCategoriesForAI.length} - [${mainCategoriesForAI.join(', ')}]`);
    }

    // Schedule background processing (await to catch immediate errors)
    try {
      if (debugMode) {
        console.log('🔍 DEBUG: Scheduling background processing with debug mode enabled');
      }
      await scheduleBackgroundProcessing(request, jobId, city, date, mainCategoriesForAI, mergedOptions);
      if (debugMode) {
        console.log('🔍 DEBUG: ✅ Background processing scheduled successfully');
      }
    } catch (scheduleError) {
      console.error('Failed to schedule background processing:', scheduleError);
      if (debugMode) {
        console.log('🔍 DEBUG: ❌ Failed to schedule background processing:', scheduleError);
      }
      // Update job to error state
      await jobStore.updateJob(jobId, {
        status: 'error',
        error: 'Failed to schedule background processing'
      });
      return NextResponse.json(
        { error: 'Failed to schedule background processing' },
        { status: 500 }
      );
    }

    // Return job for polling
    if (debugMode) {
      console.log('🔍 DEBUG: ✅ Returning job for polling:', {
        jobId,
        status: 'partial',
        cachedEvents: allCachedEvents.length,
        missingCategories: missingCategories.length,
        progress: {
          completedCategories: effectiveCategories.length - missingCategories.length,
          totalCategories: effectiveCategories.length
        }
      });
      console.log('🔍 DEBUG: === EVENTS API DEBUG COMPLETE ===\n');
    }
    
    return NextResponse.json({
      jobId,
      status: 'partial',
      events: allCachedEvents,
      cached: allCachedEvents.length > 0,
      processing: true,
      progress: {
        completedCategories: effectiveCategories.length - missingCategories.length,
        totalCategories: effectiveCategories.length
      },
      message: allCachedEvents.length > 0 
        ? `${allCachedEvents.length} Events aus dem Cache geladen, ${missingCategories.length} Kategorien werden verarbeitet...`
        : `${missingCategories.length} Kategorien werden verarbeitet...`
    });

  } catch (error) {
    console.error('❌ Events API Error:', error);
    return NextResponse.json(
      { error: 'Unerwarteter Fehler beim Verarbeiten der Anfrage' },
      { status: 500 }
    );
  }
}
