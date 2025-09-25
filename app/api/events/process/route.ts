import { NextRequest, NextResponse } from 'next/server';
import { eventsCache } from '@/lib/cache';
import { createPerplexityService } from '@/lib/perplexity';
import { eventAggregator } from '@/lib/aggregator';
import { computeTTLSecondsForEvents } from '@/lib/cacheTtl';
import { getJobStore } from '@/lib/jobStore';
import { EVENT_CATEGORIES, mapToMainCategories } from '@/lib/eventCategories';

export const runtime = 'nodejs';
export const maxDuration = 300;
const DEFAULT_CATEGORIES = EVENT_CATEGORIES;

export async function POST(request: NextRequest) {
  try {
    const { jobId, city, date, categories, options } = await request.json();
    if (!jobId || !city || !date) {
      return NextResponse.json({ error: 'Missing job parameters' }, { status: 400 });
    }

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

    // Start with existing job events
    let runningEvents = eventAggregator.deduplicateEvents([...(job.events || [])]);

    // NEU: Batch-Verarbeitung mehrerer Kategorien parallel
    const concurrency = Math.max(1, options?.categoryConcurrency ?? 3);

    for (let i = 0; i < effective.length; i += concurrency) {
      const batch = effective.slice(i, i + concurrency);

      const results = await service.executeMultiQuery(city, date, batch, {
        ...(options || {}),
        categoryConcurrency: concurrency
      });

      // Collect debug information if debug mode is enabled
      if (options?.debug) {
        for (const result of results) {
          // Determine category from the result (if available in the aggregated events)
          const eventsFromResult = eventAggregator.aggregateResults([result]);
          const category = eventsFromResult.length > 0 ? eventsFromResult[0].category || 'Unknown' : 'Unknown';
          
          const debugStep = {
            category,
            query: result.query,
            response: result.response,
            parsedCount: eventsFromResult.length
          };

          try {
            await jobStore.pushDebugStep(jobId, debugStep);
          } catch (error) {
            console.warn('Failed to save debug step:', error);
          }
        }
      }

      const chunk = eventAggregator.aggregateResults(results).map(e => ({ ...e, source: e.source ?? 'ai' as const }));

      // Cache per Kategorie
      const ttlSeconds = computeTTLSecondsForEvents(chunk);
      const grouped: Record<string, any[]> = {};
      for (const ev of chunk) {
        if (!ev.category) continue;
        (grouped[ev.category] ||= []).push(ev);
      }
      for (const cat of Object.keys(grouped)) {
        eventsCache.setEventsByCategory(city, date, cat, grouped[cat], ttlSeconds);
      }

      // Merge und Fortschritt updaten
      runningEvents = eventAggregator.deduplicateEvents([...runningEvents, ...chunk]);

      await jobStore.updateJob(jobId, {
        status: 'processing',
        events: runningEvents,
        progress: { completedCategories: Math.min(i + batch.length, effective.length), totalCategories: effective.length },
        lastUpdateAt: new Date().toISOString()
      });
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
