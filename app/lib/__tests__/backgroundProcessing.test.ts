import { describe, it, expect } from 'vitest';
import { POST } from '../../api/events/process/route';

describe('Background Processing Route', () => {
  it('should validate required parameters', async () => {
    const request = new Request('http://localhost:3000/api/events/process', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-vercel-background': '1' // Add auth header to pass auth check
      },
      body: JSON.stringify({})
    });

    const response = await POST(request as any);
    const result = await response.json();

    expect(response.status).toBe(400);
    expect(result.error).toContain('Missing required parameters');
  });

  it('should accept valid processing request', async () => {
    // Test with a simple jobId that doesn't require pre-creation
    const jobId = `test_job_${Date.now()}`;

    const request = new Request('http://localhost:3000/api/events/process', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-vercel-background': '1' // Add auth header
      },
      body: JSON.stringify({
        jobId,
        city: 'Berlin',
        date: '2025-01-20'
      })
    });

    const response = await POST(request as any);
    const result = await response.json();

    expect(response.status).toBe(202);
    expect(result.success).toBe(true);
    expect(result.started).toBe(true);
    expect(result.jobId).toBe(jobId);
  });

  describe('Authentication', () => {
    const validJobData = {
      jobId: 'test_job_123',
      city: 'Berlin',
      date: '2025-01-20'
    };

    it('should allow requests with x-vercel-background header', async () => {
      const request = new Request('http://localhost:3000/api/events/process', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-vercel-background': '1'
        },
        body: JSON.stringify(validJobData)
      });

      const response = await POST(request as any);
      expect(response.status).not.toBe(401);
    });

    it('should allow requests with valid x-internal-secret', async () => {
      // Set env var for test
      const originalSecret = process.env.INTERNAL_API_SECRET;
      process.env.INTERNAL_API_SECRET = 'test-secret';

      const request = new Request('http://localhost:3000/api/events/process', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-internal-secret': 'test-secret'
        },
        body: JSON.stringify(validJobData)
      });

      const response = await POST(request as any);
      expect(response.status).not.toBe(401);

      // Restore env var
      if (originalSecret) {
        process.env.INTERNAL_API_SECRET = originalSecret;
      } else {
        delete process.env.INTERNAL_API_SECRET;
      }
    });

    it('should reject requests without any auth headers', async () => {
      const request = new Request('http://localhost:3000/api/events/process', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(validJobData)
      });

      const response = await POST(request as any);
      const result = await response.json();
      
      expect(response.status).toBe(401);
      expect(result.error).toBe('Unauthorized');
    });

    it('should reject requests with invalid internal secret', async () => {
      // Set env var for test
      const originalSecret = process.env.INTERNAL_API_SECRET;
      process.env.INTERNAL_API_SECRET = 'correct-secret';

      const request = new Request('http://localhost:3000/api/events/process', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-internal-secret': 'wrong-secret'
        },
        body: JSON.stringify(validJobData)
      });

      const response = await POST(request as any);
      const result = await response.json();
      
      expect(response.status).toBe(401);
      expect(result.error).toBe('Unauthorized');

      // Restore env var
      if (originalSecret) {
        process.env.INTERNAL_API_SECRET = originalSecret;
      } else {
        delete process.env.INTERNAL_API_SECRET;
      }
    });
  });
});