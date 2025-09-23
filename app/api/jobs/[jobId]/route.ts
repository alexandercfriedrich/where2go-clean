import { NextRequest, NextResponse } from 'next/server';
import { getJobStore } from '@/lib/jobStore';
import { normalizeEvents } from '@/lib/event-normalizer';

export const runtime = 'nodejs';

const jobStore = getJobStore();

export async function GET(request: NextRequest, { params }: { params: { jobId: string } }) {
  try {
    const jobId = params.jobId;
    const debugMode = request.nextUrl.searchParams.get('debug') === '1';
    if (!jobId) {
      return NextResponse.json({ error: 'Job ID ist erforderlich' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
    }

    let job;
    try {
      job = await jobStore.getJob(jobId);
    } catch (error) {
      console.error('Error retrieving job from store:', error);
      return NextResponse.json({ error: 'Fehler beim Abrufen des Job-Status' }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
    }
    if (!job) {
      return NextResponse.json({ error: 'Job nicht gefunden' }, { status: 404, headers: { 'Cache-Control': 'no-store' } });
    }

    await jobStore.cleanupOldJobs();

    // Preserve 'source'
    const normalized = job.events ? normalizeEvents(job.events) : undefined;

    const response: any = {
      jobId: job.id,
      status: job.status,
      ...(normalized ? { events: normalized } : {}),
      ...(job.status === 'error' && job.error ? { error: job.error } : {}),
      ...(job.progress ? { progress: job.progress } : {}),
      ...(job.lastUpdateAt ? { lastUpdateAt: job.lastUpdateAt } : {})
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error('Job status API Error:', error);
    return NextResponse.json({ error: 'Fehler beim Abrufen des Job-Status' }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
}
