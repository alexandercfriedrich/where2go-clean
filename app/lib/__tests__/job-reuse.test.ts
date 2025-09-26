import { describe, it, expect, beforeEach } from 'vitest';
import { getJobStore } from '../jobStore';
import { JobStatus } from '../types';

describe('Job Reuse Functionality', () => {
  let jobStore: any;

  beforeEach(() => {
    jobStore = getJobStore();
  });

  it('should create and retrieve active job mapping', async () => {
    const key = 'city=Wien|date=2025-01-20|cats=Music,Theater';
    const jobId = 'job_test_123';
    const ttlSec = 600; // 10 minutes

    // Set active job mapping
    await jobStore.setActiveJob(key, jobId, ttlSec);

    // Retrieve active job mapping
    const retrievedJobId = await jobStore.getActiveJob(key);
    expect(retrievedJobId).toBe(jobId);
  });

  it('should return null for non-existent active job mapping', async () => {
    const key = 'city=NonExistent|date=2025-01-20|cats=Music';
    const retrievedJobId = await jobStore.getActiveJob(key);
    expect(retrievedJobId).toBeNull();
  });

  it('should delete active job mapping', async () => {
    const key = 'city=Berlin|date=2025-01-20|cats=Art';
    const jobId = 'job_test_456';
    const ttlSec = 600;

    // Set and verify
    await jobStore.setActiveJob(key, jobId, ttlSec);
    expect(await jobStore.getActiveJob(key)).toBe(jobId);

    // Delete and verify
    await jobStore.deleteActiveJob(key);
    expect(await jobStore.getActiveJob(key)).toBeNull();
  });

  it('should handle TTL expiry in InMemoryJobStore', async () => {
    // This test will only work if using InMemoryJobStore
    const key = 'city=Paris|date=2025-01-20|cats=Food';
    const jobId = 'job_test_789';
    const ttlSec = 1; // 1 second

    await jobStore.setActiveJob(key, jobId, ttlSec);
    expect(await jobStore.getActiveJob(key)).toBe(jobId);

    // Wait for expiry
    await new Promise(resolve => setTimeout(resolve, 1100));
    expect(await jobStore.getActiveJob(key)).toBeNull();
  });
});