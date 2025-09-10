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
}

export async function POST(req: NextRequest) {
  console.log('🔄 Background processing endpoint called with headers:', {
    'x-vercel-background': req.headers.get('x-vercel-background'),
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
    const { jobId, city, date, categories } = body;

    console.log('Processing job:', { jobId, city, date, categories: categories?.length || 0 });

    if (!jobId || !city || !date) {
      console.error('❌ Missing required parameters:', { jobId: !!jobId, city: !!city, date: !!date });
      return NextResponse.json(
        { error: 'Missing required parameters: jobId, city, date' },
        { status: 400 }
      );
    }

    console.log(`🚀 Background processing starting for job ${jobId}...`);

    // Start background processing (fire and forget)
    processJobInBackground(jobId, city, date, categories)
      .then(() => {
        console.log(`✅ Background processing completed successfully for job: ${jobId}`);
      })
      .catch(error => {
        console.error(`❌ Background processing failed for job ${jobId}:`, error);
        // Update job to error state
        jobStore.updateJob(jobId, {
          status: 'error',
          error: 'Processing failed: ' + (error instanceof Error ? error.message : String(error))
        }).catch(updateError => {
          console.error('❌ Failed to update job status after background error:', updateError);
        });
      });

    console.log(`✅ Background processing started successfully for job: ${jobId}`);
    return NextResponse.json({ success: true, jobId, message: 'Background processing started' });

  } catch (error) {
    console.error('❌ Background processing route error:', error);
    return NextResponse.json(
      { error: 'Background processing failed: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}