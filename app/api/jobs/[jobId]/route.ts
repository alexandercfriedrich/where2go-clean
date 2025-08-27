import { NextRequest, NextResponse } from 'next/server';

// Type definitions (matching the events route)
interface JobStatus {
  id: string;
  status: 'pending' | 'done' | 'error';
  events?: any[];
  error?: string;
  createdAt: Date;
}

// Access shared maps from global
const jobMap = (global as any).jobMapForAPI as Map<string, JobStatus>;
const debugMap = (global as any).debugMapForAPI as Map<string, any>;

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
        // Also clean up debug data
        debugMap.delete(id);
      }
    }

    const response: any = {
      jobId: job.id,
      status: job.status,
      // Return events for both 'pending' and 'done' status
      ...(job.events ? { events: job.events } : {}),
      ...(job.status === 'error' && job.error ? { error: job.error } : {})
    };

    // Include debug data if requested and available
    if (debugMode) {
      const debugInfo = debugMap.get(jobId);
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
