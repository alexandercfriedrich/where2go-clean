import { NextRequest, NextResponse } from 'next/server';
import { getJobStore } from '@/lib/jobStore';
import { processJobInBackground } from './backgroundProcessor';

// Serverless configuration for background processing
export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes max

const jobStore = getJobStore();

interface ProcessingRequest {
  jobId: string;
  city: string;
  date: string;
  categories?: string[];
  options?: any;
}

export async function POST(req: NextRequest) {
  console.log('🔄 Background processing endpoint called with headers:', {
    'x-vercel-background': req.headers.get('x-vercel-background'),
    'x-internal-call': req.headers.get('x-internal-call'),
    'x-internal-secret': req.headers.get('x-internal-secret') ? 'SET' : 'NOT_SET',
    'x-vercel-protection-bypass': req.headers.get('x-vercel-protection-bypass') ? 'SET' : 'NOT_SET',
    'host': req.headers.get('host'),
    'userAgent': req.headers.get('user-agent')
  });

  // Enhanced internal request validation with multiple detection methods
  const isInternalRequest = 
    req.headers.get('x-vercel-background') === '1' ||
    req.headers.get('x-internal-call') === '1' ||
    req.headers.get('user-agent')?.includes('where2go-internal') ||
    req.headers.get('user-agent')?.includes('node');
  
  if (!isInternalRequest) {
    console.log('⚠️ External request detected, blocking access');
    return NextResponse.json({ error: 'Internal endpoint only' }, { status: 403 });
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
    // Set to 4.5 minutes to ensure it triggers before Vercel's 5-minute timeout
    const deadmanTimeout = setTimeout(() => {
      console.error(`🚨 DEADMAN SWITCH: Job ${jobId} has been running for more than 4.5 minutes, marking as failed`);
      jobStore.updateJob(jobId, {
        status: 'error',
        error: 'Processing timed out - job took longer than expected (4.5 min limit)',
        lastUpdateAt: new Date().toISOString()
      }).catch(updateError => {
        console.error('Failed to update job status via deadman switch:', updateError);
      });
    }, 4.5 * 60 * 1000); // 4.5 minutes - before Vercel's 5 minute timeout
    
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
          console.error('Failed to update job status after background error:', updateError);
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