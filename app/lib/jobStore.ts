// Clean, simple job store with Redis fallback
import { JobStatus } from './types';

// Simple in-memory store as fallback
const memoryStore = new Map<string, JobStatus>();

interface JobStore {
  setJob(jobId: string, job: JobStatus): Promise<void>;
  getJob(jobId: string): Promise<JobStatus | null>;
  updateJob(jobId: string, updates: Partial<JobStatus>): Promise<void>;
  deleteJob(jobId: string): Promise<void>;
  cleanupOldJobs(): Promise<void>;
}

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
  }

  async cleanupOldJobs(): Promise<void> {
    const now = Date.now();
    const maxAge = 60 * 60 * 1000; // 1 hour
    
    for (const [jobId, job] of memoryStore.entries()) {
      if (now - job.createdAt.getTime() > maxAge) {
        memoryStore.delete(jobId);
      }
    }
  }
}

class RedisJobStore implements JobStore {
  private redis: any;
  private fallback: SimpleMemoryJobStore;

  constructor() {
    this.fallback = new SimpleMemoryJobStore();
    this.initRedis();
  }

  private async initRedis() {
    try {
      if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
        const { Redis } = await import('@upstash/redis');
        this.redis = new Redis({
          url: process.env.UPSTASH_REDIS_REST_URL,
          token: process.env.UPSTASH_REDIS_REST_TOKEN,
        });
        
        // Test connection with timeout
        const testPromise = this.redis.set('test_connection', 'ok', { ex: 10 });
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Redis connection timeout')), 3000)
        );
        
        await Promise.race([testPromise, timeoutPromise]);
        console.log('✅ Redis connected successfully');
      }
    } catch (error) {
      console.log('⚠️ Redis not available, using in-memory store:', error instanceof Error ? error.message : 'Unknown error');
      this.redis = null;
    }
  }

  async setJob(jobId: string, job: JobStatus): Promise<void> {
    try {
      if (this.redis) {
        await this.redis.set(`job:${jobId}`, JSON.stringify({
          ...job,
          createdAt: job.createdAt.toISOString()
        }), { ex: 3600 }); // 1 hour expiry
        return;
      }
    } catch (error) {
      console.warn('Redis setJob failed, using fallback:', error);
    }
    
    await this.fallback.setJob(jobId, job);
  }

  async getJob(jobId: string): Promise<JobStatus | null> {
    try {
      if (this.redis) {
        const data = await this.redis.get(`job:${jobId}`);
        if (data) {
          const parsed = JSON.parse(data);
          return {
            ...parsed,
            createdAt: new Date(parsed.createdAt)
          };
        }
        return null;
      }
    } catch (error) {
      console.warn('Redis getJob failed, using fallback:', error);
    }
    
    return await this.fallback.getJob(jobId);
  }

  async updateJob(jobId: string, updates: Partial<JobStatus>): Promise<void> {
    try {
      if (this.redis) {
        const existing = await this.getJob(jobId);
        if (existing) {
          const updated = { ...existing, ...updates };
          await this.setJob(jobId, updated);
          return;
        }
      }
    } catch (error) {
      console.warn('Redis updateJob failed, using fallback:', error);
    }
    
    await this.fallback.updateJob(jobId, updates);
  }

  async deleteJob(jobId: string): Promise<void> {
    try {
      if (this.redis) {
        await this.redis.del(`job:${jobId}`);
        return;
      }
    } catch (error) {
      console.warn('Redis deleteJob failed, using fallback:', error);
    }
    
    await this.fallback.deleteJob(jobId);
  }

  async cleanupOldJobs(): Promise<void> {
    // Redis keys expire automatically, just clean memory fallback
    await this.fallback.cleanupOldJobs();
  }
}

// Singleton instance
let jobStoreInstance: JobStore | null = null;

export function getJobStore(): JobStore {
  if (!jobStoreInstance) {
    jobStoreInstance = new RedisJobStore();
  }
  return jobStoreInstance;
}