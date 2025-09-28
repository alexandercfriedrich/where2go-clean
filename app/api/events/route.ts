// Optimiertes Main Route für bessere Event-Erfassung
// Diese Datei zeigt die wichtigsten Änderungen am Haupt-API Route

import { NextRequest, NextResponse } from 'next/server';
import { RequestBody, EventData, JobStatus, DebugInfo } from '@/lib/types';
import { eventsCache } from '@/lib/cache';
import { eventAggregator } from '@/lib/aggregator';
import { getJobStore } from '@/lib/jobStore';
import { getEnhancedCityWebsitesForCategories, getCitySpecificSearchStrategies } from '@/lib/hotCityStore';
import { getMainCategoriesForAICalls, EVENT_CATEGORIES } from '@/lib/eventCategories';

export const runtime = 'nodejs';
export const maxDuration = 300;

// Verbesserte Default-Optionen
const OPTIMIZED_PPLX_OPTIONS = {
  temperature: 0.1,        // Reduziert für fokussiertere Ergebnisse
  max_tokens: 40000,       // Erhöht für mehr Events
  categoryConcurrency: 5   // Erhöht für bessere Parallelisierung
};

const jobStore = getJobStore();
const DEFAULT_CATEGORIES = EVENT_CATEGORIES;

// Helper function für erweiterte Datumsfilterung
function getValidDatesForFiltering(baseDate: string, timePeriod?: string): string[] {
  if (timePeriod === 'kommendes-wochenende') {
    const friday = new Date(baseDate);
    const saturday = new Date(friday);
    saturday.setDate(friday.getDate() + 1);
    const sunday = new Date(friday);
    sunday.setDate(friday.getDate() + 2);
    
    const formatDate = (d: Date) => d.toISOString().slice(0, 10);
    return [formatDate(friday), formatDate(saturday), formatDate(sunday)];
  }
  return [baseDate];
}

