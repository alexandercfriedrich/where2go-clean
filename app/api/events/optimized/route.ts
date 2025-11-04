/**
 * Optimized Events API Endpoint - NDJSON Streaming
 * 
 * POST /api/events/optimized
 * - Streams NDJSON responses with immediate phase and event updates
 * - Uses SmartEventFetcher with 4-phase pipeline (max 5 AI calls)
 * - Each line is a JSON object: phase update or event batch
 * 
 * Response: NDJSON stream with phase updates and events
 */

import { NextRequest } from 'next/server';
import { createSmartEventFetcher } from '@/lib/smartEventFetcher';
import { normalizeCategory } from '@/lib/eventCategories';
import { EventData } from '@/lib/types';
import { eventsCache } from '@/lib/cache';
import { upsertDayEvents } from '@/lib/dayCache';
import { computeTTLSecondsForEvents } from '@/lib/cacheTtl';

export const runtime = 'nodejs';
export const maxDuration = 120;

interface OptimizedSearchRequest {
  city: string;
  date: string;
  categories?: string[];
  options?: {
    debug?: boolean;
    temperature?: number;
    maxTokens?: number;
  };
}

// NDJSON message types
type StreamMessage = 
  | { type: 'phase'; phase: number; totalPhases: number; message: string; timestamp: number }
  | { type: 'events'; phase: number; events: EventData[]; totalEvents: number; timestamp: number }
  | { type: 'complete'; totalEvents: number; events: EventData[]; timestamp: number }
  | { type: 'error'; error: string; timestamp: number };

/**
 * Validates city name to prevent malicious inputs
 */
function validateCityName(city: string): { valid: boolean; error?: string } {
  if (!city || !city.trim()) {
    return { valid: false, error: 'City name is required' };
  }

  const trimmed = city.trim();

  // Block file extensions
  const blockedExtensions = ['.php', '.asp', '.jsp', '.exe', '.dll', '.so'];
  if (blockedExtensions.some(ext => trimmed.toLowerCase().includes(ext))) {
    return { valid: false, error: 'Invalid city name format' };
  }

  // Block path traversal
  if (trimmed.includes('../') || trimmed.includes('..\\')) {
    return { valid: false, error: 'Invalid city name format' };
  }

  // Block suspicious patterns
  if (/<script|javascript:|onerror=/i.test(trimmed)) {
    return { valid: false, error: 'Invalid city name format' };
  }

  return { valid: true };
}

/**
 * Validates date in YYYY-MM-DD format
 */
function validateDate(date: string): { valid: boolean; error?: string } {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { valid: false, error: 'Date must be in YYYY-MM-DD format' };
  }

  const parsed = new Date(date);
  if (isNaN(parsed.getTime())) {
    return { valid: false, error: 'Invalid date' };
  }

  return { valid: true };
}

/**
 * Write an NDJSON line to the stream
 */
