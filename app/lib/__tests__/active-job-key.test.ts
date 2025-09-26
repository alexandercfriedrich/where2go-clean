import { describe, it, expect } from 'vitest';

// Helper function to create composite key for active job mapping
function createActiveJobKey(city: string, date: string, categories: string[]): string {
  const sortedCategories = [...categories].sort();
  return `city=${city}|date=${date}|cats=${sortedCategories.join(',')}`;
}

describe('Active Job Key Generation', () => {
  it('should create consistent keys for same parameters', () => {
    const key1 = createActiveJobKey('Wien', '2025-01-20', ['Music', 'Theater']);
    const key2 = createActiveJobKey('Wien', '2025-01-20', ['Theater', 'Music']);
    
    expect(key1).toBe(key2);
    expect(key1).toBe('city=Wien|date=2025-01-20|cats=Music,Theater');
  });

  it('should handle empty categories', () => {
    const key = createActiveJobKey('Berlin', '2025-01-21', []);
    expect(key).toBe('city=Berlin|date=2025-01-21|cats=');
  });

  it('should handle single category', () => {
    const key = createActiveJobKey('Paris', '2025-01-22', ['Art']);
    expect(key).toBe('city=Paris|date=2025-01-22|cats=Art');
  });

  it('should sort complex category names', () => {
    const categories = ['DJ Sets/Electronic', 'Clubs/Discos', 'Live-Konzerte'];
    const key = createActiveJobKey('Ibiza', '2025-01-23', categories);
    expect(key).toBe('city=Ibiza|date=2025-01-23|cats=Clubs/Discos,DJ Sets/Electronic,Live-Konzerte');
  });

  it('should create different keys for different cities', () => {
    const key1 = createActiveJobKey('Wien', '2025-01-20', ['Music']);
    const key2 = createActiveJobKey('Berlin', '2025-01-20', ['Music']);
    
    expect(key1).not.toBe(key2);
  });

  it('should create different keys for different dates', () => {
    const key1 = createActiveJobKey('Wien', '2025-01-20', ['Music']);
    const key2 = createActiveJobKey('Wien', '2025-01-21', ['Music']);
    
    expect(key1).not.toBe(key2);
  });

  it('should create different keys for different categories', () => {
    const key1 = createActiveJobKey('Wien', '2025-01-20', ['Music']);
    const key2 = createActiveJobKey('Wien', '2025-01-20', ['Theater']);
    
    expect(key1).not.toBe(key2);
  });
});