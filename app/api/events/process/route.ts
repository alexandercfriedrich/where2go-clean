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

    // Erweiterte Datumsvalidierung
    const getValidDatesForFiltering = (baseDate: string, timePeriod?: string): string[] => {
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
    };
    
    const validDates = getValidDatesForFiltering(date, options?.timePeriod);
    console.log(`[ENHANCED-WORKER] Processing job ${jobId} for ${city} on ${date}`);

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

    // Verwende optimierten Perplexity Service
    const service = createPerplexityService(PERPLEXITY_API_KEY);

    // Start mit existierenden Job Events
    let runningEvents = eventAggregator.deduplicateEvents([...(job.events || [])]);
    
    // Erweiterte Batch-Verarbeitung mit adaptiver Concurrency
    const baseConcurrency = Math.max(1, options?.categoryConcurrency ?? 5);
    let concurrency = baseConcurrency;
    let totalEventCount = 0;
    let categoryResults: any[] = [];
    
    console.log(`[ENHANCED-WORKER] Starting with concurrency ${concurrency} for ${effective.length} categories`);

    for (let i = 0; i < effective.length; i += concurrency) {
      const batch = effective.slice(i, i + concurrency);
      const batchStartTime = Date.now();
      
      console.log(`[BATCH] Processing batch ${Math.floor(i/concurrency) + 1}: ${batch.join(', ')}`);
      
      try {
        const results = await service.executeMultiQuery(city, date, batch, {
          ...(options || {}),
          categoryConcurrency: concurrency,
          // Erweiterte Optionen
          enhancedSearch: true,
          fallbackEnabled: true,
          diversityBoost: true
        });
        
        categoryResults.push(...results);

        // Debug-Informationen sammeln
        if (options?.debug) {
          for (const result of results) {
            const eventsFromResult = eventAggregator.aggregateResults([result], validDates);
            const category = eventsFromResult.length > 0 ? eventsFromResult[0].category || 'Unknown' : 'Unknown';
            
            const debugStep = {
              category,
              query: result.query,
              response: result.response,
              parsedCount: eventsFromResult.length,
              enhancedMetrics: {
                queryLength: result.query.length,
                responseLength: result.response.length,
                processingTime: Date.now() - batchStartTime
              }
            };
            
            try {
              await jobStore.pushDebugStep(jobId, debugStep);
            } catch (error) {
              console.warn('Failed to save enhanced debug step:', error);
            }
          }
        }

        // Events aggregieren und analysieren
        const chunk = eventAggregator.aggregateResults(results, validDates)
          .map(e => ({ ...e, source: e.source ?? 'ai' as const }));
        
        const batchEventCount = chunk.length;
        totalEventCount += batchEventCount;
        
        console.log(`[BATCH-COMPLETE] ${batch.join(', ')}: ${batchEventCount} events in ${Date.now() - batchStartTime}ms`);

        // Cache pro Kategorie
        const ttlSeconds = computeTTLSecondsForEvents(chunk);
        const grouped: Record<string, any[]> = {};
        for (const ev of chunk) {
          if (!ev.category) continue;
          (grouped[ev.category] ||= []).push(ev);
        }
        
        for (const cat of Object.keys(grouped)) {
          eventsCache.setEventsByCategory(city, date, cat, grouped[cat], ttlSeconds);
        }

        // Events mergen und Job updaten
        runningEvents = eventAggregator.deduplicateEvents([...runningEvents, ...chunk]);
        
        // Adaptive Concurrency: Reduziere bei vielen Events, erhöhe bei wenigen
        if (batchEventCount < 5 && concurrency < 8) {
          concurrency = Math.min(8, concurrency + 1);
          console.log(`[ADAPTIVE] Increasing concurrency to ${concurrency} (low event count)`);
        } else if (batchEventCount > 20 && concurrency > 2) {
          concurrency = Math.max(2, concurrency - 1);
          console.log(`[ADAPTIVE] Decreasing concurrency to ${concurrency} (high event count)`);
        }

        // Job Update mit erweiterten Metriken in separatem Objekt
        const updateData: any = {
          status: 'processing',
          events: runningEvents,
          progress: { 
            completedCategories: Math.min(i + batch.length, effective.length), 
            totalCategories: effective.length 
          },
          lastUpdateAt: new Date().toISOString()
        };

        // Erweiterte Metriken falls unterstützt
        if (options?.enhancedTracking) {
          updateData.enhancedMetrics = {
            totalEventsFound: totalEventCount,
            averageEventsPerCategory: Math.round(totalEventCount / (Math.min(i + batch.length, effective.length) || 1)),
            processingSpeed: Math.round((Date.now() - (job.createdAt?.getTime() || Date.now())) / 1000),
            currentConcurrency: concurrency
          };
        }

        await jobStore.updateJob(jobId, updateData);

      } catch (batchError) {
        console.error(`[BATCH-ERROR] Failed processing batch ${batch.join(', ')}:`, batchError);
        
        // Fallback: Versuche Kategorien einzeln
        for (const singleCategory of batch) {
          try {
            console.log(`[FALLBACK] Retrying single category: ${singleCategory}`);
            const fallbackResults = await service.executeMultiQuery(city, date, [singleCategory], {
              ...(options || {}),
              categoryConcurrency: 1,
              temperature: 0.2 // Etwas höher für Fallback
            });
            
            const fallbackEvents = eventAggregator.aggregateResults(fallbackResults, validDates)
              .map(e => ({ ...e, source: e.source ?? 'ai-fallback' as const }));
            
            if (fallbackEvents.length > 0) {
              runningEvents = eventAggregator.deduplicateEvents([...runningEvents, ...fallbackEvents]);
              totalEventCount += fallbackEvents.length;
              console.log(`[FALLBACK-SUCCESS] ${singleCategory}: ${fallbackEvents.length} events`);
            }
            
          } catch (fallbackError) {
            console.error(`[FALLBACK-ERROR] ${singleCategory}:`, fallbackError);
          }
        }
      }

      // Zwischen Batches kurz pausieren um Rate Limits zu respektieren
      if (i + concurrency < effective.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Final update
    const finalUpdate = {
      status: 'done' as const,
      events: runningEvents,
      progress: { 
        completedCategories: effective.length, 
        totalCategories: effective.length 
      },
      lastUpdateAt: new Date().toISOString()
    };

    await jobStore.updateJob(jobId, finalUpdate);

    console.log(`[ENHANCED-WORKER-COMPLETE] Job ${jobId}: ${runningEvents.length} unique events from ${totalEventCount} total`);

    // Erweiterte Statistiken in Response
    const enhancedStats = {
      totalEventsFound: totalEventCount,
      totalUniqueEvents: runningEvents.length,
      averageEventsPerCategory: Math.round(totalEventCount / effective.length),
      processingTimeSeconds: Math.round((Date.now() - (job.createdAt?.getTime() || Date.now())) / 1000),
      categoriesProcessed: effective.length,
      optimizationsApplied: [
        'enhanced-prompts',
        'adaptive-concurrency', 
        'fallback-retry',
        'extended-tokens'
      ]
    };

    return NextResponse.json({ 
      jobId, 
      status: 'done', 
      events: runningEvents, 
      categoriesProcessed: effective,
      enhancedStats
    });

  } catch (error) {
    console.error('Enhanced background processing error:', error);
    
    // Versuche Job als fehlgeschlagen zu markieren
    try {
      const { jobId } = await request.json();
      if (jobId) {
        const jobStore = getJobStore();
        await jobStore.updateJob(jobId, {
          status: 'error',
          error: 'Enhanced processing failed: ' + (error as Error).message,
          lastUpdateAt: new Date().toISOString()
        });
      }
    } catch (updateError) {
      console.error('Failed to update job error status:', updateError);
    }
    
    return NextResponse.json({ 
      error: 'Enhanced processing failed',
      details: (error as Error).message 
    }, { status: 500 });
  }
}
