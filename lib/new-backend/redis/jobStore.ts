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
const JOB_STALENESS_THRESHOLD = 1800;

export interface JobStore {
  createJob(params: CreateJobParams): Promise<CreateJobResult>;
  getJob(jobId: string): Promise<EventSearchJob | null>;
  updateJob(jobId: string, updates: Partial<EventSearchJob>): Promise<void>;
  dequeueJob(timeoutSeconds?: number): Promise<string | null>;
  getQueueLength(): Promise<number>;
  deleteJob(jobId: string): Promise<void>;
  findJobBySignature(signature: string): Promise<EventSearchJob | null>;
  isJobStale(job: EventSearchJob): boolean;
  initializeProgress(job: EventSearchJob): EventSearchJob;
}

export class RedisJobStore implements JobStore {
  private redisClient = getRedisClient();

  async createJob(params: CreateJobParams): Promise<CreateJobResult> {
    try {
      logger.info('Creating job', { 
        city: params.city, 
        date: params.date, 
        categoryCount: params.categories.length 
      });

      const signature = generateJobSignature(params.city, params.date, params.categories);
      
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
          await this.deleteJob(existingJob.id);
          logger.info('Removed stale job', { jobId: existingJob.id });
        }
      }

      const jobId = generateJobId();
      const now = new Date().toISOString();
      const ttlSeconds = params.ttlSeconds || DEFAULT_JOB_TTL;

