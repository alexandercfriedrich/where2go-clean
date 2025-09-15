/**
 * Test for reproducing the exact issue described in the bug report.
 * API calls with includeEvents=true&aggregateFromCache=true return no events.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET } from '../../../app/api/events/jobs/[jobId]/route';
import { NextRequest } from 'next/server';
import { JobStatus } from '../../../lib/new-backend/types/jobs';

// Mock the dependencies
const mockJob = {
  id: 'test-job-123',
  city: 'Berlin',
  date: '2024-01-15',
  categories: ['DJ Sets/Electronic', 'Clubs/Discos'],
  status: JobStatus.RUNNING,
  events: [], // No events in job yet
  progress: {
    totalCategories: 2,
    completedCategories: 0,
    failedCategories: 0,
    categoryStates: {}
  },
  createdAt: '2024-01-15T10:00:00.000Z',
  updatedAt: '2024-01-15T10:00:00.000Z'
};

const mockCachedEvents = [
  {
    title: 'Electronic Night',
    category: 'DJ Sets/Electronic',
    date: '2024-01-15',
    time: '22:00',
    venue: 'Watergate',
    price: '15€',
    website: 'https://watergate.de'
  },
  {
    title: 'Club Night',
    category: 'Clubs/Discos',
    date: '2024-01-15',
    time: '23:00',
    venue: 'Berghain',
    price: '20€',
    website: 'https://berghain.de'
  }
];

const mockCacheResult = {
  cachedEvents: {
    'DJ Sets/Electronic': [mockCachedEvents[0]],
    'Clubs/Discos': [mockCachedEvents[1]]
  },
  missingCategories: [],
  cacheMetadata: {
    'DJ Sets/Electronic': {
      cachedAt: '2024-01-15T09:00:00.000Z',
      ttlSeconds: 3600,
      expireAt: '2024-01-15T13:00:00.000Z', // Still valid
      eventCount: 1
    },
    'Clubs/Discos': {
      cachedAt: '2024-01-15T09:00:00.000Z',
      ttlSeconds: 3600,
      expireAt: '2024-01-15T13:00:00.000Z', // Still valid
      eventCount: 1
    }
  }
};

// Mock the job store
const mockJobStore = {
  getJob: vi.fn()
};

// Mock the event cache
const mockEventCache = {
  getEventsForCategories: vi.fn()
};

// Mock the modules
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

describe('Job Status API Events Bug Reproduction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset job to base state for each test
    mockJob.events = [];
    mockJob.status = JobStatus.RUNNING;
    
    // Setup default successful mocks
    mockJobStore.getJob.mockResolvedValue(mockJob);
    mockEventCache.getEventsForCategories.mockResolvedValue(mockCacheResult);
  });

  it('should return cached events when aggregateFromCache=true and job has no events', async () => {
    // Create a request with the exact parameters from the issue
    const request = new NextRequest('http://localhost/api/events/jobs/test-job-123?includeEvents=true&aggregateFromCache=true');
    const params = { params: { jobId: 'test-job-123' } };

    const response = await GET(request, params);
    const responseData = await response.json();

    // Verify that the response includes events from cache
    expect(response.status).toBe(200);
    expect(responseData.success).toBe(true);
    expect(responseData.data.events).toBeDefined();
    expect(responseData.data.events).toHaveLength(2);
    expect(responseData.data.events).toEqual(mockCachedEvents);
    
    // Verify cache info is included
    expect(responseData.data.cacheInfo).toBeDefined();
    expect(responseData.data.cacheInfo.totalCachedEvents).toBe(2);
    expect(responseData.data.cacheInfo.usedCachedEvents).toBe(true);
  });

  it('should use cached events when they have more events than job events', async () => {
    // Job has 1 event, cache has 2 events
    mockJob.events = [mockCachedEvents[0]];
    
    const request = new NextRequest('http://localhost/api/events/jobs/test-job-123?includeEvents=true&aggregateFromCache=true');
    const params = { params: { jobId: 'test-job-123' } };

    const response = await GET(request, params);
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.data.events).toHaveLength(2);
    expect(responseData.data.events).toEqual(mockCachedEvents);
    expect(responseData.data.cacheInfo.usedCachedEvents).toBe(true);
  });

  it('should still work when aggregateFromCache=false', async () => {
    const request = new NextRequest('http://localhost/api/events/jobs/test-job-123?includeEvents=true&aggregateFromCache=false');
    const params = { params: { jobId: 'test-job-123' } };

    const response = await GET(request, params);
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.data.events).toEqual([]); // Should use job events (empty)
    expect(responseData.data.cacheInfo).toBeUndefined(); // No cache aggregation
  });

  it('should handle the case when job status is not RUNNING but has no events', async () => {
    // This tests the condition: events.length === 0 || job.status === JobStatus.RUNNING
    mockJob.status = JobStatus.SUCCESS;
    mockJob.events = []; // No events but status is success

    const request = new NextRequest('http://localhost/api/events/jobs/test-job-123?includeEvents=true&aggregateFromCache=true');
    const params = { params: { jobId: 'test-job-123' } };

    const response = await GET(request, params);
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.data.events).toHaveLength(2);
    expect(responseData.data.events).toEqual(mockCachedEvents);
    expect(responseData.data.cacheInfo.usedCachedEvents).toBe(true);
  });

  it('should not aggregate from cache when condition is not met', async () => {
    // Job has events and is not running - should not aggregate from cache
    mockJob.status = JobStatus.SUCCESS;
    mockJob.events = [mockCachedEvents[0], mockCachedEvents[1]]; // Job has events

    const request = new NextRequest('http://localhost/api/events/jobs/test-job-123?includeEvents=true&aggregateFromCache=true');
    const params = { params: { jobId: 'test-job-123' } };

    const response = await GET(request, params);
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.data.events).toEqual(mockJob.events); // Should use job events
    expect(mockEventCache.getEventsForCategories).not.toHaveBeenCalled();
    expect(responseData.data.cacheInfo).toBeUndefined();
  });
});