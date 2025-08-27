import { NextRequest, NextResponse } from 'next/server';
import { RequestBody, EventData, JobStatus } from '@/lib/types';
import { eventsCache } from '@/lib/cache';
import InMemoryCache from '@/lib/cache';
import { createPerplexityService } from '@/lib/perplexity';
import { eventAggregator } from '@/lib/aggregator';
import { computeTTLSecondsForEvents } from '@/lib/cacheTtl';

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
  'Natur/Outdoor'
];

// Default Perplexity options
const DEFAULT_PPLX_OPTIONS = {
  temperature: 0.2,
  max_tokens: 1000
};

// Global map to store job statuses (shared with jobs API)
const globalForJobs = global as unknown as { jobMap?: Map<string, JobStatus> };
if (!globalForJobs.jobMap) {
  globalForJobs.jobMap = new Map();
}
const jobMap = globalForJobs.jobMap!;

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
    const mergedOptions = { ...DEFAULT_PPLX_OPTIONS, ...options };

    // Check cache first (dynamic TTL based on event timing)
    const cacheKey = InMemoryCache.createKey(city, date, effectiveCategories);
    const cachedEvents = eventsCache.get<EventData[]>(cacheKey);
    
    if (cachedEvents) {
      console.log('Cache hit for:', cacheKey);
      // Return cached results immediately as a completed job
      const jobId = `job_cached_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const job: JobStatus = {
        id: jobId,
        status: 'done',
        events: cachedEvents,
        createdAt: new Date()
      };
      jobMap.set(jobId, job);
      
      return NextResponse.json({
        jobId,
        status: 'pending' // Still return pending to maintain API compatibility
      });
    }

    // Generate unique job ID
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create job entry with pending status
    const job: JobStatus = {
      id: jobId,
      status: 'pending',
      createdAt: new Date()
    };

    jobMap.set(jobId, job);

    // Start background job (don't await)
    fetchPerplexityInBackground(jobId, city, date, effectiveCategories, mergedOptions);

    // Return job ID immediately
    return NextResponse.json({
      jobId,
      status: 'pending'
    });

  } catch (error) {
    console.error('Events API Error:', error);
    return NextResponse.json(
      { error: 'Unerwarteter Fehler beim Verarbeiten der Anfrage' },
      { status: 500 }
    );
  }
}

// Background function to fetch from Perplexity
async function fetchPerplexityInBackground(
  jobId: string, 
  city: string, 
  date: string, 
  categories?: string[], 
  options?: any
) {
  try {
    const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
    if (!PERPLEXITY_API_KEY) {
      const job = jobMap.get(jobId);
      if (job) {
        job.status = 'error';
        job.error = 'Perplexity API Key ist nicht konfiguriert';
      }
      return;
    }

    // Default to DEFAULT_CATEGORIES when categories is missing or empty
    const effectiveCategories = categories && categories.length > 0 ? categories : DEFAULT_CATEGORIES;
    
    console.log('Background job starting for:', jobId, city, date, effectiveCategories);

    const perplexityService = createPerplexityService(PERPLEXITY_API_KEY);
    if (!perplexityService) {
      const job = jobMap.get(jobId);
      if (job) {
        job.status = 'error';
        job.error = 'Failed to create Perplexity service';
      }
      return;
    }

    const job = jobMap.get(jobId);
    if (!job) return; // Job might have been cleaned up

    let events: EventData[] = [];

    // Always use multi-query approach across all categories
    const results = await perplexityService.executeMultiQuery(city, date, effectiveCategories, options);
    
    // Parse events from all results and aggregate them
    for (const result of results) {
      result.events = eventAggregator.parseEventsFromResponse(result.response);
    }
    
    events = eventAggregator.aggregateResults(results);

    // Categorize events
    events = eventAggregator.categorizeEvents(events);

    // Cache the results with dynamic TTL based on event timings
    const cacheKey = InMemoryCache.createKey(city, date, effectiveCategories);
    const ttlSeconds = computeTTLSecondsForEvents(events);
    eventsCache.set(cacheKey, events, ttlSeconds);

    console.log(`Background job cached ${events.length} events with TTL: ${ttlSeconds} seconds`);

    // Update job with results
    job.status = 'done';
    job.events = events;

  } catch (error) {
    console.error('Background job error for:', jobId, error);
    const job = jobMap.get(jobId);
    if (job) {
      job.status = 'error';
      job.error = 'Fehler beim Verarbeiten der Anfrage';
    }
  }
}