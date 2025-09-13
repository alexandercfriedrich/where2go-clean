import { describe, it, expect, beforeEach } from 'vitest';
import { POST } from '../../api/events/jobs/route';
import { getJobStore } from '../../../lib/new-backend/redis/jobStore';

describe('Events Jobs Route with Background Scheduling', () => {
  const jobStore = getJobStore();

  beforeEach(async () => {
    // Clean up any existing jobs for testing
    try {
      await jobStore.cleanup();
    } catch (error) {
      // Ignore cleanup errors in tests
    }
  });

  it('should create job and schedule background processing', async () => {
    const request = new Request('http://localhost:3000/api/events/jobs', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'host': 'localhost:3000'
      },
      body: JSON.stringify({
        city: 'Berlin',
        date: '2025-01-20',
        categories: ['DJ Sets/Electronic'],
        options: { 
          ttlSeconds: 3600
        }
      })
    });

    const response = await POST(request as any);
    const result = await response.json();

    expect(response.status).toBe(201); // New job created - should be 201
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data.job).toBeDefined();
    expect(result.data.job.id).toBeDefined();
    expect(result.data.isNew).toBe(true);

    // Verify job was created with pending status
    const job = await jobStore.getJob(result.data.job.id);
    expect(job).toBeDefined();
    expect(job?.status).toBe('pending'); // Job status should be 'pending'
  });

  it('should handle missing required parameters', async () => {
    const request = new Request('http://localhost:3000/api/events/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });

    const response = await POST(request as any);
    const result = await response.json();

    expect(response.status).toBe(400);
    expect(result.status).toBe(400);
    expect(result.error).toBeDefined();
    expect(result.error.code).toBe('VALIDATION_ERROR');
  });
});