import { NextRequest, NextResponse } from 'next/server';
import { eventsCache } from '@/lib/cache';
import { createPerplexityService } from '@/lib/perplexity';
import { eventAggregator } from '@/lib/aggregator';
import { computeTTLSecondsForEvents } from '@/lib/cacheTtl';
import { getJobStore } from '@/lib/jobStore';
import { EVENT_CATEGORIES, mapToMainCategories, normalizeCategory } from '@/lib/eventCategories';
import { upsertDayEvents } from '@/lib/dayCache';
import { processEvents, RawEventInput } from '../../../../lib/events/unified-event-pipeline';
import { waitUntil } from '@vercel/functions';
import { supabaseAdmin } from '@/lib/supabase/client';

export const runtime = 'nodejs';
export const maxDuration = 300;
const DEFAULT_CATEGORIES = EVENT_CATEGORIES;

/**
 * GET handler for /api/events/process
 * 
 * Enables GET support to prevent 405 errors and allow PostgreSQL writes.
 * 
 * Accepts query parameters and delegates to POST handler:
 * - Required: jobId, city, date
 * - Optional: categories (comma-separated), options (JSON string)
 * 
 * Example: /api/events/process?jobId=xyz&city=Wien&date=2025-01-20&categories=musik,kultur&options={"debug":true}
 * 
 * Returns 400 (not 405) if parameters are missing, allowing callers to fix their requests.
 */
export async function GET(request: NextRequest) {
  // GET requests don't have a body, so we extract parameters from query string
  const url = new URL(request.url);
  const jobId = url.searchParams.get('jobId');
  const city = url.searchParams.get('city');
  const date = url.searchParams.get('date');
  const categoriesParam = url.searchParams.get('categories');
  const optionsParam = url.searchParams.get('options');
  
  // If query parameters are provided, construct a body-like object and process
  if (jobId && city && date) {
    const categories = categoriesParam ? categoriesParam.split(',').map(c => c.trim()) : undefined;
    
    let options;
    try {
      options = optionsParam ? JSON.parse(optionsParam) : undefined;
    } catch (e) {
      console.error('Failed to parse options parameter:', e);
      return NextResponse.json({ 
        error: 'Invalid JSON in options parameter',
        example: '/api/events/process?jobId=xyz&city=Wien&date=2025-01-20&options={"debug":true}'
      }, { status: 400 });
    }
    
    // Create a mock request with the data in a format the POST handler expects
    const bodyData = {
      jobId,
      city,
      date,
      ...(categories && { categories }),
      ...(options && { options }),
    };
    
    // We need to create a new request with this data as the body
    const mockRequest = new Request(request.url, {
      method: 'POST',
      headers: request.headers,
      body: JSON.stringify(bodyData)
    });
    
    return POST(mockRequest as NextRequest);
  }
  
  // If no query parameters, return helpful error
  return NextResponse.json({ 
    error: 'This endpoint requires either POST with JSON body or GET with query parameters',
    requiredParams: ['jobId', 'city', 'date'],
    optionalParams: ['categories', 'options'],
    example: '/api/events/process?jobId=xyz&city=Wien&date=2025-01-20&categories=musik,kultur&options={"debug":true}'
  }, { status: 400 });
}

