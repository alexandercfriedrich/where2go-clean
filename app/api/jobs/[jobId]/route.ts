import { NextRequest, NextResponse } from 'next/server';
import { getJobStore } from '@/lib/jobStore';

// Explicit runtime configuration for clarity
export const runtime = 'nodejs';

// Get JobStore instance for accessing job state
const jobStore = getJobStore();

export async function GET(request: NextRequest, { params }: { params: { jobId: string } }) {
  try {
    const jobId = params.jobId;
    const url = new URL(request.url);
    const debugMode = url.searchParams.get('debug') === '1';
    
    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID ist erforderlich' },
        { status: 400 }
      );
    }

    const job = await jobStore.getJob(jobId);
    
    if (!job) {
      return NextResponse.json(
        { error: 'Job nicht gefunden' },
        { status: 404 }
      );
    }

    // Clean up old jobs (JobStore handles this automatically for Redis, but run anyway)
    await jobStore.cleanupOldJobs();

    const response: any = {
      jobId: job.id,
      status: job.status,
      // Return events for both 'pending' and 'done' status
      ...(job.events ? { events: job.events } : {}),
      ...(job.status === 'error' && job.error ? { error: job.error } : {})
    };

    // Include debug data if requested and available
    if (debugMode) {
      const debugInfo = await jobStore.getDebugInfo(jobId);
      if (debugInfo) {
        response.debug = debugInfo;
      }
    }

    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Job status API Error:', error);
    return NextResponse.json(
      { error: 'Fehler beim Abrufen des Job-Status' },
      { status: 500 }
    );
  }
}
