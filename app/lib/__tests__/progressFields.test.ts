import { describe, it, expect, beforeEach } from 'vitest';
import { createJobStore, JobStore } from '../jobStore';
import { JobStatus } from '../types';

describe('Progress Fields in JobStore', () => {
  let jobStore: JobStore;

  beforeEach(() => {
    jobStore = createJobStore();
  });

  it('should store and retrieve progress fields correctly', async () => {
    const jobId = 'test-progress-job';
    
    // Create initial job
    await jobStore.setJob(jobId, {
      id: jobId,
      status: 'pending',
      createdAt: new Date(),
      events: []
    });

    // Update with progress
    const now = new Date().toISOString();
    await jobStore.updateJob(jobId, {
      progress: { completedCategories: 3, totalCategories: 16 },
      lastUpdateAt: now
    });

    // Retrieve and verify
    const job = await jobStore.getJob(jobId);
    expect(job?.progress).toEqual({ completedCategories: 3, totalCategories: 16 });
    expect(job?.lastUpdateAt).toBe(now);
  });

  it('should preserve progress during multiple updates', async () => {
    const jobId = 'test-progress-preservation';
    
    // Create initial job with progress
    await jobStore.setJob(jobId, {
      id: jobId,
      status: 'pending',
      createdAt: new Date(),
      events: [],
      progress: { completedCategories: 0, totalCategories: 16 }
    });

    // Update progress multiple times
    for (let i = 1; i <= 3; i++) {
      await jobStore.updateJob(jobId, {
        progress: { completedCategories: i, totalCategories: 16 },
        lastUpdateAt: new Date().toISOString()
      });
      
      const job = await jobStore.getJob(jobId);
      expect(job?.progress?.completedCategories).toBe(i);
      expect(job?.progress?.totalCategories).toBe(16);
      expect(job?.lastUpdateAt).toBeDefined();
    }
  });

  it('should handle jobs without progress fields gracefully', async () => {
    const jobId = 'test-no-progress';
    
    // Create job without progress
    await jobStore.setJob(jobId, {
      id: jobId,
      status: 'pending',
      createdAt: new Date(),
      events: []
    });

    const job = await jobStore.getJob(jobId);
    expect(job?.progress).toBeUndefined();
    expect(job?.lastUpdateAt).toBeUndefined();
  });

  it('should handle completion with final progress', async () => {
    const jobId = 'test-completion-progress';
    
    // Create job with partial progress
    await jobStore.setJob(jobId, {
      id: jobId,
      status: 'pending',
      createdAt: new Date(),
      events: [],
      progress: { completedCategories: 10, totalCategories: 16 }
    });

    // Complete job with final progress
    await jobStore.updateJob(jobId, {
      status: 'done',
      progress: { completedCategories: 16, totalCategories: 16 },
      lastUpdateAt: new Date().toISOString()
    });

    const job = await jobStore.getJob(jobId);
    expect(job?.status).toBe('done');
    expect(job?.progress?.completedCategories).toBe(16);
    expect(job?.progress?.totalCategories).toBe(16);
  });
});