import { NextRequest, NextResponse } from 'next/server';
import { RequestBody, EventData, JobStatus } from '@/lib/types';
import { eventsCache } from '@/lib/cache';
import { getJobStore } from '@/lib/jobStore';
import { getMainCategoriesForAICalls } from '@/categories';

// Serverless configuration  
export const runtime = 'nodejs';
export const maxDuration = 300;

// Default categories - main categories only
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

// Get JobStore instance
const jobStore = getJobStore();

// Simple background processing scheduler
async function scheduleBackgroundProcessing(
  request: NextRequest,
  jobId: string,
  city: string,
  date: string,
  categories: string[]
) {
  const isVercel = process.env.VERCEL === '1';
  
  let backgroundUrl: string;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-vercel-background': '1',
  };

  if (isVercel) {
    const host = request.headers.get('x-vercel-deployment-url') || 
                  request.headers.get('x-forwarded-host') || 
                  request.headers.get('host');
    if (!host) {
      throw new Error('Unable to determine host for background processing');
    }
    backgroundUrl = `https://${host}/api/events/process`;
    
    // Add optional bypass headers
    if (process.env.PROTECTION_BYPASS_TOKEN) {
      headers['x-vercel-protection-bypass'] = process.env.PROTECTION_BYPASS_TOKEN;
    }
    if (process.env.INTERNAL_API_SECRET) {
      headers['x-internal-secret'] = process.env.INTERNAL_API_SECRET;
    }
  } else {
    backgroundUrl = 'http://localhost:3000/api/events/process';
  }

  console.log(`🚀 Scheduling background processing: ${backgroundUrl}`);

  const response = await fetch(backgroundUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({ jobId, city, date, categories }),
    signal: AbortSignal.timeout(10000) // 10s timeout
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`Background processing failed: ${response.status} - ${errorText}`);
  }

  console.log('✅ Background processing scheduled successfully');
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

    console.log(`Cache check: ${Object.keys(cacheResult.cachedEvents).length}/${effectiveCategories.length} categories cached`);
    console.log(`Missing categories: ${missingCategories.length}`);

    // If all categories are cached, return immediately
    if (missingCategories.length === 0) {
      console.log('All categories cached - returning directly');
      return NextResponse.json({
        events: allCachedEvents,
        status: 'completed',
        cached: true,
        message: allCachedEvents.length > 0 
          ? `${allCachedEvents.length} Events aus dem Cache geladen`
          : 'Keine Events gefunden'
      });
    }

    // Create job for missing categories
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
    console.log(`Processing ${mainCategoriesForAI.length} main categories: ${mainCategoriesForAI.join(', ')}`);

    // Schedule background processing
    try {
      await scheduleBackgroundProcessing(request, jobId, city, date, mainCategoriesForAI);
    } catch (scheduleError) {
      console.error('❌ Failed to schedule background processing:', scheduleError);
      await jobStore.updateJob(jobId, {
        status: 'error',
        error: 'Failed to start background processing: ' + (scheduleError instanceof Error ? scheduleError.message : String(scheduleError))
      });
      return NextResponse.json(
        { error: 'Failed to start background processing' },
        { status: 500 }
      );
    }

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
    console.error('Events API Error:', error);
    return NextResponse.json(
      { error: 'Unerwarteter Fehler beim Verarbeiten der Anfrage' },
      { status: 500 }
    );
  }
}
