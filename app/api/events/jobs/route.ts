/**
 * API endpoint for creating and managing event search jobs.
 * POST /api/events/jobs - Create new job or return existing if signature matches.
 * 
 * @fileoverview Job creation endpoint with deterministic job creation via signature hashing.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getJobStore } from '../../../../lib/new-backend/redis/jobStore';
import { normalizeCategories } from '../../../../lib/new-backend/categories/normalize';
import { createComponentLogger } from '../../../../lib/new-backend/utils/log';
import { createError, createHttpError, ErrorCode, fromError } from '../../../../lib/new-backend/utils/errors';
import { 
  CreateJobRequestSchema, 
  safeValidate 
} from '../../../../lib/new-backend/validation/schemas';
import { JobStatus } from '../../../../lib/new-backend/types/jobs';

const logger = createComponentLogger('JobsAPI');

/**
 * Create a new event search job or return existing job with matching signature.
 * 
 * Request body:
 * {
 *   "city": "Berlin",
 *   "date": "2024-01-15",
 *   "categories": ["DJ Sets/Electronic", "Clubs/Discos"],
 *   "options": {
 *     "ttlSeconds": 3600
 *   }
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "job": { ... },
 *     "isNew": true,
 *     "isStale": false
 *   }
 * }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  
  try {
    logger.info('Job creation request received');

    // Parse and validate request body
    const body = await request.json();
    const validation = safeValidate(CreateJobRequestSchema, body, 'request body');

    if (!validation.success) {
      const error = createError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid request data',
        { errors: validation.errors }
      );

      logger.warn('Job creation request validation failed', {
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

    const validatedData = validation.data!;
    
    // Normalize categories for consistent processing
    const normalizedCategories = normalizeCategories(validatedData.categories);
    
    if (normalizedCategories.length === 0) {
      const error = createError(
        ErrorCode.VALIDATION_ERROR,
        'No valid categories provided after normalization',
        { originalCategories: validatedData.categories }
      );

      logger.warn('No valid categories after normalization', {
        originalCategories: validatedData.categories,
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

    // Create job with normalized categories
    const jobStore = getJobStore();
    const result = await jobStore.createJob({
      city: validatedData.city,
      date: validatedData.date,
      categories: normalizedCategories,
      ttlSeconds: validatedData.options?.ttlSeconds
    });

    logger.info('Job creation completed', {
      jobId: result.job.id,
      isNew: result.isNew,
      isStale: result.isStale,
      city: result.job.city,
      date: result.job.date,
      categoryCount: result.job.categories.length,
      signature: result.job.signature.substring(0, 8) + '...',
      responseTime: Date.now() - startTime
    });

    // If job is new, enqueue it for processing
    if (result.isNew) {
      try {
        await jobStore.enqueueJob(result.job.id);
        logger.info('Job enqueued for processing', { jobId: result.job.id });
      } catch (enqueueError) {
        logger.error('Failed to enqueue job for processing', {
          jobId: result.job.id,
          error: fromError(enqueueError)
        });
        // Don't fail the request if enqueuing fails
        // The job can still be processed manually or by retry
      }
    }

    // Return successful response
    return NextResponse.json(
      {
        success: true,
        data: result
      },
      {
        status: result.isNew ? 201 : 200,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'X-Job-Id': result.job.id,
          'X-Job-Status': result.job.status,
          'X-Is-New': result.isNew.toString()
        }
      }
    );

  } catch (error) {
    const appError = fromError(error, ErrorCode.JOB_CREATION_FAILED);
    
    // Special handling for configuration errors
    if (appError.code === ErrorCode.CONFIG_ERROR) {
      logger.error('Job creation failed due to configuration error', {
        error: appError,
        environment: process.env.NODE_ENV || 'development',
        responseTime: Date.now() - startTime
      });

      return NextResponse.json(
        {
          status: 503,
          error: {
            code: appError.code,
            message: 'Service temporarily unavailable - Redis not configured',
            details: appError.message,
            context: appError.context,
            suggestion: process.env.NODE_ENV === 'production' 
              ? 'Please contact system administrator - Redis configuration missing'
              : 'For development: Set up Redis configuration in .env.local file'
          }
        },
        { 
          status: 503,
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            'Retry-After': '300' // Suggest retry after 5 minutes
          }
        }
      );
    }
    
    logger.error('Job creation failed', {
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
 * Get job queue statistics.
 * GET /api/events/jobs?stats=true
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const searchParams = request.nextUrl.searchParams;
  const includeStats = searchParams.get('stats') === 'true';

  if (!includeStats) {
    const error = createError(
      ErrorCode.INVALID_INPUT,
      'This endpoint only supports stats=true parameter'
    );

    return NextResponse.json(
      createHttpError(400, error),
      { 
        status: 400,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      }
    );
  }

  try {
    logger.debug('Job queue stats request received');

    const jobStore = getJobStore();
    const queueLength = await jobStore.getQueueLength();

    const stats = {
      queueLength,
      timestamp: new Date().toISOString()
    };

    logger.debug('Job queue stats retrieved', stats);

    return NextResponse.json(
      {
        success: true,
        data: stats
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    );

  } catch (error) {
    const appError = fromError(error, ErrorCode.REDIS_OPERATION_FAILED);
    
    logger.error('Failed to get job queue stats', { error: appError });

    return NextResponse.json(
      createHttpError(500, appError),
      { 
        status: 500,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      }
    );
  }
}