export async function POST(request: NextRequest) {
  try {
    const { jobId, city, date, categories, options } = await request.json();
    if (!jobId || !city || !date) {
      return NextResponse.json({ error: 'Missing job parameters' }, { status: 400 });
    }

    const getValidDatesForFiltering = (baseDate: string, timePeriod?: string): string[] => {
      if (timePeriod === 'kommendes-wochenende') {
        const friday = new Date(baseDate);
        const saturday = new Date(friday); saturday.setDate(friday.getDate() + 1);
        const sunday = new Date(friday); sunday.setDate(friday.getDate() + 2);
        const fmt = (d: Date) => d.toISOString().slice(0, 10);
        return [fmt(friday), fmt(saturday), fmt(sunday)];
      }
      return [baseDate];
    };

    const validDates = getValidDatesForFiltering(date, options?.timePeriod);

    const jobStore = getJobStore();
    const job = await jobStore.getJob(jobId);
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

    let effective = (categories && categories.length > 0) ? categories : DEFAULT_CATEGORIES;
    effective = options?.forceAllCategories ? DEFAULT_CATEGORIES : mapToMainCategories(effective);

    const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
    if (!PERPLEXITY_API_KEY) {
      await jobStore.updateJob(jobId, { status: 'error', error: 'Missing Perplexity API key' });
      return NextResponse.json({ error: 'Perplexity API key not configured' }, { status: 500 });
    }

    const service = createPerplexityService(PERPLEXITY_API_KEY);

    let runningEvents = eventAggregator.deduplicateEvents([...(job.events || [])]);

    const concurrency = Math.max(1, options?.categoryConcurrency ?? 10);
    for (let i = 0; i < effective.length; i += concurrency) {
      const batch = effective.slice(i, i + concurrency);

      const results = await service.executeMultiQuery(city, date, batch, {
        ...(options || {}),
        categoryConcurrency: concurrency,
        enableVenueQueries: true,          // venue queries
        venueQueryLimit: 20,
        venueQueryConcurrency: 2,
        debugVerbose: options?.debug
      });

      if (options?.debug) {
        for (const result of results) {
          const eventsFromResultRaw = eventAggregator.aggregateResults([result], validDates);
          const eventsFromResult = eventsFromResultRaw.map(e => ({ ...e, category: normalizeCategory(e.category || '') }));
          const category = eventsFromResult.length > 0 ? (eventsFromResult[0].category || 'Unknown') : 'Unknown';

          const debugStep = {
            category,
            query: result.query,
            response: result.response,
            parsedCount: eventsFromResult.length,
            venueId: (result as any).venueId || null,
            venueName: (result as any).venueName || null,
            isVenueQuery: !!(result as any).venueId
          };

          try {
            await jobStore.pushDebugStep(jobId, debugStep);
          } catch (error) {
            console.warn('Failed to save debug step:', error);
          }
        }
      }

      // KI-Events: Quelle setzen + Kategorie normalisieren
      const chunkRaw = eventAggregator.aggregateResults(results, validDates).map(e => ({ ...e, source: e.source ?? 'ai' as const }));
      const chunk = chunkRaw.map(e => ({ ...e, category: normalizeCategory(e.category || '') }));

      // Cache per Kategorie
      const ttlSeconds = computeTTLSecondsForEvents(chunk);
      const grouped: Record<string, any[]> = {};
      for (const ev of chunk) {
        if (!ev.category) continue;
        (grouped[ev.category] ||= []).push(ev);
      }
      for (const cat of Object.keys(grouped)) {
        await eventsCache.setEventsByCategory(city, date, cat, grouped[cat], ttlSeconds);
      }
      
      // Also upsert into day-bucket cache
      await upsertDayEvents(city, date, chunk);

      runningEvents = eventAggregator.deduplicateEvents([...runningEvents, ...chunk]);

      await jobStore.updateJob(jobId, {
        status: 'processing',
        events: runningEvents,
        progress: { completedCategories: Math.min(i + batch.length, effective.length), totalCategories: effective.length },
        lastUpdateAt: new Date().toISOString()
      });
    }

    // AFTER events are cached to Redis, ALSO save to PostgreSQL via unified pipeline (guaranteed to complete)
    waitUntil(
      (async () => {
        try {
          // Convert EventData to RawEventInput for unified pipeline
          const rawEvents: RawEventInput[] = runningEvents
            .filter(e => e.title && e.venue)
            .map(e => ({
              title: e.title,
              description: e.description,
              start_date_time: e.date && e.time ? `${e.date}T${e.time}:00.000Z` : e.date ? `${e.date}T00:00:00.000Z` : new Date().toISOString(),
              end_date_time: e.endTime && e.date ? `${e.date}T${e.endTime}:00.000Z` : undefined,
              venue_name: e.venue || 'Unknown Venue',
              venue_address: e.address,
              venue_city: e.city || city,
              category: e.category,
              price: e.price,
              website_url: e.website,
              ticket_url: e.bookingLink,
              image_url: e.imageUrl,
              source: 'ai-search' as const,
              source_url: e.website,
              latitude: e.latitude,
              longitude: e.longitude
            }));

          // Process through unified pipeline - handles venue matching, deduplication, and cache sync
          const pipelineResult = await processEvents(rawEvents, {
            source: 'ai-search',
            city: city,
            dryRun: false,
            debug: false
          });

          console.log(`[UnifiedPipeline] AI Search: Processed ${pipelineResult.eventsInserted} events, ${pipelineResult.venuesCreated} new venues for ${city}`);
          if (pipelineResult.errors.length > 0) {
            console.warn('[UnifiedPipeline] Errors:', pipelineResult.errors);
          }
        } catch (pipelineError) {
          // Don't fail the request if pipeline fails
          console.error('[UnifiedPipeline] Background processing failed:', pipelineError);
        }
      })()
    );

    // BACKGROUND: Download and store images in Supabase (non-blocking)
    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      waitUntil(
        (async () => {
          try {
            const { ImageDownloadService } = await import('@/lib/services/ImageDownloadService');
            const { generateEventImageId } = await import('@/lib/aggregator');

            const imageService = new ImageDownloadService(
              process.env.SUPABASE_URL!,
              process.env.SUPABASE_SERVICE_ROLE_KEY!
            );

            // Collect events that need image downloads
            const eventsToDownload = runningEvents
              .filter(e => e.imageUrl && e.imageUrl.startsWith('http') && !e.imageUrl.includes('supabase'))
              .map(e => ({
                url: e.imageUrl!,
                eventId: generateEventImageId(e),
                city: e.city || city,
                title: e.title,
                venue: e.venue
              }));

            if (eventsToDownload.length > 0) {
              console.log(`[ImageDownload:Background] Starting download for ${eventsToDownload.length} images...`);
              
              const downloadResults = await imageService.downloadAndStoreImageBatch(
                eventsToDownload,
                3 // 3 parallel downloads
              );

              // Update database with new Supabase URLs (this is the whole point!)
              let successCount = 0;
              let failCount = 0;
              
              for (let idx = 0; idx < downloadResults.length; idx++) {
                const result = downloadResults[idx];
                const originalEvent = eventsToDownload[idx];
                
                if (result.success && result.publicUrl) {
                  try {
                    // Update event in database with permanent Supabase URL
                    const { error: updateError } = await supabaseAdmin
                      .from('events')
                      .update({ 
                        image_urls: [result.publicUrl]
                      })
                      .eq('title', originalEvent.title)
                      .eq('venue_name', originalEvent.venue)
                      .eq('city', originalEvent.city);

                    if (!updateError) {
                      successCount++;
                      console.log(`[ImageDownload:Background] ✅ ${originalEvent.title}: Stored and DB updated`);
                    } else {
                      failCount++;
                      console.warn(`[ImageDownload:Background] ⚠️ ${originalEvent.title}: Stored but DB update failed: ${updateError.message}`);
                    }
                  } catch (dbError) {
                    failCount++;
                    console.warn(`[ImageDownload:Background] ⚠️ ${originalEvent.title}: Stored but DB update error`, dbError);
                  }
                } else {
                  failCount++;
                  console.warn(`[ImageDownload:Background] ❌ ${originalEvent.title}: ${result.error}`);
                }
              }
              
              console.log(`[ImageDownload:Background] Complete: ${successCount} images stored & updated, ${failCount} failed`);
            }
          } catch (error) {
            console.error('[ImageDownload:Background] Service failed:', error);
            // Silent failure - don't impact the main pipeline
          }
        })()
      );
    }

    await jobStore.updateJob(jobId, {
      status: 'done',
      events: runningEvents,
      progress: { completedCategories: effective.length, totalCategories: effective.length },
      lastUpdateAt: new Date().toISOString()
    });

    return NextResponse.json({ jobId, status: 'done', events: runningEvents, categoriesProcessed: effective });
  } catch (error) {
    console.error('Background processing error:', error);
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
}