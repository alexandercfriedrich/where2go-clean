import { NextRequest, NextResponse } from 'next/server';
import { scrapeWienInfoEvents } from '@/lib/scrapers/wienInfoScraper';
import { validateCronAuth } from '@/lib/cronAuth';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes

/**
 * Scraper options parsed from query parameters
 */
interface ScraperParams {
  limit: number;
  dryRun: boolean;
  debug: boolean;
  scrapeAll: boolean;
}

/**
 * Parse scraper options from URL search params
 */
function parseScraperParams(searchParams: URLSearchParams): ScraperParams {
  return {
    limit: parseInt(searchParams.get('limit') || '100', 10),
    dryRun: searchParams.get('dryRun') === 'true',
    debug: searchParams.get('debug') === 'true',
    scrapeAll: searchParams.get('all') === 'true',
  };
}

/**
 * Shared scraper logic for both GET and POST handlers
 * Runs the Wien.info event detail scraper
 */
async function runWienInfoScraper(params: ScraperParams): Promise<NextResponse> {
  const { limit, dryRun, debug, scrapeAll } = params;
  
  console.log('[CRON:SCRAPE-WIEN-INFO] Starting Wien.info event scraper', {
    limit,
    dryRun,
    debug,
    scrapeAll, // Parameter kept for backward compatibility but no longer used
  });

  // Run the scraper
  // Note: scrapeAll parameter is ignored - scraper now always filters for placeholder times
  const result = await scrapeWienInfoEvents({
    limit,
    dryRun,
    debug,
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
}

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
    const authResult = validateCronAuth(request, '[CRON:SCRAPE-WIEN-INFO]');
    if (!authResult.authorized) {
      return authResult.errorResponse!;
    }

    const { searchParams } = new URL(request.url);
    const params = parseScraperParams(searchParams);
    return await runWienInfoScraper(params);

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
 * Vercel Cron job handler - Vercel cron makes GET requests to this endpoint
 * This runs the actual scraper when called by Vercel Cron
 * 
 * Query parameters:
 * - limit: Maximum number of events to scrape (default: 100)
 * - dryRun: If true, don't update database (default: false)
 * - debug: Enable verbose logging (default: false)
 * - all: If true, scrape all events, not just those with missing times (default: false)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authResult = validateCronAuth(request, '[CRON:SCRAPE-WIEN-INFO]');
    if (!authResult.authorized) {
      return authResult.errorResponse!;
    }

    const { searchParams } = new URL(request.url);
    const params = parseScraperParams(searchParams);
    return await runWienInfoScraper(params);

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
