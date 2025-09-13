// Old API endpoint completely removed - use /api/events/jobs instead
// This file serves as a clear indicator that the old system has been removed

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  console.warn('❌ REMOVED: /api/events endpoint no longer exists - use /api/events/jobs instead');
  
  return NextResponse.json(
    { 
      error: 'This endpoint has been removed. Use /api/events/jobs instead.',
      removed: true,
      newEndpoint: '/api/events/jobs'
    },
    { 
      status: 410, // 410 Gone
      headers: {
        'X-Removed': 'true',
        'X-New-Endpoint': '/api/events/jobs'
      }
    }
  );
}

export async function GET(request: NextRequest) {
  return POST(request);
}
