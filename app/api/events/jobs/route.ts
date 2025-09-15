import { NextRequest, NextResponse } from 'next/server';
import { getJobStore } from '../../../../lib/new-backend/redis/jobStore';
import { normalizeCategories } from '../../../../lib/new-backend/categories/normalize';
import { createComponentLogger } from '../../../../lib/new-backend/utils/log';
import { createError, createHttpError, ErrorCode, fromError } from '../../../../lib/new-backend/utils/errors';
import { CreateJobRequestSchema, safeValidate } from '../../../../lib/new-backend/validation/schemas';

const logger = createComponentLogger('JobsAPI');

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  try {
    const body = await request.json();
    const validation = safeValidate(CreateJobRequestSchema, body);
    if (!validation.success) {
      const error = createError(ErrorCode.INVALID_INPUT, 'Invalid request body', { issues: validation.errors });
      return NextResponse.json(createHttpError(400, error), { status: 400 });
    }

    const { city, date, categories, options } = validation.data!;
    const normalizedCategories = normalizeCategories(categories);
    if (normalizedCategories.length === 0) {
      const error = createError(ErrorCode.INVALID_INPUT, 'No valid categories after normalization');
      return NextResponse.json(createHttpError(400, error), { status: 400 });
    }

    const jobStore = getJobStore();
    const result = await jobStore.createJob({
      city,
      date,
      categories: normalizedCategories,
      ttlSeconds: options?.ttlSeconds
    });

    if (result.isNew) {
      triggerProcessingFireAndForget(result.job.id).catch(err => {
        logger.warn('Processing trigger failed (non-fatal)', {
          jobId: result.job.id,
          error: err instanceof Error ? err.message : String(err)
        });
      });
    }

    logger.info('Job create/reuse handled', {
      jobId: result.job.id,
      isNew: result.isNew,
      status: result.job.status,
      ms: Date.now() - startTime
    });

    return NextResponse.json({
      success: true,
      data: {
        job: result.job,
        isNew: result.isNew,
        isStale: result.isStale ?? false
      }
    }, {
      status: result.isNew ? 201 : 200,
      headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
    });
  } catch (error) {
    const appError = fromError(error);
    logger.error('Job creation failed', { error: appError });
    return NextResponse.json(createHttpError(500, appError), { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const includeStats = searchParams.get('stats') === 'true';
  if (!includeStats) {
    const error = createError(ErrorCode.INVALID_INPUT, 'This endpoint only supports stats=true parameter');
    return NextResponse.json(createHttpError(400, error), { status: 400 });
  }
  try {
    const jobStore = getJobStore();
    const queueLength = await jobStore.getQueueLength();
    return NextResponse.json({ success: true, data: { queueLength, timestamp: new Date().toISOString() } });
  } catch (error) {
    const appError = fromError(error);
    return NextResponse.json(createHttpError(500, appError), { status: 500 });
  }
}

async function triggerProcessingFireAndForget(sourceJobId: string) {
  const base = process.env.NEXT_PUBLIC_BASE_URL || '';
  const url = `${base}/api/events/process`;
  try {
    await fetch(url, { method: 'POST' });
    logger.info('Triggered batch processing', { sourceJobId, url });
  } catch (e) {
    logger.warn('Failed to trigger batch processing', {
      sourceJobId,
      error: e instanceof Error ? e.message : String(e)
    });
  }
}
