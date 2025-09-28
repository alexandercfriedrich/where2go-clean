import { NextRequest, NextResponse } from 'next/server';
import { RequestBody, EventData, JobStatus, DebugInfo } from '@/lib/types';
import { eventsCache } from '@/lib/cache';
import { eventAggregator } from '@/lib/aggregator';
import { computeTTLSecondsForEvents } from '@/lib/cacheTtl';
import { getJobStore } from '@/lib/jobStore';
import { getHotCity, getCityWebsitesForCategories } from '@/lib/hotCityStore';
import { getMainCategoriesForAICalls } from '@/categories';
import { EVENT_CATEGORIES } from '@/lib/eventCategories';

// Wien.info (Discovery + JSON API)
import { buildWienInfoUrl, getWienInfoF1IdsForCategories } from '@/event_mapping_wien_info';
import { fetchWienInfoEvents } from '@/lib/sources/wienInfo';

// Optional: Resident Advisor RSS
import { fetchResidentAdvisorRss } from '@/lib/sources/residentAdvisor';

export const runtime = 'nodejs';
export const maxDuration = 300;

// Default categories from SSOT
const DEFAULT_CATEGORIES = EVENT_CATEGORIES;

function getValidDatesForFiltering(baseDate: string, timePeriod?: string): string[] {
  if (timePeriod === 'kommendes-wochenende') {
    const friday = new Date(baseDate);
    const saturday = new Date(friday); saturday.setDate(friday.getDate() + 1);
    const sunday = new Date(friday); sunday.setDate(friday.getDate() + 2);
    const formatDate = (d: Date) => d.toISOString().slice(0, 10);
    return [formatDate(friday), formatDate(saturday), formatDate(sunday)];
  }
  return [baseDate];
}

const DEFAULT_PPLX_OPTIONS = {
  temperature: 0.2,
  max_tokens: 10000
};

const jobStore = getJobStore();

function createActiveJobKey(city: string, date: string, categories: string[]): string {
  const sorted = [...categories].sort();
  return `city=${city}|date=${date}|cats=${sorted.join(',')}`;
}

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
    if (!host) throw new Error('Unable to determine host for background processing');

    const backgroundUrl = `${protocol}://${host}/api/events/process`;
    console.log('Scheduling background processing via Vercel:', backgroundUrl);

    const protectionBypass = process.env.PROTECTION_BYPASS_TOKEN;
    const internalSecret = process.env.INTERNAL_API_SECRET;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-vercel-background': '1',
    };
    if (protectionBypass) headers['x-vercel-protection-bypass'] = protectionBypass;
    if (internalSecret) headers['x-internal-secret'] = internalSecret;

    const response = await fetch(backgroundUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ jobId, city, date, categories, options })
    });

    if (!response.ok) throw new Error(`Background scheduling failed: ${response.status} ${response.statusText}`);
    console.log('Background processing scheduled successfully');
  } else {
    const localUrl = 'http://localhost:3000/api/events/process';
    console.log('Local dev background call:', localUrl);
    fetch(localUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-vercel-background': '1' },
      body: JSON.stringify({ jobId, city, date, categories, options })
    }).catch(error => console.error('Local background request failed:', error));
  }
}

