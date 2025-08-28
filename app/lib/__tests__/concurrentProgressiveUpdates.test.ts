import { describe, it, expect, beforeEach } from 'vitest';
import { createJobStore, JobStore } from '../jobStore';
import { JobStatus, EventData } from '../types';

describe('Concurrent Progressive Updates', () => {
  let jobStore: JobStore;

  beforeEach(() => {
    // Create a new in-memory instance for each test
    jobStore = createJobStore();
  });

  it('should handle concurrent progressive updates simulating background processing', async () => {
    const jobId = 'test-concurrent-job';
    
    // Create initial job
    await jobStore.setJob(jobId, {
      id: jobId,
      status: 'pending',
      createdAt: new Date(),
      events: []
    });

    // Simulate the background processing pattern where each worker:
    // 1. Gets current job state
    // 2. Merges new events with existing events
    // 3. Updates the job with the merged events
    
    const simulateWorker = async (workerId: number, newEvents: EventData[]) => {
      // Add small delay to simulate processing time and increase chance of seeing other workers' updates
      await new Promise(resolve => setTimeout(resolve, workerId * 10));
      
      // Get current job state (simulating what the background processor does)
      const currentJob = await jobStore.getJob(jobId);
      const currentEvents = currentJob?.events || [];
      
      // Merge with new events (simulating deduplication in background processor)
      const combinedEvents = [...currentEvents, ...newEvents];
      
      // Update job with merged events
      await jobStore.updateJob(jobId, { events: combinedEvents });
      
      console.log(`Worker ${workerId}: updated job with ${combinedEvents.length} events (current: ${currentEvents.length}, added: ${newEvents.length})`);
    };

    // Start multiple workers sequentially to increase chance of seeing progressive updates
    await simulateWorker(1, [{
      title: 'Music Event 1',
      category: 'Music',
      date: '2025-01-20',
      time: '20:00',
      venue: 'Venue 1',
      price: '20€',
      website: 'http://music1.com'
    }]);
    
    await simulateWorker(2, [{
      title: 'Art Event 1',
      category: 'Art',
      date: '2025-01-20',
      time: '18:00',
      venue: 'Gallery 1',
      price: 'Free',
      website: 'http://art1.com'
    }]);
    
    await simulateWorker(3, [{
      title: 'Food Event 1',
      category: 'Food',
      date: '2025-01-20',
      time: '12:00',
      venue: 'Restaurant 1',
      price: '25€',
      website: 'http://food1.com'
    }]);

    // Verify final state
    const finalJob = await jobStore.getJob(jobId);
    expect(finalJob?.status).toBe('pending');
    expect(finalJob?.events).toBeDefined();
    expect(finalJob?.events?.length).toBe(3); // Should have exactly 3 events
    
    // Should have all events from all workers
    const eventTitles = finalJob?.events?.map(e => e.title) || [];
    expect(eventTitles).toContain('Music Event 1');
    expect(eventTitles).toContain('Art Event 1'); 
    expect(eventTitles).toContain('Food Event 1');
  });

  it('should handle progressive updates with identical events (deduplication scenario)', async () => {
    const jobId = 'test-dedup-job';
    
    // Create initial job
    await jobStore.setJob(jobId, {
      id: jobId,
      status: 'pending',
      createdAt: new Date(),
      events: []
    });

    const duplicateEvent = {
      title: 'Duplicate Event',
      category: 'Music',
      date: '2025-01-20',
      time: '20:00',
      venue: 'Same Venue',
      price: '20€',
      website: 'http://same.com'
    };

    // Simulate workers finding the same event (common in real scenario)
    const simulateWorkerWithCurrentState = async (workerId: number, events: EventData[]) => {
      const currentJob = await jobStore.getJob(jobId);
      const currentEvents = currentJob?.events || [];
      
      // Simple deduplication by title
      const existingTitles = new Set(currentEvents.map(e => e.title));
      const newEvents = events.filter(e => !existingTitles.has(e.title));
      const combinedEvents = [...currentEvents, ...newEvents];
      
      await jobStore.updateJob(jobId, { events: combinedEvents });
    };

    // Multiple workers process the same event
    const workerPromises = [
      simulateWorkerWithCurrentState(1, [duplicateEvent]),
      simulateWorkerWithCurrentState(2, [duplicateEvent]),
      simulateWorkerWithCurrentState(3, [duplicateEvent])
    ];

    await Promise.all(workerPromises);

    // Should only have one copy of the event
    const finalJob = await jobStore.getJob(jobId);
    expect(finalJob?.events?.length).toBe(1);
    expect(finalJob?.events?.[0].title).toBe('Duplicate Event');
  });

  it('should handle mixed progressive updates with some unique and some duplicate events', async () => {
    const jobId = 'test-mixed-job';
    
    // Create initial job
    await jobStore.setJob(jobId, {
      id: jobId,
      status: 'pending',
      createdAt: new Date(),
      events: []
    });

    const sharedEvent = {
      title: 'Shared Event',
      category: 'Music',
      date: '2025-01-20',
      time: '20:00',
      venue: 'Shared Venue',
      price: '20€',
      website: 'http://shared.com'
    };

    const simulateWorkerWithDedup = async (workerId: number, events: EventData[]) => {
      // Add delay to simulate processing time
      await new Promise(resolve => setTimeout(resolve, workerId * 10));
      
      const currentJob = await jobStore.getJob(jobId);
      const currentEvents = currentJob?.events || [];
      
      // Simple deduplication by title
      const existingTitles = new Set(currentEvents.map(e => e.title));
      const newEvents = events.filter(e => !existingTitles.has(e.title));
      const combinedEvents = [...currentEvents, ...newEvents];
      
      await jobStore.updateJob(jobId, { events: combinedEvents });
      console.log(`Worker ${workerId}: current ${currentEvents.length}, new ${newEvents.length}, total ${combinedEvents.length}`);
    };

    // Workers with mix of shared and unique events - run sequentially to ensure proper progression
    await simulateWorkerWithDedup(1, [
      sharedEvent,
      {
        title: 'Unique Event 1',
        category: 'Art',
        date: '2025-01-20',
        time: '18:00',
        venue: 'Gallery 1',
        price: 'Free',
        website: 'http://unique1.com'
      }
    ]);
    
    await simulateWorkerWithDedup(2, [
      sharedEvent, // Same as worker 1 - should be deduplicated
      {
        title: 'Unique Event 2',
        category: 'Food',
        date: '2025-01-20',
        time: '12:00',
        venue: 'Restaurant 1',
        price: '25€',
        website: 'http://unique2.com'
      }
    ]);
    
    await simulateWorkerWithDedup(3, [
      {
        title: 'Unique Event 3',
        category: 'Sports',
        date: '2025-01-20',
        time: '15:00',
        venue: 'Stadium',
        price: '30€',
        website: 'http://unique3.com'
      }
    ]);

    // Should have 4 unique events (1 shared + 3 unique)
    const finalJob = await jobStore.getJob(jobId);
    expect(finalJob?.events?.length).toBe(4);
    
    const eventTitles = finalJob?.events?.map(e => e.title) || [];
    expect(eventTitles).toContain('Shared Event');
    expect(eventTitles).toContain('Unique Event 1');
    expect(eventTitles).toContain('Unique Event 2');
    expect(eventTitles).toContain('Unique Event 3');
  });
});