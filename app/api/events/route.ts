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

// Robust background processing trigger with comprehensive Vercel protection bypass
async function triggerBackgroundProcessing(
  request: NextRequest,
  jobId: string,
  city: string,
  date: string,
  categories: string[]
) {
  // STRATEGY: Try HTTP trigger first, but immediately fall back to direct processing if blocked
  const shouldSkipHttp = process.env.SKIP_HTTP_TRIGGER === 'true';
  
  if (shouldSkipHttp) {
    console.log(`🔄 HTTP trigger disabled, using direct processing for job ${jobId}`);
    return await processJobDirectly(jobId, city, date, categories);
  }

  const host = request.headers.get('x-forwarded-host') || 
                request.headers.get('host') || 
                'localhost:3000';
                
  const protocol = host.includes('localhost') ? 'http' : 'https';
  const backgroundUrl = `${protocol}://${host}/api/events/process`;

  console.log(`🚀 Attempting HTTP background trigger: ${backgroundUrl}`);

  try {
    // Multi-strategy Vercel protection bypass headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'where2go-internal/1.0',
      'x-vercel-background': '1',
      'x-internal-call': '1'
    };

    // Strategy 1: Official Vercel Automation Bypass
    const vercelBypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
    if (vercelBypassSecret) {
      headers['x-vercel-protection-bypass'] = vercelBypassSecret;
      console.log(`🔐 Using official Vercel bypass secret`);
    }

    // Strategy 2: Alternative bypass headers  
    headers['x-vercel-skip-toolbar'] = '1';
    headers['x-middleware-skip'] = '1';
    
    // Strategy 3: Forward authentication context
    const authHeaders = ['authorization', 'cookie', 'x-forwarded-for', 'x-real-ip'];
    authHeaders.forEach(headerName => {
      const value = request.headers.get(headerName);
      if (value) {
        headers[headerName] = value;
      }
    });

    console.log(`🔐 HTTP request headers: ${Object.keys(headers).join(', ')}`);

    // Short timeout - fail fast if blocked
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const response = await fetch(backgroundUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ jobId, city, date, categories }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    console.log(`📡 HTTP response: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      
      // Check for Vercel Protection authentication errors
      if (response.status === 401 || response.status === 403 || 
          errorText.includes('Authentication Required') ||
          errorText.includes('x-vercel-protection-bypass')) {
        console.log(`🚫 Vercel Protection blocking detected (${response.status})`);
        throw new Error(`Vercel Protection: ${response.status}`);
      }
      
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    console.log(`✅ HTTP background processing triggered successfully`);
    return;

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.log(`⚠️ HTTP trigger failed: ${errorMsg}`);
    
    // Always fall back to direct processing when HTTP fails
    console.log(`🔄 Falling back to direct processing for job ${jobId}`);
    return await processJobDirectly(jobId, city, date, categories);
  }
}

// Direct processing function - primary solution when HTTP triggers fail due to Vercel protection
async function processJobDirectly(
  jobId: string,
  city: string,
  date: string,
  categories: string[]
) {
  console.log(`🔄 Starting direct background processing for job ${jobId}`);
  console.log(`📍 Processing: ${city}, ${date}, ${categories.length} categories`);
  
  try {
    // Update job status to indicate processing has started
    await jobStore.updateJob(jobId, {
      status: 'processing',
      message: 'Background processing started via direct method'
    });
    console.log(`✅ Job ${jobId} status updated - processing started`);
  } catch (error) {
    console.error(`⚠️ Could not update job status to processing:`, error);
    // Continue anyway - the processing itself is more important
  }
  
  // Import the processing function dynamically to avoid circular dependencies
  const { processJobInBackground } = await import('./process/backgroundProcessor');
  
  // Start processing in background (don't await to return quickly)
  processJobInBackground(jobId, city, date, categories)
    .then(() => {
      console.log(`✅ Direct background processing completed successfully for job: ${jobId}`);
    })
    .catch(async (error) => {
      console.error(`❌ Direct background processing failed for job ${jobId}:`, error);
      
      // Update job to error state
      try {
        await jobStore.updateJob(jobId, {
          status: 'error',
          error: 'Direct processing failed: ' + (error instanceof Error ? error.message : String(error))
        });
        console.log(`🔄 Job ${jobId} updated to error state after direct processing failure`);
      } catch (updateError) {
        console.error(`❌ Failed to update job status after direct processing error:`, updateError);
      }
    });
    
  console.log(`✅ Direct background processing initiated for job: ${jobId}`);
}

export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json();
    const { city, date, categories } = body;

    if (!city || !date) {
      return NextResponse.json(
        { error: 'Stadt und Datum sind erforderlich' },
        { status: 400 }
      );
    }

    // Use provided categories or defaults
    const effectiveCategories = categories && categories.length > 0 ? categories : DEFAULT_CATEGORIES;
    
    // Check cache for all categories
    const cacheResult = eventsCache.getEventsByCategories(city, date, effectiveCategories);
    const allCachedEvents = Object.values(cacheResult.cachedEvents).flat();
    const missingCategories = cacheResult.missingCategories;

    console.log(`📦 Cache: ${Object.keys(cacheResult.cachedEvents).length}/${effectiveCategories.length} categories cached, ${missingCategories.length} missing`);

    // If all categories are cached, return immediately
    if (missingCategories.length === 0) {
      console.log('✅ All categories cached - returning directly');
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

    await jobStore.setJob(jobId, job);
    console.log(`✅ Job created: ${jobId}`);

    // Map subcategories to main categories for AI calls
    const mainCategoriesForAI = getMainCategoriesForAICalls(missingCategories);
    console.log(`🎯 Processing ${mainCategoriesForAI.length} main categories for AI: ${mainCategoriesForAI.join(', ')}`);

    // Trigger background processing (await to catch immediate errors)
    await triggerBackgroundProcessing(request, jobId, city, date, mainCategoriesForAI);

    // Return job for polling
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
