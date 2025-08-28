import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../../api/jobs/[jobId]/route';
import { getJobStore } from '../jobStore';

describe('Job Status Route Headers', () => {
  const jobStore = getJobStore();
  const testJobId = 'test-job-headers-123';

  beforeEach(async () => {
    // Clean up any existing test job
    await jobStore.deleteJob(testJobId);
    
    // Create a test job for header testing
    await jobStore.setJob(testJobId, {
      id: testJobId,
      status: 'done',
      createdAt: new Date(),
      events: [{
        title: 'Test Event',
        category: 'Music',
        date: '2025-01-20',
        time: '20:00',
        venue: 'Test Venue',
        price: '10€',
        website: 'http://test.com'
      }],
      lastUpdateAt: new Date().toISOString()
    });
  });

  afterEach(async () => {
    // Clean up test job
    await jobStore.deleteJob(testJobId);
  });

  it('should include comprehensive no-cache headers in successful responses', async () => {
    const request = new NextRequest(`http://localhost:3000/api/jobs/${testJobId}`);
    
    const response = await GET(request, { params: { jobId: testJobId } });

    // Verify response status
    expect(response.status).toBe(200);

    // Verify all no-cache headers are present
    const headers = response.headers;
    expect(headers.get('Cache-Control')).toBe('no-store, no-cache, must-revalidate');
    expect(headers.get('Pragma')).toBe('no-cache');
    expect(headers.get('Expires')).toBe('0');
  });

  it('should include no-cache headers in debug mode responses', async () => {
    const request = new NextRequest(`http://localhost:3000/api/jobs/${testJobId}?debug=1`);
    
    const response = await GET(request, { params: { jobId: testJobId } });

    // Verify response status
    expect(response.status).toBe(200);

    // Verify all no-cache headers are present even in debug mode
    const headers = response.headers;
    expect(headers.get('Cache-Control')).toBe('no-store, no-cache, must-revalidate');
    expect(headers.get('Pragma')).toBe('no-cache');
    expect(headers.get('Expires')).toBe('0');
  });

  it('should include lastUpdateAt field when present', async () => {
    const request = new NextRequest(`http://localhost:3000/api/jobs/${testJobId}`);
    const response = await GET(request, { params: { jobId: testJobId } });

    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data.lastUpdateAt).toBeDefined();
    expect(typeof data.lastUpdateAt).toBe('string');
  });

  it('should include no-cache headers even for 404 responses', async () => {
    const nonExistentJobId = 'non-existent-job-id';
    const request = new NextRequest(`http://localhost:3000/api/jobs/${nonExistentJobId}`);
    
    const response = await GET(request, { params: { jobId: nonExistentJobId } });

    // Verify 404 status
    expect(response.status).toBe(404);

    // Verify no-cache headers are still present (this was already working)
    const headers = response.headers;
    expect(headers.get('Cache-Control')).toBe('no-store');
  });
});