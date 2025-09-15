/**
 * API endpoint for retrieving job status and events.
 * GET /api/events/jobs/[jobId] - Get job status with optional events aggregation.
 * 
 * @fileoverview Job status endpoint with events aggregation and progress tracking.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getJobStore } from '../../../../../lib/new-backend/redis/jobStore';
import { getEventCache } from '../../../../../lib/new-backend/redis/eventCache';
import { createComponentLogger } from '../../../../../lib/new-backend/utils/log';
import { createError, createHttpError, ErrorCode, fromError } from '../../../../../lib/new-backend/utils/errors';
import { JobIdSchema, safeValidate } from '../../../../../lib/new-backend/validation/schemas';
import { JobStatus } from '../../../../../lib/new-backend/types/jobs';
import { type EventData } from '../../../../../lib/new-backend/types/events';

const logger = createComponentLogger('JobStatusAPI');

/**
 * Get job status and optionally aggregate events from cache.
 * 
 * Query parameters:
 * - includeEvents: boolean - Whether to include events in response (default: true)
 * - aggregateFromCache: boolean - Whether to aggregate events from cache (default: false)
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "job": { ... },
 *     "events": [ ... ],  // If includeEvents=true
 *     "cacheInfo": { ... } // If aggregateFromCache=true
 *   }
 * }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
): Promise<NextResponse> {
  const startTime = Date.now();
  
  try {
    const jobId = params.jobId;
    
    // Validate job ID format
    const validation = safeValidate(JobIdSchema, jobId, 'jobId parameter');
    
    if (!validation.success) {
      const error = createError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid job ID format',
        { jobId, errors: validation.errors }
      );

      logger.warn('Job status request with invalid job ID', {
        jobId,
        errors: validation.errors,
        responseTime: Date.now() - startTime
      });

      return NextResponse.json(
        createHttpError(400, error),
        { 
          status: 400,
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        }
      );
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const includeEvents = searchParams.get('includeEvents') !== 'false'; // Default true
    const aggregateFromCache = searchParams.get('aggregateFromCache') === 'true'; // Default false

    logger.info('Job status request received', {
      jobId,
      includeEvents,
      aggregateFromCache
    });

    // Get job from store
    const jobStore = getJobStore();
    const job = await jobStore.getJob(jobId);

    if (!job) {
      const error = createError(
        ErrorCode.JOB_NOT_FOUND,
        `Job not found: ${jobId}`,
        { jobId }
      );

      logger.warn('Job not found', {
        jobId,
        responseTime: Date.now() - startTime
      });

      return NextResponse.json(
        createHttpError(404, error),
        { 
          status: 404,
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        }
      );
    }

    // Prepare response data
    const responseData: any = { job };

    // Include events if requested
    if (includeEvents) {
      let events = job.events || [];
      let cacheInfo: any = undefined;

      // Aggregate events from cache if requested and job doesn't have events yet
      if (aggregateFromCache && (events.length === 0 || job.status === JobStatus.RUNNING)) {
        try {
          const eventCache = getEventCache();
          const cacheResult = await eventCache.getEventsForCategories(
            job.city,
            job.date,
            job.categories
          );

          const cachedEvents = Object.values(cacheResult.cachedEvents).flat();
          
          // Use cached events if we have more than job events, or if job has no events
          if (cachedEvents.length > events.length) {
            events = cachedEvents;
          }

          // Provide cache information
          cacheInfo = {
            totalCachedEvents: cachedEvents.length,
            cachedCategories: Object.keys(cacheResult.cachedEvents),
            missingCategories: cacheResult.missingCategories,
            cacheMetadata: cacheResult.cacheMetadata,
            usedCachedEvents: cachedEvents.length > 0
          };

          logger.debug('Aggregated events from cache', {
            jobId,
            jobEventCount: job.events?.length || 0,
            cachedEventCount: cachedEvents.length,
            finalEventCount: events.length,
            usedCachedEvents: cacheInfo.usedCachedEvents
          });

        } catch (cacheError) {
          logger.error('Failed to aggregate events from cache', {
            jobId,
            error: fromError(cacheError)
          });
          // Continue with job events only
        }
      }

      responseData.events = events;
      if (cacheInfo) {
        responseData.cacheInfo = cacheInfo;
      }
    }

    // Add response metadata
    responseData.metadata = {
      retrievedAt: new Date().toISOString(),
      responseTime: Date.now() - startTime,
      includeEvents,
      aggregateFromCache
    };

    logger.info('Job status request completed', {
      jobId,
      status: job.status,
      eventCount: responseData.events?.length || 0,
      includeEvents,
      aggregateFromCache,
      responseTime: Date.now() - startTime
    });

    // Determine cache headers based on job status
    const isTerminal = [
      JobStatus.SUCCESS,
      JobStatus.EMPTY,
      JobStatus.PARTIAL_SUCCESS,
      JobStatus.FAILED,
      JobStatus.CANCELLED
    ].includes(job.status);

    // Build headers object with proper typing
    const headers: Record<string, string> = {
      'X-Job-Id': job.id,
      'X-Job-Status': job.status,
      'X-Event-Count': (responseData.events?.length || 0).toString(),
      'X-Is-Terminal': isTerminal.toString()
    };

    if (isTerminal) {
      headers['Cache-Control'] = 'private, max-age=300'; // Cache completed jobs for 5 minutes
      headers['ETag'] = `"${job.id}-${job.updatedAt}"`;
    } else {
      headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
      headers['Pragma'] = 'no-cache';
      headers['Expires'] = '0';
    }

    return NextResponse.json(
      {
        success: true,
        data: responseData
      },
      {
        status: 200,
        headers
      }
    );

  } catch (error) {
    const appError = fromError(error, ErrorCode.INTERNAL_ERROR);
    
    logger.error('Job status request failed', {
      jobId: params.jobId,
      error: appError,
      responseTime: Date.now() - startTime
    });

    return NextResponse.json(
      createHttpError(500, appError),
      { 
        status: 500,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    );
  }
}

/**
 * Cancel a running job.
 * DELETE /api/events/jobs/[jobId]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { jobId: string } }
): Promise<NextResponse> {
  const startTime = Date.now();
  
  try {
    const jobId = params.jobId;
    
    // Validate job ID format
    const validation = safeValidate(JobIdSchema, jobId, 'jobId parameter');
    
    if (!validation.success) {
      const error = createError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid job ID format',
        { jobId, errors: validation.errors }
      );

      return NextResponse.json(
        createHttpError(400, error),
        { status: 400 }
      );
    }

    logger.info('Job cancellation request received', { jobId });

    // Get job from store
    const jobStore = getJobStore();
    const job = await jobStore.getJob(jobId);

    if (!job) {
      const error = createError(
        ErrorCode.JOB_NOT_FOUND,
        `Job not found: ${jobId}`,
        { jobId }
      );

      return NextResponse.json(
        createHttpError(404, error),
        { status: 404 }
      );
    }

    // Check if job can be cancelled
    const cancellableStatuses = [JobStatus.PENDING, JobStatus.RUNNING];
    
    if (!cancellableStatuses.includes(job.status)) {
      const error = createError(
        ErrorCode.JOB_PROCESSING_FAILED,
        `Job cannot be cancelled in status: ${job.status}`,
        { jobId, currentStatus: job.status }
      );

      logger.warn('Attempted to cancel non-cancellable job', {
        jobId,
        currentStatus: job.status
      });

      return NextResponse.json(
        createHttpError(409, error),
        { status: 409 }
      );
    }

    // Update job status to cancelled
    await jobStore.updateJob(jobId, {
      status: JobStatus.CANCELLED,
      completedAt: new Date().toISOString(),
      error: 'Job cancelled by user request'
    });

    logger.info('Job cancelled successfully', {
      jobId,
      previousStatus: job.status,
      responseTime: Date.now() - startTime
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          jobId,
          previousStatus: job.status,
          newStatus: JobStatus.CANCELLED,
          cancelledAt: new Date().toISOString()
        }
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'X-Job-Id': jobId,
          'X-Job-Status': JobStatus.CANCELLED
        }
      }
    );

  } catch (error) {
    const appError = fromError(error, ErrorCode.JOB_PROCESSING_FAILED);
    
    logger.error('Job cancellation failed', {
      jobId: params.jobId,
      error: appError,
      responseTime: Date.now() - startTime
    });

    return NextResponse.json(
      createHttpError(500, appError),
      { status: 500 }
    );
  }
}
