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
  source?: 'cache' | 'rss' | 'ai';
}

type OnEventsCallback = (newEvents: EventData[], getCurrent: () => EventData[]) => void;
type OnDoneCallback = (finalEvents: EventData[], status: string) => void;

export function deduplicateEvents(existing: EventData[], newEvents: EventData[]): EventData[] {
  const seen = new Set<string>();
  const result: EventData[] = [];
  const add = (ev: EventData) => {
    const key = `${ev.title}_${ev.date}_${ev.venue}`.toLowerCase();
    if (!seen.has(key)) { seen.add(key); result.push(ev); }
  };
  existing.forEach(add);
  newEvents.forEach(add);
  return result;
}

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
    if (intervalId) { clearInterval(intervalId); intervalId = null; }
  };

  const tick = async () => {
    if (!isActive) return;
    count++;
    if (count > maxPolls) {
      cleanup();
      onDone(getCurrent(), 'timeout');
      return;
    }
    try {
      const res = await fetch(`/api/jobs/${jobId}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const job = await res.json();

      if (Array.isArray(job.events) && job.events.length > 0) {
        onEvents(job.events, getCurrent);
      }

      if (job.status === 'done' || job.status === 'error') {
        const merged = Array.isArray(job.events) ? deduplicateEvents(getCurrent(), job.events) : getCurrent();
        cleanup();
        onDone(merged, job.status);
      }
    } catch (e) {
      console.warn('Polling error', e);
      if (count >= maxPolls) { cleanup(); onDone(getCurrent(), 'error'); }
    }
  };

  tick();
  intervalId = setInterval(tick, intervalMs);
  return cleanup;
}
