import { describe, it, expect, beforeEach, vi } from 'vitest';
import { processJobInBackground } from '../../api/events/process/backgroundProcessor';
import { JobStatus, ProgressState } from '../../../lib/new-backend/types/jobs';

// Mock dependencies
vi.mock('../../../lib/new-backend/redis/jobStore', () => ({
  getJobStore: () => ({
    updateJob: vi.fn().mockResolvedValue(undefined)
  })
}));

vi.mock('../../../lib/new-backend/redis/eventCache', () => ({
  getEventCache: () => ({
    getEventsForCategories: vi.fn().mockResolvedValue({ cachedEvents: {} }),
    cacheEvents: vi.fn().mockResolvedValue(undefined)
  })
}));

vi.mock('../../../lib/new-backend/services/perplexityClient', () => ({
  getPerplexityClient: () => ({
    queryGeneral: vi.fn().mockResolvedValue({ response: 'Mock event response' })
  })
}));

vi.mock('../../../lib/new-backend/utils/eventAggregator', () => ({
  deduplicateEvents: vi.fn().mockImplementation(events => events)
}));

vi.mock('../../../lib/new-backend/utils/log', () => ({
  createComponentLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  })
}));

describe('Progressive Background Processor', () => {
  const mockJobStore = {
    updateJob: vi.fn().mockResolvedValue(undefined)
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Setup job store mock
    vi.mocked(require('../../../lib/new-backend/redis/jobStore').getJobStore).mockReturnValue(mockJobStore);
  });

  it('should implement progressive event updates', async () => {
    const jobId = 'test-job-123';
    const city = 'Berlin';
    const date = '2024-01-15';
    const categories = ['Music', 'Theater'];

    await processJobInBackground(jobId, city, date, categories);

    // Check that job was updated multiple times
    expect(mockJobStore.updateJob).toHaveBeenCalledTimes(5);
    
    // Check initial RUNNING status
    expect(mockJobStore.updateJob).toHaveBeenNthCalledWith(1, jobId, expect.objectContaining({
      status: JobStatus.RUNNING,
      progress: expect.objectContaining({
        completedCategories: 0,
        totalCategories: 2,
        failedCategories: 0
      })
    }));

    // Check progressive updates during processing
    expect(mockJobStore.updateJob).toHaveBeenNthCalledWith(2, jobId, expect.objectContaining({
      progress: expect.objectContaining({
        categoryStates: expect.objectContaining({
          'Music': expect.objectContaining({
            state: ProgressState.IN_PROGRESS
          })
        })
      })
    }));
  });

  it('should handle category timeouts properly', async () => {
    const jobId = 'test-job-timeout';
    const city = 'Berlin';
    const date = '2024-01-15';
    const categories = ['Music'];
    const options = { perCategoryTimeoutMs: 100 }; // Very short timeout

    // Mock a slow response to trigger timeout
    const mockPerplexity = {
      queryGeneral: vi.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ response: 'Slow response' }), 200))
      )
    };
    vi.mocked(require('../../../lib/new-backend/services/perplexityClient').getPerplexityClient).mockReturnValue(mockPerplexity);

    await processJobInBackground(jobId, city, date, categories, options);

    // Should still complete with failed status for the category
    expect(mockJobStore.updateJob).toHaveBeenCalled();
  });

  it('should determine final status correctly', async () => {
    const jobId = 'test-job-status';
    const city = 'Berlin';
    const date = '2024-01-15';
    const categories = ['Music', 'Theater'];

    await processJobInBackground(jobId, city, date, categories);

    // Check final status update
    const finalCall = mockJobStore.updateJob.mock.calls[mockJobStore.updateJob.mock.calls.length - 1];
    expect(finalCall[1]).toHaveProperty('status');
    expect(finalCall[1]).toHaveProperty('completedAt');
    expect(finalCall[1]).toHaveProperty('events');
  });

  it('should increment completedCategories after category finishes', async () => {
    const jobId = 'test-job-progress';
    const city = 'Berlin';
    const date = '2024-01-15';
    const categories = ['Music'];

    await processJobInBackground(jobId, city, date, categories);

    // Find the progressive update call
    const progressUpdateCalls = mockJobStore.updateJob.mock.calls.filter(call => 
      call[1].events && call[1].progress
    );

    expect(progressUpdateCalls.length).toBeGreaterThan(0);
    
    // Check that completedCategories is properly incremented
    const lastProgressUpdate = progressUpdateCalls[progressUpdateCalls.length - 1];
    expect(lastProgressUpdate[1].progress.completedCategories).toBe(1);
  });

  it('should apply inter-category delays', async () => {
    const jobId = 'test-job-delay';
    const city = 'Berlin';
    const date = '2024-01-15';
    const categories = ['Music', 'Theater', 'Sports'];
    const options = { interCategoryDelayMs: 100 };

    const startTime = Date.now();
    await processJobInBackground(jobId, city, date, categories, options);
    const endTime = Date.now();

    // Should take at least 200ms for 2 delays between 3 categories
    expect(endTime - startTime).toBeGreaterThan(200);
  });

  it('should include timestamps in category states', async () => {
    const jobId = 'test-job-timestamps';
    const city = 'Berlin';
    const date = '2024-01-15';
    const categories = ['Music'];

    await processJobInBackground(jobId, city, date, categories);

    // Check for startedAt in progress update
    const progressUpdate = mockJobStore.updateJob.mock.calls.find(call => 
      call[1].progress?.categoryStates?.Music?.state === ProgressState.IN_PROGRESS
    );

    expect(progressUpdate).toBeDefined();
    expect(progressUpdate[1].progress.categoryStates.Music).toHaveProperty('startedAt');
  });
});