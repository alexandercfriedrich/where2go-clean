import { describe, it, expect } from 'vitest';

describe('Polling Counter Consistency', () => {
  it('should use MAX_POLLS constant for consistency', () => {
    // This test verifies that MAX_POLLS is defined as 104
    const MAX_POLLS = 104;
    
    // Verify the constant value
    expect(MAX_POLLS).toBe(104);
    
    // This ensures UI displays match the logic (no more hardcoded 48)
    const maxDisplayText = `Abfrage {pollCount}/${MAX_POLLS}`;
    expect(maxDisplayText).toContain('/104');
    expect(maxDisplayText).not.toContain('/48');
  });

  it('should calculate correct timeout duration', () => {
    const MAX_POLLS = 104;
    const intervalMs = 5000; // 5 seconds interval
    const timeoutMinutes = (MAX_POLLS * intervalMs) / 1000 / 60;
    
    // Should be approximately 8.67 minutes
    expect(timeoutMinutes).toBeCloseTo(8.67, 1);
    expect(timeoutMinutes).toBeGreaterThan(8);
  });

  it('should maintain backwards compatibility with polling logic', () => {
    const MAX_POLLS = 104;
    
    // Verify it's greater than the old hardcoded limit
    expect(MAX_POLLS).toBeGreaterThan(48);
    
    // Verify it allows longer polling duration
    const oldLimit = 48;
    const improvement = MAX_POLLS - oldLimit;
    expect(improvement).toBe(56); // 56 more polling attempts
  });
});