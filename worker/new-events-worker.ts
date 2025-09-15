/**
 * Simplified single-job processor (no internal polling loop).
 * All orchestration remains in worker/process-once.ts.
 */

import { getJobStore } from '../lib/new-backend/redis/jobStore';
import { getEventCache } from '../lib/new-backend/redis/eventCache';
import { getPerplexityClient } from '../lib/new-backend/services/perplexityClient';
import { normalizeCategories } from '../lib/new-backend/categories/normalize';
import { createComponentLogger } from '../lib/new-backend/utils/log';
import { createError, ErrorCode, fromError } from '../lib/new-backend/utils/errors';
import { recomputeCounters, deriveFinalStatus } from '../lib/new-backend/jobs/status';
import { 
  JobStatus, 
  ProgressState, 
  type EventSearchJob, 
  type CategoryState 
} from '../lib/new-backend/types/jobs';
import { type EventData } from '../lib/new-backend/types/events';
import { type MainCategory } from '../lib/new-backend/categories/categoryMap';

const logger = createComponentLogger('EventsWorker');

interface WorkerConfig {
  categoryTimeoutMs: number;
  categoryMaxRetries: number;
  retryDelayMs: number;
  defaultCacheTtlSeconds: number;
}

const DEFAULT_CONFIG: WorkerConfig = {
  categoryTimeoutMs: 25000,
  categoryMaxRetries: 2,
  retryDelayMs: 1000,
  defaultCacheTtlSeconds: 3600,
};

export class NewEventsWorker {
  private config: WorkerConfig;
  private jobStore = getJobStore();
  private eventCache = getEventCache();
  private perplexityClient = getPerplexityClient();

  constructor(config: Partial<WorkerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    logger.info('New events worker initialized', {
      categoryTimeoutMs: this.config.categoryTimeoutMs,
      categoryMaxRetries: this.config.categoryMaxRetries
    });
  }

  /**
   * Process a single job.
   */
  async processJob(jobId: string): Promise<void> {
    const startTime = Date.now();
    
    try {
      const job = await this.jobStore.getJob(jobId);
      
      if (!job) {
        logger.error('Job not found for processing', { jobId });
        return;
      }

      if (job.status !== JobStatus.PENDING) {
        logger.warn('Job is not in pending status', { 
          jobId, 
          status: job.status 
        });
        return;
      }

      logger.info('Starting job processing', {
        jobId,
        city: job.city,
        date: job.date,
        categoryCount: job.categories.length
      });

      await this.updateJobStatus(job, JobStatus.RUNNING, {
        startedAt: new Date().toISOString()
      });

      const normalizedCategories = normalizeCategories(job.categories);
      
      const cacheResult = await this.eventCache.getEventsForCategories(
        job.city,
        job.date,
        normalizedCategories
      );

      let allEvents = Object.values(cacheResult.cachedEvents).flat();

      // Update progress with cached categories
      for (const category of Object.keys(cacheResult.cachedEvents)) {
        await this.updateCategoryState(job, category, {
          state: ProgressState.COMPLETED,
          completedAt: new Date().toISOString(),
          eventCount: cacheResult.cachedEvents[category].length
        });
      }

      logger.info('Loaded events from cache', {
        jobId,
        cachedCategories: Object.keys(cacheResult.cachedEvents).length,
        cachedEvents: allEvents.length,
        missingCategories: cacheResult.missingCategories.length
      });

      // Process missing categories
      for (const category of cacheResult.missingCategories) {
        try {
          const categoryEvents = await this.processCategoryWithRetry(
            job,
            category as MainCategory
          );
          
          if (categoryEvents.length > 0) {
            await this.eventCache.cacheEvents(
              job.city,
              job.date,
              category,
              categoryEvents,
              this.config.defaultCacheTtlSeconds
            );

            allEvents.push(...categoryEvents);

            await this.updateCategoryState(job, category, {
              state: ProgressState.COMPLETED,
              completedAt: new Date().toISOString(),
              eventCount: categoryEvents.length
            });

            logger.info('Successfully processed category', {
              jobId,
              category,
              eventCount: categoryEvents.length
            });
          } else {
            // Zero parsed events - mark as completed with eventCount 0 for EMPTY status derivation
            await this.updateCategoryState(job, category, {
              state: ProgressState.COMPLETED,
              completedAt: new Date().toISOString(),
              eventCount: 0
            });

            logger.info('Category processed with no events - marked as completed', {
              jobId,
              category
            });
          }

        } catch (error) {
          const appError = fromError(error, ErrorCode.CATEGORY_PROCESSING_FAILED);

          await this.updateCategoryState(job, category, {
            state: ProgressState.FAILED,
            completedAt: new Date().toISOString(),
            error: appError.message
          });

          logger.error('Failed to process category', {
            jobId,
            category,
            error: appError
          });
        }

        await this.updateJobProgress(job, {
          events: allEvents
        });
      }

      // Finalize with centralized status logic
      const finalJob = await this.jobStore.getJob(jobId);
      if (finalJob) {
        recomputeCounters(finalJob);
        const finalStatus = deriveFinalStatus(finalJob);

        await this.updateJobStatus(finalJob, finalStatus, {
          completedAt: new Date().toISOString(),
          events: allEvents,
          progress: finalJob.progress
        });

        const processingTime = Date.now() - startTime;

        logger.info('Job processing completed', {
          jobId,
          finalStatus,
          totalCategories: finalJob.progress.totalCategories,
          completedCategories: finalJob.progress.completedCategories,
          failedCategories: finalJob.progress.failedCategories,
          totalEvents: allEvents.length,
          processingTimeMs: processingTime
        });
      }

    } catch (error) {
      const appError = fromError(error, ErrorCode.JOB_PROCESSING_FAILED);
      
      logger.error('Job processing failed', {
        jobId,
        error: appError,
        processingTimeMs: Date.now() - startTime
      });

      try {
        const job = await this.jobStore.getJob(jobId);
        if (job) {
          await this.updateJobStatus(job, JobStatus.FAILED, {
            completedAt: new Date().toISOString(),
            error: appError.message
          });
        }
      } catch (updateError) {
        logger.error('Failed to update job status after processing error', {
          jobId,
          error: fromError(updateError)
        });
      }
    }
  }

