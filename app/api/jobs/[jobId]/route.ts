import { NextRequest, NextResponse } from 'next/server';
import { getJobStore } from '@/lib/jobStore';
import { normalizeEvents } from '@/lib/event-normalizer';

export const runtime = 'nodejs';

const jobStore = getJobStore();

export async function GET(request: NextRequest, { params }: { params: { jobId: string } }) {
  try {
    const jobId = params.jobId;
    
    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID ist erforderlich' },
        { 
          status: 400,
          headers: { 'Cache-Control': 'no-store' }
        }
      );
    }

    console.log(`📋 Job status request: ${jobId}`);
    
    // Get job from store
    const job = await jobStore.getJob(jobId);
    
    if (!job) {
      return NextResponse.json(
        { error: 'Job nicht gefunden' },
        { 
          status: 404,
          headers: { 'Cache-Control': 'no-store' }
        }
      );
    }

    // Simple timeout check: If job is older than 5 minutes and still pending, mark as error
    const jobAgeMs = Date.now() - job.createdAt.getTime();
    const maxJobAgeMs = 5 * 60 * 1000; // 5 minutes
    
    // Stale detection: Check if job hasn't been updated in a while (indicates stuck processing)
    const lastUpdateTime = job.lastUpdateAt ? new Date(job.lastUpdateAt).getTime() : job.createdAt.getTime();
    const timeSinceLastUpdate = Date.now() - lastUpdateTime;
    const maxStaleMs = 3 * 60 * 1000; // 3 minutes without update
    
    if (job.status === 'pending' && jobAgeMs > maxJobAgeMs) {
      console.warn(`⏰ Job timeout: ${jobId} is ${Math.round(jobAgeMs/1000)}s old - marking as error`);
      try {
        await jobStore.updateJob(jobId, {
          status: 'error',
          error: 'Job wurde aufgrund von Zeitüberschreitung beendet (5 Min. Limit)',
          lastUpdateAt: new Date().toISOString()
        });
        job.status = 'error';
        job.error = 'Job wurde aufgrund von Zeitüberschreitung beendet (5 Min. Limit)';
      } catch (updateError) {
        console.error('Failed to update timeout job:', updateError);
      }
    } else if (job.status === 'pending' && timeSinceLastUpdate > maxStaleMs) {
      console.warn(`🔄 Stale job detected: ${jobId} hasn't been updated for ${Math.round(timeSinceLastUpdate/1000)}s - marking as error`);
      try {
        await jobStore.updateJob(jobId, {
          status: 'error',
          error: 'Job scheint stecken geblieben zu sein (keine Updates seit 3 Min.)',
          lastUpdateAt: new Date().toISOString()
        });
        job.status = 'error';
        job.error = 'Job scheint stecken geblieben zu sein (keine Updates seit 3 Min.)';
      } catch (updateError) {
        console.error('Failed to update stale job:', updateError);
      }
    }

    // Clean up old jobs
    await jobStore.cleanupOldJobs();

    const response: any = {
      id: job.id,
      status: job.status,
      events: normalizeEvents(job.events || []),
      ...(job.status === 'error' && job.error ? { error: job.error } : {}),
      ...(job.progress ? { progress: job.progress } : {}),
      ...(job.lastUpdateAt ? { lastUpdateAt: job.lastUpdateAt } : {})
    };

    console.log(`📤 Job status response: ${jobId}, status: ${job.status}, events: ${job.events?.length || 0}`);

    return NextResponse.json(response, {
      headers: { 
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
  } catch (error) {
    console.error('❌ Job status API Error:', error);
    return NextResponse.json(
      { error: 'Fehler beim Abrufen des Job-Status' },
      { 
        status: 500,
        headers: { 'Cache-Control': 'no-store' }
      }
    );
  }
}
