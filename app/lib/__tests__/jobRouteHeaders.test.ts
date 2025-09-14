import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../../api/events/jobs/[jobId]/route';
import { getJobStore } from '../../../lib/new-backend/redis/jobStore';
import { JobStatus } from '../../../lib/new-backend/types/jobs';

describe('New Job Status Route Headers', () => {
  const jobStore = getJobStore();
  const testJobId = 'test-job-headers-123';

  beforeEach(async () => {
    try {
      // Clean up any existing test job
      await jobStore.deleteJob(testJobId);
    } catch (error) {
      // Ignore cleanup errors
    }
    
    // Create a test job for header testing
    await jobStore.createJob({
      city: 'Berlin',
      date: '2025-01-20',
      categories: ['DJ Sets/Electronic']
    });
  });

  afterEach(async () => {
    try {
      // Clean up test job
      await jobStore.deleteJob(testJobId);
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  it('should include comprehensive no-cache headers in successful responses', async () => {
    // First create a job to test with
    const createResult = await jobStore.createJob({
      city: 'Berlin',
      date: '2025-01-20',
      categories: ['DJ Sets/Electronic']
    });
    
    const request = new NextRequest(`http://localhost:3000/api/events/jobs/${createResult.job.id}`);
    
    const response = await GET(request, { params: { jobId: createResult.job.id } });

    // Verify response status
    expect(response.status).toBe(200);

    // Verify all no-cache headers are present
    const headers = response.headers;
    expect(headers.get('Cache-Control')).toBe('no-cache, no-store, must-revalidate');
    expect(headers.get('Pragma')).toBe('no-cache');
    expect(headers.get('Expires')).toBe('0');
    
    // Verify new API response format
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data).toBeDefined();
    expect(data.data.job).toBeDefined();
  });

  it('should include no-cache headers for 404 responses', async () => {
    const nonExistentJobId = 'non-existent-job-id';
    const request = new NextRequest(`http://localhost:3000/api/events/jobs/${nonExistentJobId}`);
    
    const response = await GET(request, { params: { jobId: nonExistentJobId } });

    // Verify 404 status
    expect(response.status).toBe(404);

    // Verify no-cache headers are still present
    const headers = response.headers;
    expect(headers.get('Cache-Control')).toBe('no-cache, no-store, must-revalidate');
    expect(headers.get('Pragma')).toBe('no-cache');
    expect(headers.get('Expires')).toBe('0');
    
    // Verify new API error format
    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.error).toBeDefined();
  });
});