function writeNDJSON(encoder: TextEncoder, controller: ReadableStreamDefaultController, message: StreamMessage) {
  const line = JSON.stringify(message) + '\n';
  controller.enqueue(encoder.encode(line));
}

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request
    const body: OptimizedSearchRequest = await request.json();
    const { city, date, categories = [], options = {} } = body;

    // Validate city
    const cityValidation = validateCityName(city);
    if (!cityValidation.valid) {
      return new Response(
        JSON.stringify({ type: 'error', error: cityValidation.error, timestamp: Date.now() }) + '\n',
        { 
          status: 400,
          headers: { 'Content-Type': 'application/x-ndjson' }
        }
      );
    }

    // Validate date
    const dateValidation = validateDate(date);
    if (!dateValidation.valid) {
      return new Response(
        JSON.stringify({ type: 'error', error: dateValidation.error, timestamp: Date.now() }) + '\n',
        { 
          status: 400,
          headers: { 'Content-Type': 'application/x-ndjson' }
        }
      );
    }

    // Check API key
    const apiKey = process.env.PERPLEXITY_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ type: 'error', error: 'Perplexity API key not configured', timestamp: Date.now() }) + '\n',
        { 
          status: 500,
          headers: { 'Content-Type': 'application/x-ndjson' }
        }
      );
    }

    console.log(`[OptimizedAPI:Stream] Starting search for ${city} on ${date}`);

    // Create readable stream for NDJSON output
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Track all events across phases
          let allEvents: EventData[] = [];

          // Create SmartEventFetcher
          const fetcher = createSmartEventFetcher({
            apiKey,
            categories: categories.length > 0 ? categories : undefined,
            debug: options.debug ?? false,
            temperature: options.temperature,
            maxTokens: options.maxTokens
          });

          // Phase update callback - streams updates immediately
          const onPhaseUpdate = async (
            phase: number,
            newEvents: EventData[],
            totalEvents: number,
            message: string
          ) => {
            try {
              // Add new events to running total
              allEvents.push(...newEvents);

              // Normalize categories
              const normalizedEvents = allEvents.map(e => ({
                ...e,
                category: normalizeCategory(e.category || '')
              }));

              // Send phase update
              writeNDJSON(encoder, controller, {
                type: 'phase',
                phase,
                totalPhases: 4,
                message,
                timestamp: Date.now()
              });

              // Send events if we have any new ones
              if (newEvents.length > 0) {
                const normalizedNewEvents = newEvents.map(e => ({
                  ...e,
                  category: normalizeCategory(e.category || '')
                }));

                writeNDJSON(encoder, controller, {
                  type: 'events',
                  phase,
                  events: normalizedNewEvents,
                  totalEvents: normalizedEvents.length,
                  timestamp: Date.now()
                });

                // Update cache immediately with extended TTL
                const ttlSeconds = computeTTLSecondsForEvents(normalizedEvents);
                const extendedTtl = Math.max(3600, ttlSeconds); // Force 1 hour minimum for streaming events
                await upsertDayEvents(city, date, normalizedEvents);

                // Update per-category shards with extended TTL
                const grouped: Record<string, EventData[]> = {};
                for (const event of normalizedEvents) {
                  if (!event.category) continue;
                  if (!grouped[event.category]) {
                    grouped[event.category] = [];
                  }
                  grouped[event.category].push(event);
                }

                for (const [category, categoryEvents] of Object.entries(grouped)) {
                  await eventsCache.setEventsByCategory(city, date, category, categoryEvents, extendedTtl);
                }
              }

              console.log(`[OptimizedAPI:Stream] Phase ${phase}: ${message} (${newEvents.length} new, ${totalEvents} total)`);
            } catch (error) {
              console.error(`[OptimizedAPI:Stream] Error in phase update:`, error);
              // Don't throw - continue streaming
            }
          };

          // Execute the optimized search with streaming updates
          const finalEvents = await fetcher.fetchEventsOptimized(city, date, onPhaseUpdate);

          // Normalize final events
          const normalizedFinal = finalEvents.map(e => ({
            ...e,
            category: normalizeCategory(e.category || '')
          }));

          // Send completion message
          writeNDJSON(encoder, controller, {
            type: 'complete',
            totalEvents: normalizedFinal.length,
            events: normalizedFinal,
            timestamp: Date.now()
          });

          console.log(`[OptimizedAPI:Stream] Complete: ${normalizedFinal.length} events`);

          // Close the stream
          controller.close();
        } catch (error) {
          console.error('[OptimizedAPI:Stream] Error:', error);
          
          // Send error message
          writeNDJSON(encoder, controller, {
            type: 'error',
            error: error instanceof Error ? error.message : 'Search failed',
            timestamp: Date.now()
          });

          controller.close();
        }
      }
    });

    // Return streaming response
    return new Response(stream, {
      headers: {
        'Content-Type': 'application/x-ndjson',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('[OptimizedAPI:Stream] Unexpected error:', error);
    return new Response(
      JSON.stringify({ type: 'error', error: error instanceof Error ? error.message : 'Internal server error', timestamp: Date.now() }) + '\n',
      { 
        status: 500,
        headers: { 'Content-Type': 'application/x-ndjson' }
      }
    );
  }
}
