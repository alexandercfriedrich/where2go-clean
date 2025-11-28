/**
 * Debug Test Endpoint for /api/admin/events/process
 * 
 * POST /api/debug/test-events-process
 * 
 * This endpoint allows testing Bearer token authentication against
 * the /api/admin/events/process endpoint without actually processing events.
 * 
 * Request Body:
 * {
 *   token: string  // The Bearer token to test
 * }
 * 
 * Response:
 * - HTTP status from the test
 * - JSON response from the endpoint
 * - Debug information
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    let body: { token?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    const { token } = body;

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    // Build the URL for the events/process endpoint
    const baseUrl = request.nextUrl.origin;
    const testUrl = `${baseUrl}/api/admin/events/process`;

    // Create an AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
      // Make a test request to the events/process endpoint
      // Using empty events array - this should authenticate and return success with 0 events
      const testResponse = await fetch(testUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          events: [],
          options: {
            source: 'system-status-test',
            dryRun: true
          }
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      let responseData: Record<string, unknown>;
      try {
        responseData = await testResponse.json();
      } catch {
        responseData = { parseError: 'Could not parse response as JSON' };
      }

      // Return the test results
      return NextResponse.json({
        success: testResponse.ok,
        httpStatus: testResponse.status,
        httpStatusText: testResponse.statusText,
        authenticated: testResponse.status !== 401,
        response: responseData,
        debug: {
          testedUrl: testUrl,
          tokenLength: token.length,
          tokenFirst4: token.substring(0, 4),
          tokenLast4: token.substring(token.length - 4),
          timestamp: new Date().toISOString(),
        }
      });
    } catch (fetchError: unknown) {
      clearTimeout(timeoutId);
      
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        return NextResponse.json({
          success: false,
          error: 'Request timed out after 30 seconds',
          debug: {
            testedUrl: testUrl,
            tokenLength: token.length,
            timestamp: new Date().toISOString(),
          }
        }, { status: 504 });
      }
      
      const errorMessage = fetchError instanceof Error ? fetchError.message : 'Unknown fetch error';
      return NextResponse.json({
        success: false,
        error: 'Network error while testing events/process endpoint',
        message: errorMessage,
        debug: {
          testedUrl: testUrl,
          tokenLength: token.length,
          timestamp: new Date().toISOString(),
        }
      }, { status: 502 });
    }

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[DEBUG:TEST-EVENTS-PROCESS] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to test events/process endpoint',
        message: errorMessage
      },
      { status: 500 }
    );
  }
}
