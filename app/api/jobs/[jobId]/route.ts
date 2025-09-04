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
    
    console.log(`Looking for job with ID: ${jobId}`);
    
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

    // Safety check: If job is older than 5 minutes and still pending, mark it as error
    // This prevents infinite polling for truly stuck jobs - reasonable timeout
    const jobAgeMs = Date.now() - job.createdAt.getTime();
    const maxJobAgeMs = 5 * 60 * 1000; // 5 minutes (back to reasonable timeout)
    
    if (job.status === 'pending' && jobAgeMs > maxJobAgeMs) {
      console.warn(`🚨 JOB TIMEOUT: Job ${jobId} is ${Math.round(jobAgeMs/1000)}s old and still pending - marking as error to prevent infinite polling`);
      try {
        await jobStore.updateJob(jobId, {
          status: 'error',
          error: 'Job wurde aufgrund von Zeitüberschreitung beendet (5 Min. Limit)',
          lastUpdateAt: new Date().toISOString()
        });
        // Retrieve the updated job
        job.status = 'error';
        job.error = 'Job wurde aufgrund von Zeitüberschreitung beendet (5 Min. Limit)';
      } catch (updateError) {
        console.error('Failed to update stale job status:', updateError);
        // Continue with the stale job data
      }
    }

    // Additional check: If job is older than 3 minutes with no progress, mark as error
    if (job.status === 'pending' && jobAgeMs > 180000 && job.progress?.completedCategories === 0) {
      console.warn(`🚨 NO PROGRESS TIMEOUT: Job ${jobId} is ${Math.round(jobAgeMs/1000)}s old with no progress - marking as error`);
      try {
        await jobStore.updateJob(jobId, {
          status: 'error',
          error: 'Background processing failed to start - job stalled (3 min no progress)',
          lastUpdateAt: new Date().toISOString()
        });
        // Retrieve the updated job
        job.status = 'error';
        job.error = 'Background processing failed to start - job stalled (3 min no progress)';
      } catch (updateError) {
        console.error('Failed to update no-progress job status:', updateError);
        // Continue with the stale job data
      }
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
      headers: { 
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
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
