/**
 * Test to reproduce the specific scenario where cache has events but they don't get returned.
 * This tests edge cases that might cause the issue described in the bug report.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET } from '../../../app/api/events/jobs/[jobId]/route';
import { NextRequest } from 'next/server';
import { JobStatus } from '../../../lib/new-backend/types/jobs';

const mockJobStore = {
  getJob: vi.fn()
};

const mockEventCache = {
  getEventsForCategories: vi.fn()
};

vi.mock('../../../lib/new-backend/redis/jobStore', () => ({
  getJobStore: () => mockJobStore
}));

vi.mock('../../../lib/new-backend/redis/eventCache', () => ({
  getEventCache: () => mockEventCache
}));

vi.mock('../../../lib/new-backend/validation/schemas', () => ({
  JobIdSchema: { parse: (id: string) => id },
  safeValidate: () => ({ success: true })
}));

describe('Event Cache Bug Edge Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle the case where cache returns empty cachedEvents but has missing categories', async () => {
    // This simulates the scenario described in the issue where cache checks succeed
    // but cachedEvents is empty due to expired or missing cache entries
    const mockJob = {
      id: 'test-job-123',
      city: 'Berlin',
      date: '2024-01-15',
      categories: ['DJ Sets/Electronic', 'Clubs/Discos'],
      status: JobStatus.RUNNING,
      events: [],
      progress: { totalCategories: 2, completedCategories: 0, failedCategories: 0, categoryStates: {} },
      createdAt: '2024-01-15T10:00:00.000Z',
      updatedAt: '2024-01-15T10:00:00.000Z'
    };

    // Cache check succeeds but returns empty cachedEvents (all categories missing)
    const mockCacheResult = {
      cachedEvents: {}, // Empty - this is the key issue!
      missingCategories: ['DJ Sets/Electronic', 'Clubs/Discos'],
      cacheMetadata: {}
    };

    mockJobStore.getJob.mockResolvedValue(mockJob);
    mockEventCache.getEventsForCategories.mockResolvedValue(mockCacheResult);

    const request = new NextRequest('http://localhost/api/events/jobs/test-job-123?includeEvents=true&aggregateFromCache=true');
    const params = { params: { jobId: 'test-job-123' } };

    const response = await GET(request, params);
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.data.events).toEqual([]); // No events should be returned
    expect(responseData.data.cacheInfo.totalCachedEvents).toBe(0);
    expect(responseData.data.cacheInfo.usedCachedEvents).toBe(false);
  });

  it('should handle the case where job has events but cache has fewer events', async () => {
    // This tests the condition cachedEvents.length > events.length
    const jobEvents = [
      { title: 'Job Event 1', category: 'DJ Sets/Electronic', date: '2024-01-15', time: '20:00', venue: 'Venue1', price: '10€', website: 'https://1.com' },
      { title: 'Job Event 2', category: 'Clubs/Discos', date: '2024-01-15', time: '22:00', venue: 'Venue2', price: '15€', website: 'https://2.com' }
    ];

    const cachedEvents = [
      { title: 'Cached Event 1', category: 'DJ Sets/Electronic', date: '2024-01-15', time: '21:00', venue: 'CachedVenue', price: '12€', website: 'https://cached.com' }
    ];

    const mockJob = {
      id: 'test-job-123',
      city: 'Berlin',
      date: '2024-01-15',
      categories: ['DJ Sets/Electronic', 'Clubs/Discos'],
      status: JobStatus.RUNNING,
      events: jobEvents, // Job has 2 events
      progress: { totalCategories: 2, completedCategories: 2, failedCategories: 0, categoryStates: {} },
      createdAt: '2024-01-15T10:00:00.000Z',
      updatedAt: '2024-01-15T10:00:00.000Z'
    };

    const mockCacheResult = {
      cachedEvents: {
        'DJ Sets/Electronic': [cachedEvents[0]] // Cache has only 1 event
      },
      missingCategories: ['Clubs/Discos'],
      cacheMetadata: {
        'DJ Sets/Electronic': {
          cachedAt: '2024-01-15T09:00:00.000Z',
          ttlSeconds: 3600,
          expireAt: '2024-01-15T13:00:00.000Z',
          eventCount: 1
        }
      }
    };

    mockJobStore.getJob.mockResolvedValue(mockJob);
    mockEventCache.getEventsForCategories.mockResolvedValue(mockCacheResult);

    const request = new NextRequest('http://localhost/api/events/jobs/test-job-123?includeEvents=true&aggregateFromCache=true');
    const params = { params: { jobId: 'test-job-123' } };

    const response = await GET(request, params);
    const responseData = await response.json();

    expect(response.status).toBe(200);
    // Since cachedEvents.length (1) < events.length (2), job events should be used
    expect(responseData.data.events).toEqual(jobEvents);
    expect(responseData.data.cacheInfo.totalCachedEvents).toBe(1);
    expect(responseData.data.cacheInfo.usedCachedEvents).toBe(false); // Cache events not used!
  });

  it('should handle the case where cache check fails but job succeeds', async () => {
    const mockJob = {
      id: 'test-job-123',
      city: 'Berlin',
      date: '2024-01-15',
      categories: ['DJ Sets/Electronic'],
      status: JobStatus.RUNNING,
      events: [],
      progress: { totalCategories: 1, completedCategories: 0, failedCategories: 0, categoryStates: {} },
      createdAt: '2024-01-15T10:00:00.000Z',
      updatedAt: '2024-01-15T10:00:00.000Z'
    };

    mockJobStore.getJob.mockResolvedValue(mockJob);
    mockEventCache.getEventsForCategories.mockRejectedValue(new Error('Cache error'));

    const request = new NextRequest('http://localhost/api/events/jobs/test-job-123?includeEvents=true&aggregateFromCache=true');
    const params = { params: { jobId: 'test-job-123' } };

    const response = await GET(request, params);
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.data.events).toEqual([]);
    expect(responseData.data.cacheInfo).toBeUndefined();
  });

  it('should handle partial cache hits correctly', async () => {
    // This tests when some categories are cached and some are missing
    const cachedEvent = { title: 'Cached Event', category: 'DJ Sets/Electronic', date: '2024-01-15', time: '21:00', venue: 'CachedVenue', price: '12€', website: 'https://cached.com' };

    const mockJob = {
      id: 'test-job-123',
      city: 'Berlin',
      date: '2024-01-15',
      categories: ['DJ Sets/Electronic', 'Clubs/Discos', 'Concerts'],
      status: JobStatus.RUNNING,
      events: [], // No job events
      progress: { totalCategories: 3, completedCategories: 1, failedCategories: 0, categoryStates: {} },
      createdAt: '2024-01-15T10:00:00.000Z',
      updatedAt: '2024-01-15T10:00:00.000Z'
    };

    const mockCacheResult = {
      cachedEvents: {
        'DJ Sets/Electronic': [cachedEvent] // Only 1 category cached
      },
      missingCategories: ['Clubs/Discos', 'Concerts'], // 2 categories missing
      cacheMetadata: {
        'DJ Sets/Electronic': {
          cachedAt: '2024-01-15T09:00:00.000Z',
          ttlSeconds: 3600,
          expireAt: '2024-01-15T13:00:00.000Z',
          eventCount: 1
        }
      }
    };

    mockJobStore.getJob.mockResolvedValue(mockJob);
    mockEventCache.getEventsForCategories.mockResolvedValue(mockCacheResult);

    const request = new NextRequest('http://localhost/api/events/jobs/test-job-123?includeEvents=true&aggregateFromCache=true');
    const params = { params: { jobId: 'test-job-123' } };

    const response = await GET(request, params);
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.data.events).toEqual([cachedEvent]); // Should use cached events
    expect(responseData.data.cacheInfo.totalCachedEvents).toBe(1);
    expect(responseData.data.cacheInfo.cachedCategories).toEqual(['DJ Sets/Electronic']);
    expect(responseData.data.cacheInfo.missingCategories).toEqual(['Clubs/Discos', 'Concerts']);
    expect(responseData.data.cacheInfo.usedCachedEvents).toBe(true);
  });
});