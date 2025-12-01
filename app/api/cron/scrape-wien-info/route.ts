import { NextRequest, NextResponse } from 'next/server';
import { scrapeWienInfoEvents } from '@/lib/scrapers/wienInfoScraper';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes

/**
 * POST /api/cron/scrape-wien-info
 * 
 * Cron job endpoint that scrapes Wien.info event detail pages to extract
 * event times and additional metadata that aren't available in the API.
 * 
 * The Wien.info API only returns date-only strings, but the event detail
 * pages contain the actual event times (e.g., "19:30 Uhr").
 * 
 * Should be called periodically (e.g., hourly or daily) via Vercel Cron
 * or external scheduler.
 * 
 * Query parameters:
 * - limit: Maximum number of events to scrape (default: 100)
 * - dryRun: If true, don't update database (default: false)
 * - debug: Enable verbose logging (default: false)
 * - all: If true, scrape all events, not just those with missing times (default: false)
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

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const dryRun = searchParams.get('dryRun') === 'true';
    const debug = searchParams.get('debug') === 'true';
    const scrapeAll = searchParams.get('all') === 'true';

    console.log('[CRON:SCRAPE-WIEN-INFO] Starting Wien.info event scraper', {
      limit,
      dryRun,
      debug,
      onlyMissingTimes: !scrapeAll,
    });

    // Run the scraper
    const result = await scrapeWienInfoEvents({
      limit,
      dryRun,
      debug,
      onlyMissingTimes: !scrapeAll,
      rateLimit: 2, // 2 requests per second to be respectful
    });

    console.log('[CRON:SCRAPE-WIEN-INFO] Scraping complete', result);

    if (!result.success) {
      return NextResponse.json({
        success: false,
        message: 'Scraping completed with errors',
        stats: {
          eventsScraped: result.eventsScraped,
          eventsUpdated: result.eventsUpdated,
          eventsFailed: result.eventsFailed,
          duration: `${result.duration}ms`,
        },
        errors: result.errors.slice(0, 10), // Limit error output
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Wien.info event scraping completed successfully',
      stats: {
        eventsScraped: result.eventsScraped,
        eventsUpdated: result.eventsUpdated,
        eventsFailed: result.eventsFailed,
        duration: `${result.duration}ms`,
      },
    });

  } catch (error: any) {
    console.error('[CRON:SCRAPE-WIEN-INFO] Fatal error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cron/scrape-wien-info
 * 
 * Health check and documentation endpoint
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    endpoint: '/api/cron/scrape-wien-info',
    description: 'Wien.info event detail scraper - extracts event times from detail pages',
    method: 'POST',
    authentication: 'Bearer token in Authorization header (CRON_SECRET)',
    queryParameters: {
      limit: 'Maximum number of events to scrape (default: 100)',
      dryRun: 'If true, don\'t update database (default: false)',
      debug: 'Enable verbose logging (default: false)',
      all: 'If true, scrape all events, not just those with missing times (default: false)',
    },
    schedule: 'Recommended: Run after sync-wien-info cron job (e.g., daily)',
    rateLimit: '2 requests per second to wien.info servers',
    example: 'POST /api/cron/scrape-wien-info?limit=50&debug=true',
  });
}
