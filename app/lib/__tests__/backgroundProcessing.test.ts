import { describe, it, expect, beforeEach } from 'vitest';
import { POST } from '../../api/events/process/route';
import { getJobStore } from '../../lib/jobStore';

describe('Background Processing Route', () => {
  const jobStore = getJobStore();

  beforeEach(async () => {
    // Clean up any existing jobs for testing
    await jobStore.cleanupOldJobs();
  });

  it('should validate required parameters', async () => {
    const request = new Request('http://localhost:3000/api/events/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });

    const response = await POST(request as any);
    const result = await response.json();

    expect(response.status).toBe(400);
    expect(result.error).toContain('Missing required parameters');
  });

  it('should accept valid processing request', async () => {
    // Create a job first
    const jobId = `test_job_${Date.now()}`;
    await jobStore.setJob(jobId, {
      id: jobId,
      status: 'pending',
      createdAt: new Date()
    });

    const request = new Request('http://localhost:3000/api/events/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobId,
        city: 'Berlin',
        date: '2025-01-20',
        categories: ['test'],
        options: { debug: true }
      })
    });

    const response = await POST(request as any);
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result.success).toBe(true);
  });
});