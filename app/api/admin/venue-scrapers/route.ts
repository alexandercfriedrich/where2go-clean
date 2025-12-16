/**
 * Admin Venue Scrapers API Endpoint
 * 
 * Secured endpoint to trigger venue event scrapers via GitHub Actions.
 * 
 * Authentication:
 * - Primary: Middleware Basic Auth (ADMIN_USER/ADMIN_PASS) - Always required
 * - Optional: Bearer token (ADMIN_WARMUP_SECRET) - Additional security layer for external access
 * 
 * POST /api/admin/venue-scrapers
 * 
 * Query Parameters:
 * - venues: string (optional) - Comma-separated list of venue keys to scrape (default: all)
 * - dryRun: boolean (optional) - If true, runs scrapers without writing to database
 * 
 * Headers:
 * - Authorization: Basic <base64(ADMIN_USER:ADMIN_PASS)> - Required (enforced by middleware)
 * - Authorization: Bearer <ADMIN_WARMUP_SECRET> - Optional (bypasses Basic Auth if valid)
 * 
 * Response:
 * - 200: Success - GitHub Action workflow triggered
 * - 401: Unauthorized (missing or invalid credentials)
 * - 400: Bad request (invalid parameters)
 * - 500: Server error
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateSupabaseConfig } from '@/lib/supabase/client';
import { timingSafeEqual } from 'crypto';

export const runtime = 'nodejs';
export const maxDuration = 60; // 1 minute timeout for API call

/**
 * Trigger GitHub Actions workflow to run venue scrapers
 */
async function triggerGitHubAction(venues: string[] | null, dryRun: boolean): Promise<any> {
  const githubToken = process.env.GITHUB_TOKEN;
  const githubRepo = process.env.GITHUB_REPOSITORY || 'alexandercfriedrich/where2go-clean';
  
  if (!githubToken) {
    throw new Error(
      'GITHUB_TOKEN environment variable is not set. ' +
      'Please configure a GitHub Personal Access Token with workflow permissions.'
    );
  }
  
  // Parse owner and repo from GITHUB_REPOSITORY (format: owner/repo)
  const [owner, repo] = githubRepo.split('/');
  
  console.log('[ADMIN:VENUE-SCRAPERS] Triggering GitHub Action workflow');
  console.log('[ADMIN:VENUE-SCRAPERS] Repository:', githubRepo);
  console.log('[ADMIN:VENUE-SCRAPERS] Venues:', venues || 'all');
  console.log('[ADMIN:VENUE-SCRAPERS] Dry Run:', dryRun);
  
  // Trigger repository_dispatch event
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/dispatches`,
    {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `Bearer ${githubToken}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Where2Go-Admin'
      },
      body: JSON.stringify({
        event_type: 'trigger-venue-scrapers',
        client_payload: {
          venues: venues ? venues.join(',') : '',
          dry_run: dryRun,
          triggered_by: 'admin-ui',
          timestamp: new Date().toISOString()
        }
      })
    }
  );
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('[ADMIN:VENUE-SCRAPERS] GitHub API error:', response.status, errorText);
    throw new Error(
      `Failed to trigger GitHub Action: ${response.status} ${response.statusText}. ` +
      `Error: ${errorText}`
    );
  }
  
  console.log('[ADMIN:VENUE-SCRAPERS] GitHub Action triggered successfully');
  
  return {
    success: true,
    triggered: true,
    venues: venues || ['all'],
    dryRun,
    message: 'GitHub Actions workflow triggered successfully',
    workflowUrl: `https://github.com/${owner}/${repo}/actions`
  };
}


