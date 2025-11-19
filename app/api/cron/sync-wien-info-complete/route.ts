// app/api/cron/sync-wien-info-complete/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { fetchWienInfoEvents } from '@/app/lib/sources/wienInfo';
import { batchScrapeWienInfoDetails } from '@/app/lib/sources/wienInfoDetailScraper';
import { batchScrapeVenues } from '@/app/lib/sources/wienInfoVenueScraper';
import { batchUpsertVenues } from '@/app/lib/venueStore';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Helper: Extract minimum price from price string
 */
function extractMinPrice(priceText: string): number | undefined {
  const match = priceText.match(/€?\s*(\d+(?:[.,]\d{2})?)/);
  return match ? parseFloat(match[1].replace(',', '.')) : undefined;
}

/**
 * Helper: Extract maximum price from price string
 */
function extractMaxPrice(priceText: string): number | undefined {
  const matches = priceText.matchAll(/€?\s*(\d+(?:[.,]\d{2})?)/g);
  const prices = Array.from(matches).map(m => parseFloat(m[1].replace(',', '.')));
  return prices.length > 1 ? Math.max(...prices) : undefined;
}

/**
 * POST /api/cron/sync-wien-info-complete
 * Complete sync: Events + Details + Venues
 */
export async function POST(request: NextRequest) {
  try {
    // Auth check
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('='.repeat(60));
    console.log('[CRON] WIEN.INFO COMPLETE SYNC STARTED');
    console.log('='.repeat(60));

    // Date range: today + 30 days
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 30);

    const fromISO = today.toISOString().split('T')[0];
    const toISO = endDate.toISOString().split('T')[0];

    console.log(`[CRON] Date range: ${fromISO} to ${toISO}`);

    // ===== STEP 1: Fetch Events from Ajax API =====
    console.log('\n[STEP 1] Fetching events from Ajax API...');
    const eventLimit = parseInt(process.env.WIEN_INFO_EVENT_LIMIT || '1000', 10);
    
    const result = await fetchWienInfoEvents({
      fromISO,
      toISO,
      categories: [],
      limit: eventLimit,
      debug: true,
    });

    if (result.error || !result.events || result.events.length === 0) {
      console.error('[CRON] No events fetched:', result.error);
      return NextResponse.json({
        success: false,
        error: result.error || 'No events returned',
      }, { status: 500 });
    }

    console.log(`[STEP 1] ✓ Fetched ${result.events.length} events`);

    // ===== STEP 2: Scrape Event Details =====
    console.log('\n[STEP 2] Scraping event detail pages...');
    const detailResults = await batchScrapeWienInfoDetails(result.events, {
      maxConcurrent: 3,
      delayMs: 1000,
      maxRetries: 2,
    });

    console.log(`[STEP 2] ✓ Scraped ${detailResults.size} detail pages`);

    // ===== STEP 3: Scrape Venue Information =====
    console.log('\n[STEP 3] Scraping venue information...');
    const venuesWithUrls = result.events
      .filter(event => event.custom_venue_name && event.website_url)
      .map(event => ({
        venue: event.custom_venue_name!,
        url: event.website_url!,
      }));

    const venueResults = await batchScrapeVenues(venuesWithUrls, {
      maxConcurrent: 2,
      delayMs: 1500,
      maxRetries: 2,
    });

    console.log(`[STEP 3] ✓ Scraped ${venueResults.size} unique venues`);

    // ===== STEP 4: Store Venues in Database =====
    console.log('\n[STEP 4] Storing venues in database...');
    const venueIdMap = await batchUpsertVenues(venueResults);
    console.log(`[STEP 4] ✓ Stored ${venueIdMap.size} venues`);

    // ===== STEP 5: Merge Data and Link Venues =====
    console.log('\n[STEP 5] Merging data and linking venues...');
    const enhancedEvents = result.events.map(event => {
      const details = event.website_url ? detailResults.get(event.website_url) : null;
      const venueId = event.custom_venue_name ? venueIdMap.get(event.custom_venue_name) : undefined;
      
      // Merge all data
      const enhanced = {
        ...event,
        
        // Link venue
        venue_id: venueId,
        
        // Enhanced pricing
        price_info: details?.price || event.price_info || '',
        is_free: details?.price?.toLowerCase().includes('frei') || false,
        
        // Parse price ranges
        ...(details?.price && {
          price_min: extractMinPrice(details.price),
          price_max: extractMaxPrice(details.price),
        }),
        
        // Enhanced URLs
        booking_url: details?.ticketUrl || event.booking_url,
        ticket_url: details?.ticketUrl || event.ticket_url,
        
        // Enhanced description
        description: details?.detailedDescription || event.description,
      };

      return enhanced;
    });

    console.log(`[STEP 5] ✓ Enhanced ${enhancedEvents.length} events`);

    // ===== STEP 6: Upsert Events into Database =====
    console.log('\n[STEP 6] Upserting events into database...');
    
    const { data: upsertedEvents, error: upsertError } = await supabase
      .from('events')
      .upsert(
        enhancedEvents,
        { 
          onConflict: 'external_id',
          ignoreDuplicates: false 
        }
      )
      .select('id, venue_id, price_info');

    if (upsertError) {
      console.error('[CRON] Database upsert error:', upsertError);
      throw upsertError;
    }

    const totalStoredEvents = upsertedEvents?.length || 0;
    const eventsWithVenues = upsertedEvents?.filter(e => e.venue_id).length || 0;
    const eventsWithPrices = upsertedEvents?.filter(e => e.price_info && e.price_info !== '').length || 0;

    console.log(`[STEP 6] ✓ Stored ${totalStoredEvents} events in database`);

    // ===== SUMMARY =====
    console.log('\n' + '='.repeat(60));
    console.log('SYNC COMPLETE - SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total events fetched:      ${result.events.length}`);
    console.log(`Events stored:             ${totalStoredEvents}`);
    console.log(`Events with prices:        ${eventsWithPrices} (${Math.round(eventsWithPrices/totalStoredEvents*100)}%)`);
    console.log(`Events with venue links:   ${eventsWithVenues} (${Math.round(eventsWithVenues/totalStoredEvents*100)}%)`);
    console.log(`Unique venues scraped:     ${venueResults.size}`);
    console.log(`Venues stored:             ${venueIdMap.size}`);
    console.log(`Date range:                ${fromISO} to ${toISO}`);
    console.log('='.repeat(60));

    return NextResponse.json({
      success: true,
      message: 'Complete Wien.info sync finished successfully',
      stats: {
        totalEventsFetched: result.events.length,
        eventsStored: totalStoredEvents,
        eventsWithPrices,
        eventsWithVenues,
        venuesScraped: venueResults.size,
        venuesStored: venueIdMap.size,
        dateRange: { from: fromISO, to: toISO },
        scrapeStats: {
          detailPages: detailResults.size,
          venuePages: venueResults.size,
        }
      }
    });

  } catch (error: any) {
    console.error('[CRON] ✗ SYNC FAILED:', error);
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
 * GET /api/cron/sync-wien-info-complete
 * Health check / Info endpoint
 */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/cron/sync-wien-info-complete',
    description: 'Complete Wien.info sync: Events + Details + Venues',
    method: 'POST',
    authentication: 'Bearer token required',
    features: [
      'Fetches events from wien.info Ajax API',
      'Scrapes event detail pages for prices',
      'Scrapes venue information',
      'Links events to venues via foreign key',
      'Stores everything in Supabase',
    ],
    environment: {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      hasCronSecret: !!process.env.CRON_SECRET,
    }
  });
}
