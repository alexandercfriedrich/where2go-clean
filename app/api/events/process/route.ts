import { NextRequest, NextResponse } from 'next/server';
import { NewEventsWorker } from '../../../../worker/new-events-worker';
import { createComponentLogger } from '../../../../lib/new-backend/utils/log';

const logger = createComponentLogger('ProcessAPI');

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const started = Date.now();
  
  try {
    // Parse request body
    let body;
    try {
      body = await req.json();
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    const { jobId, city, date } = body;

    // Validate required parameters
    if (!jobId || !city || !date) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters: jobId, city, date' },
        { status: 400 }
      );
    }

    // Validate authentication headers
    const hasValidSecret = req.headers.get('x-internal-secret') === process.env.INTERNAL_API_SECRET;
    const hasVercelBackground = req.headers.get('x-vercel-background') === '1';
    
    if (!hasValidSecret && !hasVercelBackground) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    logger.info('Starting job processing', {
      jobId,
      city,
      date,
      ms: Date.now() - started
    });

    // Kick off processing asynchronously (no await)
    const worker = new NewEventsWorker();
    worker.processJob(jobId).catch(error => {
      logger.error('Job processing failed asynchronously', {
        jobId,
        error: error.message || String(error)
      });
    });

    // Return 202 immediately
    return NextResponse.json({
      success: true,
      started: true,
      jobId,
      ms: Date.now() - started
    }, { status: 202 });

  } catch (error: any) {
    logger.error('Process API error', {
      error: error.message || String(error),
      ms: Date.now() - started
    });
    
    return NextResponse.json(
      { success: false, error: error.message || 'processing_failed' },
      { status: 500 }
    );
  }
}

export async function GET(_req: NextRequest) {
  // Simple health/status endpoint
  return NextResponse.json({
    ok: true,
    status: 'ready',
    timestamp: new Date().toISOString()
  });
}

