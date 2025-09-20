import { NextRequest, NextResponse } from 'next/server';
import { RequestBody, EventData, JobStatus, DebugInfo } from '@/lib/types';
import { eventsCache } from '@/lib/cache';
import InMemoryCache from '@/lib/cache';
import { createPerplexityService } from '@/lib/perplexity';
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

export const runtime = 'nodejs';
export const maxDuration = 300;

const DEFAULT_CATEGORIES = EVENT_CATEGORIES;

const DEFAULT_PPLX_OPTIONS = {
  temperature: 0.2,
  max_tokens: 10000
};

const jobStore = getJobStore();

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
    const body: RequestBody = await request.json();
    const { city, date, categories, options } = body;

    if (!city || !date) {
      return NextResponse.json({ error: 'Stadt und Datum sind erforderlich' }, { status: 400 });
    }

    const effectiveCategories = categories && categories.length > 0 ? categories : DEFAULT_CATEGORIES;
    
    // Hot City Konfiguration laden
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

    // Wien.info Discovery-Link dynamisch hinzufügen (nur Wien)
    try {
      const isVienna = /(^|\s)wien(\s|$)|vienna/.test(city.toLowerCase());
      if (isVienna) {
        const mainCats = getMainCategoriesForAICalls(effectiveCategories);
        const f1Ids = getWienInfoF1IdsForCategories(mainCats);
        if (f1Ids.length > 0) {
          const wienInfoUrl = buildWienInfoUrl(date, date, f1Ids);
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

    const mergedOptions = { 
      ...DEFAULT_PPLX_OPTIONS, 
      ...options,
      hotCity: hotCityData,
      additionalSources
    };

    const disableCache = mergedOptions?.disableCache === true || mergedOptions?.debug === true;

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
          const mainCats = getMainCategoriesForAICalls(effectiveCategories);
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

            allCachedEvents = eventAggregator.deduplicateEvents([
              ...allCachedEvents,
              ...rssStamped
            ]);

            if (!disableCache) {
              const ttlRss = computeTTLSecondsForEvents(rssStamped);
              const grouped: Record<string, EventData[]> = {};
              for (const ev of rssStamped) {
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

            console.log(`Wien.at RSS merged: ${rssStamped.length} events`);
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

    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

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

    if (options?.debug) {
      const debugInfo: DebugInfo = {
        createdAt: new Date(),
        city,
        date,
        categories: effectiveCategories,
        options: mergedOptions,
        steps: []
      };
      await jobStore.setDebugInfo(jobId, debugInfo);
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
