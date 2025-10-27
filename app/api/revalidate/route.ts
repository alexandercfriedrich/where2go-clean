import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

/**
 * API Route for on-demand ISR revalidation
 * 
 * Usage:
 * POST /api/revalidate
 * Body: { path: string, secret: string }
 * 
 * Example:
 * {
 *   "path": "/wien",
 *   "secret": "your-secret-token"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { path, secret } = body;
    
    console.log('[DEBUG Revalidation API] Request received:', { path, hasSecret: !!secret });
    
    // Validate inputs
    if (!path) {
      console.log('[DEBUG Revalidation API] ❌ Missing path parameter');
      return NextResponse.json({ 
        error: 'Missing path parameter',
        usage: 'POST with body { path: string, secret: string }' 
      }, { status: 400 });
    }
    
    // Security: Check secret (if configured in environment)
    const expectedSecret = process.env.REVALIDATION_SECRET;
    if (expectedSecret && secret !== expectedSecret) {
      console.log('[DEBUG Revalidation API] ❌ Invalid secret provided');
      return NextResponse.json({ error: 'Invalid secret' }, { status: 401 });
    }
    
    if (!expectedSecret) {
      console.warn('[DEBUG Revalidation API] ⚠️ REVALIDATION_SECRET not set - revalidation is unprotected!');
    }
    
    // Revalidate the specified path
    console.log('[DEBUG Revalidation API] Revalidating path:', path);
    await revalidatePath(path);
    
    const timestamp = new Date().toISOString();
    console.log('[DEBUG Revalidation API] ✅ Path revalidated successfully:', path, 'at', timestamp);
    
    return NextResponse.json({ 
      revalidated: true, 
      path,
      timestamp,
      message: `Path ${path} has been revalidated`
    });
    
  } catch (err) {
    console.error('[DEBUG Revalidation API] ❌ Revalidation failed:', err);
    return NextResponse.json({ 
      error: 'Revalidation failed',
      details: err instanceof Error ? err.message : 'Unknown error' 
    }, { status: 500 });
  }
}

/**
 * GET endpoint for health check and documentation
 */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/revalidate',
    method: 'POST',
    description: 'Triggers on-demand revalidation for ISR pages',
    usage: {
      body: {
        path: 'string (required) - The path to revalidate (e.g., "/wien", "/wien/live-konzerte")',
        secret: 'string (optional) - Secret token if REVALIDATION_SECRET is set'
      },
      example: {
        path: '/wien',
        secret: 'your-secret-token'
      }
    },
    security: process.env.REVALIDATION_SECRET 
      ? 'Protected with REVALIDATION_SECRET' 
      : '⚠️ WARNING: No REVALIDATION_SECRET set - endpoint is unprotected!'
  });
}
