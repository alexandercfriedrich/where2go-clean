/**
 * One-shot batch processor for pending event search jobs.
 * Replaces the need for a persistent while(true)-style worker loop in serverless environments.
 *
 * Responsibilities:
 *  - Acquire an exclusive lock (Redis) to avoid concurrent processors
 *  - Dequeue up to maxJobsPerRun jobs
 *  - For each job call existing NewEventsWorker.processJob(jobId)
 *  - Respect maxRunMs (time budget) and release lock at the end
 *
 * Lock semantics:
 *  - Key: worker:events:lock
 *  - TTL extended periodically (sliding TTL)
 *  - On crash: TTL expiry frees lock automatically
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

async function acquireLock(rawClient: any, key: string, ttlMs: number): Promise<boolean> {
  try {
    // Upstash supports nx option
    // @ts-ignore
    const res = await rawClient.set(key, Date.now().toString(), { px: ttlMs, nx: true });
    return res === 'OK';
  } catch (e) {
    logger.error('Failed to acquire lock', { error: (e as Error).message });
    return false;
  }
}

async function extendLock(rawClient: any, key: string, ttlMs: number): Promise<void> {
  try {
    const exists = await rawClient.exists(key);
    if (exists) {
      // @ts-ignore
      await rawClient.set(key, Date.now().toString(), { px: ttlMs });
    }
  } catch (e) {
    logger.warn('Failed to extend lock (continuing)', { error: (e as Error).message });
  }
}

export async function processPendingJobsOnce(partial?: Partial<ProcessConfig>) {
  const cfg: ProcessConfig = { ...DEFAULTS, ...partial };
  const jobStore = getJobStore();
  const redisWrapper = getRedisClient();
  const redis = await redisWrapper.getClient();

  const lockAcquired = await acquireLock(redis, cfg.lockKey, cfg.lockTtlMs);
  if (!lockAcquired) {
    logger.info('Another batch processor is active. Skipping.');
    return { started: false, reason: 'locked' };
  }

  logger.info('Batch processor started', {
    maxJobsPerRun: cfg.maxJobsPerRun,
    maxRunMs: cfg.maxRunMs
  });

  const worker = new NewEventsWorker({ keepRunning: false });
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
        logger.info('Queue empty, ending batch early.');
        break;
      }

      const job = await jobStore.getJob(jobId);
      if (!job) {
        logger.warn('Dequeued job not found (skipping)', { jobId });
        continue;
      }

      if (cfg.skipAlreadyRunning && job.status === JobStatus.RUNNING) {
        logger.warn('Job already RUNNING - possible leftover or concurrent start, skipping', { jobId });
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

    const durationMs = Date.now() - startedAt;
    logger.info('Batch processing finished', {
      processedJobs,
      durationMs
    });

    return {
      started: true,
      processedJobs,
      durationMs
    };
  } catch (e) {
    logger.error('Batch processor crashed', {
      error: e instanceof Error ? e.message : String(e)
    });
    throw e;
  } finally {
    try {
      await redis.del(cfg.lockKey);
    } catch (e) {
      logger.warn('Failed to release lock (may have expired)', { error: (e as Error).message });
    }
  }
}