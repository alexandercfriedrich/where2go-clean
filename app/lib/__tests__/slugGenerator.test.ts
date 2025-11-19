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
  it('should generate slug with title, venue, and date', () => {
    const result = generateEventSlug({
      title: 'Wiener Mozart Konzert',
      venue: 'Musikverein',
      date: '2025-11-20'
    });
    expect(result).toBe('wiener-mozart-konzert-musikverein-2025-11-20');
  });

  it('should handle special characters and diacritics', () => {
    const result = generateEventSlug({
      title: 'Café Müller präsentiert: Rock & Roll!',
      venue: 'Café Zürich',
      date: '2025-11-20'
    });
    expect(result).toBe('cafe-muller-prasentiert-rock-roll-cafe-zurich-2025-11-20');
  });

  it('should handle missing venue', () => {
    const result = generateEventSlug({
      title: 'Jazz Night',
      venue: '',
      date: '2025-11-20'
    });
    expect(result).toBe('jazz-night-2025-11-20');
  });

  it('should handle undefined venue', () => {
    const result = generateEventSlug({
      title: 'Jazz Night',
      venue: undefined,
      date: '2025-11-20'
    });
    expect(result).toBe('jazz-night-2025-11-20');
  });

  it('should remove consecutive hyphens', () => {
    const result = generateEventSlug({
      title: 'Event  --  With   Multiple   Spaces',
      venue: 'Venue --- Name',
      date: '2025-11-20'
    });
    expect(result).toBe('event-with-multiple-spaces-venue-name-2025-11-20');
  });

  it('should limit slug to 150 characters', () => {
    const longTitle = 'This is an extremely long event title that goes on and on and includes many words and details about the event and what will happen there and who will be performing';
    const result = generateEventSlug({
      title: longTitle,
      venue: 'Venue',
      date: '2025-11-20'
    });
    expect(result.length).toBeLessThanOrEqual(150);
  });

  it('should handle numbers in title and venue', () => {
    const result = generateEventSlug({
      title: '90s Party 2023',
      venue: 'Club 54',
      date: '2025-11-20'
    });
    expect(result).toBe('90s-party-2023-club-54-2025-11-20');
  });

  it('should handle title with forward slashes', () => {
    const result = generateEventSlug({
      title: 'Rock/Pop/Jazz Festival',
      venue: 'Arena',
      date: '2025-11-20'
    });
    expect(result).toBe('rockpopjazz-festival-arena-2025-11-20');
  });

  it('should handle all lowercase input', () => {
    const result = generateEventSlug({
      title: 'already lowercase',
      venue: 'lower venue',
      date: '2025-11-20'
    });
    expect(result).toBe('already-lowercase-lower-venue-2025-11-20');
  });

  it('should handle German umlauts correctly', () => {
    const result = generateEventSlug({
      title: 'Frühlingskonzert Ä Ö Ü ß',
      venue: 'Zürich',
      date: '2025-11-20'
    });
    // Note: NFKD normalization removes diacritics but ß is treated as a special character and removed
    expect(result).toBe('fruhlingskonzert-a-o-u-zurich-2025-11-20');
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