export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const qDebug = url.searchParams.get('debug') === '1';
    const qVerbose = url.searchParams.get('verbose') === '1';

    const body: RequestBody = await request.json();
    const { city, date, categories, options } = body;

    if (!city || !date) {
      return NextResponse.json({ error: 'Stadt und Datum sind erforderlich' }, { status: 400 });
    }

    // Map inputs to main categories (SSOT)
    const requested = Array.isArray(categories) ? categories : [];
    const effectiveInput = requested.length > 0 ? requested : DEFAULT_CATEGORIES;
    const effectiveCategories = getMainCategoriesForAICalls(effectiveInput);

    // Hot city config
    let hotCityData: any = null;
    let additionalSources: any[] = [];
    try {
      hotCityData = await getHotCity(city);
      if (hotCityData) {
        additionalSources = await getCityWebsitesForCategories(city, effectiveCategories);
        console.log(`Hot City '${city}' active – ${additionalSources.length} sources`);
      }
    } catch (error) {
      console.error('Hot City fetch error:', error);
    }

    // Wien.info Discovery URL (debug)
    try {
      const isVienna = /(^|\s)wien(\s|$)|vienna/.test(city.toLowerCase());
      if (isVienna) {
        const f1Ids = getWienInfoF1IdsForCategories(effectiveCategories);
        if (f1Ids.length > 0) {
          const wienInfoUrl = buildWienInfoUrl(date, date, f1Ids);
          if (qDebug) {
            console.log('[WIEN.INFO:DISCOVERY]', { mainCats: effectiveCategories, url: wienInfoUrl });
          }
          additionalSources = [
            ...additionalSources,
            {
              name: 'Wien.info Filter',
              url: wienInfoUrl,
              categories: effectiveCategories,
              priority: 7,
              isActive: true,
              description: 'Dynamic filter link (dr, f1) for Vienna events on wien.info'
            }
          ];
        }
      }
    } catch (e) {
      console.warn('Wien.info link generation failed:', (e as Error).message);
    }

    // Early events (Wien.info JSON) for fast feedback
    let earlyEvents: EventData[] = [];
    let wienInfoDebugData: any = null;

    try {
      const shouldFetchWienInfo =
        request.nextUrl.searchParams.get('fetchWienInfo') === '1' ||
        (options && (options as any).fetchWienInfo === true);
      const isVienna = /(^|\s)wien(\s|$)|vienna/.test(city.toLowerCase());

      if (shouldFetchWienInfo && isVienna) {
        const wienInfoResult = await fetchWienInfoEvents({
          fromISO: date,
          toISO: date,
          categories: effectiveCategories,
          limit: 120,
          debug: (options as any)?.debug === true || qDebug,
          debugVerbose: (options as any)?.debugVerbose === true || qVerbose
        });

        if (wienInfoResult.events.length) {
          const normalized = wienInfoResult.events.map(ev => ({
            title: ev.title,
            category: ev.category,
            date: ev.date,
            time: ev.time || '',
            venue: ev.venue || '',
            price: ev.price || '',
            website: ev.website || '',
            source: ev.source,
            city: ev.city || 'Wien'
          }));
          const deduped = eventAggregator.deduplicateEvents(normalized);
          earlyEvents.push(...deduped);
          if (qDebug) console.log('[WIEN.INFO:EARLY]', { count: deduped.length });
        } else if (wienInfoResult.error) {
          console.log('[WIEN.INFO:ERROR]', wienInfoResult.error);
          if (qDebug) console.log('[WIEN.INFO:EARLY]', { count: 0, error: wienInfoResult.error });
        }

        if (wienInfoResult.debugInfo && ((options as any)?.debug === true || qDebug)) {
          wienInfoDebugData = wienInfoResult.debugInfo;
        }
      }
    } catch (e) {
      console.warn('Wien.info fetch failed:', (e as Error).message);
    }

    // Merge options
    const mergedOptions = {
      ...DEFAULT_PPLX_OPTIONS,
      ...options,
      hotCity: hotCityData,
      additionalSources,
      debug: (options as any)?.debug === true || qDebug,
      debugVerbose: (options as any)?.debugVerbose === true || qVerbose,
      categoryConcurrency: (options as any)?.categoryConcurrency ?? 3
    };

    // Important: debug must NOT disable cache
    const disableCache = (mergedOptions as any)?.disableCache === true;

    // 1) Cache read
    let allCachedEvents: EventData[] = [];
    let missingCategories: string[] = [];
    let cacheInfo: { [category: string]: { fromCache: boolean; eventCount: number } } = {};

    if (!disableCache) {
      const cacheResult = await eventsCache.getEventsByCategories(city, date, effectiveCategories);
      const cachedEventsList: EventData[] = [];
      for (const category in cacheResult.cachedEvents) {
        cachedEventsList.push(...cacheResult.cachedEvents[category]);
      }
      const cachedStamped = cachedEventsList.map(e => ({ ...e, source: e.source ?? 'cache' as const }));
      allCachedEvents = eventAggregator.deduplicateEvents(cachedStamped);
      missingCategories = cacheResult.missingCategories;
      cacheInfo = cacheResult.cacheInfo;
    } else {
      missingCategories = effectiveCategories;
      for (const category of effectiveCategories) {
        cacheInfo[category] = { fromCache: false, eventCount: 0 };
      }
    }

    // 2) Merge EarlyEvents and cache them immediately per category
    if (earlyEvents.length > 0) {
      const validDates = getValidDatesForFiltering(date, (mergedOptions as any)?.timePeriod);
      const filteredEarlyEvents = earlyEvents.filter(event => {
        const eventDate = event.date?.slice(0, 10);
        return !eventDate || validDates.includes(eventDate);
      });

      allCachedEvents = eventAggregator.deduplicateEvents([
        ...filteredEarlyEvents,
        ...allCachedEvents
      ]);

      if (!disableCache && filteredEarlyEvents.length > 0) {
        const ttlSeconds = computeTTLSecondsForEvents(filteredEarlyEvents);
        const seenCategories = new Set<string>();
        for (const event of filteredEarlyEvents) {
          if (event.category && !seenCategories.has(event.category)) {
            const categoryEvents = filteredEarlyEvents.filter(e => e.category === event.category);
            try {
              await eventsCache.setEventsByCategory(city, date, event.category, categoryEvents, ttlSeconds);
              seenCategories.add(event.category);
              if (qDebug) {
                console.log(`[WIEN.INFO:CACHE] Cached ${categoryEvents.length} events for category: ${event.category}`);
              }
              cacheInfo[event.category] = {
                fromCache: cacheInfo[event.category]?.fromCache ?? false,
                eventCount: (cacheInfo[event.category]?.eventCount || 0) + categoryEvents.length
              };
            } catch (error) {
              console.warn(`Failed to cache Wien.info events for category ${event.category}:`, error);
            }
          }
        }
      }
    }

    // 3) Optional: Resident Advisor RSS (also cached per category if enabled in sources)
    try {
      const raSites = Array.isArray(additionalSources)
        ? additionalSources.filter((s: any) => typeof s.url === 'string' && /ra\.co|residentadvisor\.net/i.test(s.url))
        : [];

      if (raSites.length && !disableCache) {
        const raEventsAll: EventData[] = [];
        for (const site of raSites) {
          const events = await fetchResidentAdvisorRss({ url: site.url, city, date: date.slice(0, 10) });
          raEventsAll.push(...events);
        }

        if (raEventsAll.length) {
          allCachedEvents = eventAggregator.deduplicateEvents([...allCachedEvents, ...raEventsAll]);

          const ttlRss = computeTTLSecondsForEvents(raEventsAll);
          const grouped: Record<string, EventData[]> = {};
          for (const ev of raEventsAll) {
            if (!ev.category) continue;
            (grouped[ev.category] ||= []).push(ev);
          }
          for (const cat of Object.keys(grouped)) {
            await eventsCache.setEventsByCategory(city, date, cat, grouped[cat], ttlRss);
            cacheInfo[cat] = {
              fromCache: cacheInfo[cat]?.fromCache ?? false,
              eventCount: (cacheInfo[cat]?.eventCount || 0) + grouped[cat].length
            };
          }
        }
      }
    } catch (e) {
      console.warn('RSS fetch failed:', (e as any)?.message || e);
    }

    // If no missing categories remain, return immediately
    if (missingCategories.length === 0) {
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

    // Job reuse
    const activeJobKey = createActiveJobKey(city, date, effectiveCategories);
    const existingJobId = await jobStore.getActiveJob(activeJobKey);
    if (existingJobId) {
      const existingJob = await jobStore.getJob(existingJobId);
      if (existingJob && (existingJob.status === 'processing' || existingJob.status === 'pending')) {
        const jobEvents = existingJob.events || [];
        const mergedEvents = eventAggregator.deduplicateEvents([...allCachedEvents, ...jobEvents]);

        console.log(`Reusing active jobId ${existingJobId} for key: ${activeJobKey}`);

        return NextResponse.json({
          jobId: existingJobId,
          status: existingJob.status,
          events: mergedEvents,
          cached: allCachedEvents.length > 0,
          cacheInfo: {
            fromCache: allCachedEvents.length > 0,
            totalEvents: mergedEvents.length,
            cachedEvents: allCachedEvents.length,
            cacheBreakdown: cacheInfo
          },
          progress: existingJob.progress || {
            completedCategories: effectiveCategories.length - missingCategories.length,
            totalCategories: effectiveCategories.length
          }
        });
      }
    }

    // Create new job
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`Creating new jobId ${jobId} for key: ${activeJobKey}`);

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

    // Map active job with TTL
    await jobStore.setActiveJob(activeJobKey, jobId, 10 * 60);

    if ((mergedOptions as any)?.debug) {
      const debugInfo: DebugInfo = {
        createdAt: new Date(),
        city,
        date,
        categories: effectiveCategories,
        options: mergedOptions,
        steps: []
      };
      await jobStore.setDebugInfo(jobId, debugInfo);

      if (wienInfoDebugData) {
        const debugStep = {
          category: 'Wien.info',
          query: wienInfoDebugData.query,
          response: wienInfoDebugData.response,
          parsedCount: earlyEvents.length
        };
        try {
          await jobStore.pushDebugStep(jobId, debugStep);
        } catch (error) {
          console.warn('Failed to save Wien.info debug step:', error);
        }
      }
    }

    // Schedule background processing of missing categories
    const mainCategoriesForAI = getMainCategoriesForAICalls(missingCategories);
    try {
      await scheduleBackgroundProcessing(request, jobId, city, date, mainCategoriesForAI, mergedOptions);
    } catch (scheduleError) {
      console.error('Schedule background error:', scheduleError);
      await jobStore.updateJob(jobId, {
        status: 'error',
        error: 'Failed to schedule background processing'
      });
      return NextResponse.json({ error: 'Failed to schedule background processing' }, { status: 500 });
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
        missingCategories
      },
      message: allCachedEvents.length > 0
        ? `${allCachedEvents.length} Events aus dem Cache geladen, ${missingCategories.length} Kategorien werden verarbeitet...`
        : `${missingCategories.length} Kategorien werden verarbeitet...`
    });

  } catch (error) {
    console.error('Events API Error:', error);
    return NextResponse.json({ error: 'Unerwarteter Fehler beim Verarbeiten der Anfrage' }, { status: 500 });
  }
}
