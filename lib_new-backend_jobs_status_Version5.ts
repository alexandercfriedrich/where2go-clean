/**
 * Centralized status derivation & counter recomputation.
 */
import { EventSearchJob, JobStatus, ProgressState } from '../types/jobs';

export function recomputeCounters(job: EventSearchJob) {
  const states = Object.values(job.progress.categoryStates);
  job.progress.completedCategories = states.filter(s => s.state === ProgressState.COMPLETED).length;
  job.progress.failedCategories = states.filter(s => s.state === ProgressState.FAILED).length;
}

export function deriveFinalStatus(job: EventSearchJob): JobStatus {
  const states = Object.values(job.progress.categoryStates);
  if (states.length === 0) return JobStatus.FAILED;

  const total = states.length;
  const completed = states.filter(s => s.state === ProgressState.COMPLETED).length;
  const failed = states.filter(s => s.state === ProgressState.FAILED).length;
  const active = states.some(s => s.state === ProgressState.IN_PROGRESS || s.state === ProgressState.RETRIED);

  if (active) return job.status; // not yet final

  const eventCount = job.events?.length ?? 0;

  if (completed === total && eventCount === 0) return JobStatus.EMPTY;
  if (completed === total && eventCount > 0) return JobStatus.SUCCESS;
  if (completed > 0 && failed > 0) return JobStatus.PARTIAL_SUCCESS;
  if (failed === total) return JobStatus.FAILED;

  // Fallback: treat ambiguous as FAILED.
  return JobStatus.FAILED;
}