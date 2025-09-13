import { NextRequest, NextResponse } from 'next/server';

// Deprecated endpoint - use /api/events/jobs instead
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  console.warn('⚠️ DEPRECATED: /api/events endpoint accessed - use /api/events/jobs instead');
  
  // Log request details for monitoring
  const userAgent = request.headers.get('user-agent') || 'unknown';
  const referer = request.headers.get('referer') || 'unknown';
  console.warn(`⚠️ Deprecated endpoint access - User-Agent: ${userAgent}, Referer: ${referer}`);

  return NextResponse.json(
    { 
      error: 'This endpoint has been deprecated. Please use /api/events/jobs instead.',
      deprecated: true,
      newEndpoint: '/api/events/jobs',
      migration: {
        message: 'This endpoint has been replaced with a new system',
        action: 'Update your API calls to use /api/events/jobs',
        documentation: 'See API documentation for the new endpoint format'
      }
    },
    { 
      status: 410, // 410 Gone - indicates the resource is no longer available
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache', 
        'Expires': '0',
        'Sunset': new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
        'X-Deprecated': 'true',
        'X-New-Endpoint': '/api/events/jobs'
      }
    }
  );
}
