/**
 * Admin Events Process API - Unified Pipeline Entry Point
 * 
 * POST /api/admin/events/process
 * 
 * This endpoint allows external services (e.g., Python scrapers) to submit
 * events for processing through the unified pipeline.
 * 
 * Authentication:
 * - Requires Bearer token (ADMIN_WARMUP_SECRET env var)
 * 
 * Request Body:
 * {
 *   events: RawEventInput[],
 *   options?: {
 *     source: string,      // e.g., 'scraper', 'grelle-forelle-scraper'
 *     city?: string,       // default: 'Wien'
 *     dryRun?: boolean,    // default: false
 *     debug?: boolean      // default: false
 *   }
 * }
 * 
 * Response:
 * - 200: Success with PipelineResult
 * - 400: Bad request (missing or invalid data)
 * - 401: Unauthorized
 * - 500: Server error
 * 
 * Note: Events are stored directly in Supabase. Upstash cache is no longer used for events.
 */

import { NextRequest, NextResponse } from 'next/server';
import { processEvents, RawEventInput, EventSource } from '../../../../../lib/events/unified-event-pipeline';
import { timingSafeEqual } from 'crypto';

export const runtime = 'nodejs';
export const maxDuration = 120; // 2 minutes for large batches

/**
 * Validate authorization
 */
function isAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const adminSecret = process.env.ADMIN_WARMUP_SECRET;
  
  if (!adminSecret) {
    // If no secret is configured, deny all requests
    console.warn('[ADMIN:EVENTS:PROCESS] ADMIN_WARMUP_SECRET not configured');
    return false;
  }
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }
  
  const token = authHeader.slice(7); // Remove 'Bearer ' prefix
  
  try {
    const tokenBuffer = Buffer.from(token, 'utf8');
    const secretBuffer = Buffer.from(adminSecret, 'utf8');
    
    if (tokenBuffer.length !== secretBuffer.length) {
      return false;
    }
    
    return timingSafeEqual(tokenBuffer, secretBuffer);
  } catch {
    return false;
  }
}

/**
 * Validate event source - map common scraper sources
 */
function normalizeSource(source: string): EventSource {
  const sourceLower = source.toLowerCase();
  
  if (sourceLower.includes('scraper')) {
    return 'scraper';
  }
  if (sourceLower.includes('wien.info') || sourceLower === 'wien-info') {
    return 'wien.info';
  }
  if (sourceLower.includes('ai') || sourceLower.includes('perplexity')) {
    return 'ai-search';
  }
  if (sourceLower.includes('community')) {
    return 'community';
  }
  if (sourceLower.includes('rss')) {
    return 'rss';
  }
  
  // Default to scraper for unknown sources
  return 'scraper';
}

/**
 * Validate RawEventInput
 */
function validateEvent(event: any, index: number): { valid: boolean; error?: string } {
  if (!event.title || typeof event.title !== 'string') {
    return { valid: false, error: `Event ${index}: title is required and must be a string` };
  }
  if (!event.venue_name || typeof event.venue_name !== 'string') {
    return { valid: false, error: `Event ${index}: venue_name is required and must be a string` };
  }
  if (!event.start_date_time) {
    return { valid: false, error: `Event ${index}: start_date_time is required` };
  }
  if (!event.source || typeof event.source !== 'string') {
    return { valid: false, error: `Event ${index}: source is required and must be a string` };
  }
  
  return { valid: true };
}