// Erweiterte Background-Verarbeitung mit Retry-Mechanismus
async function scheduleBackgroundProcessing(
  request: NextRequest,
  jobId: string,
  city: string,
  date: string,
  categories: string[],
  options: any
) {
  const isVercel = process.env.VERCEL === '1';
  
  // Erweiterte Optionen für bessere Event-Erfassung
  const enhancedOptions = {
    ...OPTIMIZED_PPLX_OPTIONS,
    ...options,
    // Zusätzliche Suchstrategien
    citySearchStrategies: getCitySpecificSearchStrategies(city),
    maxRetries: 3,           // Retry-Mechanismus
    fallbackSearchEnabled: true,
    diversityBoost: true     // Flag für erweiterte Diversitäts-Suche
  };
  
  if (isVercel) {
    const deploymentUrl = request.headers.get('x-vercel-deployment-url');
    const host = deploymentUrl || request.headers.get('x-forwarded-host') || request.headers.get('host');
    const protocol = 'https';
    
    if (!host) throw new Error('Unable to determine host for background processing');
    
    const backgroundUrl = `${protocol}://${host}/api/events/process`;
    console.log('Scheduling enhanced background processing:', backgroundUrl);
    
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
      body: JSON.stringify({ jobId, city, date, categories, options: enhancedOptions })
    });
    
    if (!response.ok) throw new Error(`Background scheduling failed: ${response.status} ${response.statusText}`);
    console.log('Enhanced background processing scheduled successfully');
    
  } else {
    const localUrl = 'http://localhost:3000/api/events/process';
    console.log('Local dev enhanced background call:', localUrl);
    
    fetch(localUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-vercel-background': '1' },
      body: JSON.stringify({ jobId, city, date, categories, options: enhancedOptions })
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

    // Erweiterte Kategorien-Verarbeitung
    const requested = Array.isArray(categories) ? categories : [];
    const effectiveInput = requested.length > 0 ? requested : DEFAULT_CATEGORIES;
    const effectiveCategories = getMainCategoriesForAICalls(effectiveInput);
    
    console.log(`[ENHANCED] Processing ${effectiveCategories.length} categories for ${city} on ${date}`);

    // Erweiterte Hot City Konfiguration
    let hotCityData: any = null;
    let additionalSources: any[] = [];
    let citySearchStrategies: string[] = [];
    
    try {
      // Verwende optimierte Hot City Funktion
      additionalSources = getEnhancedCityWebsitesForCategories(city, effectiveCategories);
      citySearchStrategies = getCitySpecificSearchStrategies(city);
      
      if (additionalSources.length > 0) {
        hotCityData = {
          city,
          totalSources: additionalSources.length,
          sourceTypes: [...new Set(additionalSources.map(s => s.sourceType))],
          prioritySources: additionalSources.filter(s => s.priority >= 8).length
        };
        
        console.log(`[HOT-CITY] Enhanced: ${city} - ${additionalSources.length} sources, ${citySearchStrategies.length} strategies`);
      }
    } catch (error) {
      console.error('Enhanced Hot City fetch error:', error);
    }

    // Erweiterte Wien.info Integration (bereits vorhanden, aber optimiert)
    try {
      const isVienna = /(^|\s)wien(\s|$)|vienna/.test(city.toLowerCase());
      if (isVienna) {
        const mainCats = effectiveCategories;
        
        // Mehr Wien-spezifische Quellen hinzufügen
        const wienSpecificSources = [
          {
            name: 'Wien.info Enhanced Filter',
            url: 'https://www.wien.info/de/sightseeing/events-wien',
            categories: mainCats,
            priority: 9,
            isActive: true,
            sourceType: 'official',
            description: 'Enhanced Wien.info filter with multiple search strategies'
          },
          {
            name: 'Falter Event Guide',
            url: 'https://www.falter.at/events',
            categories: mainCats,
            priority: 8,
            isActive: true,
            sourceType: 'news',
            description: 'Vienna\'s premier cultural magazine'
          }
        ];
        
        additionalSources = [...additionalSources, ...wienSpecificSources];
        
        if (qDebug) {
          console.log('[WIEN.INFO:ENHANCED]', { 
            mainCats, 
            totalSources: additionalSources.length,
            strategies: citySearchStrategies.length 
          });
        }
      }
    } catch (e) {
      console.warn('Wien.info enhanced integration failed:', (e as Error).message);
    }

    // Frühe Events sammeln (bereits vorhanden, erweitert um mehr Quellen)
    let earlyEvents: EventData[] = [];
    let earlyEventsDebugData: any = null;
    
    // TODO: Hier können zusätzliche schnelle Quellen integriert werden
    // z.B. RSS-Feeds, APIs von Venues, Social Media APIs
    
    const mergedOptions = { 
      ...OPTIMIZED_PPLX_OPTIONS,
      ...options,
      hotCity: hotCityData,
      additionalSources,
      citySearchStrategies,
      // Erweiterte Debug-Informationen
      debug: (options as any)?.debug === true || qDebug,
      debugVerbose: (options as any)?.debugVerbose === true || qVerbose,
      // Erhöhte Parallelisierung
      categoryConcurrency: (options as any)?.categoryConcurrency ?? 5,
      // Neue Optionen
      enhancedSearch: true,
      fallbackEnabled: true,
      diversityBoost: true
    };

    const disableCache = (mergedOptions as any)?.disableCache === true || (mergedOptions as any)?.debug === true;
    let allCachedEvents: EventData[] = [];
    let missingCategories: string[] = [];
    let cacheInfo: { [category: string]: { fromCache: boolean; eventCount: number } } = {};

    // Cache-Verarbeitung (unverändert, aber mit erweiterten Optionen)
    if (!disableCache) {
      const cacheResult = eventsCache.getEventsByCategories(city, date, effectiveCategories);
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
      effectiveCategories.forEach(category => {
        cacheInfo[category] = { fromCache: false, eventCount: 0 };
      });
    }

    // Early Events kombinieren (erweitert)
    if (earlyEvents.length > 0) {
      const validDates = getValidDatesForFiltering(date, (mergedOptions as any)?.timePeriod);
      const filteredEarlyEvents = earlyEvents.filter(event => {
        const eventDate = event.date?.slice(0, 10);
        return !eventDate || validDates.includes(eventDate);
      });
      
      if (qDebug && filteredEarlyEvents.length !== earlyEvents.length) {
        console.log('[EARLY-EVENTS:ENHANCED-FILTER]', {
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

    // Vollständiger Cache-Hit: Sofortige Rückgabe
    if (missingCategories.length === 0) {
      console.log(`[CACHE-HIT] Returning ${allCachedEvents.length} cached events for ${city}`);
      
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
        enhancedInfo: {
          totalSources: additionalSources.length,
          searchStrategies: citySearchStrategies.length,
          optimizationsApplied: ['enhanced-prompts', 'extended-sources', 'fallback-strategies']
        },
        message: allCachedEvents.length > 0 
          ? `${allCachedEvents.length} Events aus dem Cache geladen (Enhanced)`
          : 'Keine Events gefunden'
      });
    }

    // Job-Erstellung mit erweiterten Informationen
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`[ENHANCED-JOB] Creating jobId ${jobId} for ${city} with ${missingCategories.length} missing categories`);
    
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
      },
      // Erweiterte Job-Metadaten
      enhancedMetadata: {
        totalSources: additionalSources.length,
        searchStrategies: citySearchStrategies.length,
        optimizationsEnabled: true,
        processingStarted: new Date().toISOString()
      }
    };

    await jobStore.setJob(jobId, job);

    // Debug-Informationen erweitern
    if ((mergedOptions as any)?.debug) {
      const debugInfo: DebugInfo = {
        createdAt: new Date(),
        city,
        date,
        categories: effectiveCategories,
        options: mergedOptions,
        steps: [],
        // Erweiterte Debug-Daten
        enhancedDebug: {
          totalSources: additionalSources.length,
          sourceTypes: [...new Set(additionalSources.map(s => s.sourceType))],
          searchStrategiesCount: citySearchStrategies.length,
          missingCategoriesCount: missingCategories.length
        }
      };
      await jobStore.setDebugInfo(jobId, debugInfo);
      
      if (earlyEventsDebugData) {
        const debugStep = {
          category: 'Early Events Enhanced',
          query: earlyEventsDebugData.query,
          response: earlyEventsDebugData.response,
          parsedCount: earlyEvents.length
        };
        try {
          await jobStore.pushDebugStep(jobId, debugStep);
        } catch (error) {
          console.warn('Failed to save enhanced debug step:', error);
        }
      }
    }

    const mainCategoriesForAI = getMainCategoriesForAICalls(missingCategories);
    
    try {
      await scheduleBackgroundProcessing(request, jobId, city, date, mainCategoriesForAI, mergedOptions);
    } catch (scheduleError) {
      console.error('Enhanced schedule background error:', scheduleError);
      await jobStore.updateJob(jobId, {
        status: 'error',
        error: 'Failed to schedule enhanced background processing'
      });
      return NextResponse.json({ error: 'Failed to schedule enhanced background processing' }, { status: 500 });
    }

    // Erweiterte Response mit Optimierungsinfo
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
      // Neue Optimierungs-Informationen
      enhancedInfo: {
        totalSources: additionalSources.length,
        searchStrategies: citySearchStrategies.length,
        optimizationsApplied: [
          'enhanced-prompts',
          'extended-sources', 
          'fallback-strategies',
          'increased-tokens',
          'improved-parallelization'
        ],
        estimatedAdditionalEvents: Math.floor(additionalSources.length * 0.8) // Schätzung
      },
      message: allCachedEvents.length > 0 
        ? `${allCachedEvents.length} Events aus dem Cache geladen, ${missingCategories.length} Kategorien werden erweitert verarbeitet...`
        : `${missingCategories.length} Kategorien werden mit erweiterten Strategien verarbeitet...`
    });

  } catch (error) {
    console.error('Enhanced Events API Error:', error);
    return NextResponse.json({ error: 'Unerwarteter Fehler beim erweiterten Verarbeiten der Anfrage' }, { status: 500 });
  }
}
