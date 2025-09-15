/**
 * One-shot batch processor with Redis locking.
 * Unchanged semantics; just aligned to new worker implementation.
 */
import { getJobStore } from '../lib/new-backend/redis/jobStore';
import { createComponentLogger } from '../lib/new-backend/utils/log';
import { NewEventsWorker } from './new-events-worker';
import { JobStatus } from '../lib/new-backend/types/jobs';
import { getRedisClient } from '../lib/new-backend/redis/redisClient';

const logger = createComponentLogger('ProcessOnce');

export interface ProcessConfig {
  lockKey: string;
  lockTtlMs: number;
  maxJobsPerRun: number;
  maxRunMs: number;
  extendLockEveryMs: number;
  skipAlreadyRunning: boolean;
}

const DEFAULTS: ProcessConfig = {
  lockKey: 'worker:events:lock',
  lockTtlMs: 120_000,
  maxJobsPerRun: 10,
  maxRunMs: 8 * 60_000,
  extendLockEveryMs: 15_000,
  skipAlreadyRunning: true
};

async function acquireLock(raw: any, key: string, ttlMs: number) {
  try {
    // @ts-ignore
    const res = await raw.set(key, Date.now().toString(), { px: ttlMs, nx: true });
    return res === 'OK';
  } catch (e) {
    logger.error('Lock acquisition failed', { error: (e as Error).message });
    return false;
  }
}

async function extendLock(raw: any, key: string, ttlMs: number) {
  try {
    const exists = await raw.exists(key);
    if (exists) {
      // @ts-ignore
      await raw.set(key, Date.now().toString(), { px: ttlMs });
    }
  } catch (e) {
    logger.warn('Lock extension failed', { error: (e as Error).message });
  }
}

export async function processPendingJobsOnce(partial?: Partial<ProcessConfig>) {
  const cfg: ProcessConfig = { ...DEFAULTS, ...(partial || {}) };
  const redisWrapper = getRedisClient();
  const redis = await redisWrapper.getClient();
  if (!(await acquireLock(redis, cfg.lockKey, cfg.lockTtlMs))) {
    logger.info('Another processor owns the lock');
    return { started: false, reason: 'locked' };
  }

  const jobStore = getJobStore();
  const worker = new NewEventsWorker();
  const startedAt = Date.now();
  let processedJobs = 0;
  let lastExtension = Date.now();

  try {
    while (
      processedJobs < cfg.maxJobsPerRun &&
      (Date.now() - startedAt) < cfg.maxRunMs
    ) {
      if (Date.now() - lastExtension >= cfg.extendLockEveryMs) {
        await extendLock(redis, cfg.lockKey, cfg.lockTtlMs);
        lastExtension = Date.now();
      }

      const jobId = await jobStore.dequeueJob();
      if (!jobId) {
        logger.info('Queue empty');
        break;
      }

      const job = await jobStore.getJob(jobId);
      if (!job) {
        logger.warn('Dequeued missing job', { jobId });
        continue;
      }

      if (cfg.skipAlreadyRunning && job.status === JobStatus.RUNNING) {
        logger.warn('Skipping already RUNNING job', { jobId });
        continue;
      }

      logger.info('Processing job', {
        jobId,
        city: job.city,
        date: job.date,
        categories: job.categories.length
      });

      await worker.processJob(jobId);
      processedJobs++;
    }

    return {
      started: true,
      processedJobs,
      durationMs: Date.now() - startedAt
    };
  } finally {
    try {
      await redis.del(cfg.lockKey);
    } catch {}
    logger.info('Batch finished', {
      processedJobs,
      ms: Date.now() - startedAt
    });
  }
}