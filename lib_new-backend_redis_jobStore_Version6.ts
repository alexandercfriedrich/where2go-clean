/**
 * Simplified Redis job store (no implicit final status logic).
 */
import { getRedisClient, REDIS_KEYS } from './redisClient';
import { createComponentLogger } from '../utils/log';
import { fromError, ErrorCode, createError } from '../utils/errors';
import {
  EventSearchJob,
  CreateJobParams,
  CreateJobResult,
  JobStatus,
  ProgressState
} from '../types/jobs';
import { generateJobId, generateJobSignature } from '../utils/hash';

const logger = createComponentLogger('JobStore');

const DEFAULT_JOB_TTL = 3600;
const JOB_STALENESS_THRESHOLD = 1800; // seconds

export class RedisJobStore {
  private redisClient = getRedisClient();

  async createJob(params: CreateJobParams): Promise<CreateJobResult> {
    const signature = generateJobSignature(params.city, params.date, params.categories);

    const existing = await this.findJobBySignature(signature);
    if (existing) {
      const isStale = this.isJobStale(existing);
      if (!isStale) {
        return { job: existing, isNew: false, isStale: false };
      }
      await this.deleteJob(existing.id);
      logger.info('Removed stale job', { jobId: existing.id });
    }

    const id = generateJobId();
    const now = new Date().toISOString();
    const ttlSeconds = params.ttlSeconds ?? DEFAULT_JOB_TTL;

    const categoryStates: EventSearchJob['progress']['categoryStates'] = {};
    for (const c of params.categories) {
      categoryStates[c] = {
        state: ProgressState.NOT_STARTED,
        retryCount: 0
      };
    }

    const job: EventSearchJob = {
      id,
      signature,
      status: JobStatus.PENDING,
      city: params.city,
      date: params.date,
      categories: [...params.categories],
      events: [],
      progress: {
        totalCategories: params.categories.length,
        completedCategories: 0,
        failedCategories: 0,
        categoryStates
      },
      createdAt: now,
      updatedAt: now,
      ttlSeconds
    };

    const client = await this.redisClient.getClient();
    await client.set(REDIS_KEYS.JOB(id), JSON.stringify(job), { ex: ttlSeconds });
    await client.set(REDIS_KEYS.JOB_SIGNATURE_INDEX(signature), id, { ex: ttlSeconds });
    await client.rpush(REDIS_KEYS.JOB_QUEUE(), id);

    logger.info('Created job', { jobId: id, categories: params.categories.length });

    return { job, isNew: true, isStale: false };
  }

  async getJob(id: string): Promise<EventSearchJob | null> {
    const client = await this.redisClient.getClient();
    const raw = await client.get(REDIS_KEYS.JOB(id));
    if (!raw) return null;
    let job: EventSearchJob;
    try {
      job = JSON.parse(raw);
    } catch (e) {
      logger.error('Corrupted job JSON, purging', { jobId: id, error: (e as Error).message });
      await client.del(REDIS_KEYS.JOB(id));
      return null;
    }

    // Structural repair only
    if (!job.progress?.categoryStates) {
      job.progress = {
        totalCategories: job.categories.length,
        completedCategories: 0,
        failedCategories: 0,
        categoryStates: {}
      };
    }
    for (const c of job.categories) {
      if (!job.progress.categoryStates[c]) {
        job.progress.categoryStates[c] = {
          state: ProgressState.NOT_STARTED,
          retryCount: 0
        };
      }
    }
    job.progress.totalCategories = job.categories.length;

    return job;
  }

  async updateJob(id: string, updates: Partial<EventSearchJob>): Promise<EventSearchJob | null> {
    const existing = await this.getJob(id);
    if (!existing) return null;
    const merged: EventSearchJob = {
      ...existing,
      ...updates,
      progress: updates.progress
        ? {
            ...existing.progress,
            ...updates.progress,
            categoryStates: {
              ...existing.progress.categoryStates,
              ...(updates.progress.categoryStates || {})
            }
          }
        : existing.progress,
      events: updates.events ?? existing.events,
      updatedAt: updates.updatedAt || new Date().toISOString()
    };
    const client = await this.redisClient.getClient();
    await client.set(REDIS_KEYS.JOB(id), JSON.stringify(merged), { ex: existing.ttlSeconds });
    return merged;
  }

  async deleteJob(id: string): Promise<void> {
    const client = await this.redisClient.getClient();
    const job = await this.getJob(id);
    if (job) {
      await client.del(REDIS_KEYS.JOB(id));
      await client.del(REDIS_KEYS.JOB_SIGNATURE_INDEX(job.signature));
    }
  }

  async dequeueJob(): Promise<string | null> {
    const client = await this.redisClient.getClient();
    const id = await client.lpop(REDIS_KEYS.JOB_QUEUE());
    return id || null;
  }

  async getQueueLength(): Promise<number> {
    const client = await this.redisClient.getClient();
    return client.llen(REDIS_KEYS.JOB_QUEUE());
  }

  async findJobBySignature(signature: string): Promise<EventSearchJob | null> {
    const client = await this.redisClient.getClient();
    const id = await client.get(REDIS_KEYS.JOB_SIGNATURE_INDEX(signature));
    if (!id) return null;
    return this.getJob(id);
  }

  isJobStale(job: EventSearchJob): boolean {
    const updatedTs = new Date(job.updatedAt).getTime();
    const age = (Date.now() - updatedTs) / 1000;
    return age > JOB_STALENESS_THRESHOLD;
  }
}

let singleton: RedisJobStore | null = null;
export function getJobStore(): RedisJobStore {
  if (!singleton) singleton = new RedisJobStore();
  return singleton;
}