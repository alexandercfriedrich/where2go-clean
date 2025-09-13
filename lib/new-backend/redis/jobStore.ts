/**
 * Job store implementation for the new backend system.
 * This module provides job persistence with signature-based deduplication.
 * 
 * @fileoverview Job storage with Redis backend and in-memory fallback for development.
 */

import { getRedisClient, REDIS_KEYS } from './redisClient';
import { InMemoryJobStore } from './inMemoryJobStore';
import { createComponentLogger } from '../utils/log';
import { createError, ErrorCode, fromError, type AppError } from '../utils/errors';
import { 
  type EventSearchJob, 
  type CreateJobParams, 
  type CreateJobResult, 
  JobStatus,
  ProgressState 
} from '../types/jobs';
import { generateJobId, generateJobSignature } from '../utils/hash';

const logger = createComponentLogger('JobStore');

/**
 * Job store interface for managing event search jobs.
 */
export interface JobStore {
  /**
   * Create a new job or return existing if signature matches.
   */
  createJob(params: CreateJobParams): Promise<CreateJobResult>;

  /**
   * Get a job by its ID.
   */
  getJob(jobId: string): Promise<EventSearchJob | null>;

  /**
   * Update job status and metadata.
   */
  updateJob(jobId: string, updates: Partial<EventSearchJob>): Promise<void>;

  /**
   * Add job to processing queue.
   */
  enqueueJob(jobId: string): Promise<void>;

  /**
   * Get next job from processing queue (blocking).
   */
  dequeueJob(timeoutSeconds?: number): Promise<string | null>;

  /**
   * Get job queue length.
   */
  getQueueLength(): Promise<number>;

  /**
   * Delete a job and its related data.
   */
  deleteJob(jobId: string): Promise<void>;

  /**
   * Find job by signature.
   */
  findJobBySignature(signature: string): Promise<EventSearchJob | null>;

  /**
   * Check if job is stale (should be recreated).
   */
  isJobStale(job: EventSearchJob): boolean;
}

/**
 * Default job TTL in seconds (1 hour).
 */
const DEFAULT_JOB_TTL = 3600;

/**
 * Job staleness threshold in seconds (30 minutes).
 * Jobs older than this are considered stale and may be recreated.
 */
const JOB_STALENESS_THRESHOLD = 1800;

/**
 * Redis-backed job store implementation.
 */
export class RedisJobStore implements JobStore {
  private redisClient = getRedisClient();

  /**
   * Create a new job or return existing if signature matches.
   */
  async createJob(params: CreateJobParams): Promise<CreateJobResult> {
    try {
      logger.info('Creating job', { 
        city: params.city, 
        date: params.date, 
        categoryCount: params.categories.length 
      });

      const signature = generateJobSignature(params.city, params.date, params.categories);
      
      // Check for existing job with same signature
      const existingJob = await this.findJobBySignature(signature);
      
      if (existingJob) {
        const isStale = this.isJobStale(existingJob);
        
        logger.info('Found existing job with matching signature', {
          jobId: existingJob.id,
          status: existingJob.status,
          isStale
        });

        if (!isStale) {
          return {
            job: existingJob,
            isNew: false,
            isStale: false
          };
        } else {
          // Remove stale job before creating new one
          await this.deleteJob(existingJob.id);
          logger.info('Removed stale job', { jobId: existingJob.id });
        }
      }

      // Create new job
      const jobId = generateJobId();
      const now = new Date().toISOString();
      const ttlSeconds = params.ttlSeconds || DEFAULT_JOB_TTL;

      const job: EventSearchJob = {
        id: jobId,
        signature,
        status: JobStatus.PENDING,
        city: params.city,
        date: params.date,
        categories: [...params.categories], // Copy array
        events: [],
        progress: {
          totalCategories: params.categories.length,
          completedCategories: 0,
          failedCategories: 0,
          categoryStates: Object.fromEntries(
            params.categories.map(cat => [cat, {
              state: ProgressState.NOT_STARTED,
              retryCount: 0
            }])
          )
        },
        createdAt: now,
        updatedAt: now,
        ttlSeconds
      };

      // Store job in Redis
      await this.storeJob(job);
      
      // Update signature index
      await this.updateSignatureIndex(signature, jobId);

      logger.info('Created new job', { 
        jobId,
        signature: signature.substring(0, 8) + '...' 
      });

      return {
        job,
        isNew: true
      };

    } catch (error) {
      const appError = fromError(error, ErrorCode.JOB_CREATION_FAILED);
      logger.error('Failed to create job', { error: appError });
      throw appError;
    }
  }

