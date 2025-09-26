import { describe, it, expect, beforeEach } from 'vitest';
import { getJobStore } from '../jobStore';
import { JobStatus, EventData } from '../types';

describe('Job Reuse - Problem Statement Scenario', () => {
  let jobStore: any;

  beforeEach(() => {
    jobStore = getJobStore();
  });

  it('should prevent event fragmentation by reusing active jobs for same search parameters', async () => {
    const city = 'Wien';
    const date = '2025-01-20';
    const categories = ['Musik', 'Theater'];
    
    // Simulate first request creating a job
    const firstJobId = 'job_1758891627029_eafxigvux';
    const firstJob: JobStatus = {
      id: firstJobId,
      status: 'processing',
      events: [
        {
          title: 'Concert at Musikverein',
          category: 'Musik',
          date: '2025-01-20',
          time: '19:30',
          venue: 'Wiener Musikverein',
          price: '€25-50',
          website: 'https://musikverein.at'
        }
      ],
      createdAt: new Date(),
      progress: { completedCategories: 0, totalCategories: 2 }
    };

    await jobStore.setJob(firstJobId, firstJob);

    // Create active job mapping (10 minute TTL)
    const activeJobKey = `city=${city}|date=${date}|cats=${categories.sort().join(',')}`;
    await jobStore.setActiveJob(activeJobKey, firstJobId, 600);

    // Simulate second request (like user refreshing or repeat search)
    const existingJobId = await jobStore.getActiveJob(activeJobKey);
    expect(existingJobId).toBe(firstJobId);

    // Verify the existing job is still processing and should be reused
    const existingJob = await jobStore.getJob(existingJobId!);
    expect(existingJob).toBeTruthy();
    expect(existingJob!.status).toBe('processing');

    // Simulate PPLX results arriving late to the existing job
    const updatedEvents: EventData[] = [
      ...existingJob!.events!,
      {
        title: 'Theater Performance',
        category: 'Theater',
        date: '2025-01-20',
        time: '20:00',
        venue: 'Burgtheater',
        price: '€30-60',
        website: 'https://burgtheater.at'
      }
    ];

    await jobStore.updateJob(firstJobId, { 
      events: updatedEvents,
      progress: { completedCategories: 2, totalCategories: 2 },
      status: 'done'
    });

    // Verify all events are in the same job
    const finalJob = await jobStore.getJob(firstJobId);
    expect(finalJob!.events).toHaveLength(2);
    expect(finalJob!.events!.map(e => e.category).sort()).toEqual(['Musik', 'Theater']);
    expect(finalJob!.status).toBe('done');
  });

  it('should handle different category orders as the same search', async () => {
    const city = 'Berlin';
    const date = '2025-01-21';
    
    // Two requests with same categories but different order
    const categories1 = ['Musik', 'Theater', 'Kunst'];
    const categories2 = ['Theater', 'Kunst', 'Musik'];
    
    const key1 = `city=${city}|date=${date}|cats=${categories1.sort().join(',')}`;
    const key2 = `city=${city}|date=${date}|cats=${categories2.sort().join(',')}`;
    
    // Both should generate the same key
    expect(key1).toBe(key2);
    expect(key1).toBe('city=Berlin|date=2025-01-21|cats=Kunst,Musik,Theater');
  });

  it('should create different jobs for different search parameters', async () => {
    const jobId1 = 'job_test_1';
    const jobId2 = 'job_test_2';
    
    // Different cities should create different active job mappings
    const key1 = 'city=Wien|date=2025-01-20|cats=Musik';
    const key2 = 'city=Berlin|date=2025-01-20|cats=Musik';
    
    await jobStore.setActiveJob(key1, jobId1, 600);
    await jobStore.setActiveJob(key2, jobId2, 600);
    
    expect(await jobStore.getActiveJob(key1)).toBe(jobId1);
    expect(await jobStore.getActiveJob(key2)).toBe(jobId2);
    
    // Different dates should also create different mappings
    const key3 = 'city=Wien|date=2025-01-21|cats=Musik';
    const jobId3 = 'job_test_3';
    await jobStore.setActiveJob(key3, jobId3, 600);
    
    expect(await jobStore.getActiveJob(key3)).toBe(jobId3);
    expect(await jobStore.getActiveJob(key1)).toBe(jobId1); // Original should be unchanged
  });

  it('should allow new jobs after TTL expiry', async () => {
    const key = 'city=Hamburg|date=2025-01-20|cats=Musik';
    const jobId1 = 'job_test_old';
    const jobId2 = 'job_test_new';
    
    // Set active job with short TTL
    await jobStore.setActiveJob(key, jobId1, 1); // 1 second
    expect(await jobStore.getActiveJob(key)).toBe(jobId1);
    
    // Wait for expiry
    await new Promise(resolve => setTimeout(resolve, 1100));
    
    // Should return null after expiry
    expect(await jobStore.getActiveJob(key)).toBeNull();
    
    // Should be able to set new active job
    await jobStore.setActiveJob(key, jobId2, 600);
    expect(await jobStore.getActiveJob(key)).toBe(jobId2);
  });
});