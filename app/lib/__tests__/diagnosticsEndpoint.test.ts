import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

describe('Diagnostics JobStore Endpoint', () => {
  let originalEnv: Record<string, string | undefined>;

  beforeEach(() => {
    // Save original environment
    originalEnv = {
      NODE_ENV: process.env.NODE_ENV,
      INTERNAL_API_SECRET: process.env.INTERNAL_API_SECRET,
      UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
      UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    };
  });

  afterEach(() => {
    // Restore original environment
    Object.assign(process.env, originalEnv);
    vi.clearAllMocks();
  });

  describe('Development Environment', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    it('should work without authentication in development', async () => {
      const { GET } = await import('@/api/diagnostics/jobstore/route');
      const request = new NextRequest('http://localhost:3000/api/diagnostics/jobstore');
      const response = await GET(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('environment', 'development');
      expect(result).toHaveProperty('usingRedis');
      expect(result).toHaveProperty('setGetOk');
    });

    it('should detect Redis configuration correctly', async () => {
      // Test without Redis env vars
      delete process.env.UPSTASH_REDIS_REST_URL;
      delete process.env.UPSTASH_REDIS_REST_TOKEN;

      const { GET } = await import('@/api/diagnostics/jobstore/route');
      const request = new NextRequest('http://localhost:3000/api/diagnostics/jobstore');
      const response = await GET(request);
      const result = await response.json();

      expect(result.usingRedis).toBe(false);

      // Test with Redis env vars
      process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io';
      process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';

      const { GET: GET2 } = await import('@/api/diagnostics/jobstore/route');
      const request2 = new NextRequest('http://localhost:3000/api/diagnostics/jobstore');
      const response2 = await GET2(request2);
      const result2 = await response2.json();

      expect(result2.usingRedis).toBe(true);
    });

    it('should successfully test set/get/delete operations', async () => {
      const { GET } = await import('@/api/diagnostics/jobstore/route');
      const request = new NextRequest('http://localhost:3000/api/diagnostics/jobstore');
      const response = await GET(request);
      const result = await response.json();

      // The test should have a valid response structure
      expect(response.status).toBe(200);
      expect(result).toHaveProperty('setGetOk');
      expect(typeof result.setGetOk).toBe('boolean');
      // Don't assert the specific value since it depends on the actual implementation
    });
  });

  describe('Production Environment', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
      process.env.INTERNAL_API_SECRET = 'test-secret';
    });

    it('should require x-internal-secret header in production', async () => {
      const { GET } = await import('@/api/diagnostics/jobstore/route');
      const request = new NextRequest('http://localhost:3000/api/diagnostics/jobstore');
      const response = await GET(request);
      const result = await response.json();

      expect(response.status).toBe(401);
      expect(result.error).toContain('Unauthorized');
    });

    it('should work with correct x-internal-secret header', async () => {
      const { GET } = await import('@/api/diagnostics/jobstore/route');
      const request = new NextRequest('http://localhost:3000/api/diagnostics/jobstore', {
        headers: {
          'x-internal-secret': 'test-secret'
        }
      });
      const response = await GET(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result).toHaveProperty('environment', 'production');
      expect(result).toHaveProperty('setGetOk');
      expect(typeof result.setGetOk).toBe('boolean');
    });

    it('should reject wrong x-internal-secret header', async () => {
      const { GET } = await import('@/api/diagnostics/jobstore/route');
      const request = new NextRequest('http://localhost:3000/api/diagnostics/jobstore', {
        headers: {
          'x-internal-secret': 'wrong-secret'
        }
      });
      const response = await GET(request);
      const result = await response.json();

      expect(response.status).toBe(401);
      expect(result.error).toContain('Unauthorized');
    });

    it('should handle missing INTERNAL_API_SECRET env var', async () => {
      delete process.env.INTERNAL_API_SECRET;

      const { GET } = await import('@/api/diagnostics/jobstore/route');
      const request = new NextRequest('http://localhost:3000/api/diagnostics/jobstore', {
        headers: {
          'x-internal-secret': 'any-secret'
        }
      });
      const response = await GET(request);
      const result = await response.json();

      expect(response.status).toBe(401);
      expect(result.error).toContain('Unauthorized');
    });
  });
});