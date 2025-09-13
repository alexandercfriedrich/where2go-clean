import { NextRequest, NextResponse } from 'next/server';
import { RequestBody, JobStatus as LegacyJobStatus } from '@/lib/types';
import { eventsCache } from '@/lib/cache';
import { getJobStore } from '@/lib/jobStore';
import { getMainCategoriesForAICalls } from '@/categories';
import { processJobInBackground } from './process/backgroundProcessor';

// Serverless configuration
export const runtime = 'nodejs';
export const maxDuration = 60; // 1 Minute (dient nur dem unmittelbaren Request – Background läuft unabhängig)

// Default Kategorien (Fallback, falls nichts übergeben wird)
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
  'Natur/Outdoor',
  'Kultur/Traditionen',
  'Märkte/Shopping',
  'Bildung/Lernen',
  'Soziales/Community'
];

const jobStore = getJobStore();

const DEFAULT_PPLX_OPTIONS = {
  temperature: 0.2,
  max_tokens: 10000
};

export async function POST(request: NextRequest) {
  const requestStart = Date.now();
  try {
    const body: RequestBody = await request.json();
    const { city, date, categories, options } = body || {};

    const debugMode = options?.debug || false;

    if (!city || !date) {
      return NextResponse.json(
        { error: 'Stadt und Datum sind erforderlich' },
        { status: 400 }
      );
    }

    if (debugMode) {
      console.log('🔍 DEBUG: Events API request:', {
        city,
        date,
        categoriesCount: categories?.length,
        hasOptions: !!options
      });
    }

    // Effektive Kategorien bestimmen
    const effectiveCategories =
      categories && categories.length > 0 ? categories : DEFAULT_CATEGORIES;

    // Optionen mergen
    const mergedOptions = {
      ...DEFAULT_PPLX_OPTIONS,
      ...(options || {}),
      debug: debugMode
    };

    // Cache prüfen
    const cacheResult = eventsCache.getEventsByCategories(
      city,
      date,
      effectiveCategories
    );

    const allCachedEvents = Object.values(cacheResult.cachedEvents).flat();
    const missingCategories = cacheResult.missingCategories;

    if (debugMode) {
      console.log(
        '🔍 DEBUG: Cache analysis - cached:',
        Object.keys(cacheResult.cachedEvents).length,
        'missing:',
        missingCategories.length
      );
    } else {
      console.log(
        `Cache analysis: ${Object.keys(cacheResult.cachedEvents).length}/${effectiveCategories.length} categories cached, ${allCachedEvents.length} events from cache`
      );
    }

    // Wenn alles im Cache: direkt zurück
    if (missingCategories.length === 0) {
      if (debugMode) {
        console.log('🔍 DEBUG: ✅ All categories cached - returning directly');
      } else {
        console.log('✅ All categories cached - returning directly');
      }
      return NextResponse.json({
        events: allCachedEvents,
        status: 'completed',
        cached: true,
        message:
          allCachedEvents.length > 0
            ? `${allCachedEvents.length} Events aus dem Cache geladen`
            : 'Keine Events gefunden'
      });
    }

    // Job anlegen
    const jobId = `job_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 10)}`;

    if (debugMode) {
      console.log('🔍 DEBUG: Creating job for missing categories:', {
        jobId,
        missingCategoriesCount: missingCategories.length
      });
    }

    const job: LegacyJobStatus = {
      id: jobId,
      status: 'pending',
      events: allCachedEvents,
      createdAt: new Date(),
      progress: {
        completedCategories: effectiveCategories.length - missingCategories.length,
        totalCategories: effectiveCategories.length
      }
    };

    try {
      await jobStore.setJob(jobId, job);
      if (debugMode) {
        console.log('🔍 DEBUG: ✅ Job created successfully:', jobId);
      } else {
        console.log(
          `Job created: ${jobId} (events: ${job.events?.length || 0}, missing categories: ${missingCategories.length})`
        );
      }
    } catch (jobErr) {
      console.error('❌ Failed to create job in JobStore:', jobErr);
      return NextResponse.json(
        {
          error:
            'Service nicht verfügbar - Redis Konfiguration oder Verbindung fehlt'
        },
        { status: 500 }
      );
    }

    // Subkategorien → Hauptkategorien für AI zusammenfassen
    const mainCategoriesForAI = getMainCategoriesForAICalls(missingCategories);

    if (debugMode) {
      console.log(
        '🔍 DEBUG: Mapped categories for AI:',
        mainCategoriesForAI.length,
        '→',
        mainCategoriesForAI
      );
    } else {
      console.log(
        `Mapped ${missingCategories.length} missing subcategories to ${mainCategoriesForAI.length} main AI categories`
      );
    }

    // Deadman-Switch (lokal in dieser Route) – falls Background gar nicht startet / hängt
    const deadmanTimeout = setTimeout(async () => {
      console.error(
        `🚨 DEADMAN (events route): Job ${jobId} >180s ohne Abschluss – markiere als error`
      );
      try {
        await jobStore.updateJob(jobId, {
          status: 'error',
          error:
            'Hintergrundsuche hat zu lange gedauert (Deadman Events Route 180s)',
          lastUpdateAt: new Date().toISOString()
        });
        console.log(`✅ Deadman updated job ${jobId} to error`);
      } catch (e) {
        console.error(
          `❌ Deadman konnte Job ${jobId} nicht auf error setzen`,
          e
        );
      }
    }, 180000);

    // Hintergrundverarbeitung DIREKT starten (kein fetch mehr)
    if (mainCategoriesForAI.length > 0) {
      if (debugMode) {
        console.log(
          '🔍 DEBUG: Starting direct background processing (no internal fetch)'
        );
      } else {
        console.log(
          `Starting background processing (direct) for job ${jobId} with ${mainCategoriesForAI.length} main AI categories`
        );
      }

      processJobInBackground(
        jobId,
        city,
        date,
        mainCategoriesForAI,
        mergedOptions
      )
        .then(() => {
          clearTimeout(deadmanTimeout);
          if (debugMode) {
            console.log(
              `🔍 DEBUG: Background processing finished for ${jobId}`
            );
          } else {
            console.log(
              `✅ Background processing finished normally for job ${jobId}`
            );
          }
        })
        .catch(async (err) => {
          clearTimeout(deadmanTimeout);
            console.error(
              `❌ Background processor threw for job ${jobId}:`,
              err
            );
          try {
            await jobStore.updateJob(jobId, {
              status: 'error',
              error: 'Interner Fehler in der Hintergrundverarbeitung',
              lastUpdateAt: new Date().toISOString()
            });
          } catch (updateErr) {
            console.error(
              '❌ Failed to update job after background error',
              updateErr
            );
          }
        });
    } else {
      // Falls aus irgendeinem Grund keine zu verarbeitenden Kategorien übrig sind → sofort finalisieren
      clearTimeout(deadmanTimeout);
      await jobStore.updateJob(jobId, {
        status: 'done',
        message: `${allCachedEvents.length} Events (nur Cache)`,
        lastUpdateAt: new Date().toISOString()
      });
      if (debugMode) {
        console.log(
          '🔍 DEBUG: No main categories for AI – job finalized immediately'
        );
      }
      return NextResponse.json({
        jobId,
        status: 'done',
        events: allCachedEvents,
        cached: true,
        processing: false,
        progress: {
          completedCategories: effectiveCategories.length,
          totalCategories: effectiveCategories.length
        },
        message: `${allCachedEvents.length} Events aus dem Cache (keine neuen Kategorien erforderlich)`
      });
    }

    // Sofortige Antwort für Polling im Frontend
    if (debugMode) {
      console.log('🔍 DEBUG: Returning initial polling payload for job:', jobId);
    }

    return NextResponse.json({
      jobId,
      status: 'partial',
      events: allCachedEvents,
      cached: allCachedEvents.length > 0,
      processing: true,
      progress: {
        completedCategories: effectiveCategories.length - missingCategories.length,
        totalCategories: effectiveCategories.length
      },
      message:
        allCachedEvents.length > 0
          ? `${allCachedEvents.length} Events aus dem Cache geladen, ${missingCategories.length} Kategorien werden verarbeitet...`
          : `${missingCategories.length} Kategorien werden verarbeitet...`
    });
  } catch (error) {
    console.error('❌ Events API Error (direct background variant):', error);
    return NextResponse.json(
      { error: 'Unerwarteter Fehler beim Verarbeiten der Anfrage' },
      { status: 500 }
    );
  } finally {
    if (process.env.NODE_ENV !== 'production') {
      console.log(
        `[EVENTS] POST handled in ${Date.now() - requestStart}ms (direct background variant)`
      );
    }
  }
}
