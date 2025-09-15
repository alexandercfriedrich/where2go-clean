import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST } from '../../api/events/jobs/route';
import { getJobStore } from '../../../lib/new-backend/redis/jobStore';
import { NewEventsWorker } from '../../../worker/new-events-worker';

// Mock the NewEventsWorker to avoid actual processing in tests
vi.mock('../../../worker/new-events-worker', () => {
  return {
    NewEventsWorker: vi.fn().mockImplementation(() => ({
      processJob: vi.fn().mockResolvedValue(undefined)
    }))
  };
});

describe('Inline Job Processing', () => {
  const jobStore = getJobStore();

  beforeEach(async () => {
    // Clear all mocks
    vi.clearAllMocks();
    // Note: No reliable cleanup method available, using unique test data instead
  });

  it('should start worker processing directly when creating new job', async () => {
    // Use unique values to avoid test interference (letters only for city names)
    const uniqueDate = '2025-01-' + String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
    const uniqueCity = 'Berlin Test City'; // Simple valid city name
    
    const request = new Request('http://localhost:3000/api/events/jobs', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'host': 'localhost:3000'
      },
      body: JSON.stringify({
        city: uniqueCity,
        date: uniqueDate,
        categories: ['DJ Sets/Electronic'],
        options: { 
          ttlSeconds: 3600
        }
      })
    });

    const response = await POST(request as any);
    const result = await response.json();

    expect(response.status).toBe(201); // New job created
    expect(result.success).toBe(true);
    expect(result.data.isNew).toBe(true);

    // Verify NewEventsWorker was instantiated and processJob was called
    expect(NewEventsWorker).toHaveBeenCalled();
    const workerInstance = (NewEventsWorker as any).mock.results[0].value;
    expect(workerInstance.processJob).toHaveBeenCalledWith(result.data.job.id);
  });

  it('should not start processing for existing job (reuse case)', async () => {
    // Use fixed values for testing reuse logic
    const testDate = '2025-01-25';
    const testCity = 'Munich Reuse Test';
    
    // Create first job
    const request1 = new Request('http://localhost:3000/api/events/jobs', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'host': 'localhost:3000'
      },
      body: JSON.stringify({
        city: testCity,
        date: testDate,
        categories: ['DJ Sets/Electronic'],
        options: { ttlSeconds: 3600 }
      })
    });

    await POST(request1 as any);
    vi.clearAllMocks(); // Clear the mock after first call

    // Make same request again (should reuse)
    const request2 = new Request('http://localhost:3000/api/events/jobs', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'host': 'localhost:3000'
      },
      body: JSON.stringify({
        city: testCity,
        date: testDate,
        categories: ['DJ Sets/Electronic'],
        options: { ttlSeconds: 3600 }
      })
    });

    const response = await POST(request2 as any);
    const result = await response.json();

    expect(response.status).toBe(200); // Existing job reused
    expect(result.data.isNew).toBe(false);

    // Verify NewEventsWorker was NOT called for reused job
    expect(NewEventsWorker).not.toHaveBeenCalled();
  });
});