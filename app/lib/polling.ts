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

/**
 * Build a stable deduplication key based on title + date + venue.
 */
function eventKey(e: Pick<EventData, 'title' | 'date' | 'venue'>): string {
  const t = (e.title || '').trim().toLowerCase();
  const d = (e.date || '').trim().toLowerCase();
  const v = (e.venue || '').trim().toLowerCase();
  return `${t}|${d}|${v}`;
}

/**
 * Merge existing events with incoming, removing duplicates by key while preserving order.
 */
export function deduplicateEvents(existing: EventData[], incoming: EventData[]): EventData[] {
  const seen = new Set<string>();
  const out: EventData[] = [];

  for (const ev of existing || []) {
    const k = eventKey(ev);
    if (!seen.has(k)) {
      seen.add(k);
      out.push(ev);
    }
  }

  for (const ev of incoming || []) {
    const k = eventKey(ev);
    if (!seen.has(k)) {
      seen.add(k);
      out.push(ev);
    }
  }

  return out;
}

/**
 * Polls job status with an immediate first poll and subsequent intervals.
 * Calls:
 * - onEvents(newChunk, getCurrent) when new events arrive
 * - onDone(finalEvents, 'done' | 'error' | 'timeout') when job finishes, errors, or times out
 */
export function startJobPolling(
  jobId: string,
  onEvents: (chunk: EventData[], getCurrent: () => EventData[]) => void,
  getCurrent: () => EventData[],
  onDone: (final: EventData[], status: 'done' | 'error' | 'timeout') => void,
  intervalMs: number,
  maxPolls: number
): () => void {
  let active = true;
  let polls = 0;
  let intervalId: ReturnType<typeof setInterval> | null = null;

  const cleanup = () => {
    active = false;
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };

  const performPoll = async () => {
    if (!active) return;

    polls += 1;
    if (polls > maxPolls) {
      onDone([], 'timeout');
      cleanup();
      return;
    }

    try {
      const res = await fetch(`/api/jobs/${jobId}`);
      if (!res.ok) {
        throw new Error(`Status ${res.status}`);
      }
      const statusJson = await res.json();
      const job: JobStatus = normalizeJobStatusId(statusJson);

      const incoming: EventData[] = Array.isArray(job.events) ? job.events : [];

      // Compute new chunk vs current
      const current = getCurrent() || [];
      const currentKeys = new Set(current.map(eventKey));
      const newChunk = incoming.filter(ev => !currentKeys.has(eventKey(ev)));

      if (newChunk.length > 0) {
        onEvents(newChunk, getCurrent);
      }

      if (job.status === 'done') {
        onDone(incoming, 'done');
        cleanup();
        return;
      }
    } catch (_err) {
      if (polls >= maxPolls) {
        onDone([], 'error');
        cleanup();
        return;
      }
    }
  };

  // Immediate first poll
  void performPoll();

  // Subsequent polling
  intervalId = setInterval(() => {
    void performPoll();
  }, Math.max(250, intervalMs || 0));

  return cleanup;
}
