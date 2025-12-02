/**
 * Cron Job: Daily Cache Warmup
 * 
 * Scheduled to run daily at 6 AM UTC via Vercel Cron
 * Calls the admin cache-warmup endpoint to pre-populate cache with Wien.info events
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Verify this is a Vercel Cron request
    // Vercel sends the secret in the Authorization header as "Bearer {CRON_SECRET}"
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    // If CRON_SECRET is not set, log a warning but allow the request in development
    if (!cronSecret) {
      console.warn('[cron-warmup] CRON_SECRET not set - authentication disabled');
    } else if (authHeader !== `Bearer ${cronSecret}`) {
      console.warn('[cron-warmup] Unauthorized request - invalid authorization header');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('[cron-warmup] Starting daily cache warmup job at', new Date().toISOString());

    // Call the admin cache-warmup endpoint
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}`
      : `http://localhost:${process.env.PORT || 3000}`;

    const response = await fetch(`${baseUrl}/api/admin/cache-warmup`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.ADMIN_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[cron-warmup] Cache warmup failed:', data.error);
      return NextResponse.json(
        { success: false, error: data.error },
        { status: response.status }
      );
    }

    console.log('[cron-warmup] Cache warmup successful:', data.stats);

    return NextResponse.json({
      success: true,
      message: 'Daily cache warmup completed',
      stats: data.stats,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('[cron-warmup] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
