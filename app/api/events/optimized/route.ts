/**
 * Optimized Events API Endpoint
 * 
 * POST /api/events/optimized
 * - Creates a background job for optimized event search
 * - Immediately returns jobId for progress tracking
 * - Uses SmartEventFetcher with 4-phase pipeline (max 5 AI calls)
 * 
 * Response: { jobId: string, status: 'pending' }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getJobStore } from '@/lib/jobStore';
import { JobStatus } from '@/lib/types';

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
 * Schedules background processing via Vercel Background Functions
 */
async function scheduleBackgroundProcessing(
  request: NextRequest,
  jobId: string,
  city: string,
  date: string,
  categories: string[],
  options: any
): Promise<void> {
  const isVercel = process.env.VERCEL === '1';
  
  if (isVercel) {
    // Production: Use Vercel deployment URL
    const deploymentUrl = request.headers.get('x-vercel-deployment-url');
    const host = deploymentUrl || request.headers.get('x-forwarded-host') || request.headers.get('host');
    const protocol = 'https';
    
    if (!host) {
      throw new Error('Unable to determine host for background processing');
    }

    const backgroundUrl = `${protocol}://${host}/api/events/optimized/process`;
    console.log('[OptimizedAPI] Scheduling background processing:', backgroundUrl);

    const protectionBypass = process.env.PROTECTION_BYPASS_TOKEN;
    const internalSecret = process.env.INTERNAL_API_SECRET;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-vercel-background': '1',
    };
    
    if (protectionBypass) {
      headers['x-vercel-protection-bypass'] = protectionBypass;
    }
    if (internalSecret) {
      headers['x-internal-secret'] = internalSecret;
    }

    const response = await fetch(backgroundUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ jobId, city, date, categories, options })
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Background scheduling failed: ${response.status} ${response.statusText} - ${text}`);
    }

    console.log('[OptimizedAPI] Background processing scheduled successfully');
  } else {
    // Local development: Direct HTTP call
    const localUrl = 'http://localhost:3000/api/events/optimized/process';
    console.log('[OptimizedAPI] Local dev background call:', localUrl);
    
    fetch(localUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-vercel-background': '1'
      },
      body: JSON.stringify({ jobId, city, date, categories, options })
    }).catch(error => {
      console.error('[OptimizedAPI] Local background request failed:', error);
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request
    const body: OptimizedSearchRequest = await request.json();
    const { city, date, categories = [], options = {} } = body;

    // Validate city
    const cityValidation = validateCityName(city);
    if (!cityValidation.valid) {
      return NextResponse.json(
        { error: cityValidation.error },
        { status: 400 }
      );
    }

    // Validate date
    const dateValidation = validateDate(date);
    if (!dateValidation.valid) {
      return NextResponse.json(
        { error: dateValidation.error },
        { status: 400 }
      );
    }

    // Check API key
    const apiKey = process.env.PERPLEXITY_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Perplexity API key not configured' },
        { status: 500 }
      );
    }

    // Create job
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    const jobStore = getJobStore();

    const job: JobStatus = {
      id: jobId,
      status: 'pending',
      events: [],
      progress: {
        completedCategories: 0,
        totalCategories: 4, // 4 phases
        phase: 0,
        completedPhases: 0,
        totalPhases: 4,
        message: 'Initializing optimized search...'
      },
      createdAt: new Date(),
      lastUpdateAt: new Date().toISOString()
    };

    await jobStore.setJob(jobId, job);

    console.log(`[OptimizedAPI] Created job ${jobId} for ${city} on ${date}`);

    // Schedule background processing
    try {
      await scheduleBackgroundProcessing(request, jobId, city, date, categories, options);
    } catch (error) {
      console.error('[OptimizedAPI] Failed to schedule background processing:', error);
      await jobStore.updateJob(jobId, {
        status: 'error',
        error: 'Failed to start background processing: ' + (error instanceof Error ? error.message : String(error))
      });
      return NextResponse.json(
        { error: 'Failed to start search' },
        { status: 500 }
      );
    }

    // Return job ID immediately
    return NextResponse.json({
      jobId,
      status: 'pending'
    });

  } catch (error) {
    console.error('[OptimizedAPI] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
