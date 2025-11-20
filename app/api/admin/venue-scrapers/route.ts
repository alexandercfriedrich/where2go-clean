/**
 * Admin Venue Scrapers API Endpoint
 * 
 * Secured endpoint to trigger venue event scrapers.
 * 
 * Authentication:
 * - Primary: Middleware Basic Auth (ADMIN_USER/ADMIN_PASS) - Always required
 * - Optional: Bearer token (ADMIN_WARMUP_SECRET) - Additional security layer
 * 
 * POST /api/admin/venue-scrapers
 * 
 * Query Parameters:
 * - venues: string (optional) - Comma-separated list of venue keys to scrape (default: all)
 * - dryRun: boolean (optional) - If true, runs scrapers without writing to database
 * 
 * Headers:
 * - Authorization: Basic <base64(ADMIN_USER:ADMIN_PASS)> - Required (enforced by middleware)
 * - Authorization: Bearer <ADMIN_WARMUP_SECRET> - Optional (if env var is set)
 * 
 * Response:
 * - 200: Success with scraping statistics
 * - 401: Unauthorized (missing or invalid credentials)
 * - 400: Bad request (invalid parameters)
 * - 500: Server error
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateSupabaseConfig } from '@/lib/supabase/client';
import { timingSafeEqual } from 'crypto';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes for large scrapes

/**
 * Run venue scrapers via Python
 */
async function runVenueScraper(venues: string[] | null, dryRun: boolean): Promise<any> {
  const projectRoot = process.cwd();
  const scraperPath = path.join(projectRoot, 'website-scrapers', 'run_all_scrapers.py');
  
  // Build command
  let command = `python3 ${scraperPath}`;
  
  if (dryRun) {
    command += ' --dry-run';
  }
  
  if (venues && venues.length > 0) {
    command += ` --venues ${venues.join(' ')}`;
  }
  
  console.log('[ADMIN:VENUE-SCRAPERS] Running command:', command);
  
  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd: projectRoot,
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large outputs
      timeout: 280000, // 280 seconds (less than maxDuration)
      env: {
        ...process.env,
        PYTHONUNBUFFERED: '1'
      }
    });
    
    // Parse output for statistics
    const output = stdout + stderr;
    
    // Extract summary statistics from output
    const stats: any = {
      output,
      venues: venues || ['all'],
      dryRun,
      success: !output.toLowerCase().includes('error') && !output.toLowerCase().includes('failed')
    };
    
    // Try to extract event counts from output
    const eventMatches = output.match(/Total Events:\s+(\d+)/i);
    const insertedMatches = output.match(/Inserted:\s+(\d+)/i);
    const updatedMatches = output.match(/Updated:\s+(\d+)/i);
    const errorMatches = output.match(/Errors:\s+(\d+)/i);
    
    if (eventMatches) stats['totalEvents'] = parseInt(eventMatches[1]);
    if (insertedMatches) stats['inserted'] = parseInt(insertedMatches[1]);
    if (updatedMatches) stats['updated'] = parseInt(updatedMatches[1]);
    if (errorMatches) stats['errors'] = parseInt(errorMatches[1]);
    
    return stats;
  } catch (error: any) {
    console.error('[ADMIN:VENUE-SCRAPERS] Scraper error:', error);
    throw new Error(`Scraper execution failed: ${error.message}`);
  }
}

/**
 * POST handler - trigger venue scrapers
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Verify authorization (optional Bearer token)
    const authHeader = request.headers.get('authorization');
    const adminSecret = process.env.ADMIN_WARMUP_SECRET;
    
    if (adminSecret) {
      const expectedAuth = `Bearer ${adminSecret}`;
      if (!authHeader || authHeader.length !== expectedAuth.length) {
        console.warn('[ADMIN:VENUE-SCRAPERS] Invalid Bearer token');
        return NextResponse.json(
          { error: 'Unauthorized - Invalid Bearer token' },
          { status: 401 }
        );
      }
      
      try {
        const authBuffer = Buffer.from(authHeader, 'utf8');
        const expectedBuffer = Buffer.from(expectedAuth, 'utf8');
        if (!timingSafeEqual(authBuffer, expectedBuffer)) {
          console.warn('[ADMIN:VENUE-SCRAPERS] Invalid Bearer token');
          return NextResponse.json(
            { error: 'Unauthorized - Invalid Bearer token' },
            { status: 401 }
          );
        }
      } catch (error) {
        console.warn('[ADMIN:VENUE-SCRAPERS] Bearer token comparison failed');
        return NextResponse.json(
          { error: 'Unauthorized - Invalid Bearer token' },
          { status: 401 }
        );
      }
    }
    
    // 2. Validate Supabase configuration
    try {
      validateSupabaseConfig();
    } catch (error: any) {
      console.error('[ADMIN:VENUE-SCRAPERS] Supabase configuration error:', error);
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
    const venuesParam = searchParams.get('venues');
    
    // Parse venue list
    let venues: string[] | null = null;
    if (venuesParam) {
      venues = venuesParam.split(',').map(v => v.trim()).filter(v => v.length > 0);
      if (venues.length === 0) {
        return NextResponse.json(
          { error: 'Invalid venues parameter. Provide comma-separated venue keys.' },
          { status: 400 }
        );
      }
    }
    
    console.log('[ADMIN:VENUE-SCRAPERS] Starting scrape', {
      dryRun,
      venues: venues || 'all'
    });
    
    // 4. Run the scrapers
    const stats = await runVenueScraper(venues, dryRun);
    
    // 5. Return results
    if (dryRun) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        message: 'Dry-run completed successfully (no data written to database)',
        stats
      });
    }
    
    if (stats.success) {
      return NextResponse.json({
        success: true,
        message: 'Venue scrapers completed successfully',
        stats
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'Venue scrapers completed with errors',
        stats
      }, { status: 207 }); // 207 Multi-Status for partial success
    }
    
  } catch (error: any) {
    console.error('[ADMIN:VENUE-SCRAPERS] Unexpected error:', error);
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
  // List available venues
  const availableVenues = [
    'grelle-forelle', 'flex', 'pratersauna', 'b72', 'das-werk', 'u4', 'volksgarten',
    'babenberger-passage', 'cabaret-fledermaus', 'camera-club', 'celeste', 'chelsea',
    'club-u', 'donau', 'flucc', 'o-der-klub', 'ponyhof', 'prater-dome',
    'praterstrasse', 'sass-music-club', 'tanzcafe-jenseits', 'the-loft',
    'vieipee', 'why-not', 'rhiz'
  ];
  
  return NextResponse.json({
    endpoint: '/api/admin/venue-scrapers',
    description: 'Admin endpoint to trigger venue event scrapers',
    method: 'POST',
    authentication: {
      required: 'Basic Auth via middleware (ADMIN_USER/ADMIN_PASS)',
      optional: 'Bearer token (ADMIN_WARMUP_SECRET env var)'
    },
    queryParameters: {
      dryRun: 'boolean (optional) - Run without writing to database',
      venues: 'string (optional) - Comma-separated venue keys (default: all)',
    },
    availableVenues,
    example: {
      url: '/api/admin/venue-scrapers?dryRun=true&venues=grelle-forelle,flex',
      headers: {
        'Authorization': 'Basic <base64(username:password)>'
      }
    }
  });
}
