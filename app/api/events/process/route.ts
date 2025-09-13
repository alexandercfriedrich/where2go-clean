import { NextRequest, NextResponse } from 'next/server';
import { getJobStore } from '@/lib/jobStore';
import { processJobInBackground } from './backgroundProcessor';

// Serverless configuration for background processing
export const runtime = 'nodejs';
export const maxDuration = 240; // 4 minutes - conservative timeout that should work on most Vercel plans

const jobStore = getJobStore();

interface ProcessingRequest {
  jobId: string;
  city: string;
  date: string;
  categories?: string[];
  options?: any;
}

export async function POST(req: NextRequest) {
  // Add immediate debug logging to see if this function is even being called
  console.log('🚀 CRITICAL DEBUG: POST function called - route is working!');
  console.log('🚀 Method and URL:', req.method, req.url);
  
  console.log('🔄 Background processing endpoint called with headers:', {
    'x-vercel-background': req.headers.get('x-vercel-background'),
    'x-internal-call': req.headers.get('x-internal-call'),
    'x-internal-secret': req.headers.get('x-internal-secret') ? 'SET' : 'NOT_SET',
    'x-vercel-protection-bypass': req.headers.get('x-vercel-protection-bypass') ? 'SET' : 'NOT_SET',
    'host': req.headers.get('host'),
    'userAgent': req.headers.get('user-agent')
  });

  // Enhanced internal request validation with multiple detection methods
  const hasInternalSecret = req.headers.get('x-internal-secret');
  const isValidSecret = hasInternalSecret && 
    (!process.env.INTERNAL_API_SECRET || hasInternalSecret === process.env.INTERNAL_API_SECRET);
    
  const isInternalRequest = 
    req.headers.get('x-vercel-background') === '1' ||
    req.headers.get('x-internal-call') === '1' ||
    isValidSecret ||
    req.headers.get('x-vercel-protection-bypass') ||
    req.headers.get('user-agent')?.includes('where2go-internal') ||
    req.headers.get('user-agent')?.includes('node');
  
  if (!isInternalRequest) {
    console.log('⚠️ External request detected, blocking access');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('✅ Background processing endpoint: Valid request received');

  try {
    const body: ProcessingRequest = await req.json();
    const { jobId, city, date, categories, options } = body;

    if (!jobId || !city || !date) {
      console.error('❌ Missing required parameters:', { jobId: !!jobId, city: !!city, date: !!date });
      return NextResponse.json(
        { error: 'Missing required parameters: jobId, city, date' },
        { status: 400 }
      );
    }

    console.log('Processing job:', { jobId, city, date, categories: categories?.length || 0 });

    // Start background processing asynchronously - DO NOT AWAIT
    // This allows the HTTP response to return immediately while processing continues
    
    // Set up a deadman's switch to automatically fail jobs that take too long
    // Set to 3.5 minutes to ensure it triggers before the 4-minute maxDuration
    const deadmanTimeout = setTimeout(async () => {
      console.error(`🚨 DEADMAN SWITCH: Job ${jobId} has been running for more than 3.5 minutes, marking as failed`);
      try {
        await jobStore.updateJob(jobId, {
          status: 'error',
          error: 'Processing timed out - job took longer than expected (3.5 min limit)',
          lastUpdateAt: new Date().toISOString()
        });
        console.log(`✅ Deadman switch successfully marked job ${jobId} as failed`);
      } catch (updateError) {
        console.error('❌ CRITICAL: Deadman switch failed to update job status:', updateError);
        // Even the deadman switch failed - this indicates serious Redis issues
        console.error(`🚨 REDIS CONNECTIVITY FAILURE: Job ${jobId} cannot be marked as failed due to Redis issues`);
      }
    }, 3.5 * 60 * 1000); // 3.5 minutes - before the 4-minute maxDuration
    
    processJobInBackground(jobId, city, date, categories, options)
      .then(() => {
        // Job completed successfully
        clearTimeout(deadmanTimeout);
        console.log(`✅ Background processing completed successfully for job: ${jobId}`);
      })
      .catch(error => {
        // Job failed with error
        clearTimeout(deadmanTimeout);
        console.error('❌ Async background processing error for job', jobId, ':', error);
        
        // Update job status to error to prevent infinite polling
        jobStore.updateJob(jobId, {
          status: 'error',
          error: 'Background processing failed to complete',
          lastUpdateAt: new Date().toISOString()
        }).catch(updateError => {
          console.error('❌ CRITICAL: Failed to update job status after background error:', updateError);
          console.error(`🚨 Job ${jobId} may be stuck in pending state due to Redis connectivity issues`);
        });
      });

    console.log('Background processing started successfully for job:', jobId);
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Background processing route error:', error);
    return NextResponse.json(
      { error: 'Background processing failed' },
      { status: 500 }
    );
  }
}

// Add GET handler for simple endpoint testing
export async function GET(req: NextRequest) {
  console.log('🔍 GET request received on background processing endpoint - route exists and works!');
  return NextResponse.json({
    success: true,
    message: 'Background processing endpoint is accessible',
    method: 'GET',
    url: req.url,
    timestamp: new Date().toISOString()
  });
}

// Add OPTIONS handler to support CORS preflight requests if needed
export async function OPTIONS(req: NextRequest) {
  console.log('🔍 OPTIONS request received on background processing endpoint');
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-vercel-background, x-internal-call, x-internal-secret, x-vercel-protection-bypass',
    },
  });
}