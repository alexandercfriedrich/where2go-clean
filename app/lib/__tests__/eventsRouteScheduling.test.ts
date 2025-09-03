import { describe, it, expect, beforeEach } from 'vitest';
import { POST } from '../../api/events/route';
import { getJobStore } from '../../lib/jobStore';

describe('Events Route with Background Scheduling', () => {
  const jobStore = getJobStore();

  beforeEach(async () => {
    // Clean up any existing jobs for testing
    await jobStore.cleanupOldJobs();
  });

  it('should create job and schedule background processing', async () => {
    const request = new Request('http://localhost:3000/api/events', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'host': 'localhost:3000'
      },
      body: JSON.stringify({
        city: 'Berlin',
        date: '2025-01-20',
        categories: ['test'],
        options: { debug: true }
      })
    });

    const response = await POST(request as any);
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result.jobId).toBeDefined();
    expect(result.status).toBe('partial'); // Should be 'partial' when processing is needed

    // Verify job was created with pending status
    const job = await jobStore.getJob(result.jobId);
    expect(job).toBeDefined();
    expect(job?.status).toBe('pending'); // Job status should be 'pending'
  });

  it('should handle missing required parameters', async () => {
    const request = new Request('http://localhost:3000/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });

    const response = await POST(request as any);
    const result = await response.json();

    expect(response.status).toBe(400);
    expect(result.error).toContain('Stadt und Datum sind erforderlich');
  });
});