  /**
   * Get a job by its ID.
   */
  async getJob(jobId: string): Promise<EventSearchJob | null> {
    try {
      return await this.redisClient.executeOperation(async (client) => {
        const jobData = await client.get(REDIS_KEYS.JOB(jobId));
        
        if (!jobData) {
          return null;
        }

        // Enhanced JSON parsing with better error handling
        try {
          // Handle case where Redis client auto-parses JSON (Upstash behavior)
          if (typeof jobData === 'object' && jobData !== null) {
            return jobData as EventSearchJob;
          }
          
          // Handle case where Redis returns string (standard Redis behavior)
          if (typeof jobData === 'string') {
            return JSON.parse(jobData) as EventSearchJob;
          }
          
          // Unexpected data type
          throw new Error(`Unexpected data type: ${typeof jobData}`);
          
        } catch (parseError) {
          logger.error('Invalid job data in Redis - corrupted JSON', {
            jobId,
            dataType: typeof jobData,
            dataPreview: String(jobData).substring(0, 100),
            parseError: parseError instanceof Error ? parseError.message : String(parseError)
          });
          
          // Clean up corrupted data
          await client.del(REDIS_KEYS.JOB(jobId));
          
          return null;
        }
      }, `getJob(${jobId})`);

    } catch (error) {
      const appError = fromError(error, ErrorCode.REDIS_OPERATION_FAILED);
      logger.error('Failed to get job', { jobId, error: appError });
      throw appError;
    }
  }

  /**
   * Update job status and metadata.
   */
  async updateJob(jobId: string, updates: Partial<EventSearchJob>): Promise<void> {
    try {
      await this.redisClient.executeOperation(async (client) => {
        // Get current job data
        const currentJobData = await client.get(REDIS_KEYS.JOB(jobId));
        
        if (!currentJobData) {
          throw createError(
            ErrorCode.JOB_NOT_FOUND,
            `Job not found: ${jobId}`
          );
        }

        // Enhanced JSON parsing with error handling
        let currentJob: EventSearchJob;
        try {
          // Handle case where Redis client auto-parses JSON (Upstash behavior)
          if (typeof currentJobData === 'object' && currentJobData !== null) {
            currentJob = currentJobData as EventSearchJob;
          } else if (typeof currentJobData === 'string') {
            // Handle case where Redis returns string (standard Redis behavior)
            currentJob = JSON.parse(currentJobData) as EventSearchJob;
          } else {
            throw new Error(`Unexpected data type: ${typeof currentJobData}`);
          }
        } catch (parseError) {
          logger.error('Invalid job data during update - corrupted JSON', {
            jobId,
            dataType: typeof currentJobData,
            dataPreview: String(currentJobData).substring(0, 100),
            parseError: parseError instanceof Error ? parseError.message : String(parseError)
          });
          
          throw createError(
            ErrorCode.JOB_PROCESSING_FAILED,
            `Job data corrupted, cannot update: ${jobId}`,
            { parseError: parseError instanceof Error ? parseError.message : String(parseError) }
          );
        }
        
        // Merge updates
        const updatedJob: EventSearchJob = {
          ...currentJob,
          ...updates,
          updatedAt: new Date().toISOString()
        };

        // Store updated job
        await client.set(
          REDIS_KEYS.JOB(jobId),
          JSON.stringify(updatedJob),
          { ex: updatedJob.ttlSeconds }
        );

        logger.debug('Updated job', { 
          jobId, 
          updatedFields: Object.keys(updates) 
        });
      }, `updateJob(${jobId})`);

    } catch (error) {
      const appError = fromError(error, ErrorCode.JOB_PROCESSING_FAILED);
      logger.error('Failed to update job', { jobId, error: appError });
      throw appError;
    }
  }

