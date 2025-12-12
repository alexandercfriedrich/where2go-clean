/**
 * Cron Job: Daily Cache Warmup
 * 
 * Scheduled to run daily at 6 AM UTC via Vercel Cron
 * Calls the admin cache-warmup endpoint to pre-populate cache with Wien.info events
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateCronAuth } from '@/lib/cronAuth';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Verify this is a Vercel Cron request
    const authResult = validateCronAuth(request, '[cron-warmup]');
    if (!authResult.authorized) {
      return authResult.errorResponse!;
    }

    console.log('[cron-warmup] Starting daily cache warmup job at', new Date().toISOString());

    // Call the admin cache-warmup endpoint
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}`
      : `http://localhost:${process.env.PORT || 3000}`;

    // Use Basic Auth credentials for admin endpoint
    const adminUser = process.env.ADMIN_USER;
    const adminPass = process.env.ADMIN_PASS;

    if (!adminUser || !adminPass) {
      console.error('[cron-warmup] ADMIN_USER or ADMIN_PASS not configured');
      return NextResponse.json(
        { success: false, error: 'Admin credentials not configured' },
        { status: 500 }
      );
    }

    const credentials = Buffer.from(`${adminUser}:${adminPass}`).toString('base64');

    const response = await fetch(`${baseUrl}/api/admin/cache-warmup`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json'
      }
    });

    // Check if response is JSON before parsing
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('[cron-warmup] Received non-JSON response:', text.substring(0, 500));
      return NextResponse.json(
        { success: false, error: 'Received non-JSON response from cache-warmup endpoint' },
        { status: 500 }
      );
    }

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
