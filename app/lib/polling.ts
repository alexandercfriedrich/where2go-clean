import { EventData, JobStatus } from './types';

export type JobStatusResponse = JobStatus & { jobId?: string };

/**
 * Normalizes potential legacy jobId → id while preserving the JobStatus shape.
 */
export function normalizeJobStatusId(status: JobStatusResponse): JobStatus {
  const id = status.id || status.jobId || '';
  const { jobId, ...rest } = status;
  return { ...rest, id };
}