  /**
   * Add job to processing queue.
   */
  async enqueueJob(jobId: string): Promise<void> {
    try {
      await this.redisClient.executeOperation(async (client) => {
        await client.lpush(REDIS_KEYS.JOB_QUEUE, jobId);
        
        logger.info('Enqueued job for processing', { jobId });
      }, `enqueueJob(${jobId})`);

    } catch (error) {
      const appError = fromError(error, ErrorCode.REDIS_OPERATION_FAILED);
      logger.error('Failed to enqueue job', { jobId, error: appError });
      throw appError;
    }
  }

  /**
   * Get next job from processing queue (non-blocking).
   * Note: This replaces the blocking blpop operation since HTTP-based Redis
   * services don't support blocking operations.
   */
  async dequeueJob(): Promise<string | null> {
    try {
      return await this.redisClient.executeOperation(async (client) => {
        const jobId = await client.lpop(REDIS_KEYS.JOB_QUEUE);
        
        if (!jobId) {
          return null;
        }

        logger.debug('Dequeued job for processing', { jobId });
        
        return jobId;
      }, 'dequeueJob');

    } catch (error) {
      const appError = fromError(error, ErrorCode.REDIS_OPERATION_FAILED);
      logger.error('Failed to dequeue job', { error: appError });
      throw appError;
    }
  }

  /**
   * Get job queue length.
   */
  async getQueueLength(): Promise<number> {
    try {
      return await this.redisClient.executeOperation(async (client) => {
        return await client.llen(REDIS_KEYS.JOB_QUEUE);
      }, 'getQueueLength');

    } catch (error) {
      const appError = fromError(error, ErrorCode.REDIS_OPERATION_FAILED);
      logger.error('Failed to get queue length', { error: appError });
      throw appError;
    }
  }

  /**
   * Delete a job and its related data.
   */
  async deleteJob(jobId: string): Promise<void> {
    try {
      await this.redisClient.executeOperation(async (client) => {
        // Get job to find signature
        const jobData = await client.get(REDIS_KEYS.JOB(jobId));
        
        if (jobData) {
          const job = JSON.parse(jobData) as EventSearchJob;
          
          // Remove signature index
          await client.del(REDIS_KEYS.JOB_SIGNATURE_INDEX(job.signature));
        }

        // Remove job data
        await client.del(REDIS_KEYS.JOB(jobId));
        
        logger.debug('Deleted job', { jobId });
      }, `deleteJob(${jobId})`);

    } catch (error) {
      const appError = fromError(error, ErrorCode.REDIS_OPERATION_FAILED);
      logger.error('Failed to delete job', { jobId, error: appError });
      throw appError;
    }
  }

