/**
 * Background worker for processing event search jobs.
 * This worker runs as a separate Node.js process and processes jobs serially.
 * 
 * @fileoverview Serial job processor with timeout, retry, and partial success handling.
 */

import { getJobStore } from '../lib/new-backend/redis/jobStore';
import { getEventCache } from '../lib/new-backend/redis/eventCache';
import { getPerplexityClient } from '../lib/new-backend/services/perplexityClient';
import { normalizeCategories } from '../lib/new-backend/categories/normalize';
import { createComponentLogger } from '../lib/new-backend/utils/log';
import { createError, ErrorCode, fromError } from '../lib/new-backend/utils/errors';
import { 
  JobStatus, 
  ProgressState, 
  type EventSearchJob, 
  type CategoryState 
} from '../lib/new-backend/types/jobs';
import { type EventData } from '../lib/new-backend/types/events';
import { type MainCategory } from '../lib/new-backend/categories/categoryMap';

const logger = createComponentLogger('EventsWorker');

/**
 * Worker configuration.
 */
interface WorkerConfig {
  /** How long to wait for jobs from queue (seconds) */
  queueTimeoutSeconds: number;
  
  /** Timeout for processing a single category (milliseconds) */
  categoryTimeoutMs: number;
  
  /** Maximum retries per category */
  categoryMaxRetries: number;
  
  /** Delay between retries (milliseconds) */
  retryDelayMs: number;
  
  /** Default cache TTL for events (seconds) */
  defaultCacheTtlSeconds: number;
  
  /** Whether worker should keep running */
  keepRunning: boolean;
}

/**
 * Default worker configuration.
 */
const DEFAULT_CONFIG: WorkerConfig = {
  queueTimeoutSeconds: 10,
  categoryTimeoutMs: 25000, // 25 seconds
  categoryMaxRetries: 2,
  retryDelayMs: 1000,
  defaultCacheTtlSeconds: 3600, // 1 hour
  keepRunning: true
};

/**
 * Background worker for processing event search jobs.
 */
export class NewEventsWorker {
  private config: WorkerConfig;
  private jobStore = getJobStore();
  private eventCache = getEventCache();
  private perplexityClient = getPerplexityClient();
  private isRunning = false;
  private shouldStop = false;

  constructor(config: Partial<WorkerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    logger.info('New events worker initialized', {
      queueTimeoutSeconds: this.config.queueTimeoutSeconds,
      categoryTimeoutMs: this.config.categoryTimeoutMs,
      categoryMaxRetries: this.config.categoryMaxRetries
    });
  }

  /**
   * Start the worker loop.
   * Continuously processes jobs from the queue.
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Worker is already running');
      return;
    }

    this.isRunning = true;
    this.shouldStop = false;

    logger.info('Starting new events worker');

    try {
      while (this.config.keepRunning && !this.shouldStop) {
        try {
          // Get next job from queue (blocking)
          const jobId = await this.jobStore.dequeueJob(this.config.queueTimeoutSeconds);
          
          if (!jobId) {
            // No job available, continue loop
            continue;
          }

          logger.info('Processing job from queue', { jobId });
          
          // Process the job
          await this.processJob(jobId);

        } catch (error) {
          const appError = fromError(error, ErrorCode.JOB_PROCESSING_FAILED);
          logger.error('Error in worker loop', { error: appError });
          
          // Continue processing other jobs
          await this.delay(1000);
        }
      }

    } finally {
      this.isRunning = false;
      logger.info('New events worker stopped');
    }
  }

  /**
   * Stop the worker gracefully.
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      logger.warn('Worker is not running');
      return;
    }

    logger.info('Stopping new events worker');
    this.shouldStop = true;

    // Wait for current job to complete (with timeout)
    let attempts = 0;
    while (this.isRunning && attempts < 30) {
      await this.delay(1000);
      attempts++;
    }

    if (this.isRunning) {
      logger.warn('Worker did not stop gracefully within 30 seconds');
    }
  }

  /**
   * Process a single job.
   * Handles job state transitions and partial success scenarios.
   */
  async processJob(jobId: string): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Get job details
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

      // Update job to running status
      await this.updateJobStatus(job, JobStatus.RUNNING, {
        startedAt: new Date().toISOString()
      });

      // Normalize categories
      const normalizedCategories = normalizeCategories(job.categories);
      
      // Check cache for existing events
      const cacheResult = await this.eventCache.getEventsForCategories(
        job.city,
        job.date,
        normalizedCategories
      );

      // Start with cached events
      let allEvents = Object.values(cacheResult.cachedEvents).flat();
      let completedCategories = 0;
      let failedCategories = 0;

