import { NextRequest, NextResponse } from 'next/server';
import { processPendingJobsOnce } from '../../../../worker/process-once';

export const runtime = 'nodejs';

export async function POST(_req: NextRequest) {
  const started = Date.now();
  try {
    const result = await processPendingJobsOnce({
      maxJobsPerRun: Number(process.env.WORKER_MAX_JOBS ?? 8),
      maxRunMs: Number(process.env.WORKER_MAX_MS ?? 480000)
    });
    return NextResponse.json({ ok: true, ...result, ms: Date.now() - started });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'processing_failed' }, { status: 500 });
  }
}