  /**
   * Find job by signature.
   */
  async findJobBySignature(signature: string): Promise<EventSearchJob | null> {
    try {
      return await this.redisClient.executeOperation(async (client) => {
        // Get job ID from signature index
        const jobId = await client.get(REDIS_KEYS.JOB_SIGNATURE_INDEX(signature));
        
        if (!jobId) {
          return null;
        }

        // Get job data
        const jobData = await client.get(REDIS_KEYS.JOB(jobId));
        
        if (!jobData) {
          // Clean up stale signature index
          await client.del(REDIS_KEYS.JOB_SIGNATURE_INDEX(signature));
          return null;
        }

        // Enhanced JSON parsing with better error handling
        try {
          // Handle case where Redis client auto-parses JSON (Upstash behavior)
          if (typeof jobData === 'object' && jobData !== null) {
            return jobData as EventSearchJob;
          }
          
          // Handle case where Redis returns string (standard Redis behavior)
          if (typeof jobData === 'string') {
            return JSON.parse(jobData) as EventSearchJob;
          }
          
          // Unexpected data type
          throw new Error(`Unexpected data type: ${typeof jobData}`);
          
        } catch (parseError) {
          logger.error('Invalid job data in Redis - corrupted JSON', {
            jobId,
            dataType: typeof jobData,
            dataPreview: String(jobData).substring(0, 100),
            parseError: parseError instanceof Error ? parseError.message : String(parseError)
          });
          
          // Clean up corrupted data
          await client.del(REDIS_KEYS.JOB(jobId));
          await client.del(REDIS_KEYS.JOB_SIGNATURE_INDEX(signature));
          
          return null;
        }
      }, `findJobBySignature(${signature.substring(0, 8)}...)`);

    } catch (error) {
      const appError = fromError(error, ErrorCode.REDIS_OPERATION_FAILED);
      logger.error('Failed to find job by signature', { 
        signature: signature.substring(0, 8) + '...', 
        error: appError 
      });
      throw appError;
    }
  }

  /**
   * Check if job is stale (should be recreated).
   */
  isJobStale(job: EventSearchJob): boolean {
    const now = Date.now();
    const createdAt = new Date(job.createdAt).getTime();
    const age = (now - createdAt) / 1000; // Age in seconds

    // Job is stale if:
    // 1. It's older than staleness threshold
    // 2. It's in a terminal state (SUCCESS, FAILED, CANCELLED) and old
    // 3. It's been running too long without updates
    
    if (age > JOB_STALENESS_THRESHOLD) {
      return true;
    }

    if ([JobStatus.SUCCESS, JobStatus.FAILED, JobStatus.CANCELLED].includes(job.status)) {
      // Terminal jobs are stale after 5 minutes
      return age > 300;
    }

    if (job.status === JobStatus.RUNNING) {
      const updatedAt = new Date(job.updatedAt).getTime();
      const timeSinceUpdate = (now - updatedAt) / 1000;
      
      // Running jobs are stale if no updates for 10 minutes
      return timeSinceUpdate > 600;
    }

    return false;
  }

  /**
   * Store job in Redis with TTL.
   */
  private async storeJob(job: EventSearchJob): Promise<void> {
    await this.redisClient.executeOperation(async (client) => {
      await client.set(
        REDIS_KEYS.JOB(job.id),
        JSON.stringify(job),
        { ex: job.ttlSeconds }
      );
    }, `storeJob(${job.id})`);
  }

  /**
   * Update signature index for job deduplication.
   */
  private async updateSignatureIndex(signature: string, jobId: string): Promise<void> {
    await this.redisClient.executeOperation(async (client) => {
      await client.set(
        REDIS_KEYS.JOB_SIGNATURE_INDEX(signature),
        jobId,
        { ex: DEFAULT_JOB_TTL } // Same TTL as job
      );
    }, `updateSignatureIndex(${signature.substring(0, 8)}...)`);
  }
}

/**
 * Global job store instance with automatic fallback.
 */
let jobStore: JobStore | null = null;

/**
 * Get the global job store instance with automatic Redis/in-memory fallback.
 */
export function getJobStore(): JobStore {
  if (!jobStore) {
    // Check if Redis is configured
    const hasRedisConfig = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN;
    
    if (hasRedisConfig) {
      logger.info('Using Redis job store');
      jobStore = new RedisJobStore();
    } else {
      logger.warn('Redis not configured, using in-memory job store for development');
      jobStore = new InMemoryJobStore() as unknown as JobStore;
    }
  }
  
  return jobStore;
}