export async function POST(request: NextRequest) {
  try {
    // 1. Authorization check
    if (!isAuthorized(request)) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid or missing Bearer token' },
        { status: 401 }
      );
    }
    
    // 2. Parse request body
    let body: { events?: any[]; options?: any };
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }
    
    // 3. Validate events array
    if (!body.events || !Array.isArray(body.events)) {
      return NextResponse.json(
        { error: 'events array is required' },
        { status: 400 }
      );
    }
    
    if (body.events.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No events to process',
        result: {
          eventsProcessed: 0,
          eventsInserted: 0,
          eventsFailed: 0,
          venuesCreated: 0
        }
      });
    }
    
    // 4. Validate each event
    const validationErrors: string[] = [];
    for (let i = 0; i < body.events.length; i++) {
      const validation = validateEvent(body.events[i], i);
      if (!validation.valid) {
        validationErrors.push(validation.error!);
        if (validationErrors.length >= 10) {
          validationErrors.push(`... and ${body.events.length - i - 1} more events not validated`);
          break;
        }
      }
    }
    
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { 
          error: 'Event validation failed',
          validationErrors 
        },
        { status: 400 }
      );
    }
    
    // 5. Parse options
    const options = body.options || {};
    const source = options.source || 'scraper';
    const city = options.city || 'Wien';
    const dryRun = options.dryRun === true;
    const debug = options.debug === true;
    // Note: syncToCache option removed - events are stored in Supabase only
    
    console.log(`[ADMIN:EVENTS:PROCESS] Processing ${body.events.length} events from ${source} for ${city}`);
    
    // 6. Convert events to RawEventInput with normalized source
    const rawEvents: RawEventInput[] = body.events.map(event => ({
      ...event,
      source: normalizeSource(event.source)
    }));
    
    // 7. Process through unified pipeline
    const result = await processEvents(rawEvents, {
      source: source,
      city: city,
      dryRun: dryRun,
      debug: debug
    });
    
    console.log(`[ADMIN:EVENTS:PROCESS] Complete:`, {
      source,
      city,
      eventsProcessed: result.eventsProcessed,
      eventsInserted: result.eventsInserted,
      eventsFailed: result.eventsFailed,
      venuesCreated: result.venuesCreated,
      duration: `${result.duration}ms`
    });
    
    // 8. Return result
    return NextResponse.json({
      success: result.success,
      message: result.success 
        ? `Successfully processed ${result.eventsInserted} events`
        : `Processing completed with ${result.eventsFailed} failures`,
      result: {
        eventsProcessed: result.eventsProcessed,
        eventsInserted: result.eventsInserted,
        eventsUpdated: result.eventsUpdated,
        eventsFailed: result.eventsFailed,
        eventsSkippedAsDuplicates: result.eventsSkippedAsDuplicates,
        venuesCreated: result.venuesCreated,
        venuesReused: result.venuesReused,
        duration: result.duration,
        errors: result.errors.length > 0 ? result.errors.slice(0, 20) : undefined // Limit errors in response
      }
    });
    
  } catch (error: any) {
    console.error('[ADMIN:EVENTS:PROCESS] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process events',
        message: error.message
      },
      { status: 500 }
    );
  }
}

/**
 * GET handler - returns API documentation
 */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/admin/events/process',
    description: 'Process events through the unified pipeline (for scrapers and external services)',
    method: 'POST',
    authentication: {
      type: 'Bearer token',
      header: 'Authorization: Bearer <ADMIN_WARMUP_SECRET>'
    },
    requestBody: {
      events: {
        type: 'array',
        required: true,
        description: 'Array of events to process',
        itemSchema: {
          title: 'string (required)',
          venue_name: 'string (required)',
          start_date_time: 'string ISO date (required)',
          source: 'string (required) - e.g., "scraper", "grelle-forelle-scraper"',
          description: 'string (optional)',
          end_date_time: 'string ISO date (optional)',
          venue_address: 'string (optional)',
          venue_city: 'string (optional, default: Wien)',
          category: 'string (optional)',
          price: 'string (optional)',
          ticket_url: 'string (optional)',
          website_url: 'string (optional)',
          image_url: 'string (optional)',
          source_url: 'string (optional)',
          latitude: 'number (optional)',
          longitude: 'number (optional)'
        }
      },
      options: {
        type: 'object',
        required: false,
        properties: {
          source: 'string - Source identifier for logging (default: "scraper")',
          city: 'string - City for events (default: "Wien")',
          dryRun: 'boolean - If true, validates but does not write (default: false)',
          debug: 'boolean - Enable verbose logging (default: false)'
        }
      }
    },
    responseSchema: {
      success: 'boolean',
      message: 'string',
      result: {
        eventsProcessed: 'number',
        eventsInserted: 'number',
        eventsUpdated: 'number',
        eventsFailed: 'number',
        eventsSkippedAsDuplicates: 'number',
        venuesCreated: 'number',
        venuesReused: 'number',
        duration: 'number (ms)',
        errors: 'string[] (first 20 errors if any)'
      }
    },
    example: {
      curl: `curl -X POST https://your-domain/api/admin/events/process \\
  -H "Authorization: Bearer YOUR_SECRET" \\
  -H "Content-Type: application/json" \\
  -d '{
    "events": [{
      "title": "DJ Night",
      "venue_name": "Grelle Forelle",
      "start_date_time": "2025-01-20T23:00:00.000Z",
      "source": "grelle-forelle-scraper",
      "category": "Clubs & Nachtleben"
    }],
    "options": {
      "source": "grelle-forelle-scraper",
      "city": "Wien"
    }
  }'`
    }
  });
}
