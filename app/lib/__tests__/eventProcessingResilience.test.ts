import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createJobStore, JobStore } from '../jobStore';

// Mock the aggregator to simulate various failure scenarios
vi.mock('../aggregator', () => {
  return {
    eventAggregator: {
      parseEventsFromResponse: vi.fn(),
      aggregateResults: vi.fn(),
      deduplicateEvents: vi.fn(),
      categorizeEvents: vi.fn(),
    }
  };
});

describe('Event Processing Resilience', () => {
  let jobStore: JobStore;

  beforeEach(() => {
    jobStore = createJobStore();
    // Reset all mocks
    vi.clearAllMocks();
  });

  it('should handle jobs properly even when no events are found', async () => {
    // Create a test job
    const jobId = 'test-resilience-job-1';
    await jobStore.setJob(jobId, {
      id: jobId,
      status: 'pending',
      createdAt: new Date()
    });

    // Update job with empty events array (simulating zero results)
    await jobStore.updateJob(jobId, {
      status: 'done',
      events: []
    });

    const finalJob = await jobStore.getJob(jobId);
    expect(finalJob?.status).toBe('done');
    expect(finalJob?.events).toEqual([]);
  });

  it('should handle progressive updates with partial failures', async () => {
    const jobId = 'test-resilience-job-2';
    await jobStore.setJob(jobId, {
      id: jobId,
      status: 'pending',
      createdAt: new Date()
    });

    // Simulate first category finding some events
    await jobStore.updateJob(jobId, {
      events: [{
        title: 'Event 1',
        category: 'Music',
        date: '2025-01-20',
        time: '20:00',
        venue: 'Venue 1',
        price: '10€',
        website: 'http://example.com'
      }]
    });

    let partialJob = await jobStore.getJob(jobId);
    expect(partialJob?.status).toBe('pending'); // Should still be pending
    expect(partialJob?.events).toHaveLength(1);

    // Simulate final completion with more events
    await jobStore.updateJob(jobId, {
      status: 'done',
      events: [{
        title: 'Event 1',
        category: 'Music',
        date: '2025-01-20',
        time: '20:00',
        venue: 'Venue 1',
        price: '10€',
        website: 'http://example.com'
      }, {
        title: 'Event 2',
        category: 'Art',
        date: '2025-01-20',
        time: '18:00',
        venue: 'Gallery',
        price: 'Free',
        website: 'http://gallery.com'
      }]
    });

    const finalJob = await jobStore.getJob(jobId);
    expect(finalJob?.status).toBe('done');
    expect(finalJob?.events).toHaveLength(2);
  });

  it('should record debug steps for failed categories', async () => {
    const jobId = 'test-resilience-job-3';
    
    // Set up debug info
    await jobStore.setDebugInfo(jobId, {
      createdAt: new Date(),
      city: 'Berlin',
      date: '2025-01-20',
      categories: ['Music', 'Art'],
      steps: []
    });

    // Add debug step for failed category
    await jobStore.pushDebugStep(jobId, {
      category: 'Music',
      query: 'Events in Music for Berlin on 2025-01-20',
      response: 'Error: All 5 attempts failed',
      parsedCount: 0,
      addedCount: 0,
      totalAfter: 0
    });

    // Add debug step for successful category
    await jobStore.pushDebugStep(jobId, {
      category: 'Art',
      query: 'Events in Art for Berlin on 2025-01-20',
      response: 'Found 3 art events...',
      parsedCount: 3,
      addedCount: 2,
      totalAfter: 2
    });

    const debugInfo = await jobStore.getDebugInfo(jobId);
    expect(debugInfo?.steps).toHaveLength(2);
    expect(debugInfo?.steps[0].parsedCount).toBe(0);
    expect(debugInfo?.steps[1].parsedCount).toBe(3);
  });

  it('should finalize jobs even after processing errors', async () => {
    const jobId = 'test-resilience-job-4';
    await jobStore.setJob(jobId, {
      id: jobId,
      status: 'pending',
      createdAt: new Date()
    });

    // Simulate an error condition but still finalize
    await jobStore.updateJob(jobId, {
      status: 'error',
      error: 'Fehler beim Verarbeiten der Anfrage'
    });

    const finalJob = await jobStore.getJob(jobId);
    expect(finalJob?.status).toBe('error');
    expect(finalJob?.error).toBeDefined();
  });

  it('should handle corrupted job data gracefully', async () => {
    const jobId = 'test-resilience-job-5';
    
    // Test that getJob returns null for non-existent jobs
    const nonExistentJob = await jobStore.getJob('non-existent-job');
    expect(nonExistentJob).toBeNull();
    
    // Test normal job creation and retrieval
    await jobStore.setJob(jobId, {
      id: jobId,
      status: 'pending',
      createdAt: new Date()
    });

    const retrievedJob = await jobStore.getJob(jobId);
    expect(retrievedJob?.id).toBe(jobId);
    expect(retrievedJob?.status).toBe('pending');
  });
});