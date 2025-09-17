import { NextRequest, NextResponse } from 'next/server';
import { EventData } from '@/lib/types';
import { eventsCache } from '@/lib/cache';
import InMemoryCache from '@/lib/cache';
import { createPerplexityService } from '@/lib/perplexity';
import { eventAggregator } from '@/lib/aggregator';
import { computeTTLSecondsForEvents } from '@/lib/cacheTtl';
import { getJobStore } from '@/lib/jobStore';
import { getSubcategoriesForMainCategory } from '@/categories';
import { EVENT_CATEGORIES } from '@/lib/eventCategories';

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
    const existingJob = await jobStore.getJob(jobId);
    if (!existingJob) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const categoryList: string[] = (categories && categories.length > 0)
      ? categories
      : DEFAULT_CATEGORIES;

    const mainCategories = Array.from(new Set(categoryList));

    const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
    if (!PERPLEXITY_API_KEY) {
      await jobStore.updateJob(jobId, { status: 'error', error: 'Missing Perplexity API key' });
      return NextResponse.json({ error: 'Perplexity API key not configured' }, { status: 500 });
    }

    const service = createPerplexityService(PERPLEXITY_API_KEY);
    if (!service) {
      await jobStore.updateJob(jobId, { status: 'error', error: 'Failed to initialize service' });
      return NextResponse.json({ error: 'Service init failed' }, { status: 500 });
    }

    const results = await service.executeMultiQuery(city, date, mainCategories, options);
    const parsed = eventAggregator.aggregateResults(results);

    const ttlSeconds = computeTTLSecondsForEvents(parsed);
    const categoriesSeen = new Set<string>();
    for (const event of parsed) {
      if (event.category && !categoriesSeen.has(event.category)) {
        const catEvents = parsed.filter(e => e.category === event.category);
        eventsCache.setEventsByCategory(city, date, event.category, catEvents, ttlSeconds);
        categoriesSeen.add(event.category);
      }
    }

    const finalEvents = eventAggregator.deduplicateEvents([
      ...(existingJob.events || []),
      ...parsed
    ]);

    await jobStore.updateJob(jobId, {
      status: 'done',
      events: finalEvents,
      progress: {
        completedCategories: mainCategories.length,
        totalCategories: mainCategories.length
      },
      lastUpdateAt: new Date().toISOString()
    });

    return NextResponse.json({
      jobId,
      status: 'done',
      events: finalEvents,
      cached: false,
      categoriesProcessed: mainCategories,
      ttlApplied: ttlSeconds
    });

  } catch (error) {
    console.error('Background processing error:', error);
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
}