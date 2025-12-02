/**
 * Cron Authentication Utilities
 * 
 * Shared authentication logic for Vercel Cron job handlers.
 * Vercel Cron sends the CRON_SECRET in the Authorization header as "Bearer {secret}".
 */

import { NextRequest, NextResponse } from 'next/server';

/**
 * Time format regex for HH:mm validation
 */
export const TIME_FORMAT_REGEX = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

/**
 * Result of cron authentication validation
 */
export interface CronAuthResult {
  /** Whether the request is authorized */
  authorized: boolean;
  /** Error response to return if not authorized (null if authorized) */
  errorResponse: NextResponse | null;
}

/**
 * Validate Vercel Cron request authentication
 * 
 * Checks for the CRON_SECRET in the Authorization header.
 * If CRON_SECRET is not set in environment, logs a warning but allows the request
 * (for development environments).
 * 
 * @param request - The incoming NextRequest
 * @param logPrefix - Log prefix for messages (e.g., '[CRON:CACHE-WARMUP]')
 * @returns CronAuthResult indicating whether request is authorized
 * 
 * @example
 * ```ts
 * const authResult = validateCronAuth(request, '[CRON:MY-JOB]');
 * if (!authResult.authorized) {
 *   return authResult.errorResponse;
 * }
 * // Continue with job execution...
 * ```
 */
export function validateCronAuth(request: NextRequest, logPrefix: string): CronAuthResult {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  // If CRON_SECRET is not set, log a warning but allow the request in development
  if (!cronSecret) {
    console.warn(`${logPrefix} CRON_SECRET not set - authentication disabled`);
    return { authorized: true, errorResponse: null };
  }
  
  // Validate the authorization header matches the expected format
  if (authHeader !== `Bearer ${cronSecret}`) {
    console.warn(`${logPrefix} Unauthorized request - invalid authorization header`);
    return {
      authorized: false,
      errorResponse: NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    };
  }
  
  return { authorized: true, errorResponse: null };
}
