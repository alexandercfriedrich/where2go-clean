// Strict Redis-only job store - no fallback to prevent serverless instance isolation issues
import { JobStatus, DebugInfo, DebugStep } from './types';

export interface JobStore {
  setJob(jobId: string, job: JobStatus): Promise<void>;
  getJob(jobId: string): Promise<JobStatus | null>;
  updateJob(jobId: string, updates: Partial<JobStatus>): Promise<void>;
  deleteJob(jobId: string): Promise<void>;
  cleanupOldJobs(): Promise<void>;
  // Debug methods expected by tests
  setDebugInfo?(jobId: string, debugInfo: DebugInfo): Promise<void>;
  getDebugInfo?(jobId: string): Promise<DebugInfo | null>;
  pushDebugStep?(jobId: string, step: DebugStep): Promise<void>;
}

// Simple in-memory store for testing only
const memoryStore = new Map<string, JobStatus>();
const debugStore = new Map<string, DebugInfo>();

class SimpleMemoryJobStore implements JobStore {
  async setJob(jobId: string, job: JobStatus): Promise<void> {
    memoryStore.set(jobId, { ...job });
  }

  async getJob(jobId: string): Promise<JobStatus | null> {
    const job = memoryStore.get(jobId);
    return job ? { ...job } : null;
  }

  async updateJob(jobId: string, updates: Partial<JobStatus>): Promise<void> {
    const existing = memoryStore.get(jobId);
    if (existing) {
      memoryStore.set(jobId, { ...existing, ...updates });
    }
  }

  async deleteJob(jobId: string): Promise<void> {
    memoryStore.delete(jobId);
    debugStore.delete(jobId);
  }

  async cleanupOldJobs(): Promise<void> {
    const now = Date.now();
    const maxAge = 60 * 60 * 1000; // 1 hour
    
    for (const [jobId, job] of memoryStore.entries()) {
      if (now - job.createdAt.getTime() > maxAge) {
        memoryStore.delete(jobId);
        debugStore.delete(jobId);
      }
    }
  }

  async setDebugInfo(jobId: string, debugInfo: DebugInfo): Promise<void> {
    debugStore.set(jobId, { ...debugInfo });
  }

  async getDebugInfo(jobId: string): Promise<DebugInfo | null> {
    const info = debugStore.get(jobId);
    return info ? { ...info } : null;
  }

  async pushDebugStep(jobId: string, step: DebugStep): Promise<void> {
    const existing = debugStore.get(jobId);
    if (existing) {
      existing.steps.push(step);
    }
  }
}

class StrictRedisJobStore implements JobStore {
  private redis: any;
  private initPromise: Promise<void>;

  constructor() {
    // Strict mode: throw immediately if Redis env vars are missing
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      throw new Error(
        'Redis configuration required: UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN environment variables must be set'
      );
    }
    
