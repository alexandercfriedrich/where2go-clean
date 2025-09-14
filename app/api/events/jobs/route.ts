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

    // If job is new, trigger background processing directly
    if (result.isNew) {
      try {
        // In serverless environment, trigger processing directly via HTTP call
        // instead of relying on a queue worker that doesn't exist
        await triggerBackgroundProcessing(result.job.id, {
          city: result.job.city,
          date: result.job.date,
          categories: result.job.categories
        }, request);
        
        // Mark job as RUNNING after successful trigger
        await jobStore.updateJob(result.job.id, {
          status: JobStatus.RUNNING,
          startedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        
        logger.info('Background processing triggered and job marked as RUNNING', { jobId: result.job.id });
      } catch (triggerError) {
        logger.error('Failed to trigger background processing', {
          jobId: result.job.id,
          error: fromError(triggerError)
        });
        
        // Mark job as FAILED if triggering fails
        await jobStore.updateJob(result.job.id, {
          status: JobStatus.FAILED,
          error: `Background processing trigger failed: ${triggerError instanceof Error ? triggerError.message : 'Unknown error'}`,
          updatedAt: new Date().toISOString()
        });
        
        // Update the result to reflect the failed status so frontend stops polling
        result.job.status = JobStatus.FAILED;
        result.job.error = `Background processing trigger failed: ${triggerError instanceof Error ? triggerError.message : 'Unknown error'}`;
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
/**
 * Trigger background processing for a job in serverless environment.
 * Makes an HTTP call to the process endpoint instead of relying on a queue worker.
 * Enhanced with better host detection, secret validation, and error logging.
 */
async function triggerBackgroundProcessing(
  jobId: string, 
  jobData: { city: string; date: string; categories: string[] },
  request: NextRequest
): Promise<void> {
  // Validate INTERNAL_API_SECRET is set
  const internalSecret = process.env.INTERNAL_API_SECRET;
  if (!internalSecret) {
    throw createError(
      ErrorCode.CONFIG_ERROR,
      'INTERNAL_API_SECRET environment variable is required for background processing',
      { 
        jobId,
        suggestion: 'Set INTERNAL_API_SECRET in environment variables' 
      }
    );
  }

  // Use request origin for production custom domain, fallback for development
  let baseUrl: string;
  
  if (process.env.NODE_ENV === 'production') {
    // Production: Use request origin if available (custom domain)
    if (request.nextUrl.origin) {
      baseUrl = request.nextUrl.origin;
    } else {
      // Fallback to environment variables
      const host = process.env.VERCEL_PROJECT_PRODUCTION_URL || 
                   process.env.VERCEL_URL || 
                   process.env.NEXT_PUBLIC_APP_URL;
      
      if (!host) {
        throw createError(
          ErrorCode.CONFIG_ERROR,
          'No production host found for background processing',
          { 
            jobId,
            availableVars: Object.keys(process.env).filter(k => k.includes('URL') || k.includes('HOST')),
            suggestion: 'Set VERCEL_PROJECT_PRODUCTION_URL or NEXT_PUBLIC_APP_URL'
          }
        );
      }
      
      baseUrl = host.startsWith('http') ? host : `https://${host}`;
    }
  } else {
    // Development: Use localhost with port 3000 (standard Next.js dev port)
    baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  }
  
  const processUrl = `${baseUrl}/api/events/process`;
  
  logger.info("Triggering background processing", {
    jobId,
    environment: process.env.NODE_ENV,
    processUrl: processUrl.replace(/\/\/[^\/]+/, "//[host]"), // Hide actual host in logs
    city: jobData.city,
    date: jobData.date,
    categoryCount: jobData.categories.length,
    hasSecret: !!internalSecret
  });

  try {
    const response = await fetch(processUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": internalSecret,
        "x-internal-call": "true",
        "User-Agent": "where2go-jobs-trigger/1.0"
      },
      body: JSON.stringify({
        jobId,
        city: jobData.city,
        date: jobData.date,
        categories: jobData.categories
      }),
      // Add timeout to prevent hanging
      signal: AbortSignal.timeout(30000) // 30 second timeout
    });

    if (!response.ok) {
      // Enhanced error handling with response body logging
      let errorText = "Unknown error";
      let errorJson = null;
      
      try {
        const responseText = await response.text();
        errorText = responseText;
        
        // Try to parse as JSON for structured error info
        if (responseText.startsWith('{')) {
          errorJson = JSON.parse(responseText);
        }
      } catch (parseError) {
        logger.warn("Failed to parse error response", { parseError: fromError(parseError) });
      }

      logger.error("Background processing trigger failed", {
        jobId,
        httpStatus: response.status,
        statusText: response.statusText,
        responseHeaders: {},
        responseBody: errorText,
        errorJson,
        processUrl: processUrl.replace(/\/\/[^\/]+/, "//[host]")
      });

      throw createError(
        ErrorCode.BACKGROUND_PROCESSING_FAILED,
        `Background processing trigger failed: ${response.status} ${response.statusText}`,
        { 
          httpStatus: response.status,
          statusText: response.statusText,
          responseBody: errorText,
          responseHeaders: {},
          jobId,
          processUrl: processUrl.replace(/\/\/[^\/]+/, "//[host]")
        }
      );
    }

    // Log successful response
    let responseText = "";
    try {
      responseText = await response.text();
      if (responseText) {
        logger.debug("Background processing response", { 
          jobId, 
          responseBody: responseText.substring(0, 500) // Truncate long responses
        });
      }
    } catch (readError) {
      logger.debug("Background processing triggered successfully (no response body)", { jobId });
    }

    logger.info("Background processing triggered successfully", { 
      jobId,
      responseStatus: response.status,
      hasResponseBody: !!responseText
    });

  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw createError(
        ErrorCode.BACKGROUND_PROCESSING_FAILED,
        'Background processing trigger timed out',
        { 
          jobId,
          timeout: '30 seconds',
          processUrl: processUrl.replace(/\/\/[^\/]+/, "//[host]")
        }
      );
    }
    
    // Re-throw AppError instances as-is, wrap other errors
    if (error && typeof error === 'object' && 'code' in error) {
      throw error;
    }
    
    throw createError(
      ErrorCode.BACKGROUND_PROCESSING_FAILED,
      `Background processing trigger failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { 
        jobId,
        originalError: fromError(error),
        processUrl: processUrl.replace(/\/\/[^\/]+/, "//[host]")
      }
    );
  }
}
