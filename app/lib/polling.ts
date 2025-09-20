/**
 * Frontend polling utility for progressive event loading.
 * Provides job polling with deduplication and functional state updates.
 */

interface EventData {
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
}

interface JobStatus {
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

  for (const event of existing) {
    const key = `${event.title}_${event.date}_${event.venue}`.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(event);
    }
  }

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

  const performPoll = async (): Promise<void> => {
    if (!isActive) return;
    count++;

    if (count > maxPolls) {
      cleanup();
      onDone(getCurrent(), 'timeout');
      return;
    }

    try {
      // Wichtig: Caching verhindern, sonst sieht der Client u.U. alte Antworten
      const res = await fetch(`/api/jobs/${jobId}`, { cache: 'no-store' });
      if (!res.ok) {
        throw new Error(`Status ${res.status}`);
      }

      const job: JobStatus = await res.json();

      // 1) Immer neue Events nach vorne durchreichen (falls vorhanden)
      if (job.events && job.events.length > 0) {
        onEvents(job.events, getCurrent);
      }

      // 2) Abschlusszustand: finalEvents sicher aus letzter Antwort + aktuellem State mergen
      if (job.status === 'done' || job.status === 'error') {
        const mergedFinal = job.events && job.events.length > 0
          ? deduplicateEvents(getCurrent(), job.events)
          : getCurrent();
        cleanup();
        onDone(mergedFinal, job.status);
        return;
      }

    } catch (err) {
      console.warn(`Polling attempt ${count} failed:`, err);
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

  // Sofortiger erster Poll
  performPoll();
  // Regelmäßig weiter pollen
  intervalId = setInterval(performPoll, intervalMs);

  return cleanup;
}
