/**
 * Frontend polling utility for progressive event loading.
 * Provides job polling with deduplication and functional state updates.
 */

export interface EventData {
  title: string;
  category: string;
  date: string;
  time: string;
  venue: string;
  price: string;
  website: string;
  endTime?: string;
  address?: string;
  ticketPrice?: string;
  eventType?: string;
  description?: string;
  bookingLink?: string;
  ageRestrictions?: string;
  // Widened to be compatible with app/page.tsx ('cache' | 'ai' | 'rss' | 'ra' | string)
  source?: string;
}

export interface JobStatus {
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
    const key = `${event.title}_${event.date}_${event.venue}`.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(event);
    }
  }

  // Add new events, skipping duplicates
  for (const event of newEvents) {
    const key = `${event.title}_${event.date}_${event.venue}`.toLowerCase();
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
 * @param maxPolls - Maximum number of polls before giving up (default: 48)
 * @returns Cleanup function to stop polling
 */
export function startJobPolling(
  jobId: string,
  onEvents: OnEventsCallback,
  getCurrent: () => EventData[],
  onDone: OnDoneCallback,
  intervalMs: number = 4000,
  maxPolls: number = 48
): () => void {
  let count = 0;
  let intervalId: ReturnType<typeof setInterval> | null = null;
  let isActive = true;

  const cleanup = () => {
    isActive = false;
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };

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

      const job: JobStatus = await res.json();

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

  // Start with immediate poll
  performPoll();

  // Schedule regular polling
  intervalId = setInterval(performPoll, intervalMs);

  return cleanup;
}
