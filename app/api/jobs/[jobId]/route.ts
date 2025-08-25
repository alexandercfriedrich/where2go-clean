import { NextRequest, NextResponse } from 'next/server';

// In-memory job storage (in production, use Redis or database)
interface JobStatus {
  id: string;
  status: 'pending' | 'done' | 'error';
  events?: any[];
  error?: string;
  createdAt: Date;
}

// Global map to store job statuses
const globalForJobs = global as unknown as { jobMap?: Map<string, JobStatus> };
if (!globalForJobs.jobMap) {
  globalForJobs.jobMap = new Map();
}
const jobMap = globalForJobs.jobMap!;

export async function GET(request: NextRequest, { params }: { params: { jobId: string } }) {
  try {
    const jobId = params.jobId;
    
    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID ist erforderlich' },
        { status: 400 }
      );
    }

    const job = jobMap.get(jobId);
    
    if (!job) {
      return NextResponse.json(
        { error: 'Job nicht gefunden' },
        { status: 404 }
      );
    }

    // Clean up old jobs (older than 10 minutes)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    for (const [id, jobData] of jobMap.entries()) {
      if (jobData.createdAt < tenMinutesAgo) {
        jobMap.delete(id);
      }
    }

    return NextResponse.json({
      jobId: job.id,
      status: job.status,
      ...(job.status === 'done' && job.events ? { events: job.events } : {}),
      ...(job.status === 'error' && job.error ? { error: job.error } : {})
    });
    
  } catch (error) {
    console.error('Job status API Error:', error);
    return NextResponse.json(
      { error: 'Fehler beim Abrufen des Job-Status' },
      { status: 500 }
    );
  }
}
