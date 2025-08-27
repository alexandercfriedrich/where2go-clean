import { NextRequest, NextResponse } from 'next/server';

// Explicit runtime configuration for clarity
export const runtime = 'nodejs';

// Type definitions (matching the events route)
interface JobStatus {
  id: string;
  status: 'pending' | 'done' | 'error';
  events?: any[];
  error?: string;
  createdAt: Date;
}

// Lazily initialize global maps to prevent runtime crashes
const globalForJobs = global as unknown as { jobMapForAPI?: Map<string, JobStatus> };
if (!globalForJobs.jobMapForAPI) {
  globalForJobs.jobMapForAPI = new Map();
}
const jobMap = globalForJobs.jobMapForAPI!;

const globalForDebug = global as unknown as { debugMapForAPI?: Map<string, any> };
if (!globalForDebug.debugMapForAPI) {
  globalForDebug.debugMapForAPI = new Map();
}
const debugMap = globalForDebug.debugMapForAPI!;

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
        // Also clean up debug data if available
        if (debugMap) {
          debugMap.delete(id);
        }
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
    if (debugMode && debugMap) {
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
