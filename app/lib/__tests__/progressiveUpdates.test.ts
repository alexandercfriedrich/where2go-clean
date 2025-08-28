import { describe, it, expect, beforeEach } from 'vitest';
import { createJobStore, JobStore } from '../jobStore';
import { JobStatus, EventData } from '../types';

describe('Progressive Updates with Concurrency', () => {
  let jobStore: JobStore;

  beforeEach(() => {
    // Create a new in-memory instance for each test
    jobStore = createJobStore();
  });

  it('should handle concurrent progressive updates correctly', async () => {
    const jobId = 'test-progressive-job';
    
    // Create initial job
    await jobStore.setJob(jobId, {
      id: jobId,
      status: 'pending',
      createdAt: new Date(),
      events: []
    });

    // Simulate concurrent updates from multiple categories
    const updatePromises = [];
    
    // Category 1: Music events
    updatePromises.push(
      jobStore.updateJob(jobId, {
        events: [{
          title: 'Concert 1',
          category: 'Music',
          date: '2025-01-20',
          time: '20:00',
          venue: 'Venue 1',
          price: '20€',
          website: 'http://example1.com'
        }]
      })
    );

    // Category 2: Art events
    updatePromises.push(
      jobStore.updateJob(jobId, {
        events: [{
          title: 'Concert 1',
          category: 'Music',
          date: '2025-01-20',
          time: '20:00',
          venue: 'Venue 1',
          price: '20€',
          website: 'http://example1.com'
        }, {
          title: 'Art Show 1',
          category: 'Art',
          date: '2025-01-20',
          time: '18:00',
          venue: 'Gallery 1',
          price: 'Free',
          website: 'http://gallery1.com'
        }]
      })
    );

    // Category 3: Food events
    updatePromises.push(
      jobStore.updateJob(jobId, {
        events: [{
          title: 'Concert 1',
          category: 'Music',
          date: '2025-01-20',
          time: '20:00',
          venue: 'Venue 1',
          price: '20€',
          website: 'http://example1.com'
        }, {
          title: 'Art Show 1',
          category: 'Art',
          date: '2025-01-20',
          time: '18:00',
          venue: 'Gallery 1',
          price: 'Free',
          website: 'http://gallery1.com'
        }, {
          title: 'Food Festival',
          category: 'Food',
          date: '2025-01-20',
          time: '12:00',
          venue: 'Park',
          price: '15€',
          website: 'http://foodfest.com'
        }]
      })
    );

    // Wait for all updates to complete
    await Promise.all(updatePromises);

    // Verify final state
    const finalJob = await jobStore.getJob(jobId);
    expect(finalJob?.status).toBe('pending'); // Should still be pending
    expect(finalJob?.events).toBeDefined();
    expect(finalJob?.events?.length).toBeGreaterThan(0);
    
    // The final result should contain all events (the latest progressive state)
    expect(finalJob?.events?.length).toBe(3);
    
    // Verify all expected events are present
    const eventTitles = finalJob?.events?.map(e => e.title);
    expect(eventTitles).toContain('Concert 1');
    expect(eventTitles).toContain('Art Show 1'); 
    expect(eventTitles).toContain('Food Festival');
  });

  it('should preserve job status during progressive event updates', async () => {
    const jobId = 'test-status-preservation';
    
    // Create initial job
    await jobStore.setJob(jobId, {
      id: jobId,
      status: 'pending',
      createdAt: new Date(),
      events: []
    });

    // Simulate progressive event update
    await jobStore.updateJob(jobId, {
      events: [{
        title: 'Test Event',
        category: 'Music',
        date: '2025-01-20',
        time: '20:00',
        venue: 'Test Venue',
        price: '10€',
        website: 'http://test.com'
      }]
    });

    // Check that status is preserved
    const job = await jobStore.getJob(jobId);
    expect(job?.status).toBe('pending');
    expect(job?.events?.length).toBe(1);

    // Update status separately
    await jobStore.updateJob(jobId, {
      status: 'done'
    });

    // Check that events are preserved when status is updated
    const finalJob = await jobStore.getJob(jobId);
    expect(finalJob?.status).toBe('done');
    expect(finalJob?.events?.length).toBe(1);
    expect(finalJob?.events?.[0].title).toBe('Test Event');
  });

  it('should handle rapid sequential updates without data loss', async () => {
    const jobId = 'test-rapid-updates';
    
    // Create initial job
    await jobStore.setJob(jobId, {
      id: jobId,
      status: 'pending',
      createdAt: new Date(),
      events: []
    });

    // Simulate rapid sequential updates (like real background processing)
    const eventSets = [
      [{
        title: 'Event 1',
        category: 'Music',
        date: '2025-01-20',
        time: '20:00',
        venue: 'Venue 1',
        price: '20€',
        website: 'http://example1.com'
      }],
      [{
        title: 'Event 1',
        category: 'Music',
        date: '2025-01-20',
        time: '20:00',
        venue: 'Venue 1',
        price: '20€',
        website: 'http://example1.com'
      }, {
        title: 'Event 2',
        category: 'Art',
        date: '2025-01-20',
        time: '18:00',
        venue: 'Gallery',
        price: 'Free',
        website: 'http://gallery.com'
      }],
      [{
        title: 'Event 1',
        category: 'Music',
        date: '2025-01-20',
        time: '20:00',
        venue: 'Venue 1',
        price: '20€',
        website: 'http://example1.com'
      }, {
        title: 'Event 2',
        category: 'Art',
        date: '2025-01-20',
        time: '18:00',
        venue: 'Gallery',
        price: 'Free',
        website: 'http://gallery.com'
      }, {
        title: 'Event 3',
        category: 'Food',
        date: '2025-01-20',
        time: '12:00',
        venue: 'Restaurant',
        price: '25€',
        website: 'http://restaurant.com'
      }]
    ];

    // Apply updates sequentially with small delays (simulating real processing)
    for (let i = 0; i < eventSets.length; i++) {
      await jobStore.updateJob(jobId, {
        events: eventSets[i]
      });
      
      // Small delay to simulate processing time
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Verify progressive state
      const job = await jobStore.getJob(jobId);
      expect(job?.events?.length).toBe(i + 1);
      expect(job?.status).toBe('pending');
    }

    // Final verification
    const finalJob = await jobStore.getJob(jobId);
    expect(finalJob?.events?.length).toBe(3);
    expect(finalJob?.status).toBe('pending');
  });
});