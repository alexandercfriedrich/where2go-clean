import { describe, it, expect, beforeAll } from 'vitest';
import { GET, POST } from '../../api/events/process/route';

describe('/api/events/process - GET Support', () => {
  beforeAll(() => {
    // Set up minimal Supabase environment variables for testing
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    }
    if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
    }
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
    }
  });

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
    const response = await GET(request as any);
    
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

    const response = await GET(request as any);
    
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

    const response = await POST(request as any);
    
    // It might return 404 (Job not found) or 400 (bad parameters), but NOT 405
    expect(response.status).not.toBe(405);
  });
});
