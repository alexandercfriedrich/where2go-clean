import { NextRequest, NextResponse } from 'next/server';
import { RequestBody, EventData, JobStatus, DebugInfo } from '@/lib/types';
import { eventsCache } from '@/lib/cache';
import { eventAggregator } from '@/lib/aggregator';
import { computeTTLSecondsForEvents } from '@/lib/cacheTtl';
import { getJobStore } from '@/lib/jobStore';
import { getHotCity, getCityWebsitesForCategories } from '@/lib/hotCityStore';
import { getMainCategoriesForAICalls } from '@/categories';
import { EVENT_CATEGORIES } from '@/lib/eventCategories';

// Wien.gv.at (VADB) RSS Vorab-Quelle
import { fetchWienAtEvents, mapMainToViennaKats } from '@/lib/sources/wienAt';

// Wien.info Filter-Mapping (Discovery-Link für KI/Navigation)
import { buildWienInfoUrl, getWienInfoF1IdsForCategories } from '@/event_mapping_wien_info';
import { fetchWienInfoEvents } from '@/lib/sources/wienInfo';

export const runtime = 'nodejs';
export const maxDuration = 300;

// Default-Kategorien ausschließlich aus der SSOT ableiten
const DEFAULT_CATEGORIES = EVENT_CATEGORIES;

// Helper function to determine valid dates for filtering
function getValidDatesForFiltering(baseDate: string, timePeriod?: string): string[] {
  if (timePeriod === 'kommendes-wochenende') {
    // For weekend, calculate Friday, Saturday, Sunday from the base date (which should be Friday)
    const friday = new Date(baseDate);
    const saturday = new Date(friday);
    saturday.setDate(friday.getDate() + 1);
    const sunday = new Date(friday);
    sunday.setDate(friday.getDate() + 2);
    
    const formatDate = (d: Date) => d.toISOString().slice(0, 10);
    return [formatDate(friday), formatDate(saturday), formatDate(sunday)];
  }
  return [baseDate]; // Single date for heute, morgen, or custom date
}

const DEFAULT_PPLX_OPTIONS = {
  temperature: 0.2,
  max_tokens: 10000
};

const jobStore = getJobStore();

