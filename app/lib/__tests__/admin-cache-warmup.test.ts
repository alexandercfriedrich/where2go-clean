import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { POST, GET } from '../../api/admin/cache-warmup/route';
import { NextRequest } from 'next/server';

describe('Admin Cache Warmup API', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Mock environment variables
    process.env = {
      ...originalEnv,
      ADMIN_WARMUP_SECRET: 'test-secret-123',
      NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-key'
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.clearAllMocks();
  });

  describe('GET endpoint', () => {
    it('should return endpoint documentation', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/cache-warmup', {
        method: 'GET'
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('endpoint');
      expect(data).toHaveProperty('description');
      expect(data).toHaveProperty('method');
      expect(data).toHaveProperty('authentication');
      expect(data).toHaveProperty('queryParameters');
      expect(data).toHaveProperty('example');
      expect(data.endpoint).toBe('/api/admin/cache-warmup');
      expect(data.method).toBe('POST');
    });
  });

  describe('POST endpoint - Authentication', () => {
    it('should reject requests without authorization header when ADMIN_WARMUP_SECRET is set', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/cache-warmup', {
        method: 'POST'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toHaveProperty('error');
      expect(data.error).toContain('Invalid Bearer token');
    });

    it('should reject requests with invalid authorization token when ADMIN_WARMUP_SECRET is set', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/cache-warmup', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer wrong-secret'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toHaveProperty('error');
      expect(data.error).toContain('Invalid Bearer token');
    });

    it('should succeed when ADMIN_WARMUP_SECRET is not configured (relies on middleware auth)', async () => {
      delete process.env.ADMIN_WARMUP_SECRET;

      const request = new NextRequest(
        'http://localhost:3000/api/admin/cache-warmup?dryRun=true&limit=5&fromDate=2025-11-17&toDate=2025-11-18',
        {
          method: 'POST'
        }
      );

      const response = await POST(request);
      const data = await response.json();

      // Should succeed without Bearer token when ADMIN_WARMUP_SECRET is not set
      // (middleware Basic Auth would be enforced separately)
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('success');
      expect(data.success).toBe(true);
    });
  });

  describe('POST endpoint - Query Parameter Validation', () => {
    it('should reject invalid fromDate format', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/admin/cache-warmup?fromDate=invalid-date',
        {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer test-secret-123'
          }
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error');
      expect(data.error).toContain('Invalid fromDate format');
    });

    it('should reject invalid toDate format', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/admin/cache-warmup?toDate=invalid-date',
        {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer test-secret-123'
          }
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error');
      expect(data.error).toContain('Invalid toDate format');
    });

    it('should reject limit out of range', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/admin/cache-warmup?limit=100000',
        {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer test-secret-123'
          }
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error');
      expect(data.error).toContain('Invalid limit');
    });

    it('should reject batchSize out of range', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/admin/cache-warmup?batchSize=5000',
        {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer test-secret-123'
          }
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error');
      expect(data.error).toContain('Invalid batchSize');
    });
  });

  describe('POST endpoint - Dry-run Mode', () => {
    it('should accept valid dry-run request', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/admin/cache-warmup?dryRun=true&fromDate=2025-11-17&toDate=2025-11-18&limit=5',
        {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer test-secret-123'
          }
        }
      );

      const response = await POST(request);
      const data = await response.json();

      // Should succeed with dry-run
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('dryRun');
      expect(data.dryRun).toBe(true);
      expect(data).toHaveProperty('stats');
      expect(data.stats).toHaveProperty('totalImported');
      expect(data.stats).toHaveProperty('duration');
    });

    it('should parse query parameters correctly', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/admin/cache-warmup?dryRun=true&fromDate=2025-12-01&toDate=2025-12-31&limit=100&batchSize=50',
        {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer test-secret-123'
          }
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.stats.dateRange.from).toBe('2025-12-01');
      expect(data.stats.dateRange.to).toBe('2025-12-31');
    });
  });
});
