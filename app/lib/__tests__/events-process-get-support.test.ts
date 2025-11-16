import { describe, it, expect } from 'vitest';
import { GET, POST } from '../../api/events/process/route';
import type { NextRequest } from 'next/server';

describe('/api/events/process - GET Support', () => {
  it('should export GET handler', () => {
    expect(GET).toBeDefined();
    expect(typeof GET).toBe('function');
  });

  it('should export POST handler', () => {
    expect(POST).toBeDefined();
    expect(typeof POST).toBe('function');
  });

  it('GET handler should return 400 for missing parameters (not 405)', async () => {
    const request = new Request('http://localhost:3000/api/events/process', {
      method: 'GET',
      headers: { 
        'Content-Type': 'application/json',
        'x-vercel-background': '1'
      }
    });

    // The response should not be 405 (Method Not Allowed)
    const response = await GET(request as unknown as NextRequest);
    
    // It will return 400 (bad parameters) since GET has no query params, but NOT 405
    expect(response.status).not.toBe(405);
    expect(response.status).toBe(400);
    
    const data = await response.json();
    expect(data.error).toBeDefined();
  });

  it('GET handler should process requests with query parameters', async () => {
    const request = new Request('http://localhost:3000/api/events/process?jobId=test-job-123&city=Wien&date=2025-01-20', {
      method: 'GET',
      headers: { 
        'Content-Type': 'application/json',
        'x-vercel-background': '1'
      }
    });

    const response = await GET(request as unknown as NextRequest);
    
    // Should not be 405
    expect(response.status).not.toBe(405);
    // Might be 404 (job not found) or 400 (other validation), but the GET handler is working
  });

  it('POST handler should still work as before', async () => {
    const request = new Request('http://localhost:3000/api/events/process', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-vercel-background': '1'
      },
      body: JSON.stringify({
        jobId: 'test-job-id',
        city: 'Wien',
        date: '2025-01-20',
        categories: ['musik']
      })
    });

    const response = await POST(request as unknown as NextRequest);
    
    // It might return 404 (Job not found) or 400 (bad parameters), but NOT 405
    expect(response.status).not.toBe(405);
  });

  it('GET handler should return 400 for malformed JSON in options parameter', async () => {
    const request = new Request('http://localhost:3000/api/events/process?jobId=test-job&city=Wien&date=2025-01-20&options={invalid-json}', {
      method: 'GET',
      headers: { 
        'Content-Type': 'application/json',
        'x-vercel-background': '1'
      }
    });

    const response = await GET(request as unknown as NextRequest);
    
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('Invalid JSON in options parameter');
  });
});
