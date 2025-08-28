import { NextRequest, NextResponse } from 'next/server';
import { getJobStore } from '@/lib/jobStore';
import { normalizeEvents } from '@/lib/event-normalizer';

// Explicit runtime configuration for clarity
export const runtime = 'nodejs';

// Get JobStore instance for accessing job state
const jobStore = getJobStore();

export async function GET(request: NextRequest, { params }: { params: { jobId: string } }) {
  try {
    const jobId = params.jobId;
    // Use request.nextUrl instead of new URL(request.url) to avoid searchParams undefined errors
    const debugMode = request.nextUrl.searchParams.get('debug') === '1';
    
    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID ist erforderlich' },
        { 
          status: 400,
          headers: { 'Cache-Control': 'no-store' }
        }
      );
    }

    // Wrap jobStore.getJob() call defensively
    let job;
    try {
      job = await jobStore.getJob(jobId);
    } catch (error) {
      console.error('Error retrieving job from store:', error);
      return NextResponse.json(
        { error: 'Fehler beim Abrufen des Job-Status' },
        { 
          status: 500,
          headers: { 'Cache-Control': 'no-store' }
        }
      );
    }
    
    if (!job) {
      return NextResponse.json(
        { error: 'Job nicht gefunden' },
        { 
          status: 404,
          headers: { 'Cache-Control': 'no-store' }
        }
      );
    }

    // Clean up old jobs (JobStore handles this automatically for Redis, but run anyway)
    await jobStore.cleanupOldJobs();

    const response: any = {
      jobId: job.id,
      status: job.status,
      // Always include events array if present, even for pending jobs
      // Apply normalization to ensure consistent field names for the UI
      ...(job.events ? { events: normalizeEvents(job.events) } : {}),
      ...(job.status === 'error' && job.error ? { error: job.error } : {}),
      // Include progress fields when available
      ...(job.progress ? { progress: job.progress } : {}),
      ...(job.lastUpdateAt ? { lastUpdateAt: job.lastUpdateAt } : {})
    };

    // Add lightweight request logging for debugging
    console.log(`Job status request: ${jobId}, status: ${job.status}, hasEvents: ${!!job.events}, hasProgress: ${!!job.progress}`);

    // Include debug data if requested and available
    if (debugMode) {
      try {
        const debugInfo = await jobStore.getDebugInfo(jobId);
        if (debugInfo) {
          response.debug = debugInfo;
        }
      } catch (error) {
        console.error('Error retrieving debug info:', error);
        // Don't fail the entire request if debug info retrieval fails
      }
    }

    return NextResponse.json(response, {
      headers: { 'Cache-Control': 'no-store' }
    });
    
  } catch (error) {
    console.error('Job status API Error:', error);
    return NextResponse.json(
      { error: 'Fehler beim Abrufen des Job-Status' },
      { 
        status: 500,
        headers: { 'Cache-Control': 'no-store' }
      }
    );
  }
}
