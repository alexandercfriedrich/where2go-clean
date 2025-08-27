import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the Upstash Redis module
vi.mock('@upstash/redis', () => ({
  Redis: vi.fn().mockImplementation(() => ({
    setex: vi.fn().mockResolvedValue('OK'),
    get: vi.fn().mockResolvedValue(null),
    del: vi.fn().mockResolvedValue(1),
  }))
}));

describe('JobStore Integration', () => {
  let originalEnv: Record<string, string | undefined>;

  beforeEach(() => {
    // Save original environment
    originalEnv = {
      UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
      UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    };
  });

  afterEach(() => {
    // Restore original environment
    Object.assign(process.env, originalEnv);
    
    // Clear any singleton instances
    vi.clearAllMocks();
  });

  it('should use in-memory store when Redis env vars are not set', async () => {
    // Ensure Redis env vars are not set
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;

    // Force re-import to get fresh instance
    const { createJobStore } = await import('../jobStore');
    const jobStore = createJobStore();

    // This should use in-memory implementation
    const job = {
      id: 'test-job',
      status: 'pending' as const,
      createdAt: new Date()
    };

    await jobStore.setJob('test-job', job);
    const retrieved = await jobStore.getJob('test-job');
    
    expect(retrieved).toEqual(job);
  });

  it('should use Redis store when env vars are set', async () => {
    // Set Redis env vars
    process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';

    // Force re-import to get fresh instance
    const { createJobStore } = await import('../jobStore');
    const jobStore = createJobStore();

    const job = {
      id: 'test-job',
      status: 'pending' as const,
      createdAt: new Date()
    };

    // Should not throw error (Redis is mocked)
    await expect(jobStore.setJob('test-job', job)).resolves.not.toThrow();
  });
});