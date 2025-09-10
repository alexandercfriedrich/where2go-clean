import { NextRequest, NextResponse } from 'next/server';
import { getJobStore } from '@/lib/jobStore';
import { normalizeEvents } from '@/lib/event-normalizer';

// Explicit runtime configuration
export const runtime = 'nodejs';

// Get JobStore instance
const jobStore = getJobStore();

export async function GET(request: NextRequest, { params }: { params: { jobId: string } }) {
  try {
    const jobId = params.jobId;
    
    console.log(`Job status request: ${jobId}`);
    
    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID ist erforderlich' },
        { 
          status: 400,
          headers: { 'Cache-Control': 'no-store' }
        }
      );
    }

    // Get job from store
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

    // Simple timeout check: If job is older than 3 minutes and still pending, mark as error
    const jobAgeMs = Date.now() - job.createdAt.getTime();
    const maxJobAgeMs = 3 * 60 * 1000; // 3 minutes
    
    if (job.status === 'pending' && jobAgeMs > maxJobAgeMs) {
      console.warn(`🚨 Job timeout: ${jobId} is ${Math.round(jobAgeMs/1000)}s old - marking as error`);
      try {
        await jobStore.updateJob(jobId, {
          status: 'error',
          error: 'Job wurde aufgrund von Zeitüberschreitung beendet (3 Min. Limit)'
        });
        job.status = 'error';
        job.error = 'Job wurde aufgrund von Zeitüberschreitung beendet (3 Min. Limit)';
      } catch (updateError) {
        console.error('Failed to update stale job status:', updateError);
      }
    }

    // Clean up old jobs periodically
    await jobStore.cleanupOldJobs();

    const response: any = {
      id: job.id,
      status: job.status,
      // Always include events array if present
      ...(job.events ? { events: normalizeEvents(job.events) } : {}),
      ...(job.status === 'error' && job.error ? { error: job.error } : {}),
      // Include progress fields when available
      ...(job.progress ? { progress: job.progress } : {})
    };

    console.log(`Job status response: ${jobId}, status: ${job.status}, events: ${job.events?.length || 0}`);

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
