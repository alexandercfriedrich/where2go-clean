import { describe, it, expect } from 'vitest';
import { deriveFinalStatus } from '../../../lib/new-backend/jobs/status';
import { JobStatus, ProgressState, type EventSearchJob } from '../../../lib/new-backend/types/jobs';

describe('deriveFinalStatus', () => {
  const createTestJob = (overrides: Partial<EventSearchJob> = {}): EventSearchJob => ({
    id: 'test-job',
    signature: 'test-sig',
    status: JobStatus.RUNNING,
    city: 'Berlin',
    date: '2024-01-15',
    categories: ['Music', 'Theater'],
    events: [],
    progress: {
      totalCategories: 2,
      completedCategories: 0,
      failedCategories: 0,
      categoryStates: {}
    },
    createdAt: '2024-01-15T10:00:00.000Z',
    updatedAt: '2024-01-15T10:00:00.000Z',
    ttlSeconds: 3600,
    ...overrides
  });

  it('should return EMPTY when all categories completed with zero events', () => {
    const job = createTestJob({
      events: [], // Zero events
      progress: {
        totalCategories: 2,
        completedCategories: 2,
        failedCategories: 0,
        categoryStates: {
          'Music': {
            state: ProgressState.COMPLETED,
            retryCount: 0,
            eventCount: 0,
            completedAt: '2024-01-15T10:05:00.000Z'
          },
          'Theater': {
            state: ProgressState.COMPLETED,
            retryCount: 0,
            eventCount: 0,
            completedAt: '2024-01-15T10:06:00.000Z'
          }
        }
      }
    });

    const status = deriveFinalStatus(job);
    expect(status).toBe(JobStatus.EMPTY);
  });

  it('should return SUCCESS when all categories completed with events', () => {
    const job = createTestJob({
      events: [{ id: '1', title: 'Test Event', venue: 'Test Venue', date: '2024-01-15' }], // Has events
      progress: {
        totalCategories: 2,
        completedCategories: 2,
        failedCategories: 0,
        categoryStates: {
          'Music': {
            state: ProgressState.COMPLETED,
            retryCount: 0,
            eventCount: 1,
            completedAt: '2024-01-15T10:05:00.000Z'
          },
          'Theater': {
            state: ProgressState.COMPLETED,
            retryCount: 0,
            eventCount: 0,
            completedAt: '2024-01-15T10:06:00.000Z'
          }
        }
      }
    });

    const status = deriveFinalStatus(job);
    expect(status).toBe(JobStatus.SUCCESS);
  });

  it('should return PARTIAL_SUCCESS when some categories completed and some failed', () => {
    const job = createTestJob({
      events: [{ id: '1', title: 'Test Event', venue: 'Test Venue', date: '2024-01-15' }],
      progress: {
        totalCategories: 2,
        completedCategories: 1,
        failedCategories: 1,
        categoryStates: {
          'Music': {
            state: ProgressState.COMPLETED,
            retryCount: 0,
            eventCount: 1,
            completedAt: '2024-01-15T10:05:00.000Z'
          },
          'Theater': {
            state: ProgressState.FAILED,
            retryCount: 2,
            error: 'Failed to process',
            completedAt: '2024-01-15T10:06:00.000Z'
          }
        }
      }
    });

    const status = deriveFinalStatus(job);
    expect(status).toBe(JobStatus.PARTIAL_SUCCESS);
  });

  it('should return FAILED when all categories failed', () => {
    const job = createTestJob({
      events: [],
      progress: {
        totalCategories: 2,
        completedCategories: 0,
        failedCategories: 2,
        categoryStates: {
          'Music': {
            state: ProgressState.FAILED,
            retryCount: 2,
            error: 'Failed to process',
            completedAt: '2024-01-15T10:05:00.000Z'
          },
          'Theater': {
            state: ProgressState.FAILED,
            retryCount: 2,
            error: 'Failed to process',
            completedAt: '2024-01-15T10:06:00.000Z'
          }
        }
      }
    });

    const status = deriveFinalStatus(job);
    expect(status).toBe(JobStatus.FAILED);
  });

  it('should return current status when categories are still in progress', () => {
    const job = createTestJob({
      status: JobStatus.RUNNING,
      events: [],
      progress: {
        totalCategories: 2,
        completedCategories: 1,
        failedCategories: 0,
        categoryStates: {
          'Music': {
            state: ProgressState.COMPLETED,
            retryCount: 0,
            eventCount: 0,
            completedAt: '2024-01-15T10:05:00.000Z'
          },
          'Theater': {
            state: ProgressState.IN_PROGRESS,
            retryCount: 0,
            startedAt: '2024-01-15T10:06:00.000Z'
          }
        }
      }
    });

    const status = deriveFinalStatus(job);
    expect(status).toBe(JobStatus.RUNNING);
  });
});