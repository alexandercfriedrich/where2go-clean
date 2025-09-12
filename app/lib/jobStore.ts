// Redis-only JobStore (no in-memory fallback).
// This implementation FAILS FAST if Redis is not configured or not reachable,
// preventing silent degradation that caused stuck "pending" jobs.
//
// Required environment variables:
//   UPSTASH_REDIS_REST_URL
//   UPSTASH_REDIS_REST_TOKEN
//
// Rationale for Redis-only:
// - Serverless environments spawn multiple isolates; in-memory state would diverge
// - Progressive background processing depends on durable shared state
// - Eliminates "pending forever" when worker & poller land on different lambdas
//
// If you need a dev fallback, create a separate local-only stub instead of adding
// silent fallback logic here.

import { Redis } from '@upstash/redis';
import { JobStatus } from './types';

const JOB_KEY_PREFIX = 'job:';
const JOB_TTL_SECONDS = 60 * 60; // 1 hour

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable '${name}' for Redis-only JobStore. ` +
      `Configure UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.`
    );
  }
  return value;
}

// Read & validate environment variables at module load (fail fast)
const redisUrl = requiredEnv('UPSTASH_REDIS_REST_URL');
const redisToken = requiredEnv('UPSTASH_REDIS_REST_TOKEN');

let redis: Redis;

try {
  redis = new Redis({
    url: redisUrl,
    token: redisToken,
  });
} catch (err: any) {
  throw new Error(`Failed to construct Redis client: ${err?.message || String(err)}`);
}

// Run a one-time connectivity test
let initPromise: Promise<void> | null = (async () => {
  const testKey = `${JOB_KEY_PREFIX}__init__`;
  try {
    await redis.set(testKey, 'ok', { ex: 10 });
    const val = await redis.get<string>(testKey);
    if (val !== 'ok') {
      throw new Error(`Unexpected Redis test value: ${val}`);
    }
    await redis.del(testKey);
    console.log('✅ Redis connectivity verified (JobStore)');
  } catch (e: any) {
    console.error('❌ Redis connectivity test failed:', e?.message || e);
    throw new Error(
      `Redis initialization failed: ${e?.message || String(e)}. JobStore cannot operate without Redis.`
    );
  }
})();

interface JobStore {
  setJob(jobId: string, job: JobStatus): Promise<void>;
  getJob(jobId: string): Promise<JobStatus | null>;
  updateJob(jobId: string, updates: Partial<JobStatus>): Promise<void>;
  deleteJob(jobId: string): Promise<void>;
  cleanupOldJobs(): Promise<void>; // no-op (TTL-based)
}

function jobKey(id: string) {
  return `${JOB_KEY_PREFIX}${id}`;
}

function serializeJob(job: JobStatus) {
  return JSON.stringify({
    ...job,
    createdAt: job.createdAt.toISOString(),
  });
}

function deserializeJob(raw: any): JobStatus | null {
  if (!raw) return null;
  // Upstash can return string or already parsed object depending on usage
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return { ...parsed, createdAt: new Date(parsed.createdAt) };
    } catch {
      return null;
    }
  }
  if (typeof raw === 'object') {
    return { ...(raw as any), createdAt: new Date((raw as any).createdAt) };
  }
  return null;
}

class RedisOnlyJobStore implements JobStore {

  private async ensureInit() {
    if (initPromise) {
      await initPromise;
      initPromise = null; // free reference after first successful wait
    }
  }

  async setJob(jobId: string, job: JobStatus): Promise<void> {
    await this.ensureInit();
    await redis.set(jobKey(jobId), serializeJob(job), { ex: JOB_TTL_SECONDS });
  }

  async getJob(jobId: string): Promise<JobStatus | null> {
    await this.ensureInit();
    const raw = await redis.get(jobKey(jobId));
    return deserializeJob(raw);
  }

  async updateJob(jobId: string, updates: Partial<JobStatus>): Promise<void> {
    await this.ensureInit();

    // Simple optimistic get-modify-set (sufficient under low/moderate contention).
    // If you need stricter atomic concurrency, move to a Lua script or add a version field.
    const existing = await this.getJob(jobId);
    if (!existing) return;

    const merged: JobStatus = {
      ...existing,
      ...updates,
      createdAt: existing.createdAt instanceof Date
        ? existing.createdAt
        : new Date(existing.createdAt),
    };

    await redis.set(jobKey(jobId), serializeJob(merged), { ex: JOB_TTL_SECONDS });
  }

  async deleteJob(jobId: string): Promise<void> {
    await this.ensureInit();
    await redis.del(jobKey(jobId));
  }

  async cleanupOldJobs(): Promise<void> {
    // NO-OP: Expiration handled by Redis TTL.
    // If proactive cleanup or analytics needed, implement SCAN-based logic here.
  }
}

// Singleton instance
let jobStoreInstance: JobStore | null = null;

export function getJobStore(): JobStore {
  if (!jobStoreInstance) {
    jobStoreInstance = new RedisOnlyJobStore();
  }
  return jobStoreInstance;
}
