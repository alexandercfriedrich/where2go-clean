/**
 * Unified single-job processor (no legacy polling loop).
 * - Processes exactly one job (identified by jobId).
 * - Uses centralized deriveFinalStatus() to finalize.
 * - Category parser failures mark category FAILED.
 * - Distinguishes EMPTY (no events, all categories completed) from SUCCESS.
 */
import { createComponentLogger } from '../lib/new-backend/utils/log';
import { fromError, ErrorCode } from '../lib/new-backend/utils/errors';
import {
  EventSearchJob,
  JobStatus,
  ProgressState
} from '../lib/new-backend/types/jobs';
import { getJobStore } from '../lib/new-backend/redis/jobStore';
import { getEventCache } from '../lib/new-backend/redis/eventCache';
import { getPerplexityClient } from '../lib/new-backend/services/perplexityClient';
import { normalizeCategories } from '../lib/new-backend/categories/normalize';
import { deriveFinalStatus, recomputeCounters } from '../lib/new-backend/jobs/status';

const logger = createComponentLogger('EventsWorker');

interface WorkerOptions {
  categoryTimeoutMs?: number;
  categoryMaxRetries?: number;
  perCategoryDelayMs?: number;
}

const DEFAULTS: Required<WorkerOptions> = {
  categoryTimeoutMs: 35_000,
  categoryMaxRetries: 1,
  perCategoryDelayMs: 120
};

export class NewEventsWorker {
  private jobStore = getJobStore();
  private eventCache = getEventCache();
  private perplexity = getPerplexityClient();
  private opts: Required<WorkerOptions>;

  constructor(opts?: WorkerOptions) {
    this.opts = { ...DEFAULTS, ...(opts || {}) };
  }

  async processJob(jobId: string): Promise<void> {
    const started = Date.now();
    let job = await this.jobStore.getJob(jobId);
    if (!job) {
      logger.warn('Job not found', { jobId });
      return;
    }

    if (![JobStatus.PENDING, JobStatus.RUNNING].includes(job.status)) {
      logger.info('Skipping job with terminal or irrelevant status', { jobId, status: job.status });
      return;
    }

    if (job.status === JobStatus.PENDING) {
      await this.jobStore.updateJob(job.id, {
        status: JobStatus.RUNNING,
        startedAt: new Date().toISOString()
      });
      job = await this.jobStore.getJob(jobId) as EventSearchJob;
    }

    const categories = normalizeCategories(job.categories);
    // Ensure states exist
    for (const c of categories) {
      if (!job.progress.categoryStates[c]) {
        job.progress.categoryStates[c] = {
          state: ProgressState.NOT_STARTED,
          retryCount: 0
        };
      }
    }
    await this.persist(job);

    let allEvents: any[] = [];

    try {
      // Warm cache: mark already cached
      const cacheResult = await this.eventCache.getEventsForCategories(job.city, job.date, categories);
      for (const [cat, evts] of Object.entries(cacheResult.cachedEvents)) {
        if (evts.length > 0) {
          job.progress.categoryStates[cat] = {
            ...job.progress.categoryStates[cat],
            state: ProgressState.COMPLETED,
            eventCount: evts.length,
            completedAt: new Date().toISOString()
          };
          allEvents.push(...evts);
        }
      }
      await this.persist(job);

      const remaining = cacheResult.missingCategories.filter(c => categories.includes(c));

      for (const cat of remaining) {
        await this.markInProgress(job, cat);

        let attempt = 0;
        let success = false;
        let collected: any[] = [];
        let lastErr: any;

        while (attempt <= this.opts.categoryMaxRetries && !success) {
          attempt++;
          try {
            const { events, rawResponseLength } = await this.fetchCategory(job, cat, this.opts.categoryTimeoutMs);
            collected = events;
            if (collected.length === 0) {
              // Treat zero parsed (with presumably non-empty raw) as failure for transparency.
              throw new Error(`No events parsed for category '${cat}'. Raw response length: ${rawResponseLength}`);
            }
            success = true;
          } catch (err) {
            lastErr = err;
            if (attempt > this.opts.categoryMaxRetries) {
              await this.markFailed(job, cat, (err as Error).message);
            } else {
              await this.delay(300);
            }
          }
        }

        if (success) {
          allEvents.push(...collected);
          await this.markCompleted(job, cat, collected.length);
        }

        await this.persistEvents(job, allEvents);
        if (this.opts.perCategoryDelayMs > 0) {
          await this.delay(this.opts.perCategoryDelayMs);
        }
      }

      // Finalization
      job.events = allEvents;
      recomputeCounters(job);
      const finalStatus = deriveFinalStatus(job);

      await this.jobStore.updateJob(job.id, {
        status: finalStatus,
        events: job.events,
        progress: job.progress,
        completedAt: new Date().toISOString()
      });

      logger.info('Job finalized', {
        jobId,
        finalStatus,
        totalCategories: job.progress.totalCategories,
        completed: job.progress.completedCategories,
        failed: job.progress.failedCategories,
        events: job.events.length,
        ms: Date.now() - started
      });

    } catch (e) {
      const err = fromError(e, ErrorCode.JOB_PROCESSING_FAILED);
      logger.error('Job failed (fatal)', { jobId, error: err });
      await this.jobStore.updateJob(job.id, {
        status: JobStatus.FAILED,
        error: err.message,
        completedAt: new Date().toISOString()
      });
    }
  }

