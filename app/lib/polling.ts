import { EventData, JobStatus } from './types';

export type JobStatusResponse = JobStatus & { jobId?: string };

/**
 * Normalizes potential legacy jobId → id while preserving the JobStatus shape.
 */
export function normalizeJobStatusId(status: JobStatusResponse): JobStatus {
  const id = status.id || status.jobId || '';
  const { jobId, ...rest } = status;
  return { ...rest, id };
}

interface JobStatusInternal {
  jobId: string;
  status: 'pending' | 'processing' | 'done' | 'error';
  events?: EventData[];
  error?: string;
  progress?: {
    completedCategories: number;
    totalCategories: number;
  };
}

type OnEventsCallback = (newEvents: EventData[], getCurrent: () => EventData[]) => void;
type OnDoneCallback = (finalEvents: EventData[], status: string) => void;

/**
 * Lightweight deduplication based on title + date + venue.
 * Combines existing and new events, removing duplicates.
 */
export function deduplicateEvents(existing: EventData[], newEvents: EventData[]): EventData[] {
  const seen = new Set<string>();
  const result: EventData[] = [];

  // Add existing events first
  for (const event of existing) {
    const key = `${event.title ?? ''}_${event.date ?? ''}_${event.venue ?? ''}`.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(event);
    }
  }

  // Add new events, skipping duplicates
  for (const event of newEvents) {
    const key = `${event.title ?? ''}_${event.date ?? ''}_${event.venue ?? ''}`.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(event);
    }
  }

  return result;
}

/**
 * Starts polling for job status and progressively updates events.
 * 
 * @param jobId - The job ID to poll
 * @param onEvents - Callback when new events are received (use functional updates)
 * @param getCurrent - Function to get current events state
 * @param onDone - Callback when job is complete
 * @param intervalMs - Polling interval in milliseconds (default: 4000)
 * @param maxPolls - Maximum number of polls before giving up (default: 104)
 * @returns Cleanup function to stop polling
 */
export function startJobPolling(
  jobId: string,
  onEvents: OnEventsCallback,
  getCurrent: () => EventData[],
  onDone: OnDoneCallback,
  intervalMs: number = 4000,
  maxPolls: number = 104
): () => void {
  let count = 0;
  let intervalId: ReturnType<typeof setInterval> | null = null;
  let isActive = true;

  const performPoll = async (): Promise<void> => {
    if (!isActive) return;
    
    count++;
    
    if (count > maxPolls) {
      cleanup();
      onDone(getCurrent(), 'timeout');
      return;
    }

    try {
      const res = await fetch(`/api/jobs/${jobId}`);
      if (!res.ok) {
        throw new Error(`Status ${res.status}`);
      }
      
      const job: JobStatusInternal = await res.json();
      
      // Handle new events if present
      if (job.events && job.events.length > 0) {
        onEvents(job.events, getCurrent);
      }
      
      // Check if job is complete
      if (job.status === 'done' || job.status === 'error') {
        cleanup();
        onDone(getCurrent(), job.status);
        return;
      }
      
    } catch (err) {
      console.warn(`Polling attempt ${count} failed:`, err);
      // Continue polling on errors, unless we've exceeded max attempts
      if (count >= maxPolls) {
        cleanup();
        onDone(getCurrent(), 'error');
      }
    }
  };

  const cleanup = () => {
    isActive = false;
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };

  // Start with immediate poll
  performPoll();
  
  // Schedule regular polling
  intervalId = setInterval(performPoll, intervalMs);
  
  return cleanup;
}
