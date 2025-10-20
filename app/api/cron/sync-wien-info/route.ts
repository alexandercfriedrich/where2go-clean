import { NextRequest, NextResponse } from 'next/server';
import { fetchWienInfoEvents } from '@/lib/sources/wienInfo';
import { upsertDayEvents } from '@/lib/dayCache';
import { getActiveHotCities } from '@/lib/hotCityStore';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes

/**
 * POST /api/cron/sync-wien-info
 * 
 * Cron job endpoint that fetches ALL Wien.info events for ALL categories
 * and stores them in the database for Wien city pages.
 * 
 * Should be called once per day via Vercel Cron or external scheduler.
 * 
 * Authorization: Requires CRON_SECRET environment variable to match
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('[CRON:WIEN-INFO] Starting daily sync of all Wien.info events');

    // Get Wien hot city to verify it exists
    const allCities = await getActiveHotCities();
    const wienCity = allCities.find(c => 
      c.name.toLowerCase() === 'wien'
    );

    if (!wienCity) {
      console.warn('[CRON:WIEN-INFO] Wien not found in hot cities');
      return NextResponse.json(
        { error: 'Wien not found in hot cities database' },
        { status: 404 }
      );
    }

    // Calculate date range: today + next 30 days
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 30);

    const fromISO = today.toISOString().split('T')[0];
    const toISO = endDate.toISOString().split('T')[0];

    console.log(`[CRON:WIEN-INFO] Fetching events from ${fromISO} to ${toISO}`);

    // Fetch ALL categories from Wien.info (empty categories array = all categories)
    const result = await fetchWienInfoEvents({
      fromISO,
      toISO,
      categories: [], // Empty array fetches all categories
      limit: 1000, // High limit to get all events
      debug: true,
      debugVerbose: false
    });

    if (result.error || !result.events || result.events.length === 0) {
      console.warn('[CRON:WIEN-INFO] No events fetched:', result.error);
      return NextResponse.json({
        success: false,
        error: result.error || 'No events returned',
        debugInfo: result.debugInfo
      }, { status: 500 });
    }

    console.log(`[CRON:WIEN-INFO] Fetched ${result.events.length} events`);

    // Group events by date
    const eventsByDate: Record<string, typeof result.events> = {};
    for (const event of result.events) {
      if (!eventsByDate[event.date]) {
        eventsByDate[event.date] = [];
      }
      eventsByDate[event.date].push(event);
    }

    // Store events in day-bucket cache for each date
    let storedDays = 0;
    let totalStoredEvents = 0;

    for (const [date, events] of Object.entries(eventsByDate)) {
      try {
        await upsertDayEvents(wienCity.name, date, events);
        storedDays++;
        totalStoredEvents += events.length;
        console.log(`[CRON:WIEN-INFO] Stored ${events.length} events for ${date}`);
      } catch (error) {
        console.error(`[CRON:WIEN-INFO] Failed to store events for ${date}:`, error);
      }
    }

    console.log(`[CRON:WIEN-INFO] Sync complete: ${totalStoredEvents} events across ${storedDays} days`);

    return NextResponse.json({
      success: true,
      message: 'Wien.info sync completed successfully',
      stats: {
        totalEvents: result.events.length,
        storedEvents: totalStoredEvents,
        daysStored: storedDays,
        dateRange: { from: fromISO, to: toISO },
        categories: result.debugInfo?.mappedCategoryCounts || {}
      }
    });

  } catch (error: any) {
    console.error('[CRON:WIEN-INFO] Sync failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cron/sync-wien-info
 * 
 * Health check endpoint
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    endpoint: '/api/cron/sync-wien-info',
    description: 'Daily Wien.info event sync cron job',
    method: 'POST',
    authentication: 'Bearer token in Authorization header',
    schedule: 'Once per day (configure in vercel.json or external scheduler)'
  });
}
