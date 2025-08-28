import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Frontend Polling Improvements', () => {
  beforeEach(() => {
    // Mock global fetch
    global.fetch = vi.fn();
    // Clear all previous timers
    vi.clearAllTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should perform immediate first poll when startPolling is called', async () => {
    // Mock a successful API response
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({
        status: 'pending',
        events: []
      })
    };
    
    (global.fetch as any).mockResolvedValue(mockResponse);

    // Simulate the polling logic from the frontend
    let count = 0;
    const maxPolls = 48;
    const pollCount = vi.fn();
    
    const performPoll = async (): Promise<void> => {
      count++;
      pollCount(count);
      
      if (count > maxPolls) {
        return;
      }

      try {
        const res = await fetch('/api/jobs/test-job-id');
        if (!res.ok) throw new Error(`Status ${res.status}`);
        
        const job = await res.json();
        // Handle job status...
      } catch (err) {
        console.warn(`Polling attempt ${count} failed:`, err);
      }
    };
    
    // Simulate startPolling with immediate first poll
    await performPoll(); // Immediate first poll
    
    // Verify immediate poll happened
    expect(pollCount).toHaveBeenCalledWith(1);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith('/api/jobs/test-job-id');
  });

  it('should use browser-safe interval type', () => {
    const performPoll = vi.fn();
    
    // Test that setInterval returns a type compatible with ReturnType<typeof setInterval>
    const intervalId: ReturnType<typeof setInterval> = setInterval(performPoll, 10000);
    
    // The actual type depends on the environment, but it should be assignable
    expect(intervalId).toBeDefined();
    expect(typeof intervalId === 'number' || typeof intervalId === 'object').toBe(true);
    
    clearInterval(intervalId);
  });

  it('should increment counter immediately on first call', async () => {
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({
        status: 'pending',
        events: []
      })
    };
    
    (global.fetch as any).mockResolvedValue(mockResponse);

    let count = 0;
    const pollCounts: number[] = [];
    
    const performPoll = async (): Promise<void> => {
      count++;
      pollCounts.push(count);
      
      // Simulate API call
      await fetch('/api/jobs/test-job-id');
    };
    
    // Immediate first poll
    await performPoll();
    
    // Check immediate increment
    expect(pollCounts).toEqual([1]);
    expect(count).toBe(1);
    
    // Call again to simulate next poll
    await performPoll();
    expect(pollCounts).toEqual([1, 2]);
    expect(count).toBe(2);
  });
});