/**
 * POST handler - trigger venue scrapers via GitHub Actions
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Optional Bearer token authentication (bypasses middleware Basic Auth if provided)
    const authHeader = request.headers.get('authorization');
    const adminSecret = process.env.ADMIN_WARMUP_SECRET;
    
    // If Bearer token is provided and ADMIN_WARMUP_SECRET is set, validate it
    if (authHeader && authHeader.startsWith('Bearer ') && adminSecret) {
      const expectedAuth = `Bearer ${adminSecret}`;
      
      // Only reject if Bearer token is invalid (wrong token)
      // If no Bearer token provided, middleware Basic Auth will handle it
      if (authHeader.length !== expectedAuth.length) {
        console.warn('[ADMIN:VENUE-SCRAPERS] Invalid Bearer token length');
        return NextResponse.json(
          { error: 'Unauthorized - Invalid Bearer token' },
          { status: 401 }
        );
      }
      
      try {
        const authBuffer = Buffer.from(authHeader, 'utf8');
        const expectedBuffer = Buffer.from(expectedAuth, 'utf8');
        if (!timingSafeEqual(authBuffer, expectedBuffer)) {
          console.warn('[ADMIN:VENUE-SCRAPERS] Invalid Bearer token');
          return NextResponse.json(
            { error: 'Unauthorized - Invalid Bearer token' },
            { status: 401 }
          );
        }
        console.log('[ADMIN:VENUE-SCRAPERS] Bearer token validated successfully');
      } catch (error) {
        console.warn('[ADMIN:VENUE-SCRAPERS] Bearer token comparison failed');
        return NextResponse.json(
          { error: 'Unauthorized - Invalid Bearer token' },
          { status: 401 }
        );
      }
    }
    // If no Bearer token or ADMIN_WARMUP_SECRET not set, rely on middleware Basic Auth
    // Middleware will have already rejected unauthenticated requests
    
    // 2. Validate Supabase configuration
    try {
      validateSupabaseConfig();
    } catch (error: any) {
      console.error('[ADMIN:VENUE-SCRAPERS] Supabase configuration error:', error);
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
    const venuesParam = searchParams.get('venues');
    
    // Parse venue list
    let venues: string[] | null = null;
    if (venuesParam) {
      venues = venuesParam.split(',').map(v => v.trim()).filter(v => v.length > 0);
      if (venues.length === 0) {
        return NextResponse.json(
          { error: 'Invalid venues parameter. Provide comma-separated venue keys.' },
          { status: 400 }
        );
      }
    }
    
    console.log('[ADMIN:VENUE-SCRAPERS] Starting scrape', {
      dryRun,
      venues: venues || 'all'
    });
    
    // 4. Trigger GitHub Actions workflow
    const result = await triggerGitHubAction(venues, dryRun);
    
    // 5. Return results
    return NextResponse.json({
      success: true,
      message: result.message,
      triggered: result.triggered,
      venues: result.venues,
      dryRun: result.dryRun,
      workflowUrl: result.workflowUrl,
      note: 'Scraper is running in GitHub Actions. Check the workflow URL for progress and results.'
    });
    
  } catch (error: any) {
    console.error('[ADMIN:VENUE-SCRAPERS] Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to trigger venue scrapers',
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
  // List available venues (keep in sync with venue_configs.py)
  const availableVenues = [
    'babenberger-passage', 'camera-club', 'celeste', 'chelsea', 'das-werk',
    'donau', 'flex', 'flucc', 'grelle-forelle', 'ibiza-spotlight',
    'o-der-klub', 'patroc-wien-gay', 'ponyhof', 'prater-dome',
    'pratersauna', 'praterstrasse', 'rhiz', 'sass-music-club',
    'the-loft', 'u4', 'vieipee', 'volksgarten'
  ];
  
  return NextResponse.json({
    endpoint: '/api/admin/venue-scrapers',
    description: 'Admin endpoint to trigger venue event scrapers via GitHub Actions',
    method: 'POST',
    implementation: 'Triggers a GitHub Actions workflow to run Python scrapers',
    authentication: {
      primary: 'Basic Auth via middleware (ADMIN_USER/ADMIN_PASS) - Required by default',
      optional: 'Bearer token (ADMIN_WARMUP_SECRET env var) - Bypasses Basic Auth if valid'
    },
    queryParameters: {
      dryRun: 'boolean (optional) - Run without writing to database',
      venues: 'string (optional) - Comma-separated venue keys (default: all)',
    },
    environmentVariables: {
      GITHUB_TOKEN: 'Required - GitHub Personal Access Token with workflow permissions',
      GITHUB_REPOSITORY: 'Optional - Repository in format owner/repo (default: alexandercfriedrich/where2go-clean)',
      ADMIN_WARMUP_SECRET: 'Optional - Bearer token for programmatic access'
    },
    availableVenues,
    example: {
      url: '/api/admin/venue-scrapers?dryRun=true&venues=grelle-forelle,flex',
      headers: {
        'Authorization': 'Basic <base64(username:password)> OR Bearer <secret>'
      }
    },
    workflowFile: '.github/workflows/venue-scrapers.yml'
  });
}