  private async fetchCategory(job: EventSearchJob, category: string, timeoutMs: number): Promise<any[]> {
    const controller = new AbortController();
    const tm = setTimeout(() => controller.abort(), timeoutMs);
    try {
      // Integrate with existing perplexity client signature; adapt if needed.
      if (typeof this.perplexity.searchCategory !== 'function') {
        logger.error('searchCategory method is not available on perplexity client', { jobId: job.id, category });
        return [];
      }
      const response = await this.perplexity.searchCategory(job.city, job.date, category, {
        signal: controller.signal
      });
      const raw = response?.raw || '';
      return this.parseEvents(raw);
    } finally {
      clearTimeout(tm);
    }
  }

  private parseEvents(raw: string): any[] {
    if (!raw.trim()) return [];
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const candidate = fenced ? fenced[1] : raw;
    const arrayMatch = candidate.match(/\[[\s\S]*\]/);
    if (!arrayMatch) return [];
    let jsonText = arrayMatch[0]
      .replace(/,\s*([\]\}])/g, '$1')
      .replace(/,\s*,+/g, ',')
      .trim();
    try {
      const parsed = JSON.parse(jsonText);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private async markInProgress(job: EventSearchJob, category: string) {
    job.progress.categoryStates[category] = {
      ...(job.progress.categoryStates[category] || { retryCount: 0 }),
      state: ProgressState.IN_PROGRESS,
      startedAt: job.progress.categoryStates[category]?.startedAt || new Date().toISOString()
    };
    await this.persist(job);
  }

  private async markCompleted(job: EventSearchJob, category: string, count: number) {
    job.progress.categoryStates[category] = {
      ...(job.progress.categoryStates[category] || { retryCount: 0 }),
      state: ProgressState.COMPLETED,
      completedAt: new Date().toISOString(),
      eventCount: count
    };
    await this.persist(job);
  }

  private async markFailed(job: EventSearchJob, category: string, error?: string) {
    job.progress.categoryStates[category] = {
      ...(job.progress.categoryStates[category] || { retryCount: 0 }),
      state: ProgressState.FAILED,
      completedAt: new Date().toISOString(),
      error: error || 'unknown'
    };
    await this.persist(job);
  }

  private async persist(job: EventSearchJob) {
    await this.jobStore.updateJob(job.id, {
      progress: job.progress
    });
  }

  private async persistEvents(job: EventSearchJob, events: any[]) {
    await this.jobStore.updateJob(job.id, {
      events
    });
  }

  private delay(ms: number) {
    return new Promise(r => setTimeout(r, ms));
  }
}