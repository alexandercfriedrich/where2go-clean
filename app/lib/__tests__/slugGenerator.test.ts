/**
 * Tests for Slug Generator
 * Validates URL slug generation for event detail pages
 */

import { describe, it, expect } from 'vitest';
import { 
  generateEventSlug, 
  generateEventSlugSimple, 
  isValidSlug, 
  extractDateFromSlug 
} from '../slugGenerator';

describe('generateEventSlug', () => {
  it('should throw an error when called - slugs must come from database', () => {
    expect(() => generateEventSlug({
      title: 'Wiener Mozart Konzert',
      venue: 'Musikverein',
      date: '2025-11-20'
    })).toThrow('Slug generation moved to database');
  });

  it('should explain that database slugs should be used', () => {
    expect(() => generateEventSlug({
      title: 'Any Event',
      venue: 'Any Venue',
      date: '2025-11-20'
    })).toThrow('Use event.slug from database query');
  });
});

describe('generateEventSlugSimple', () => {
  it('should generate slug with title and date only', () => {
    const result = generateEventSlugSimple('Jazz Concert', '2025-11-20');
    expect(result).toBe('jazz-concert-2025-11-20');
  });

  it('should handle special characters', () => {
    const result = generateEventSlugSimple('Rock & Roll!', '2025-11-20');
    expect(result).toBe('rock-roll-2025-11-20');
  });

  it('should limit to 150 characters', () => {
    const longTitle = 'A'.repeat(200);
    const result = generateEventSlugSimple(longTitle, '2025-11-20');
    expect(result.length).toBeLessThanOrEqual(150);
  });
});

describe('isValidSlug', () => {
  it('should validate correct slug format', () => {
    expect(isValidSlug('wiener-mozart-konzert-2025-11-20')).toBe(true);
  });

  it('should validate slug with numbers', () => {
    expect(isValidSlug('event-123-venue-456-2025-11-20')).toBe(true);
  });

  it('should reject slug with uppercase letters', () => {
    expect(isValidSlug('Event-Name-2025-11-20')).toBe(false);
  });

  it('should reject slug with special characters', () => {
    expect(isValidSlug('event-name!-2025-11-20')).toBe(false);
  });

  it('should reject slug with consecutive hyphens', () => {
    expect(isValidSlug('event--name-2025-11-20')).toBe(false);
  });

  it('should reject slug starting with hyphen', () => {
    expect(isValidSlug('-event-name-2025-11-20')).toBe(false);
  });

  it('should reject slug ending with hyphen', () => {
    expect(isValidSlug('event-name-2025-11-20-')).toBe(false);
  });

  it('should reject empty string', () => {
    expect(isValidSlug('')).toBe(false);
  });

  it('should validate single word slug', () => {
    expect(isValidSlug('event')).toBe(true);
  });
});

describe('extractDateFromSlug', () => {
  it('should extract date from end of slug', () => {
    const result = extractDateFromSlug('wiener-mozart-konzert-musikverein-2025-11-20');
    expect(result).toBe('2025-11-20');
  });

  it('should return null when no date found', () => {
    const result = extractDateFromSlug('event-without-date');
    expect(result).toBe(null);
  });

  it('should extract date from simple slug', () => {
    const result = extractDateFromSlug('event-2025-12-31');
    expect(result).toBe('2025-12-31');
  });

  it('should extract only the last date if multiple date patterns exist', () => {
    const result = extractDateFromSlug('event-2025-01-01-venue-2025-11-20');
    expect(result).toBe('2025-11-20');
  });

  it('should return null for invalid date format', () => {
    const result = extractDateFromSlug('event-20-11-2025');
    expect(result).toBe(null);
  });
});
