import { EventSearchJob, JobStatus } from '../types/jobs';

export interface IntegrityInfo {
  mismatchCompleted: boolean;
  mismatchFailed: boolean;
  countedCompleted: number;
  countedFailed: number;
  expectedCompleted: number;
  expectedFailed: number;
  finalStatus: JobStatus;
  needsRepair: boolean;
}

/**
 * Builds integrity information for a job by analyzing its progress and category states.
 * Detects mismatches between aggregated counters and actual category states.
 */
export function buildIntegrityInfo(job: EventSearchJob): IntegrityInfo {
  const { progress } = job;
  const { categoryStates, totalCategories, completedCategories, failedCategories } = progress;

  // Count actual states from categoryStates
  let actualCompleted = 0;
  let actualFailed = 0;

  for (const [, state] of Object.entries(categoryStates)) {
    if (state.state === 'completed') {
      actualCompleted++;
    } else if (state.state === 'failed') {
      actualFailed++;
    }
  }

  // Detect mismatches
  const mismatchCompleted = actualCompleted !== completedCategories;
  const mismatchFailed = actualFailed !== failedCategories;

  // Determine final status based on actual counts
  let finalStatus: JobStatus;
  if (actualCompleted === totalCategories) {
    finalStatus = JobStatus.SUCCESS;
  } else if (actualCompleted > 0) {
    finalStatus = JobStatus.PARTIAL_SUCCESS;
  } else if (actualFailed === totalCategories) {
    finalStatus = JobStatus.FAILED;
  } else {
    // Some categories might still be in progress or not started
    finalStatus = job.status; // Keep current status
  }

  const needsRepair = mismatchCompleted || mismatchFailed || finalStatus !== job.status;

  return {
    mismatchCompleted,
    mismatchFailed,
    countedCompleted: actualCompleted,
    countedFailed: actualFailed,
    expectedCompleted: completedCategories,
    expectedFailed: failedCategories,
    finalStatus,
    needsRepair
  };
}

/**
 * Repairs job progress by recalculating counters from category states
 * and updating the job status accordingly.
 */
export function repairJobProgress(job: EventSearchJob): Partial<EventSearchJob> {
  const integrity = buildIntegrityInfo(job);
  
  if (!integrity.needsRepair) {
    return {}; // No repair needed
  }

  return {
    status: integrity.finalStatus,
    progress: {
      ...job.progress,
      completedCategories: integrity.countedCompleted,
      failedCategories: integrity.countedFailed
    },
    updatedAt: new Date().toISOString()
  };
}