      // Update progress with cached categories
      for (const category of Object.keys(cacheResult.cachedEvents)) {
        await this.updateCategoryState(job, category, {
          state: ProgressState.COMPLETED,
          completedAt: new Date().toISOString(),
          eventCount: cacheResult.cachedEvents[category].length
        });
        completedCategories++;
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
            // Cache the events
            await this.eventCache.cacheEvents(
              job.city,
              job.date,
              category,
              categoryEvents,
              this.config.defaultCacheTtlSeconds
            );

            // Add to all events
            allEvents.push(...categoryEvents);
            completedCategories++;

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
            // Category processed but no events found
            completedCategories++;
            
            await this.updateCategoryState(job, category, {
              state: ProgressState.COMPLETED,
              completedAt: new Date().toISOString(),
              eventCount: 0
            });

            logger.info('Category processed with no events', {
              jobId,
              category
            });
          }

        } catch (error) {
          const appError = fromError(error, ErrorCode.CATEGORY_PROCESSING_FAILED);
          failedCategories++;

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

        // Update job progress
        await this.updateJobProgress(job, {
          events: allEvents,
          progress: {
            ...job.progress,
            completedCategories,
            failedCategories
          }
        });
      }

      // Determine final job status
      const totalCategories = normalizedCategories.length;
      let finalStatus: JobStatus;
      
      if (completedCategories === totalCategories) {
        finalStatus = JobStatus.SUCCESS;
      } else if (completedCategories > 0) {
        finalStatus = JobStatus.PARTIAL_SUCCESS;
      } else {
        finalStatus = JobStatus.FAILED;
      }

      // Update final job status
      await this.updateJobStatus(job, finalStatus, {
        completedAt: new Date().toISOString(),
        events: allEvents,
        progress: {
          ...job.progress,
          completedCategories,
          failedCategories
        }
      });

      const processingTime = Date.now() - startTime;

      logger.info('Job processing completed', {
        jobId,
        finalStatus,
        totalCategories,
        completedCategories,
        failedCategories,
        totalEvents: allEvents.length,
        processingTimeMs: processingTime
      });

    } catch (error) {
      const appError = fromError(error, ErrorCode.JOB_PROCESSING_FAILED);
      
      logger.error('Job processing failed', {
        jobId,
        error: appError,
        processingTimeMs: Date.now() - startTime
      });

      // Update job to failed status
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

  /**
   * Process a category with retry logic and timeout.
   */
  private async processCategoryWithRetry(
    job: EventSearchJob,
    category: MainCategory
  ): Promise<EventData[]> {
    let retryCount = 0;

    while (retryCount <= this.config.categoryMaxRetries) {
      try {
        // Update category state to in progress
        await this.updateCategoryState(job, category, {
          state: ProgressState.IN_PROGRESS,
          startedAt: new Date().toISOString(),
          retryCount
        });

        // Process with timeout
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

          // Update category state for retry
          await this.updateCategoryState(job, category, {
            state: ProgressState.RETRIED,
            retryCount: retryCount + 1,
            error: appError.message
          });

          // Wait before retry with exponential backoff
          await this.delay(this.config.retryDelayMs * Math.pow(2, retryCount));
          retryCount++;
        } else {
          // All retries exhausted
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

    // Should never reach here
    throw createError(
      ErrorCode.CATEGORY_PROCESSING_FAILED,
      `Category processing failed after ${this.config.categoryMaxRetries + 1} attempts`
    );
  }

  /**
   * Process a category with timeout using AbortController.
   */
  private async processCategoryWithTimeout(
    job: EventSearchJob,
    category: MainCategory
  ): Promise<EventData[]> {
    const abortController = new AbortController();
    
    // Set timeout
    const timeoutId = setTimeout(() => {
      abortController.abort();
    }, this.config.categoryTimeoutMs);

    try {
      // Check for lock
      const isLocked = await this.eventCache.isLocked(job.city, job.date, category);
      if (isLocked) {
        throw createError(
          ErrorCode.CATEGORY_PROCESSING_FAILED,
          `Category ${category} is currently being processed by another worker`
        );
      }

      // Acquire lock
      const lockAcquired = await this.eventCache.acquireLock(job.city, job.date, category);
      if (!lockAcquired) {
        throw createError(
          ErrorCode.CATEGORY_PROCESSING_FAILED,
          `Failed to acquire lock for category ${category}`
        );
      }

      try {
        // Search for events using AI
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
        // Always release lock
        await this.eventCache.releaseLock(job.city, job.date, category);
      }

    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Update job status and metadata.
   */
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

  /**
   * Update job progress without changing status.
   */
  private async updateJobProgress(
    job: EventSearchJob,
    updates: Partial<EventSearchJob>
  ): Promise<void> {
    await this.jobStore.updateJob(job.id, updates);
  }

  /**
   * Update category state within job progress.
   */
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

    const updatedProgress = {
      ...job.progress,
      categoryStates: {
        ...job.progress.categoryStates,
        [category]: updatedState
      }
    };

    await this.jobStore.updateJob(job.id, {
      progress: updatedProgress
    });
  }

  /**
   * Delay execution for specified milliseconds.
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get worker status.
   */
  getStatus(): {
    isRunning: boolean;
    shouldStop: boolean;
    config: WorkerConfig;
  } {
    return {
      isRunning: this.isRunning,
      shouldStop: this.shouldStop,
      config: this.config
    };
  }
}

/**
 * Main entry point for running the worker as a standalone process.
 */
async function main() {
  const worker = new NewEventsWorker();
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    logger.info('Received SIGINT, stopping worker');
    await worker.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM, stopping worker');
    await worker.stop();
    process.exit(0);
  });

  // Start worker
  try {
    await worker.start();
  } catch (error) {
    logger.error('Worker crashed', { error: fromError(error) });
    process.exit(1);
  }
}

// Run main if this file is executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('Failed to start worker:', error);
    process.exit(1);
  });
}