      const job: EventSearchJob = {
        id: jobId,
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

      await this.storeJob(job);
      await this.updateSignatureIndex(signature, jobId);
      await this.enqueueJob(jobId);

      logger.info('Created new job', { 
        jobId,
        signature: signature.substring(0, 8) + '...' 
      });

      return {
        job,
        isNew: true,
        isStale: false
      };

    } catch (error) {
      const appError = fromError(error, ErrorCode.JOB_CREATION_FAILED);
      logger.error('Failed to create job', { error: appError });
      throw appError;
    }
  }

  async getJob(jobId: string): Promise<EventSearchJob | null> {
    try {
      return await this.redisClient.executeOperation(async (client) => {
        const jobData = await client.get(REDIS_KEYS.JOB(jobId));
        
        if (!jobData) {
          return null;
        }

        let job: EventSearchJob;
        try {
          if (typeof jobData === 'object' && jobData !== null) {
            job = jobData as EventSearchJob;
          } else if (typeof jobData === 'string') {
            job = JSON.parse(jobData) as EventSearchJob;
          } else {
            throw new Error(`Unexpected data type: ${typeof jobData}`);
          }
        } catch (parseError) {
          logger.error('Invalid job data in Redis - corrupted JSON', {
            jobId,
            dataType: typeof jobData,
            dataPreview: String(jobData).substring(0, 100),
            parseError: parseError instanceof Error ? parseError.message : String(parseError)
          });
          
          await client.del(REDIS_KEYS.JOB(jobId));
          return null;
        }

        // Structural repair only - do basic initialization
        job = this.initializeProgress(job);
        
        return job;
      }, `getJob(${jobId})`);

    } catch (error) {
      const appError = fromError(error, ErrorCode.REDIS_OPERATION_FAILED);
      logger.error('Failed to get job', { jobId, error: appError });
      throw appError;
    }
  }

  async updateJob(jobId: string, updates: Partial<EventSearchJob>): Promise<void> {
    try {
      await this.redisClient.executeOperation(async (client) => {
        const currentJobData = await client.get(REDIS_KEYS.JOB(jobId));
        
        if (!currentJobData) {
          throw createError(
            ErrorCode.JOB_NOT_FOUND,
            `Job not found: ${jobId}`
          );
        }

        let currentJob: EventSearchJob;
        try {
          if (typeof currentJobData === 'object' && currentJobData !== null) {
            currentJob = currentJobData as EventSearchJob;
          } else if (typeof currentJobData === 'string') {
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
            `Job data corrupted for ${jobId}`
          );
        }

        const updatedJob = {
          ...currentJob,
          ...updates,
          updatedAt: new Date().toISOString()
        };

        await client.set(
          REDIS_KEYS.JOB(jobId),
          JSON.stringify(updatedJob),
          { ex: updatedJob.ttlSeconds }
        );

        logger.debug('Job updated', { jobId, updatedFields: Object.keys(updates) });
      }, `updateJob(${jobId})`);

    } catch (error) {
      const appError = fromError(error, ErrorCode.JOB_PROCESSING_FAILED);
      logger.error('Failed to update job', { jobId, error: appError });
      throw appError;
    }
  }

  async dequeueJob(timeoutSeconds: number = 0): Promise<string | null> {
    try {
      return await this.redisClient.executeOperation(async (client) => {
        // HTTP-based Redis (Upstash) doesn't support blocking operations like blpop
        return await client.lpop(REDIS_KEYS.JOB_QUEUE);
      }, 'dequeueJob');

    } catch (error) {
      const appError = fromError(error, ErrorCode.REDIS_OPERATION_FAILED);
      logger.error('Failed to dequeue job', { error: appError });
      throw appError;
    }
  }

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

  async deleteJob(jobId: string): Promise<void> {
    try {
      await this.redisClient.executeOperation(async (client) => {
        const job = await this.getJob(jobId);
        
        await client.del(REDIS_KEYS.JOB(jobId));
        
        if (job) {
          await client.del(REDIS_KEYS.JOB_SIGNATURE_INDEX(job.signature));
        }

        logger.debug('Job deleted', { jobId });
      }, `deleteJob(${jobId})`);

    } catch (error) {
      const appError = fromError(error, ErrorCode.JOB_PROCESSING_FAILED);
      logger.error('Failed to delete job', { jobId, error: appError });
      throw appError;
    }
  }

  async findJobBySignature(signature: string): Promise<EventSearchJob | null> {
    try {
      return await this.redisClient.executeOperation(async (client) => {
        const jobId = await client.get(REDIS_KEYS.JOB_SIGNATURE_INDEX(signature));
        
        if (!jobId) {
          return null;
        }

        return await this.getJob(jobId);
      }, `findJobBySignature(${signature.substring(0, 8)}...)`);

    } catch (error) {
      const appError = fromError(error, ErrorCode.REDIS_OPERATION_FAILED);
      logger.error('Failed to find job by signature', { signature, error: appError });
      throw appError;
    }
  }

  isJobStale(job: EventSearchJob): boolean {
    const now = Date.now();
    const createdAt = new Date(job.createdAt).getTime();
    const ageSeconds = (now - createdAt) / 1000;
    
    return ageSeconds > JOB_STALENESS_THRESHOLD;
  }

  initializeProgress(job: EventSearchJob): EventSearchJob {
    if (!job.progress || !job.progress.categoryStates) {
      const categoryStates = Object.fromEntries(
        job.categories.map(cat => [cat, {
          state: ProgressState.NOT_STARTED,
          retryCount: 0
        }])
      );

      return {
        ...job,
        progress: {
          totalCategories: job.categories.length,
          completedCategories: 0,
          failedCategories: 0,
          categoryStates
        }
      };
    }

    return job;
  }

  private async storeJob(job: EventSearchJob): Promise<void> {
    await this.redisClient.executeOperation(async (client) => {
      await client.set(
        REDIS_KEYS.JOB(job.id),
        JSON.stringify(job),
        { ex: job.ttlSeconds }
      );
    }, `storeJob(${job.id})`);
  }

  private async updateSignatureIndex(signature: string, jobId: string): Promise<void> {
    await this.redisClient.executeOperation(async (client) => {
      await client.set(
        REDIS_KEYS.JOB_SIGNATURE_INDEX(signature),
        jobId,
        { ex: DEFAULT_JOB_TTL }
      );
    }, `updateSignatureIndex(${signature.substring(0, 8)}...)`);
  }

  private async enqueueJob(jobId: string): Promise<void> {
    await this.redisClient.executeOperation(async (client) => {
      await client.rpush(REDIS_KEYS.JOB_QUEUE, jobId);
    }, `enqueueJob(${jobId})`);
  }
}

let jobStoreInstance: JobStore | null = null;

export function getJobStore(): JobStore {
  if (!jobStoreInstance) {
    jobStoreInstance = new RedisJobStore();
  }
  return jobStoreInstance;
}