/**
 * Unit tests for JobStore functionality.
 * Tests job creation, retrieval, updates, and queue operations.
 * 
 * @fileoverview JobStore behavior test suite.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JobStatus, ProgressState } from '../../../lib/new-backend/types/jobs';
import { generateJobSignature } from '../../../lib/new-backend/utils/hash';

// Mock Redis client to avoid actual Redis dependency in tests
const mockRedisClient = {
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
  lpush: vi.fn(),
  blpop: vi.fn(),
  llen: vi.fn(),
  exists: vi.fn(),
  executeOperation: vi.fn()
};

// Mock the Redis client module
vi.mock('../../../lib/new-backend/redis/redisClient', () => ({
  getRedisClient: () => ({
    executeOperation: mockRedisClient.executeOperation
  }),
  REDIS_KEYS: {
    JOB: (jobId: string) => `jobs:${jobId}`,
    JOB_SIGNATURE_INDEX: (signature: string) => `jobs:idx:signature:${signature}`,
    JOB_QUEUE: 'jobs:queue'
  }
}));

// Now import the JobStore after mocking
import { RedisJobStore } from '../../../lib/new-backend/redis/jobStore';

describe('JobStore', () => {
  let jobStore: RedisJobStore;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Create new job store instance
    jobStore = new RedisJobStore();
    
    // Setup default mock behavior
    mockRedisClient.executeOperation.mockImplementation(async (operation) => {
      return await operation(mockRedisClient);
    });
  });

  describe('createJob', () => {
    it('should create a new job with correct structure', async () => {
      // Mock that no existing job is found
      mockRedisClient.get.mockResolvedValueOnce(null); // No existing signature
      mockRedisClient.set.mockResolvedValue('OK');

      const params = {
        city: 'Berlin',
        date: '2024-01-15',
        categories: ['DJ Sets/Electronic', 'Clubs/Discos'],
        ttlSeconds: 3600
      };

      const result = await jobStore.createJob(params);

      expect(result.isNew).toBe(true);
      expect(result.job.city).toBe('Berlin');
      expect(result.job.date).toBe('2024-01-15');
      expect(result.job.categories).toEqual(['DJ Sets/Electronic', 'Clubs/Discos']);
      expect(result.job.status).toBe(JobStatus.PENDING);
      expect(result.job.events).toEqual([]);
      expect(result.job.progress.totalCategories).toBe(2);
      expect(result.job.progress.completedCategories).toBe(0);
      expect(result.job.progress.failedCategories).toBe(0);
      
      // Check that all categories have initial state
      expect(result.job.progress.categoryStates['DJ Sets/Electronic']).toEqual({
        state: ProgressState.NOT_STARTED,
        retryCount: 0
      });
      expect(result.job.progress.categoryStates['Clubs/Discos']).toEqual({
        state: ProgressState.NOT_STARTED,
        retryCount: 0
      });
    });

    it('should return existing job if signature matches', async () => {
      const existingJob = {
        id: 'job_123_existing',
        signature: 'abc123',
        status: JobStatus.SUCCESS,
        city: 'Berlin',
        date: '2024-01-15',
        categories: ['DJ Sets/Electronic'],
        events: [],
        progress: {
          totalCategories: 1,
          completedCategories: 1,
          failedCategories: 0,
          categoryStates: {}
        },
        createdAt: '2024-01-15T10:00:00.000Z',
        updatedAt: '2024-01-15T10:30:00.000Z',
        ttlSeconds: 3600
      };

      // Mock existing job found by signature
      mockRedisClient.get
        .mockResolvedValueOnce('job_123_existing') // Signature index returns job ID
        .mockResolvedValueOnce(JSON.stringify(existingJob)); // Job data

      const params = {
        city: 'Berlin',
        date: '2024-01-15',
        categories: ['DJ Sets/Electronic']
      };

      const result = await jobStore.createJob(params);

      expect(result.isNew).toBe(false);
      expect(result.job.id).toBe('job_123_existing');
      expect(result.job.status).toBe(JobStatus.SUCCESS);
    });

    it('should generate deterministic signatures', async () => {
      mockRedisClient.get.mockResolvedValue(null);
      mockRedisClient.set.mockResolvedValue('OK');

      const params1 = {
        city: 'Berlin',
        date: '2024-01-15',
        categories: ['DJ Sets/Electronic', 'Clubs/Discos']
      };

      const params2 = {
        city: 'Berlin',
        date: '2024-01-15',
        categories: ['Clubs/Discos', 'DJ Sets/Electronic'] // Different order
      };

      const result1 = await jobStore.createJob(params1);
      vi.clearAllMocks();
      mockRedisClient.executeOperation.mockImplementation(async (operation) => {
        return await operation(mockRedisClient);
      });
      mockRedisClient.get.mockResolvedValue(null);
      mockRedisClient.set.mockResolvedValue('OK');

      const result2 = await jobStore.createJob(params2);

      // Signatures should be the same regardless of category order
      expect(result1.job.signature).toBe(result2.job.signature);
    });

    it('should handle stale job detection', async () => {
      const staleJob = {
        id: 'job_123_stale',
        signature: 'abc123',
        status: JobStatus.SUCCESS,
        city: 'Berlin',
        date: '2024-01-15',
        categories: ['DJ Sets/Electronic'],
        events: [],
        progress: {
          totalCategories: 1,
          completedCategories: 1,
          failedCategories: 0,
          categoryStates: {}
        },
        createdAt: new Date(Date.now() - 2000000).toISOString(), // Very old
        updatedAt: new Date(Date.now() - 2000000).toISOString(),
        ttlSeconds: 3600
      };

      // Mock stale job found
      mockRedisClient.get
        .mockResolvedValueOnce('job_123_stale')
        .mockResolvedValueOnce(JSON.stringify(staleJob))
        .mockResolvedValueOnce(JSON.stringify(staleJob)) // For deletion check
        .mockResolvedValueOnce(null); // After deletion

      mockRedisClient.del.mockResolvedValue(1);
      mockRedisClient.set.mockResolvedValue('OK');

      const params = {
        city: 'Berlin',
        date: '2024-01-15',
        categories: ['DJ Sets/Electronic']
      };

      const result = await jobStore.createJob(params);

      expect(result.isNew).toBe(true);
      expect(result.job.id).not.toBe('job_123_stale');
    });
  });

  describe('getJob', () => {
    it('should retrieve job by ID', async () => {
      const jobData = {
        id: 'job_123_test',
        signature: 'abc123',
        status: JobStatus.PENDING,
        city: 'Berlin',
        date: '2024-01-15',
        categories: ['DJ Sets/Electronic'],
        events: [],
        progress: {
          totalCategories: 1,
          completedCategories: 0,
          failedCategories: 0,
          categoryStates: {}
        },
        createdAt: '2024-01-15T10:00:00.000Z',
        updatedAt: '2024-01-15T10:00:00.000Z',
        ttlSeconds: 3600
      };

      mockRedisClient.get.mockResolvedValue(JSON.stringify(jobData));

      const result = await jobStore.getJob('job_123_test');

      expect(result).toEqual(jobData);
      expect(mockRedisClient.get).toHaveBeenCalledWith('jobs:job_123_test');
    });

    it('should return null for non-existent job', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await jobStore.getJob('job_nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('updateJob', () => {
    it('should update job with new data', async () => {
      const existingJob = {
        id: 'job_123_test',
        signature: 'abc123',
        status: JobStatus.PENDING,
        city: 'Berlin',
        date: '2024-01-15',
        categories: ['DJ Sets/Electronic'],
        events: [],
        progress: {
          totalCategories: 1,
          completedCategories: 0,
          failedCategories: 0,
          categoryStates: {}
        },
        createdAt: '2024-01-15T10:00:00.000Z',
        updatedAt: '2024-01-15T10:00:00.000Z',
        ttlSeconds: 3600
      };

      mockRedisClient.get.mockResolvedValue(JSON.stringify(existingJob));
      mockRedisClient.set.mockResolvedValue('OK');

      const updates = {
        status: JobStatus.RUNNING,
        startedAt: '2024-01-15T10:05:00.000Z'
      };

      await jobStore.updateJob('job_123_test', updates);

      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'jobs:job_123_test',
        expect.stringContaining('"status":"running"'),
        { ex: 3600 }
      );
    });

    it('should throw error for non-existent job', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      await expect(
        jobStore.updateJob('job_nonexistent', { status: JobStatus.RUNNING })
      ).rejects.toThrow();
    });
  });

  describe('Queue Operations', () => {
    it('should enqueue job', async () => {
      mockRedisClient.lpush.mockResolvedValue(1);

      await jobStore.enqueueJob('job_123_test');

      expect(mockRedisClient.lpush).toHaveBeenCalledWith('jobs:queue', 'job_123_test');
    });

    it('should dequeue job', async () => {
      mockRedisClient.blpop.mockResolvedValue(['jobs:queue', 'job_123_test']);

      const result = await jobStore.dequeueJob(10);

      expect(result).toBe('job_123_test');
      expect(mockRedisClient.blpop).toHaveBeenCalledWith('jobs:queue', 10);
    });

    it('should return null when no job in queue', async () => {
      mockRedisClient.blpop.mockResolvedValue(null);

      const result = await jobStore.dequeueJob(10);

      expect(result).toBeNull();
    });

    it('should get queue length', async () => {
      mockRedisClient.llen.mockResolvedValue(5);

      const result = await jobStore.getQueueLength();

      expect(result).toBe(5);
      expect(mockRedisClient.llen).toHaveBeenCalledWith('jobs:queue');
    });
  });

  describe('findJobBySignature', () => {
    it('should find job by signature', async () => {
      const jobData = {
        id: 'job_123_test',
        signature: 'abc123',
        status: JobStatus.PENDING
      };

      mockRedisClient.get
        .mockResolvedValueOnce('job_123_test') // Signature index
        .mockResolvedValueOnce(JSON.stringify(jobData)); // Job data

      const result = await jobStore.findJobBySignature('abc123');

      expect(result).toEqual(jobData);
    });

    it('should return null for non-existent signature', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await jobStore.findJobBySignature('nonexistent');

      expect(result).toBeNull();
    });

    it('should clean up stale signature index', async () => {
      mockRedisClient.get
        .mockResolvedValueOnce('job_123_test') // Signature index returns job ID
        .mockResolvedValueOnce(null); // But job doesn't exist

      mockRedisClient.del.mockResolvedValue(1);

      const result = await jobStore.findJobBySignature('abc123');

      expect(result).toBeNull();
      expect(mockRedisClient.del).toHaveBeenCalledWith('jobs:idx:signature:abc123');
    });
  });

  describe('isJobStale', () => {
    it('should detect old jobs as stale', () => {
      const oldJob = {
        id: 'job_123_old',
        signature: 'abc123',
        status: JobStatus.PENDING,
        city: 'Berlin',
        date: '2024-01-15',
        categories: ['DJ Sets/Electronic'],
        events: [],
        progress: {
          totalCategories: 1,
          completedCategories: 0,
          failedCategories: 0,
          categoryStates: {}
        },
        createdAt: new Date(Date.now() - 2000000).toISOString(), // Very old
        updatedAt: new Date(Date.now() - 2000000).toISOString(),
        ttlSeconds: 3600
      };

      expect(jobStore.isJobStale(oldJob)).toBe(true);
    });

    it('should detect fresh jobs as not stale', () => {
      const freshJob = {
        id: 'job_123_fresh',
        signature: 'abc123',
        status: JobStatus.PENDING,
        city: 'Berlin',
        date: '2024-01-15',
        categories: ['DJ Sets/Electronic'],
        events: [],
        progress: {
          totalCategories: 1,
          completedCategories: 0,
          failedCategories: 0,
          categoryStates: {}
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ttlSeconds: 3600
      };

      expect(jobStore.isJobStale(freshJob)).toBe(false);
    });

    it('should detect long-running jobs as stale', () => {
      const stuckJob = {
        id: 'job_123_stuck',
        signature: 'abc123',
        status: JobStatus.RUNNING,
        city: 'Berlin',
        date: '2024-01-15',
        categories: ['DJ Sets/Electronic'],
        events: [],
        progress: {
          totalCategories: 1,
          completedCategories: 0,
          failedCategories: 0,
          categoryStates: {}
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date(Date.now() - 800000).toISOString(), // Not updated for long time
        ttlSeconds: 3600
      };

      expect(jobStore.isJobStale(stuckJob)).toBe(true);
    });

    it('should detect old terminal jobs as stale', () => {
      const oldTerminalJob = {
        id: 'job_123_terminal',
        signature: 'abc123',
        status: JobStatus.SUCCESS,
        city: 'Berlin',
        date: '2024-01-15',
        categories: ['DJ Sets/Electronic'],
        events: [],
        progress: {
          totalCategories: 1,
          completedCategories: 1,
          failedCategories: 0,
          categoryStates: {}
        },
        createdAt: new Date(Date.now() - 400000).toISOString(), // 6+ minutes old
        updatedAt: new Date(Date.now() - 400000).toISOString(),
        ttlSeconds: 3600
      };

      expect(jobStore.isJobStale(oldTerminalJob)).toBe(true);
    });
  });

  describe('deleteJob', () => {
    it('should delete job and signature index', async () => {
      const jobData = {
        id: 'job_123_test',
        signature: 'abc123'
      };

      mockRedisClient.get.mockResolvedValue(JSON.stringify(jobData));
      mockRedisClient.del.mockResolvedValue(1);

      await jobStore.deleteJob('job_123_test');

      expect(mockRedisClient.del).toHaveBeenCalledWith('jobs:idx:signature:abc123');
      expect(mockRedisClient.del).toHaveBeenCalledWith('jobs:job_123_test');
    });

    it('should handle deletion of non-existent job', async () => {
      mockRedisClient.get.mockResolvedValue(null);
      mockRedisClient.del.mockResolvedValue(0);

      await jobStore.deleteJob('job_nonexistent');

      expect(mockRedisClient.del).toHaveBeenCalledWith('jobs:job_nonexistent');
    });
  });
});