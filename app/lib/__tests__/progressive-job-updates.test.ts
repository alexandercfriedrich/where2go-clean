import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getJobStore } from '../jobStore';
import { EventData } from '../types';

// Mock events for testing
const createMockEvents = (category: string, count: number): EventData[] => {
  return Array.from({ length: count }, (_, i) => ({
    title: `${category} Event ${i + 1}`,
    category,
    date: '2025-01-20',
    time: `${20 + i}:00`,
    venue: `Venue ${i + 1}`,
    price: `${10 + i}€`,
    website: 'https://test.com'
  }));
};

describe('Progressive Job Updates Test', () => {
  const jobStore = getJobStore();
  const testJobId = 'test-progressive-job';

  beforeEach(async () => {
    // Clean up any existing test jobs
    try {
      await jobStore.deleteJob(testJobId);
    } catch {
      // Ignore if job doesn't exist
    }
  });

  afterEach(async () => {
    // Clean up after test
    try {
      await jobStore.deleteJob(testJobId);
    } catch {
      // Ignore cleanup errors
    }
  });

  it('should update job progressively as categories are processed', async () => {
    // SCENARIO: Simulate how background processing should work
    // 1. Create initial job with empty events
    // 2. Process categories one by one, updating job after each
    // 3. Verify that job is updated progressively, not all at once
    
    const initialJob = {
      id: testJobId,
      status: 'processing' as const,
      events: [],
      createdAt: new Date(),
      progress: {
        completedCategories: 0,
        totalCategories: 3
      }
    };
    
    await jobStore.setJob(testJobId, initialJob);
    
    // Simulate processing first category
    const category1Events = createMockEvents('DJ Sets/Electronic', 2);
    await jobStore.updateJob(testJobId, {
      events: category1Events,
      progress: {
        completedCategories: 1,
        totalCategories: 3
      }
    });
    
    // Check progressive update 1
    let job = await jobStore.getJob(testJobId);
    expect(job?.events).toHaveLength(2);
    expect(job?.progress?.completedCategories).toBe(1);
    expect(job?.status).toBe('processing');
    
    // Simulate processing second category (add to existing events)
    const category2Events = createMockEvents('Clubs/Discos', 3);
    const allEventsAfterCategory2 = [...category1Events, ...category2Events];
    
    await jobStore.updateJob(testJobId, {
      events: allEventsAfterCategory2,
      progress: {
        completedCategories: 2,
        totalCategories: 3
      }
    });
    
    // Check progressive update 2
    job = await jobStore.getJob(testJobId);
    expect(job?.events).toHaveLength(5); // 2 + 3
    expect(job?.progress?.completedCategories).toBe(2);
    expect(job?.status).toBe('processing');
    
    // Simulate processing third category (final)
    const category3Events = createMockEvents('Live-Konzerte', 1);
    const allFinalEvents = [...allEventsAfterCategory2, ...category3Events];
    
    await jobStore.updateJob(testJobId, {
      status: 'done',
      events: allFinalEvents,
      progress: {
        completedCategories: 3,
        totalCategories: 3
      }
    });
    
    // Check final state
    job = await jobStore.getJob(testJobId);
    expect(job?.events).toHaveLength(6); // 2 + 3 + 1
    expect(job?.progress?.completedCategories).toBe(3);
    expect(job?.status).toBe('done');
    
    console.log('✅ PROGRESSIVE UPDATES VERIFIED:');
    console.log('  - Job updated after each category completion');
    console.log('  - Events accumulated progressively (2 → 5 → 6)');
    console.log('  - Status and progress updated correctly');
  });

  it('should demonstrate the problem: all events shown at once vs progressively', async () => {
    // This test demonstrates what the user might be experiencing
    
    const allCategories = ['DJ Sets/Electronic', 'Clubs/Discos', 'Live-Konzerte'];
    const startTime = Date.now();
    
    // BAD APPROACH: Process all categories then update job once (all at once)
    console.log('🚫 BAD APPROACH: All events at once');
    const allEventsAtOnce: EventData[] = [];
    for (const category of allCategories) {
      const events = createMockEvents(category, 2);
      allEventsAtOnce.push(...events);
    }
    
    await jobStore.setJob(testJobId + '_bad', {
      id: testJobId + '_bad',
      status: 'done' as const,
      events: allEventsAtOnce, // All 6 events at once
      createdAt: new Date(),
      progress: {
        completedCategories: 3,
        totalCategories: 3
      }
    });
    
    // GOOD APPROACH: Update job after each category (progressive)
    console.log('✅ GOOD APPROACH: Progressive updates');
    await jobStore.setJob(testJobId + '_good', {
      id: testJobId + '_good', 
      status: 'processing' as const,
      events: [],
      createdAt: new Date(),
      progress: {
        completedCategories: 0,
        totalCategories: 3
      }
    });
    
    let accumulatedEvents: EventData[] = [];
    for (let i = 0; i < allCategories.length; i++) {
      const category = allCategories[i];
      const events = createMockEvents(category, 2);
      accumulatedEvents.push(...events);
      
      await jobStore.updateJob(testJobId + '_good', {
        events: [...accumulatedEvents], // Progressive accumulation
        status: i === allCategories.length - 1 ? 'done' : 'processing',
        progress: {
          completedCategories: i + 1,
          totalCategories: 3
        }
      });
      
      console.log(`  Step ${i + 1}: ${accumulatedEvents.length} events total`);
    }
    
    // Clean up test jobs
    await jobStore.deleteJob(testJobId + '_bad');
    await jobStore.deleteJob(testJobId + '_good');
    
    console.log('📊 COMPARISON:');
    console.log('  Bad: Client gets 0 events, then suddenly 6 events');
    console.log('  Good: Client gets 2 events, then 4 events, then 6 events');
  });
});