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
  private isConnected: boolean = false;
  private connectionAttempts: number = 0;
  private lastConnectionAttempt: number = 0;
  private maxConnectionAttempts: number = 5;
  private backoffMultiplier: number = 1000; // Start with 1 second

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
        // Add more robust connection settings
        retry: {
          retries: 3,
          backoff: (retryCount: number) => Math.min(1000 * Math.pow(2, retryCount), 10000)
        }
      });
      
      // Test connection with longer timeout for production environments
      const testPromise = this.redis.set('test_connection_strict', 'ok', { ex: 10 });
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Redis connection timeout')), 15000) // Increased to 15 seconds
      );
      
      await Promise.race([testPromise, timeoutPromise]);
      this.isConnected = true;
      this.connectionAttempts = 0;
      console.log('✅ Strict Redis JobStore connected successfully');
    } catch (error) {
      this.isConnected = false;
      this.connectionAttempts++;
      const message = `Redis connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error('❌ Strict Redis JobStore connection failed:', message);
      throw new Error(message);
    }
  }

  private async retryOperation<T>(operation: () => Promise<T>, operationName: string, maxRetries: number = 3): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await operation();
        this.isConnected = true;
        return result;
      } catch (error) {
        lastError = error as Error;
        this.isConnected = false;
        
        console.error(`Redis ${operationName} attempt ${attempt}/${maxRetries} failed:`, error);
        
        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // Exponential backoff, max 10s
          console.log(`Retrying Redis ${operationName} in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw new Error(`Redis ${operationName} failed after ${maxRetries} attempts: ${lastError!.message}`);
  }

  private async ensureInitialized() {
    if (!this.isConnected) {
      // Implement exponential backoff for reconnection attempts
      const now = Date.now();
      const backoffDelay = this.backoffMultiplier * Math.pow(2, Math.min(this.connectionAttempts, 10));
      
      if (this.connectionAttempts >= this.maxConnectionAttempts && 
          now - this.lastConnectionAttempt < backoffDelay) {
        throw new Error(`Redis connection failed after ${this.maxConnectionAttempts} attempts. Next attempt in ${Math.ceil((backoffDelay - (now - this.lastConnectionAttempt)) / 1000)}s`);
      }
      
      if (this.connectionAttempts >= this.maxConnectionAttempts || 
          now - this.lastConnectionAttempt >= backoffDelay) {
        this.lastConnectionAttempt = now;
        // Reset and retry connection
        this.initPromise = this.initRedis();
      }
    }
    
    await this.initPromise;
  }

  async setJob(jobId: string, job: JobStatus): Promise<void> {
    return this.retryOperation(async () => {
      await this.ensureInitialized();
      await this.redis.set(`job:${jobId}`, JSON.stringify({
        ...job,
        createdAt: job.createdAt.toISOString(),
        lastUpdateAt: job.lastUpdateAt || new Date().toISOString()
      }), { ex: 3600 }); // 1 hour expiry
    }, `setJob(${jobId})`);
  }

  async getJob(jobId: string): Promise<JobStatus | null> {
    return this.retryOperation(async () => {
      await this.ensureInitialized();
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
    }, `getJob(${jobId})`);
  }

  async updateJob(jobId: string, updates: Partial<JobStatus>): Promise<void> {
    return this.retryOperation(async () => {
      await this.ensureInitialized();
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
    }, `updateJob(${jobId})`);
  }

  async deleteJob(jobId: string): Promise<void> {
    return this.retryOperation(async () => {
      await this.ensureInitialized();
      await this.redis.del(`job:${jobId}`);
      await this.redis.del(`debug:${jobId}`); // Also delete debug info
    }, `deleteJob(${jobId})`);
  }

  async cleanupOldJobs(): Promise<void> {
    // Redis keys expire automatically with TTL, so this is a no-op
    // Could implement a scan-based cleanup here if needed
  }

  // Debug methods for test compatibility
  async setDebugInfo(jobId: string, debugInfo: DebugInfo): Promise<void> {
    return this.retryOperation(async () => {
      await this.ensureInitialized();
      await this.redis.set(`debug:${jobId}`, JSON.stringify({
        ...debugInfo,
        createdAt: debugInfo.createdAt.toISOString()
      }), { ex: 3600 });
    }, `setDebugInfo(${jobId})`);
  }

  async getDebugInfo(jobId: string): Promise<DebugInfo | null> {
    return this.retryOperation(async () => {
      await this.ensureInitialized();
      const data = await this.redis.get(`debug:${jobId}`);
      if (!data) {
        return null;
      }
      
      const parsed = typeof data === 'string' ? JSON.parse(data) : data;
      return {
        ...parsed,
        createdAt: new Date(parsed.createdAt)
      };
    }, `getDebugInfo(${jobId})`);
  }

  async pushDebugStep(jobId: string, step: DebugStep): Promise<void> {
    return this.retryOperation(async () => {
      await this.ensureInitialized();
      const existing = await this.getDebugInfo(jobId);
      if (existing) {
        existing.steps.push(step);
        await this.setDebugInfo(jobId, existing);
      }
    }, `pushDebugStep(${jobId})`);
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