import { NextRequest, NextResponse } from 'next/server';
import { scrapeAndStoreVenue, batchScrapeAndStoreVenues } from '@/lib/db/venueStore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes for long-running venue scraping

/**
 * POST /api/admin/sync-wien-info-complete
 * 
 * Scrapes venue information from Wien.info event URLs and stores in Supabase
 * 
 * Request body:
 * - eventUrl: string (single URL to scrape)
 * - eventUrls: string[] (batch URLs to scrape)
 * - dryRun: boolean (optional, default false)
 * 
 * Response:
 * - success: boolean
 * - venueId: string (single URL mode)
 * - venueIds: Map<string, string> (batch mode)
 * - stats: { processed, successful, failed }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { eventUrl, eventUrls, dryRun = false } = body;

    // Validate input
    if (!eventUrl && !eventUrls) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Either eventUrl or eventUrls must be provided' 
        },
        { status: 400 }
      );
    }

    // Single URL mode
    if (eventUrl) {
      if (dryRun) {
        return NextResponse.json({
          success: true,
          dryRun: true,
          message: 'Dry run - would scrape venue from URL',
          eventUrl
        });
      }

      const venueId = await scrapeAndStoreVenue(eventUrl);

      if (!venueId) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Failed to scrape or store venue' 
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        venueId,
        eventUrl
      });
    }

    // Batch mode
    if (eventUrls && Array.isArray(eventUrls)) {
      if (dryRun) {
        return NextResponse.json({
          success: true,
          dryRun: true,
          message: 'Dry run - would scrape venues from URLs',
          count: eventUrls.length,
          eventUrls
        });
      }

      const results = await batchScrapeAndStoreVenues(eventUrls);

      const stats = {
        processed: eventUrls.length,
        successful: results.size,
        failed: eventUrls.length - results.size
      };

      return NextResponse.json({
        success: true,
        stats,
        venueIds: Object.fromEntries(results), // Convert Map to object for JSON
        eventUrls
      });
    }

    return NextResponse.json(
      { 
        success: false, 
        error: 'Invalid request format' 
      },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error in POST /api/admin/sync-wien-info-complete:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to sync venues',
        details: String(error)
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/sync-wien-info-complete
 * 
 * Health check endpoint
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    service: 'Wien.info Venue Sync',
    status: 'ready',
    endpoints: {
      POST: {
        description: 'Scrape and store venues from Wien.info event URLs',
        parameters: {
          eventUrl: 'string - Single event URL to scrape',
          eventUrls: 'string[] - Array of event URLs to batch scrape',
          dryRun: 'boolean - Preview operation without storing'
        }
      }
    }
  });
}