  private async processCategoryWithRetry(
    job: EventSearchJob,
    category: MainCategory
  ): Promise<EventData[]> {
    let retryCount = 0;

    while (retryCount <= this.config.categoryMaxRetries) {
      try {
        await this.updateCategoryState(job, category, {
          state: ProgressState.IN_PROGRESS,
          startedAt: new Date().toISOString(),
          retryCount
        });

        const events = await this.processCategoryWithTimeout(job, category);
        
        return events;

      } catch (error) {
        const appError = fromError(error, ErrorCode.CATEGORY_PROCESSING_FAILED);
        
        if (retryCount < this.config.categoryMaxRetries) {
          logger.warn('Category processing failed, retrying', {
            jobId: job.id,
            category,
            retryCount,
            error: appError
          });

          await this.updateCategoryState(job, category, {
            state: ProgressState.RETRIED,
            retryCount: retryCount + 1,
            error: appError.message
          });

          await this.delay(this.config.retryDelayMs * Math.pow(2, retryCount));
          retryCount++;
        } else {
          logger.error('Category processing failed after all retries', {
            jobId: job.id,
            category,
            retryCount,
            error: appError
          });
          throw appError;
        }
      }
    }

    throw createError(
      ErrorCode.CATEGORY_PROCESSING_FAILED,
      `Category processing failed after ${this.config.categoryMaxRetries + 1} attempts`
    );
  }

  private async processCategoryWithTimeout(
    job: EventSearchJob,
    category: MainCategory
  ): Promise<EventData[]> {
    const abortController = new AbortController();
    
    const timeoutId = setTimeout(() => {
      abortController.abort();
    }, this.config.categoryTimeoutMs);

    try {
      const isLocked = await this.eventCache.isLocked(job.city, job.date, category);
      if (isLocked) {
        throw createError(
          ErrorCode.CATEGORY_PROCESSING_FAILED,
          `Category ${category} is currently being processed by another worker`
        );
      }

      const lockAcquired = await this.eventCache.acquireLock(job.city, job.date, category);
      if (!lockAcquired) {
        throw createError(
          ErrorCode.CATEGORY_PROCESSING_FAILED,
          `Failed to acquire lock for category ${category}`
        );
      }

      try {
        const searchResult = await this.perplexityClient.searchCategory(
          job.city,
          job.date,
          category
        );

        if (!searchResult.success) {
          throw createError(
            ErrorCode.AI_SERVICE_ERROR,
            `AI search failed for category ${category}`,
            { aiError: searchResult.error?.message }
          );
        }

        return searchResult.response.events;

      } finally {
        await this.eventCache.releaseLock(job.city, job.date, category);
      }

    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async updateJobStatus(
    job: EventSearchJob,
    status: JobStatus,
    updates: Partial<EventSearchJob>
  ): Promise<void> {
    await this.jobStore.updateJob(job.id, {
      status,
      ...updates
    });
  }

  private async updateJobProgress(
    job: EventSearchJob,
    updates: Partial<EventSearchJob>
  ): Promise<void> {
    await this.jobStore.updateJob(job.id, updates);
  }

  private async updateCategoryState(
    job: EventSearchJob,
    category: string,
    stateUpdates: Partial<CategoryState>
  ): Promise<void> {
    const currentState = job.progress.categoryStates[category] || {
      state: ProgressState.NOT_STARTED,
      retryCount: 0
    };

    const updatedState: CategoryState = {
      ...currentState,
      ...stateUpdates
    };

    const updatedCategoryStates = {
      ...job.progress.categoryStates,
      [category]: updatedState
    };

    recomputeCounters({
      ...job,
      progress: {
        ...job.progress,
        categoryStates: updatedCategoryStates
      }
    });

    const updatedProgress = {
      ...job.progress,
      categoryStates: updatedCategoryStates,
      completedCategories: Object.values(updatedCategoryStates).filter(s => s.state === ProgressState.COMPLETED).length,
      failedCategories: Object.values(updatedCategoryStates).filter(s => s.state === ProgressState.FAILED).length
    };

    await this.jobStore.updateJob(job.id, {
      progress: updatedProgress
    });

    job.progress = updatedProgress;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getStatus(): {
    config: WorkerConfig;
  } {
    return {
      config: this.config
    };
  }
}