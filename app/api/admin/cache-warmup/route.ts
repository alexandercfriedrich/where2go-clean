/**
 * Admin Cache Warmup API Endpoint
 * 
 * Secured endpoint to trigger wien.info event import into Supabase.
 * Requires ADMIN_WARMUP_SECRET environment variable for authentication.
 * 
 * POST /api/admin/cache-warmup
 * 
 * Query Parameters:
 * - dryRun: boolean (optional) - If true, runs import without writing to database
 * - fromDate: string (optional) - Start date in YYYY-MM-DD format
 * - toDate: string (optional) - End date in YYYY-MM-DD format
 * - limit: number (optional) - Maximum events to fetch (default: 10000)
 * - batchSize: number (optional) - Batch size for processing (default: 100)
 * 
 * Headers:
 * - Authorization: Bearer <ADMIN_WARMUP_SECRET>
 * 
 * Response:
 * - 200: Success with import statistics
 * - 401: Unauthorized (missing or invalid secret)
 * - 400: Bad request (invalid parameters)
 * - 500: Server error
 */

import { NextRequest, NextResponse } from 'next/server';
import { importWienInfoEvents } from '@/lib/importers/wienInfoImporter';
import { validateSupabaseConfig } from '@/lib/supabase/client';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes for large imports


/**
 * POST handler - trigger import
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Verify authorization
    const authHeader = request.headers.get('authorization');
    const adminSecret = process.env.ADMIN_WARMUP_SECRET;
    
    if (!adminSecret) {
      console.error('[ADMIN:WARMUP] ADMIN_WARMUP_SECRET not configured');
      return NextResponse.json(
        { 
          error: 'Admin warmup endpoint is not configured. Set ADMIN_WARMUP_SECRET environment variable.' 
        },
        { status: 500 }
      );
    }
    
    if (authHeader !== `Bearer ${adminSecret}`) {
      console.warn('[ADMIN:WARMUP] Unauthorized access attempt');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // 2. Validate Supabase configuration
    try {
      validateSupabaseConfig();
    } catch (error: any) {
      console.error('[ADMIN:WARMUP] Supabase configuration error:', error);
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
    const fromDate = searchParams.get('fromDate') || undefined;
    const toDate = searchParams.get('toDate') || undefined;
    const limitParam = searchParams.get('limit');
    const batchSizeParam = searchParams.get('batchSize');
    
    // Validate date formats if provided
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (fromDate && !dateRegex.test(fromDate)) {
      return NextResponse.json(
        { error: 'Invalid fromDate format. Use YYYY-MM-DD.' },
        { status: 400 }
      );
    }
    if (toDate && !dateRegex.test(toDate)) {
      return NextResponse.json(
        { error: 'Invalid toDate format. Use YYYY-MM-DD.' },
        { status: 400 }
      );
    }
    
    // Parse numeric parameters with validation
    let limit = 10000;
    let batchSize = 100;
    
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
    
    if (batchSizeParam) {
      const parsedBatchSize = parseInt(batchSizeParam, 10);
      if (isNaN(parsedBatchSize) || parsedBatchSize < 1 || parsedBatchSize > 1000) {
        return NextResponse.json(
          { error: 'Invalid batchSize. Must be between 1 and 1000.' },
          { status: 400 }
        );
      }
      batchSize = parsedBatchSize;
    }
    
    console.log('[ADMIN:WARMUP] Starting import', {
      dryRun,
      fromDate,
      toDate,
      limit,
      batchSize
    });
    
    // 4. Run the import
    const stats = await importWienInfoEvents({
      dryRun,
      fromDate,
      toDate,
      limit,
      batchSize,
      debug: true
    });
    
    // 5. Return results
    const success = stats.totalFailed === 0 && stats.errors.length === 0;
    
    if (dryRun) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        message: 'Dry-run completed successfully (no data written to database)',
        stats
      });
    }
    
    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Import completed successfully',
        stats
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'Import completed with errors',
        stats
      }, { status: 207 }); // 207 Multi-Status for partial success
    }
    
  } catch (error: any) {
    console.error('[ADMIN:WARMUP] Unexpected error:', error);
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
    endpoint: '/api/admin/cache-warmup',
    description: 'Admin endpoint to trigger wien.info event import into Supabase',
    method: 'POST',
    authentication: 'Bearer token in Authorization header (ADMIN_WARMUP_SECRET)',
    queryParameters: {
      dryRun: 'boolean (optional) - Run without writing to database',
      fromDate: 'string (optional) - Start date in YYYY-MM-DD format',
      toDate: 'string (optional) - End date in YYYY-MM-DD format',
      limit: 'number (optional) - Maximum events to fetch (default: 10000, max: 50000)',
      batchSize: 'number (optional) - Batch size for processing (default: 100, max: 1000)'
    },
    example: {
      url: '/api/admin/cache-warmup?dryRun=true&fromDate=2025-11-17&toDate=2025-12-17',
      headers: {
        'Authorization': 'Bearer YOUR_ADMIN_WARMUP_SECRET'
      }
    }
  });
}
