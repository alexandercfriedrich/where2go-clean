import { Redis } from '@upstash/redis';
import { JobStatus, DebugInfo, DebugStep } from './types';

/**
 * JobStore abstraction for managing job state and debug information
 * Uses Upstash Redis when environment variables are set, falls back to in-memory storage
 */
export interface JobStore {
  // Job methods
  setJob(jobId: string, job: JobStatus): Promise<void>;
  getJob(jobId: string): Promise<JobStatus | null>;
  updateJob(jobId: string, updates: Partial<JobStatus>): Promise<void>;
  deleteJob(jobId: string): Promise<void>;
  cleanupOldJobs(): Promise<void>;
  
  // Debug methods
  setDebugInfo(jobId: string, debugInfo: DebugInfo): Promise<void>;
  getDebugInfo(jobId: string): Promise<DebugInfo | null>;
  pushDebugStep(jobId: string, step: DebugStep): Promise<void>;
}

/**
 * Redis-based JobStore implementation using Upstash Redis REST API
 */
class RedisJobStore implements JobStore {
  private redis: Redis;
  private jobKeyPrefix = 'job:';
  private debugKeyPrefix = 'debug:';
  private ttlSeconds = 10 * 60; // 10 minutes

  constructor(restUrl: string, restToken: string) {
    this.redis = new Redis({
      url: restUrl,
      token: restToken,
    });
  }

  async setJob(jobId: string, job: JobStatus): Promise<void> {
    const key = this.jobKeyPrefix + jobId;
    const serialized = JSON.stringify({
      ...job,
      createdAt: job.createdAt.toISOString()
    });
    await this.redis.setex(key, this.ttlSeconds, serialized);
  }

  async getJob(jobId: string): Promise<JobStatus | null> {
    const key = this.jobKeyPrefix + jobId;
    const result = await this.redis.get(key);
    if (!result) return null;
    
    const parsed = JSON.parse(result as string);
    return {
      ...parsed,
      createdAt: new Date(parsed.createdAt)
    };
  }

  async updateJob(jobId: string, updates: Partial<JobStatus>): Promise<void> {
    const existing = await this.getJob(jobId);
    if (!existing) return;
    
    const updated = { ...existing, ...updates };
    await this.setJob(jobId, updated);
  }

  async deleteJob(jobId: string): Promise<void> {
    const jobKey = this.jobKeyPrefix + jobId;
    const debugKey = this.debugKeyPrefix + jobId;
    await Promise.all([
      this.redis.del(jobKey),
      this.redis.del(debugKey)
    ]);
  }

  async cleanupOldJobs(): Promise<void> {
    // Redis keys automatically expire due to TTL, so cleanup is automatic
    // This method is kept for interface compatibility
  }

  async setDebugInfo(jobId: string, debugInfo: DebugInfo): Promise<void> {
    const key = this.debugKeyPrefix + jobId;
    const serialized = JSON.stringify({
      ...debugInfo,
      createdAt: debugInfo.createdAt.toISOString()
    });
    await this.redis.setex(key, this.ttlSeconds, serialized);
  }

  async getDebugInfo(jobId: string): Promise<DebugInfo | null> {
    const key = this.debugKeyPrefix + jobId;
    const result = await this.redis.get(key);
    if (!result) return null;
    
    const parsed = JSON.parse(result as string);
    return {
      ...parsed,
      createdAt: new Date(parsed.createdAt)
    };
  }

  async pushDebugStep(jobId: string, step: DebugStep): Promise<void> {
    const debugInfo = await this.getDebugInfo(jobId);
    if (debugInfo) {
      debugInfo.steps.push(step);
      await this.setDebugInfo(jobId, debugInfo);
    }
  }
}

/**
 * In-memory JobStore implementation for development/fallback
 */
class InMemoryJobStore implements JobStore {
  private jobs = new Map<string, JobStatus>();
  private debugInfo = new Map<string, DebugInfo>();

  async setJob(jobId: string, job: JobStatus): Promise<void> {
    this.jobs.set(jobId, job);
  }

  async getJob(jobId: string): Promise<JobStatus | null> {
    return this.jobs.get(jobId) || null;
  }

  async updateJob(jobId: string, updates: Partial<JobStatus>): Promise<void> {
    const existing = this.jobs.get(jobId);
    if (existing) {
      this.jobs.set(jobId, { ...existing, ...updates });
    }
  }

  async deleteJob(jobId: string): Promise<void> {
    this.jobs.delete(jobId);
    this.debugInfo.delete(jobId);
  }

  async cleanupOldJobs(): Promise<void> {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    
    for (const [jobId, job] of this.jobs.entries()) {
      if (job.createdAt < tenMinutesAgo) {
        this.jobs.delete(jobId);
        this.debugInfo.delete(jobId);
      }
    }
  }

  async setDebugInfo(jobId: string, debugInfo: DebugInfo): Promise<void> {
    this.debugInfo.set(jobId, debugInfo);
  }

  async getDebugInfo(jobId: string): Promise<DebugInfo | null> {
    return this.debugInfo.get(jobId) || null;
  }

  async pushDebugStep(jobId: string, step: DebugStep): Promise<void> {
    const existing = this.debugInfo.get(jobId);
    if (existing) {
      existing.steps.push(step);
    }
  }
}

/**
 * Create JobStore instance based on environment variables
 */
export function createJobStore(): JobStore {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (redisUrl && redisToken) {
    console.log('Using Redis JobStore for durable job state');
    return new RedisJobStore(redisUrl, redisToken);
  } else {
    console.log('Using in-memory JobStore (Redis env vars not configured)');
    return new InMemoryJobStore();
  }
}

// Singleton instance
let jobStoreInstance: JobStore | null = null;

export function getJobStore(): JobStore {
  if (!jobStoreInstance) {
    jobStoreInstance = createJobStore();
  }
  return jobStoreInstance;
}