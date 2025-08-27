import { describe, it, expect, beforeEach } from 'vitest';
import { createJobStore, JobStore } from '../jobStore';
import { JobStatus, DebugInfo, DebugStep } from '../types';

describe('JobStore', () => {
  let jobStore: JobStore;

  beforeEach(() => {
    // Create a new in-memory instance for each test
    jobStore = createJobStore();
  });

  it('should create and retrieve jobs', async () => {
    const job: JobStatus = {
      id: 'test-job-1',
      status: 'pending',
      createdAt: new Date()
    };

    await jobStore.setJob('test-job-1', job);
    const retrieved = await jobStore.getJob('test-job-1');

    expect(retrieved).toEqual(job);
  });

  it('should update existing jobs', async () => {
    const job: JobStatus = {
      id: 'test-job-2',
      status: 'pending',
      createdAt: new Date()
    };

    await jobStore.setJob('test-job-2', job);
    await jobStore.updateJob('test-job-2', { status: 'done', events: [] });

    const updated = await jobStore.getJob('test-job-2');
    expect(updated?.status).toBe('done');
    expect(updated?.events).toEqual([]);
  });

  it('should handle debug information', async () => {
    const debugInfo: DebugInfo = {
      createdAt: new Date(),
      city: 'Berlin',
      date: '2025-01-20',
      categories: ['music'],
      steps: []
    };

    await jobStore.setDebugInfo('test-job-3', debugInfo);
    const retrieved = await jobStore.getDebugInfo('test-job-3');

    expect(retrieved?.city).toBe('Berlin');
    expect(retrieved?.date).toBe('2025-01-20');
    expect(retrieved?.categories).toEqual(['music']);
  });

  it('should push debug steps', async () => {
    const debugInfo: DebugInfo = {
      createdAt: new Date(),
      city: 'Berlin',
      date: '2025-01-20',
      categories: ['music'],
      steps: []
    };

    await jobStore.setDebugInfo('test-job-4', debugInfo);

    const step: DebugStep = {
      category: 'music',
      query: 'test query',
      response: 'test response',
      parsedCount: 5
    };

    await jobStore.pushDebugStep('test-job-4', step);

    const retrieved = await jobStore.getDebugInfo('test-job-4');
    expect(retrieved?.steps).toHaveLength(1);
    expect(retrieved?.steps[0]).toEqual(step);
  });

  it('should delete jobs', async () => {
    const job: JobStatus = {
      id: 'test-job-5',
      status: 'pending',
      createdAt: new Date()
    };

    await jobStore.setJob('test-job-5', job);
    await jobStore.deleteJob('test-job-5');

    const retrieved = await jobStore.getJob('test-job-5');
    expect(retrieved).toBeNull();
  });

  it('should return null for non-existent jobs', async () => {
    const job = await jobStore.getJob('non-existent');
    expect(job).toBeNull();
  });
});