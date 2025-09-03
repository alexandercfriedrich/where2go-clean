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
  
  // Enhanced monitoring methods
  getJobHealth(jobId: string): Promise<{
    exists: boolean;
    isStale: boolean;
    lastUpdate: Date | null;
    processingTime: number | null;
  }>;
  incrementJobMetric(jobId: string, metric: string, value?: number): Promise<void>;
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
      createdAt: job.createdAt.toISOString()
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
          createdAt: new Date((result as any).createdAt)
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
        createdAt: new Date(parsed.createdAt)
      };
    } catch (error) {
      console.error(`Failed to parse job data for ${jobId}:`, error, 'Raw result:', result);
      return null;
    }
  }

  async updateJob(jobId: string, updates: Partial<JobStatus>): Promise<void> {
    // Enhanced update with better progress tracking
    const maxRetries = 5;
    let retries = 0;
    
    while (retries < maxRetries) {
      try {
        const existing = await this.getJob(jobId);
        if (!existing) {
          console.warn(`Attempted to update non-existent job: ${jobId}`);
          return;
        }
        
        // Preserve important fields during update
        const updated = { 
          ...existing, 
          ...updates,
          // Ensure lastUpdateAt is always updated
          lastUpdateAt: new Date().toISOString(),
          // Preserve creation time
          createdAt: existing.createdAt
        };

        // Enhanced progress tracking
        if (updates.events && existing.events) {
          const previousEventCount = existing.events.length;
          const newEventCount = updates.events.length;
          
          if (newEventCount > previousEventCount) {
            console.log(`Job ${jobId}: Event count increased from ${previousEventCount} to ${newEventCount}`);
            
            // Update progress if available
            if (updated.progress) {
              updated.progress = {
                ...updated.progress,
                lastEventUpdate: new Date().toISOString(),
                eventsAdded: newEventCount - previousEventCount
              };
            }
          }
        }
        
        // Try optimistic update with enhanced error handling
        try {
          await this.setJob(jobId, updated);
          return; // Success
        } catch (writeError) {
          console.error(`Write error for job ${jobId}:`, writeError);
          throw writeError;
        }
        
      } catch (error) {
        retries++;
        console.warn(`Job update attempt ${retries}/${maxRetries} failed for ${jobId}:`, error);
        
        if (retries >= maxRetries) {
          console.error(`Failed to update job ${jobId} after ${maxRetries} retries:`, error);
          throw new Error(`Job update failed after ${maxRetries} attempts: ${error}`);
        }
        
        // Enhanced exponential backoff with jitter: 10ms, 20ms, 40ms, 80ms, 160ms
        const baseDelay = 10 * Math.pow(2, retries - 1);
        const jitter = Math.random() * 0.3; // Up to 30% jitter
        const delay = Math.floor(baseDelay * (1 + jitter));
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

  async getJobHealth(jobId: string): Promise<{
    exists: boolean;
    isStale: boolean;
    lastUpdate: Date | null;
    processingTime: number | null;
  }> {
    const job = await this.getJob(jobId);
    
    if (!job) {
      return {
        exists: false,
        isStale: false,
        lastUpdate: null,
        processingTime: null
      };
    }

    const now = new Date();
    const lastUpdate = job.lastUpdateAt ? new Date(job.lastUpdateAt) : job.createdAt;
    const timeSinceUpdate = now.getTime() - lastUpdate.getTime();
    const processingTime = now.getTime() - job.createdAt.getTime();
    
    // Consider job stale if no update in 5 minutes and status is still pending
    const isStale = timeSinceUpdate > 5 * 60 * 1000 && job.status === 'pending';

    return {
      exists: true,
      isStale,
      lastUpdate,
      processingTime
    };
  }

  async incrementJobMetric(jobId: string, metric: string, value: number = 1): Promise<void> {
    const job = await this.getJob(jobId);
    if (job) {
      if (!job.metrics) {
        job.metrics = {};
      }
      job.metrics[metric] = (job.metrics[metric] || 0) + value;
      await this.updateJob(jobId, { metrics: job.metrics });
    }
  }
}

/**
 * In-memory JobStore implementation for development/fallback
 */
class InMemoryJobStore implements JobStore {
  private jobs = new Map<string, JobStatus>();
  private debugInfo = new Map<string, DebugInfo>();
  private updateLocks = new Map<string, Promise<void>>();

  async setJob(jobId: string, job: JobStatus): Promise<void> {
    // Serialize and deserialize to ensure consistency with Redis store
    const serialized = JSON.stringify({
      ...job,
      createdAt: job.createdAt.toISOString()
    });
    const parsed = JSON.parse(serialized);
    this.jobs.set(jobId, {
      ...parsed,
      createdAt: new Date(parsed.createdAt)
    });
    console.log(`[InMemoryJobStore] Job ${jobId} saved. Total jobs in store: ${this.jobs.size}`);
  }

  async getJob(jobId: string): Promise<JobStatus | null> {
    console.log(`[InMemoryJobStore] Looking for job ${jobId}. Total jobs in store: ${this.jobs.size}. Available jobs: [${Array.from(this.jobs.keys()).join(', ')}]`);
    const job = this.jobs.get(jobId);
    if (!job) return null;
    
    // Ensure consistent format by re-serializing/deserializing
    try {
      const serialized = JSON.stringify({
        ...job,
        createdAt: job.createdAt.toISOString()
      });
      const parsed = JSON.parse(serialized);
      return {
        ...parsed,
        createdAt: new Date(parsed.createdAt)
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
      if (job.createdAt < twoHoursAgo) {
        this.jobs.delete(jobId);
        this.debugInfo.delete(jobId);
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

  async getJobHealth(jobId: string): Promise<{
    exists: boolean;
    isStale: boolean;
    lastUpdate: Date | null;
    processingTime: number | null;
  }> {
    const job = this.jobs.get(jobId);
    
    if (!job) {
      return {
        exists: false,
        isStale: false,
        lastUpdate: null,
        processingTime: null
      };
    }

    const now = new Date();
    const lastUpdate = job.lastUpdateAt ? new Date(job.lastUpdateAt) : job.createdAt;
    const timeSinceUpdate = now.getTime() - lastUpdate.getTime();
    const processingTime = now.getTime() - job.createdAt.getTime();
    
    // Consider job stale if no update in 5 minutes and status is still pending
    const isStale = timeSinceUpdate > 5 * 60 * 1000 && job.status === 'pending';

    return {
      exists: true,
      isStale,
      lastUpdate,
      processingTime
    };
  }

  async incrementJobMetric(jobId: string, metric: string, value: number = 1): Promise<void> {
    const job = this.jobs.get(jobId);
    if (job) {
      if (!job.metrics) {
        job.metrics = {};
      }
      job.metrics[metric] = (job.metrics[metric] || 0) + value;
      // Update the job in place for in-memory store
      this.jobs.set(jobId, job);
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

// Use global variable to ensure singleton across serverless execution contexts
const globalForJobStore = globalThis as unknown as {
  jobStore: JobStore | undefined
}

export function getJobStore(): JobStore {
  if (!globalForJobStore.jobStore) {
    globalForJobStore.jobStore = createJobStore();
  }
  return globalForJobStore.jobStore;
}