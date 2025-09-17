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
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    let effective = (categories && categories.length > 0) ? categories : DEFAULT_CATEGORIES;
    effective = options?.forceAllCategories ? DEFAULT_CATEGORIES : mapToMainCategories(effective);

    const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
    if (!PERPLEXITY_API_KEY) {
      await jobStore.updateJob(jobId, { status: 'error', error: 'Missing Perplexity API key' });
      return NextResponse.json({ error: 'Perplexity API key not configured' }, { status: 500 });
    }

    const service = createPerplexityService(PERPLEXITY_API_KEY);
    const results = await service.executeMultiQuery(city, date, effective, options || {});

    const parsed = eventAggregator.aggregateResults(results);
    const ttlSeconds = computeTTLSecondsForEvents(parsed);

    // Cache per category
    const grouped: Record<string, any[]> = {};
    for (const ev of parsed) {
      if (!ev.category) continue;
      if (!grouped[ev.category]) grouped[ev.category] = [];
      grouped[ev.category].push(ev);
    }
    for (const cat of Object.keys(grouped)) {
      eventsCache.setEventsByCategory(city, date, cat, grouped[cat], ttlSeconds);
    }

    const finalEvents = eventAggregator.deduplicateEvents([
      ...(job.events || []),
      ...parsed
    ]);

    await jobStore.updateJob(jobId, {
      status: 'done',
      events: finalEvents,
      progress: { completedCategories: effective.length, totalCategories: effective.length },
      lastUpdateAt: new Date().toISOString()
    });

    return NextResponse.json({
      jobId,
      status: 'done',
      events: finalEvents,
      categoriesProcessed: effective,
      ttlApplied: ttlSeconds
    });

  } catch (error) {
    console.error('Background processing error:', error);
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
}