    this.initPromise = this.initRedis();
  }

  private async initRedis() {
    try {
      const { Redis } = await import('@upstash/redis');
      this.redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
      });
      
      // Test connection with timeout - fail fast if Redis is unreachable
      const testPromise = this.redis.set('test_connection_strict', 'ok', { ex: 10 });
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Redis connection timeout')), 5000)
      );
      
      await Promise.race([testPromise, timeoutPromise]);
      console.log('✅ Strict Redis JobStore connected successfully');
    } catch (error) {
      const message = `Redis connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error('❌ Strict Redis JobStore connection failed:', message);
      throw new Error(message);
    }
  }

  private async ensureInitialized() {
    await this.initPromise;
  }

  async setJob(jobId: string, job: JobStatus): Promise<void> {
    await this.ensureInitialized();
    try {
      await this.redis.set(`job:${jobId}`, JSON.stringify({
        ...job,
        createdAt: job.createdAt.toISOString(),
        lastUpdateAt: job.lastUpdateAt || new Date().toISOString()
      }), { ex: 3600 }); // 1 hour expiry
    } catch (error) {
      console.error('Redis setJob failed:', error);
      throw new Error(`Failed to store job ${jobId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getJob(jobId: string): Promise<JobStatus | null> {
    await this.ensureInitialized();
    try {
      const data = await this.redis.get(`job:${jobId}`);
      if (!data) {
        return null;
      }
      
      // Handle case where Redis returns an object instead of JSON string
      if (typeof data === 'object' && data !== null) {
        return {
          ...data as any,
          createdAt: new Date((data as any).createdAt)
        };
      }
      
      // Handle case where Redis returns a JSON string
      if (typeof data === 'string') {
        const parsed = JSON.parse(data);
        return {
          ...parsed,
          createdAt: new Date(parsed.createdAt)
        };
      }
      
      return null;
    } catch (error) {
      console.error('Redis getJob failed:', error);
      throw new Error(`Failed to retrieve job ${jobId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateJob(jobId: string, updates: Partial<JobStatus>): Promise<void> {
    await this.ensureInitialized();
    try {
      const existing = await this.getJob(jobId);
      if (existing) {
        const updated = { 
          ...existing, 
          ...updates,
          lastUpdateAt: new Date().toISOString()
        };
        await this.setJob(jobId, updated);
      } else {
        throw new Error(`Job ${jobId} not found for update`);
      }
    } catch (error) {
      console.error('Redis updateJob failed:', error);
      throw error; // Re-throw to preserve original error
    }
  }

  async deleteJob(jobId: string): Promise<void> {
    await this.ensureInitialized();
    try {
      await this.redis.del(`job:${jobId}`);
      await this.redis.del(`debug:${jobId}`); // Also delete debug info
    } catch (error) {
      console.error('Redis deleteJob failed:', error);
      throw new Error(`Failed to delete job ${jobId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async cleanupOldJobs(): Promise<void> {
    // Redis keys expire automatically with TTL, so this is a no-op
    // Could implement a scan-based cleanup here if needed
  }

  // Debug methods for test compatibility
  async setDebugInfo(jobId: string, debugInfo: DebugInfo): Promise<void> {
    await this.ensureInitialized();
    try {
      await this.redis.set(`debug:${jobId}`, JSON.stringify({
        ...debugInfo,
        createdAt: debugInfo.createdAt.toISOString()
      }), { ex: 3600 });
    } catch (error) {
      console.error('Redis setDebugInfo failed:', error);
      throw new Error(`Failed to store debug info for ${jobId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getDebugInfo(jobId: string): Promise<DebugInfo | null> {
    await this.ensureInitialized();
    try {
      const data = await this.redis.get(`debug:${jobId}`);
      if (!data) {
        return null;
      }
      
      const parsed = typeof data === 'string' ? JSON.parse(data) : data;
      return {
        ...parsed,
        createdAt: new Date(parsed.createdAt)
      };
    } catch (error) {
      console.error('Redis getDebugInfo failed:', error);
      throw new Error(`Failed to retrieve debug info for ${jobId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async pushDebugStep(jobId: string, step: DebugStep): Promise<void> {
    await this.ensureInitialized();
    try {
      const existing = await this.getDebugInfo(jobId);
      if (existing) {
        existing.steps.push(step);
        await this.setDebugInfo(jobId, existing);
      }
    } catch (error) {
      console.error('Redis pushDebugStep failed:', error);
      throw new Error(`Failed to push debug step for ${jobId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Singleton instance
let jobStoreInstance: JobStore | null = null;

export function getJobStore(): JobStore {
  if (!jobStoreInstance) {
    try {
      jobStoreInstance = new StrictRedisJobStore();
    } catch (error) {
      console.error('Failed to create Redis JobStore:', error);
      throw error; // Fail fast instead of falling back
    }
  }
  return jobStoreInstance;
}

// Factory function for tests - allows creating fresh instances
export function createJobStore(forceInMemory = false): JobStore {
  if (forceInMemory || process.env.NODE_ENV === 'test') {
    // For tests, always use in-memory store to avoid Redis dependency
    return new SimpleMemoryJobStore();
  }
  
  try {
    return new StrictRedisJobStore();
  } catch (error) {
    console.error('Failed to create Redis JobStore:', error);
    throw error; // Fail fast
  }
}