// Helper function to create composite key for active job mapping
function createActiveJobKey(city: string, date: string, categories: string[]): string {
  const sortedCategories = [...categories].sort();
  return `city=${city}|date=${date}|cats=${sortedCategories.join(',')}`;
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

    // Eingaben oder Defaults → immer zu HAUPTKATEGORIEN mappen (SSOT)
    const requested = Array.isArray(categories) ? categories : [];
    const effectiveInput = requested.length > 0 ? requested : DEFAULT_CATEGORIES;
    const effectiveCategories = getMainCategoriesForAICalls(effectiveInput);
    
    // Hot City Konfiguration laden
    let hotCityData: any = null;
    let additionalSources: any[] = [];
    try {
      hotCityData = await getHotCity(city);
      if (hotCityData) {
        // Quellen gegen Hauptkategorien filtern/auflösen
        additionalSources = await getCityWebsitesForCategories(city, effectiveCategories);
        console.log(`Hot City '${city}' active – ${additionalSources.length} sources`);
      }
    } catch (error) {
      console.error('Hot City fetch error:', error);
    }

    // Wien.info Discovery-Link dynamisch hinzufügen (nur Wien)
    try {
      const isVienna = /(^|\s)wien(\s|$)|vienna/.test(city.toLowerCase());
      if (isVienna) {
        const mainCats = effectiveCategories; // bereits gemappt
        const f1Ids = getWienInfoF1IdsForCategories(mainCats);
        if (f1Ids.length > 0) {
          const wienInfoUrl = buildWienInfoUrl(date, date, f1Ids);
          if (qDebug) {
            console.log('[WIEN.INFO:DISCOVERY]', { mainCats, url: wienInfoUrl });
          }
          additionalSources = [
            ...additionalSources,
            {
              name: 'Wien.info Filter',
              url: wienInfoUrl,
              categories: mainCats,
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

    // Frühe Sammelliste für schnelle Quellen (z.B. Wien.info, RSS)
    let earlyEvents: EventData[] = [];
    let wienInfoDebugData: any = null;

    // Optional: direkte Wien.info HTML Events (Opt-In)
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
          if (qDebug) {
            console.log('[WIEN.INFO:EARLY]', { count: deduped.length });
          }
        } else if (wienInfoResult.error) {
          // Log Wien.info error but continue processing
          console.log('[WIEN.INFO:ERROR]', wienInfoResult.error);
          if (qDebug) {
            console.log('[WIEN.INFO:EARLY]', { count: 0, error: wienInfoResult.error });
          }
        }

        // Store Wien.info debug information for later use
        if (wienInfoResult.debugInfo && ((options as any)?.debug === true || qDebug)) {
          wienInfoDebugData = wienInfoResult.debugInfo;
        }
      }
    } catch (e) {
      console.warn('Wien.info fetch failed:', (e as Error).message);
    }

    const mergedOptions = { 
      ...DEFAULT_PPLX_OPTIONS, 
      ...options,
      hotCity: hotCityData,
      additionalSources,
      // Debug/Verbose auch per Query-Param aktivierbar
      debug: (options as any)?.debug === true || qDebug,
      debugVerbose: (options as any)?.debugVerbose === true || qVerbose,
      categoryConcurrency: (options as any)?.categoryConcurrency ?? 3
    };

    const disableCache = (mergedOptions as any)?.disableCache === true || (mergedOptions as any)?.debug === true;

    let allCachedEvents: EventData[] = [];
    let missingCategories: string[] = [];
    let cacheInfo: { [category: string]: { fromCache: boolean; eventCount: number } } = {};

    if (!disableCache) {
      const cacheResult = eventsCache.getEventsByCategories(city, date, effectiveCategories);
      const cachedEventsList: EventData[] = [];
      for (const category in cacheResult.cachedEvents) {
        cachedEventsList.push(...cacheResult.cachedEvents[category]);
      }
      // Stamp cache provenance
      const cachedStamped = cachedEventsList.map(e => ({ ...e, source: e.source ?? 'cache' as const }));
      allCachedEvents = eventAggregator.deduplicateEvents(cachedStamped);
      missingCategories = cacheResult.missingCategories;
      cacheInfo = cacheResult.cacheInfo;
    } else {
      missingCategories = effectiveCategories;
      effectiveCategories.forEach(category => {
        cacheInfo[category] = { fromCache: false, eventCount: 0 };
      });
    }

    // Combine early events with cached events
    if (earlyEvents.length > 0) {
      // Filter early events by valid dates
      const validDates = getValidDatesForFiltering(date, (mergedOptions as any)?.timePeriod);
      const filteredEarlyEvents = earlyEvents.filter(event => {
        const eventDate = event.date?.slice(0, 10);
        return !eventDate || validDates.includes(eventDate);
      });
      
      if (qDebug && filteredEarlyEvents.length !== earlyEvents.length) {
        console.log('[EARLY-EVENTS:DATE-FILTER]', {
          validDates,
          beforeFilter: earlyEvents.length,
          afterFilter: filteredEarlyEvents.length,
          filteredOut: earlyEvents.length - filteredEarlyEvents.length
        });
      }
      
      allCachedEvents = eventAggregator.deduplicateEvents([
        ...filteredEarlyEvents,
        ...allCachedEvents
      ]);
    }

    // Wien.gv.at (VADB) RSS – schnelle Vorab-Ergebnisse (nur Wien)
    try {
      const isVienna = /(^|\s)wien(\s|$)|vienna/.test(city.toLowerCase());
      if (isVienna && Array.isArray(additionalSources)) {
        const rssSites = additionalSources.filter((s: any) =>
          typeof s.url === 'string' &&
          /wien\.gv\.at\/vadb\/internet\/AdvPrSrv\.asp/i.test(s.url) &&
          s.isActive !== false
        );

        if (rssSites.length) {
          const mainCats = effectiveCategories; // bereits gemappt
          const viennaKats = mapMainToViennaKats(mainCats);
          const rssResults: EventData[] = [];

          for (const site of rssSites) {
            const initial = await fetchWienAtEvents({
              baseUrl: site.url,
              fromISO: date,
              toISO: date,
              extraQuery: site.searchQuery || '', // KATx aus extraQuery wird überschrieben, wenn viennaKats gesetzt
              viennaKats,
              limit: 500
            });
            rssResults.push(...initial);

            // Fallback: Breite Abfrage ohne KAT1, wenn initial 0
            if (initial.length === 0) {
              const broad = await fetchWienAtEvents({
                baseUrl: site.url,
                fromISO: date,
                toISO: date,
                extraQuery: site.searchQuery || '',
                limit: 500
              });
              rssResults.push(...broad);
            }
          }

          if (rssResults.length) {
            // Stamp RSS provenance
            const rssStamped = rssResults.map(e => ({ ...e, source: e.source ?? 'rss' as const }));

            // Filter RSS events by valid dates
            const validDates = getValidDatesForFiltering(date, (mergedOptions as any)?.timePeriod);
            const filteredRssEvents = rssStamped.filter(event => {
              const eventDate = event.date?.slice(0, 10);
              return !eventDate || validDates.includes(eventDate);
            });
            
            if (qDebug && filteredRssEvents.length !== rssStamped.length) {
              console.log('[RSS-EVENTS:DATE-FILTER]', {
                validDates,
                beforeFilter: rssStamped.length,
                afterFilter: filteredRssEvents.length,
                filteredOut: rssStamped.length - filteredRssEvents.length
              });
            }

            allCachedEvents = eventAggregator.deduplicateEvents([
              ...allCachedEvents,
              ...filteredRssEvents
            ]);

            if (!disableCache) {
              const ttlRss = computeTTLSecondsForEvents(filteredRssEvents);
              const grouped: Record<string, EventData[]> = {};
              for (const ev of filteredRssEvents) {
                if (!ev.category) continue;
                if (!grouped[ev.category]) grouped[ev.category] = [];
                grouped[ev.category].push(ev);
              }
              for (const cat of Object.keys(grouped)) {
                eventsCache.setEventsByCategory(city, date, cat, grouped[cat], ttlRss);
                cacheInfo[cat] = {
                  fromCache: false,
                  eventCount: (cacheInfo[cat]?.eventCount || 0) + grouped[cat].length
                };
              }
            }

            console.log(`Wien.at RSS merged: ${filteredRssEvents.length} events (${rssStamped.length - filteredRssEvents.length} filtered by date)`);
          }
        }
      }
    } catch (e) {
      console.warn('Wien.at RSS integration failed:', (e as Error).message);
    }

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

    // Check for existing active job for job reuse
    const activeJobKey = createActiveJobKey(city, date, effectiveCategories);
    const existingJobId = await jobStore.getActiveJob(activeJobKey);
    
    if (existingJobId) {
      const existingJob = await jobStore.getJob(existingJobId);
      if (existingJob && (existingJob.status === 'processing' || existingJob.status === 'pending')) {
        // Reuse existing job - merge cached events with job events and return immediately
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

    // Set active job mapping with 10-minute TTL
    const activeJobTtlSeconds = 10 * 60; // 10 minutes
    await jobStore.setActiveJob(activeJobKey, jobId, activeJobTtlSeconds);

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

      // Add Wien.info debug information if available
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
        missingCategories: missingCategories
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
