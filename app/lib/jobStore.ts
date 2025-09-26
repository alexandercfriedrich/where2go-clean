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
  
  // Active job mapping methods (for job reuse)
  setActiveJob(key: string, jobId: string, ttlSec: number): Promise<void>;
  getActiveJob(key: string): Promise<string | null>;
  deleteActiveJob(key: string): Promise<void>;
  
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
  private ttlSeconds = 2 * 60 * 60; // 2 hours

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
      createdAt: job.createdAt?.toISOString()
    });
    await this.redis.setex(key, this.ttlSeconds, serialized);
  }

  async getJob(jobId: string): Promise<JobStatus | null> {
    const key = this.jobKeyPrefix + jobId;
    const result = await this.redis.get(key);
    if (!result) return null;
    
    try {
      // Handle the case where result is already an object (not a JSON string)
      if (typeof result === 'object' && result !== null) {
        return {
          ...result as any,
          createdAt: (result as any).createdAt ? new Date((result as any).createdAt) : undefined
        };
      }
      
      // Handle the case where result is a string
      const resultStr = result as string;
      
      // Check for corrupted "[object Object]" strings
      if (resultStr === '[object Object]' || resultStr.startsWith('[object Object]')) {
        console.warn(`Corrupted job data for ${jobId}: ${resultStr}`);
        return null;
      }
      
      const parsed = JSON.parse(resultStr);
      return {
        ...parsed,
        createdAt: parsed.createdAt ? new Date(parsed.createdAt) : undefined
      };
    } catch (error) {
      console.error(`Failed to parse job data for ${jobId}:`, error, 'Raw result:', result);
      return null;
    }
  }

  async updateJob(jobId: string, updates: Partial<JobStatus>): Promise<void> {
    // For Redis, we need to implement an atomic update operation
    // Use a simple retry mechanism with exponential backoff to handle concurrent updates
    const maxRetries = 5;
    let retries = 0;
    
    while (retries < maxRetries) {
      try {
        const existing = await this.getJob(jobId);
        if (!existing) return;
        
        const updated = { ...existing, ...updates };
        
        // Try to use conditional write if supported, otherwise fall back to simple write
        try {
          // First attempt: optimistic update
          await this.setJob(jobId, updated);
          return; // Success
        } catch (writeError) {
          throw writeError;
        }
        
      } catch (error) {
        retries++;
        if (retries >= maxRetries) {
          console.error(`Failed to update job ${jobId} after ${maxRetries} retries:`, error);
          throw error;
        }
        
        // Exponential backoff: 10ms, 20ms, 40ms, 80ms, 160ms
        const delay = 10 * Math.pow(2, retries - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
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
    
    try {
      // Handle the case where result is already an object (not a JSON string)
      if (typeof result === 'object' && result !== null) {
        return {
          ...result as any,
          createdAt: new Date((result as any).createdAt)
        };
      }
      
      // Handle the case where result is a string
      const resultStr = result as string;
      
      // Check for corrupted "[object Object]" strings
      if (resultStr === '[object Object]' || resultStr.startsWith('[object Object]')) {
        console.warn(`Corrupted debug data for ${jobId}: ${resultStr}`);
        return null;
      }
      
      const parsed = JSON.parse(resultStr);
      return {
        ...parsed,
        createdAt: new Date(parsed.createdAt)
      };
    } catch (error) {
      console.error(`Failed to parse debug data for ${jobId}:`, error, 'Raw result:', result);
      return null;
    }
  }

  async pushDebugStep(jobId: string, step: DebugStep): Promise<void> {
    const debugInfo = await this.getDebugInfo(jobId);
    if (debugInfo) {
      debugInfo.steps.push(step);
      await this.setDebugInfo(jobId, debugInfo);
    }
  }

  // Active job mapping methods for job reuse
  async setActiveJob(key: string, jobId: string, ttlSec: number): Promise<void> {
    const activeKey = 'jobidx:' + key;
    await this.redis.setex(activeKey, ttlSec, jobId);
  }

  async getActiveJob(key: string): Promise<string | null> {
    const activeKey = 'jobidx:' + key;
    const result = await this.redis.get(activeKey);
    return result as string | null;
  }

  async deleteActiveJob(key: string): Promise<void> {
    const activeKey = 'jobidx:' + key;
    await this.redis.del(activeKey);
  }
}

/**
 * In-memory JobStore implementation for development/fallback
 */
class InMemoryJobStore implements JobStore {
  private jobs = new Map<string, JobStatus>();
  private debugInfo = new Map<string, DebugInfo>();
  private updateLocks = new Map<string, Promise<void>>();
  private activeJobs = new Map<string, { jobId: string; expiresAt: number }>();

  async setJob(jobId: string, job: JobStatus): Promise<void> {
    // Serialize and deserialize to ensure consistency with Redis store
    const serialized = JSON.stringify({
      ...job,
      createdAt: job.createdAt?.toISOString()
    });
    const parsed = JSON.parse(serialized);
    this.jobs.set(jobId, {
      ...parsed,
      createdAt: parsed.createdAt ? new Date(parsed.createdAt) : undefined
    });
  }

  async getJob(jobId: string): Promise<JobStatus | null> {
    const job = this.jobs.get(jobId);
    if (!job) return null;
    
    // Ensure consistent format by re-serializing/deserializing
    try {
      const serialized = JSON.stringify({
        ...job,
        createdAt: job.createdAt?.toISOString()
      });
      const parsed = JSON.parse(serialized);
      return {
        ...parsed,
        createdAt: parsed.createdAt ? new Date(parsed.createdAt) : undefined
      };
    } catch (error) {
      console.error(`Failed to serialize/deserialize job ${jobId}:`, error);
      return null;
    }
  }

  async updateJob(jobId: string, updates: Partial<JobStatus>): Promise<void> {
    // Use a simple locking mechanism to prevent concurrent updates
    const existingLock = this.updateLocks.get(jobId);
    if (existingLock) {
      await existingLock;
    }

    const updatePromise = this.performUpdate(jobId, updates);
    this.updateLocks.set(jobId, updatePromise);
    
    try {
      await updatePromise;
    } finally {
      this.updateLocks.delete(jobId);
    }
  }

  private async performUpdate(jobId: string, updates: Partial<JobStatus>): Promise<void> {
    const existing = this.jobs.get(jobId);
    if (existing) {
      // Create a new object to avoid mutation issues in concurrent environments
      const updated = { 
        ...existing, 
        ...updates,
        // Ensure createdAt is preserved properly
        createdAt: existing.createdAt
      };
      this.jobs.set(jobId, updated);
    }
  }

  async deleteJob(jobId: string): Promise<void> {
    this.jobs.delete(jobId);
    this.debugInfo.delete(jobId);
  }

  async cleanupOldJobs(): Promise<void> {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours
    
    for (const [jobId, job] of this.jobs.entries()) {
      if (job.createdAt && job.createdAt < twoHoursAgo) {
        this.jobs.delete(jobId);
        this.debugInfo.delete(jobId);
      }
    }

    // Clean up expired active job mappings
    const now = Date.now();
    for (const [key, entry] of this.activeJobs.entries()) {
      if (now > entry.expiresAt) {
        this.activeJobs.delete(key);
      }
    }
  }

  async setDebugInfo(jobId: string, debugInfo: DebugInfo): Promise<void> {
    // Serialize and deserialize to ensure consistency with Redis store
    const serialized = JSON.stringify({
      ...debugInfo,
      createdAt: debugInfo.createdAt.toISOString()
    });
    const parsed = JSON.parse(serialized);
    this.debugInfo.set(jobId, {
      ...parsed,
      createdAt: new Date(parsed.createdAt)
    });
  }

  async getDebugInfo(jobId: string): Promise<DebugInfo | null> {
    const debug = this.debugInfo.get(jobId);
    if (!debug) return null;
    
    // Ensure consistent format by re-serializing/deserializing
    try {
      const serialized = JSON.stringify({
        ...debug,
        createdAt: debug.createdAt.toISOString()
      });
      const parsed = JSON.parse(serialized);
      return {
        ...parsed,
        createdAt: new Date(parsed.createdAt)
      };
    } catch (error) {
      console.error(`Failed to serialize/deserialize debug info ${jobId}:`, error);
      return null;
    }
  }

  async pushDebugStep(jobId: string, step: DebugStep): Promise<void> {
    const existing = this.debugInfo.get(jobId);
    if (existing) {
      existing.steps.push(step);
    }
  }

  // Active job mapping methods for job reuse
  async setActiveJob(key: string, jobId: string, ttlSec: number): Promise<void> {
    const expiresAt = Date.now() + (ttlSec * 1000);
    this.activeJobs.set(key, { jobId, expiresAt });
  }

  async getActiveJob(key: string): Promise<string | null> {
    const entry = this.activeJobs.get(key);
    if (!entry) return null;
    
    if (Date.now() > entry.expiresAt) {
      this.activeJobs.delete(key);
      return null;
    }
    
    return entry.jobId;
  }

  async deleteActiveJob(key: string): Promise<void> {
    this.activeJobs.delete(key);
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