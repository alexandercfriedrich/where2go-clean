/**
 * Admin Wien.info Scraper API Endpoint
 * 
 * Secured endpoint to trigger the Wien.info event detail scraper.
 * This scraper fetches event detail pages to extract event times and
 * additional metadata that aren't available in the Wien.info API.
 * 
 * Authentication:
 * - Primary: Middleware Basic Auth (ADMIN_USER/ADMIN_PASS) - Always required
 * - Optional: Bearer token (ADMIN_WARMUP_SECRET) - Additional security layer for external access
 * 
 * POST /api/admin/wien-scraper
 * 
 * Query Parameters:
 * - limit: number (optional) - Maximum events to scrape (default: 100)
 * - dryRun: boolean (optional) - If true, runs scraper without writing to database
 * - debug: boolean (optional) - Enable verbose logging
 * - all: boolean (optional) - If true, scrape all events, not just those with missing times
 * 
 * Headers:
 * - Authorization: Basic <base64(ADMIN_USER:ADMIN_PASS)> - Required (enforced by middleware)
 * - Authorization: Bearer <ADMIN_WARMUP_SECRET> - Optional (bypasses Basic Auth if valid)
 * 
 * Response:
 * - 200: Success with scraper statistics
 * - 401: Unauthorized (missing or invalid credentials)
 * - 400: Bad request (invalid parameters)
 * - 500: Server error
 */

import { NextRequest, NextResponse } from 'next/server';
import { scrapeWienInfoEvents } from '@/lib/scrapers/wienInfoScraper';
import { validateSupabaseConfig } from '@/lib/supabase/client';
import { timingSafeEqual } from 'crypto';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes for scraping

/**
 * POST handler - trigger Wien.info event scraper
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Optional Bearer token authentication (bypasses middleware Basic Auth if provided)
    const authHeader = request.headers.get('authorization');
    const adminSecret = process.env.ADMIN_WARMUP_SECRET;
    
    // If Bearer token is provided and ADMIN_WARMUP_SECRET is set, validate it
    if (authHeader && authHeader.startsWith('Bearer ') && adminSecret) {
      const expectedAuth = `Bearer ${adminSecret}`;
      
      // Only reject if Bearer token is invalid (wrong token)
      // If no Bearer token provided, middleware Basic Auth will handle it
      if (authHeader.length !== expectedAuth.length) {
        console.warn('[ADMIN:WIEN-SCRAPER] Invalid Bearer token length');
        return NextResponse.json(
          { error: 'Unauthorized - Invalid Bearer token' },
          { status: 401 }
        );
      }
      
      try {
        const authBuffer = Buffer.from(authHeader, 'utf8');
        const expectedBuffer = Buffer.from(expectedAuth, 'utf8');
        if (!timingSafeEqual(authBuffer, expectedBuffer)) {
          console.warn('[ADMIN:WIEN-SCRAPER] Invalid Bearer token');
          return NextResponse.json(
            { error: 'Unauthorized - Invalid Bearer token' },
            { status: 401 }
          );
        }
        console.log('[ADMIN:WIEN-SCRAPER] Bearer token validated successfully');
      } catch (error) {
        console.warn('[ADMIN:WIEN-SCRAPER] Bearer token comparison failed');
        return NextResponse.json(
          { error: 'Unauthorized - Invalid Bearer token' },
          { status: 401 }
        );
      }
    }
    // If no Bearer token or ADMIN_WARMUP_SECRET not set, rely on middleware Basic Auth
    
    // 2. Validate Supabase configuration
    try {
      validateSupabaseConfig();
    } catch (error: any) {
      console.error('[ADMIN:WIEN-SCRAPER] Supabase configuration error:', error);
      return NextResponse.json(
        { 
          error: 'Database configuration error',
          details: error.message 
        },
        { status: 500 }
      );
    }
    
    // 3. Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const dryRun = searchParams.get('dryRun') === 'true';
    const debug = searchParams.get('debug') === 'true';
    const scrapeAll = searchParams.get('all') === 'true';
    const limitParam = searchParams.get('limit');
    
    // Parse limit with validation - default to 10000 to process all events with missing times
    let limit = 10000;
    if (limitParam) {
      const parsedLimit = parseInt(limitParam, 10);
      if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 50000) {
        return NextResponse.json(
          { error: 'Invalid limit. Must be between 1 and 50000.' },
          { status: 400 }
        );
      }
      limit = parsedLimit;
    }
    
    console.log('[ADMIN:WIEN-SCRAPER] Starting scrape', {
      limit,
      dryRun,
      debug,
      // Note: scrapeAll parameter accepted but ignored - scraper always filters for placeholder times
    });
    
    // 4. Run the scraper
    const result = await scrapeWienInfoEvents({
      limit,
      dryRun,
      debug,
      rateLimit: 2, // 2 requests per second to be respectful
    });
    
    // 5. Return results
    if (dryRun) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        message: 'Dry-run completed successfully (no data written to database)',
        stats: {
          eventsScraped: result.eventsScraped,
          eventsUpdated: result.eventsUpdated,
          eventsFailed: result.eventsFailed,
          duration: `${result.duration}ms`,
        },
      });
    }
    
    if (result.success) {
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
    } else {
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
      }, { status: 207 }); // 207 Multi-Status for partial success
    }
    
  } catch (error: any) {
    console.error('[ADMIN:WIEN-SCRAPER] Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

/**
 * GET handler - endpoint info
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    endpoint: '/api/admin/wien-scraper',
    description: 'Admin endpoint to trigger Wien.info event detail scraper. Extracts event times from detail pages.',
    method: 'POST',
    purpose: 'The Wien.info API only returns date-only strings (YYYY-MM-DD). This scraper fetches event detail pages to extract actual event times (e.g., 19:30).',
    authentication: {
      primary: 'Basic Auth via middleware (ADMIN_USER/ADMIN_PASS) - Required by default',
      optional: 'Bearer token (ADMIN_WARMUP_SECRET env var) - Bypasses Basic Auth if valid'
    },
    queryParameters: {
      dryRun: 'boolean (optional) - Run without writing to database',
      limit: 'number (optional) - Maximum events to scrape (default: 10000, max: 50000)',
      debug: 'boolean (optional) - Enable verbose logging',
      all: 'boolean (optional) - If true, scrape all events, not just those with missing times (default: false)'
    },
    rateLimit: '2 requests per second to wien.info servers',
    example: {
      url: '/api/admin/wien-scraper?dryRun=true&limit=50&debug=true',
      headers: {
        'Authorization': 'Basic <base64(username:password)> OR Bearer <secret>'
      }
    }
  });
}
