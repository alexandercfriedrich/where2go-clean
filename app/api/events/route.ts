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

// Robust background processing trigger with proper error handling
async function triggerBackgroundProcessing(
  request: NextRequest,
  jobId: string,
  city: string,
  date: string,
  categories: string[]
) {
  const host = request.headers.get('x-forwarded-host') || 
                request.headers.get('host') || 
                'localhost:3000';
                
  const protocol = host.includes('localhost') ? 'http' : 'https';
  const backgroundUrl = `${protocol}://${host}/api/events/process`;

  console.log(`🚀 Triggering background processing: ${backgroundUrl}`);
  console.log(`🔧 Payload:`, { jobId, city, date, categories: categories.length });

  try {
    const response = await fetch(backgroundUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'where2go-background-trigger/1.0'
      },
      body: JSON.stringify({ jobId, city, date, categories }),
    });

    console.log(`📡 Background trigger response: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Background processing trigger failed: ${response.status} - ${errorText}`);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    console.log(`✅ Background processing triggered successfully:`, result);

  } catch (error) {
    console.error('❌ Background processing trigger failed:', error);
    // Update job to error state if background processing fails to start
    try {
      await jobStore.updateJob(jobId, {
        status: 'error',
        error: `Failed to start background processing: ${error instanceof Error ? error.message : String(error)}`
      });
      console.log(`🔄 Job ${jobId} updated to error state due to background trigger failure`);
    } catch (updateError) {
      console.error('❌ Failed to update job after background error:', updateError);
    }
  }
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
