import { describe, it, expect, beforeEach } from 'vitest';
import { createJobStore, JobStore } from '../jobStore';
import { normalizeEvents } from '../event-normalizer';

describe('Job Status API with Event Normalization', () => {
  let jobStore: JobStore;

  beforeEach(() => {
    jobStore = createJobStore();
  });

  it('should normalize events when retrieving job status', async () => {
    const jobId = 'test-normalization-job';
    
    // Create a job with events using the new LLM field names
    const rawEvents = [
      {
        name: 'Concert in Berlin',  // Should map to title
        location: 'Berghain',      // Should map to venue
        url: 'berghain.berlin',    // Should map to website and get https://
        ticket: 'tickets.berghain.berlin', // Should map to bookingLink
        date_str: '2025-01-20',
        start_time: '23:00',
        summary: 'Techno music event',
        cost: '15€'
      },
      {
        eventTitle: 'Theater Show',
        venueName: 'Deutsches Theater',
        source_url: 'https://deutschestheater.de',
        ticketLink: 'https://tickets.deutschestheater.de',
        eventDate: '2025-01-21',
        eventTime: '19:30',
        shortDescription: 'Classic drama performance',
        ticketPrice: '45€',
        eventType: 'Drama'
      }
    ];

    await jobStore.setJob(jobId, {
      id: jobId,
      status: 'done',
      events: rawEvents,
      createdAt: new Date()
    });

    const job = await jobStore.getJob(jobId);
    expect(job).toBeTruthy();
    expect(job!.events).toHaveLength(2);

    // Test that direct normalization would work
    const normalizedEvents = normalizeEvents(job!.events!);
    
    // Verify first event normalization
    expect(normalizedEvents[0].title).toBe('Concert in Berlin');
    expect(normalizedEvents[0].venue).toBe('Berghain');
    expect(normalizedEvents[0].website).toBe('https://berghain.berlin');
    expect(normalizedEvents[0].bookingLink).toBe('https://tickets.berghain.berlin');
    expect(normalizedEvents[0].date).toBe('2025-01-20');
    expect(normalizedEvents[0].time).toBe('23:00');
    expect(normalizedEvents[0].description).toBe('Techno music event');
    expect(normalizedEvents[0].price).toBe('15€');

    // Verify second event normalization
    expect(normalizedEvents[1].title).toBe('Theater Show');
    expect(normalizedEvents[1].venue).toBe('Deutsches Theater');
    expect(normalizedEvents[1].website).toBe('https://deutschestheater.de');
    expect(normalizedEvents[1].bookingLink).toBe('https://tickets.deutschestheater.de');
    expect(normalizedEvents[1].date).toBe('2025-01-21');
    expect(normalizedEvents[1].time).toBe('19:30');
    expect(normalizedEvents[1].description).toBe('Classic drama performance');
    expect(normalizedEvents[1].ticketPrice).toBe('45€');
    expect(normalizedEvents[1].eventType).toBe('Drama');
  });

  it('should handle jobs with already normalized events', async () => {
    const jobId = 'test-already-normalized-job';
    
    // Create a job with events already in the expected format
    const normalizedEvents = [
      {
        title: 'Music Festival',
        venue: 'Tempelhof',
        website: 'https://festival.com',
        bookingLink: 'https://tickets.festival.com',
        date: '2025-06-15',
        time: '14:00',
        price: '89€',
        category: 'Music',
        description: 'Summer music festival'
      }
    ];

    await jobStore.setJob(jobId, {
      id: jobId,
      status: 'done',
      events: normalizedEvents,
      createdAt: new Date()
    });

    const job = await jobStore.getJob(jobId);
    const normalized = normalizeEvents(job!.events!);
    
    // Should remain unchanged
    expect(normalized[0].title).toBe('Music Festival');
    expect(normalized[0].venue).toBe('Tempelhof');
    expect(normalized[0].website).toBe('https://festival.com');
    expect(normalized[0].bookingLink).toBe('https://tickets.festival.com');
    expect(normalized[0].category).toBe('Music');
  });

  it('should handle jobs with mixed event formats', async () => {
    const jobId = 'test-mixed-formats-job';
    
    // Mix of old and new format events
    const mixedEvents = [
      {
        // New LLM format
        name: 'Art Exhibition',
        location: 'Museum Island',
        url: 'museum-island.de',
        date_str: '2025-02-01'
      },
      {
        // Already normalized format
        title: 'Food Festival',
        venue: 'Alexanderplatz',
        website: 'https://foodfest.berlin',
        date: '2025-02-02',
        time: '12:00'
      }
    ];

    await jobStore.setJob(jobId, {
      id: jobId,
      status: 'done',
      events: mixedEvents,
      createdAt: new Date()
    });

    const job = await jobStore.getJob(jobId);
    const normalized = normalizeEvents(job!.events!);
    
    // Both should be properly normalized
    expect(normalized[0].title).toBe('Art Exhibition');
    expect(normalized[0].venue).toBe('Museum Island');
    expect(normalized[0].website).toBe('https://museum-island.de');
    
    expect(normalized[1].title).toBe('Food Festival');
    expect(normalized[1].venue).toBe('Alexanderplatz');
    expect(normalized[1].website).toBe('https://foodfest.berlin');
  });

  it('should handle jobs with no events', async () => {
    const jobId = 'test-no-events-job';
    
    await jobStore.setJob(jobId, {
      id: jobId,
      status: 'done',
      events: [],
      createdAt: new Date()
    });

    const job = await jobStore.getJob(jobId);
    const normalized = normalizeEvents(job!.events!);
    
    expect(normalized).toEqual([]);
  });

  it('should preserve progressive update functionality', async () => {
    const jobId = 'test-progressive-job';
    
    // Start with pending status and no events
    await jobStore.setJob(jobId, {
      id: jobId,
      status: 'pending',
      createdAt: new Date()
    });

    let job = await jobStore.getJob(jobId);
    expect(job!.status).toBe('pending');
    expect(job!.events).toBeUndefined();

    // Add first batch of events (new format)
    await jobStore.updateJob(jobId, {
      events: [
        {
          name: 'First Event',
          location: 'First Venue',
          url: 'first.com',
          date_str: '2025-01-20'
        }
      ]
    });

    job = await jobStore.getJob(jobId);
    expect(job!.status).toBe('pending');
    expect(job!.events).toHaveLength(1);
    
    const firstNormalized = normalizeEvents(job!.events!);
    expect(firstNormalized[0].title).toBe('First Event');
    expect(firstNormalized[0].website).toBe('https://first.com');

    // Add more events (mixed format)
    await jobStore.updateJob(jobId, {
      events: [
        {
          name: 'First Event',
          location: 'First Venue', 
          url: 'first.com',
          date_str: '2025-01-20'
        },
        {
          title: 'Second Event',
          venue: 'Second Venue',
          website: 'https://second.com',
          date: '2025-01-21'
        }
      ]
    });

    job = await jobStore.getJob(jobId);
    expect(job!.events).toHaveLength(2);

    const finalNormalized = normalizeEvents(job!.events!);
    expect(finalNormalized[0].title).toBe('First Event');
    expect(finalNormalized[1].title).toBe('Second Event');
    expect(finalNormalized[0].website).toBe('https://first.com');
    expect(finalNormalized[1].website).toBe('https://second.com');
  });
});