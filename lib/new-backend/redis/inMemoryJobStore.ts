/**
 * In-memory job store fallback for development when Redis is not configured.
 * This provides basic functionality for testing without external dependencies.
 * 
 * @fileoverview Development-only in-memory job storage implementation.
 */

import { createComponentLogger } from '../utils/log';
import { createError, ErrorCode } from '../utils/errors';
import { 
  type EventSearchJob, 
  type CreateJobParams, 
  type CreateJobResult, 
  JobStatus,
  ProgressState 
} from '../types/jobs';
import { generateJobId, generateJobSignature } from '../utils/hash';

const logger = createComponentLogger('InMemoryJobStore');

/**
 * In-memory job store for development use only.
 * Data is lost when the server restarts.
 */
export class InMemoryJobStore {
  private jobs = new Map<string, EventSearchJob>();
  private signatureIndex = new Map<string, string>();
  private queue: string[] = [];

  constructor() {
    logger.warn('Using in-memory job store - data will be lost on restart');
    logger.warn('For production use, configure Redis with UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN');
  }

  async createJob(params: CreateJobParams): Promise<CreateJobResult> {
    logger.info('Creating job in memory', { 
      city: params.city, 
      date: params.date, 
      categoryCount: params.categories.length 
    });

    const signature = generateJobSignature(params.city, params.date, params.categories);
    
    // Check for existing job with same signature
    const existingJobId = this.signatureIndex.get(signature);
    if (existingJobId) {
      const existingJob = this.jobs.get(existingJobId);
      if (existingJob && !this.isJobStale(existingJob)) {
        logger.info('Found existing job with matching signature', {
          jobId: existingJob.id,
          status: existingJob.status
        });

        return {
          job: existingJob,
          isNew: false,
          isStale: false
        };
      } else if (existingJob) {
        // Remove stale job
        this.jobs.delete(existingJobId);
        this.signatureIndex.delete(signature);
        logger.info('Removed stale job', { jobId: existingJobId });
      }
    }

    // Create new job
    const jobId = generateJobId();
    const now = new Date().toISOString();
    
    const job: EventSearchJob = {
      id: jobId,
      signature,
      status: JobStatus.PENDING,
      city: params.city,
      date: params.date,
      categories: params.categories,
      events: [],
      progress: {
        totalCategories: params.categories.length,
        completedCategories: 0,
        failedCategories: 0,
        categoryStates: params.categories.reduce((states, category) => {
          states[category] = {
            state: ProgressState.NOT_STARTED,
            retryCount: 0
          };
          return states;
        }, {} as Record<string, { state: ProgressState; retryCount: number }>)
      },
      createdAt: now,
      updatedAt: now,
      ttlSeconds: params.ttlSeconds || 3600
    };

    // Store job
    this.jobs.set(jobId, job);
    this.signatureIndex.set(signature, jobId);

    logger.info('Job created in memory', {
      jobId,
      signature: signature.substring(0, 8) + '...',
      city: job.city,
      date: job.date,
      categoryCount: job.categories.length
    });

    return {
      job,
      isNew: true,
      isStale: false
    };
  }

  async getJob(jobId: string): Promise<EventSearchJob | null> {
    const job = this.jobs.get(jobId);
    if (!job) {
      return null;
    }

    // Check if job has expired
    const now = Date.now();
    const createdAt = new Date(job.createdAt).getTime();
    const age = (now - createdAt) / 1000;
    
    if (age > job.ttlSeconds) {
      this.jobs.delete(jobId);
      this.signatureIndex.delete(job.signature);
      return null;
    }

    return job;
  }

  async updateJob(jobId: string, updates: Partial<EventSearchJob>): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw createError(
        ErrorCode.JOB_NOT_FOUND,
        `Job not found: ${jobId}`
      );
    }

    const updatedJob: EventSearchJob = {
      ...job,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    this.jobs.set(jobId, updatedJob);
    
    logger.debug('Updated job in memory', { 
      jobId, 
      updatedFields: Object.keys(updates) 
    });
  }

  async enqueueJob(jobId: string): Promise<void> {
    if (!this.jobs.has(jobId)) {
      throw createError(
        ErrorCode.JOB_NOT_FOUND,
        `Cannot enqueue job that doesn't exist: ${jobId}`
      );
    }

    this.queue.push(jobId);
    logger.debug('Job enqueued in memory', { jobId, queueLength: this.queue.length });
  }

  async dequeueJob(timeoutSeconds?: number): Promise<string | null> {
    const jobId = this.queue.shift();
    return jobId || null;
  }

  async getQueueLength(): Promise<number> {
    return this.queue.length;
  }

  async deleteJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (job) {
      this.jobs.delete(jobId);
      this.signatureIndex.delete(job.signature);
      
      // Remove from queue if present
      const queueIndex = this.queue.indexOf(jobId);
      if (queueIndex !== -1) {
        this.queue.splice(queueIndex, 1);
      }
      
      logger.debug('Job deleted from memory', { jobId });
    }
  }

  async findJobBySignature(signature: string): Promise<EventSearchJob | null> {
    const jobId = this.signatureIndex.get(signature);
    if (!jobId) {
      return null;
    }

    return this.getJob(jobId);
  }

  isJobStale(job: EventSearchJob): boolean {
    const now = Date.now();
    const createdAt = new Date(job.createdAt).getTime();
    const age = (now - createdAt) / 1000;
    
    return age > 1800; // 30 minutes
  }
}