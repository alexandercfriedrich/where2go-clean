import { describe, it, expect } from 'vitest';
import { normalizeEvents } from '../event-normalizer';
import { validateAndNormalizeEventsTolerant } from '../eventValidation';

describe('ImageUrl Support', () => {
  describe('normalizeEvents', () => {
    it('should pass through imageUrl when present', () => {
      const events = [{
        title: 'Test Event',
        category: 'Concert',
        date: '2025-01-20',
        time: '20:00',
        venue: 'Test Venue',
        price: '10€',
        website: 'https://example.com',
        imageUrl: 'https://example.com/image.jpg'
      }];

      const normalized = normalizeEvents(events);

      expect(normalized).toHaveLength(1);
      expect(normalized[0].imageUrl).toBe('https://example.com/image.jpg');
    });

    it('should handle missing imageUrl gracefully', () => {
      const events = [{
        title: 'Test Event',
        category: 'Concert',
        date: '2025-01-20',
        time: '20:00',
        venue: 'Test Venue',
        price: '10€',
        website: 'https://example.com'
      }];

      const normalized = normalizeEvents(events);

      expect(normalized).toHaveLength(1);
      expect(normalized[0].imageUrl).toBeUndefined();
    });
  });

  describe('validateAndNormalizeEventsTolerant', () => {
    it('should preserve imageUrl during validation', () => {
      const events = [{
        title: 'Test Event',
        category: 'Live-Konzerte',
        date: '2025-01-20',
        time: '20:00',
        venue: 'Test Venue',
        price: '10€',
        website: 'https://example.com',
        imageUrl: 'https://example.com/image.jpg'
      }];

      const validated = validateAndNormalizeEventsTolerant(events);

      expect(validated).toHaveLength(1);
      expect(validated[0].imageUrl).toBe('https://example.com/image.jpg');
    });

    it('should trim imageUrl whitespace', () => {
      const events = [{
        title: 'Test Event',
        category: 'Live-Konzerte',
        date: '2025-01-20',
        time: '20:00',
        venue: 'Test Venue',
        price: '10€',
        website: 'https://example.com',
        imageUrl: '  https://example.com/image.jpg  '
      }];

      const validated = validateAndNormalizeEventsTolerant(events);

      expect(validated).toHaveLength(1);
      expect(validated[0].imageUrl).toBe('https://example.com/image.jpg');
    });

    it('should handle undefined imageUrl', () => {
      const events = [{
        title: 'Test Event',
        category: 'Live-Konzerte',
        date: '2025-01-20',
        time: '20:00',
        venue: 'Test Venue',
        price: '10€',
        website: 'https://example.com'
      }];

      const validated = validateAndNormalizeEventsTolerant(events);

      expect(validated).toHaveLength(1);
      expect(validated[0].imageUrl).toBeUndefined();
    });

    it('should not include empty string imageUrl', () => {
      const events = [{
        title: 'Test Event',
        category: 'Live-Konzerte',
        date: '2025-01-20',
        time: '20:00',
        venue: 'Test Venue',
        price: '10€',
        website: 'https://example.com',
        imageUrl: ''
      }];

      const validated = validateAndNormalizeEventsTolerant(events);

      expect(validated).toHaveLength(1);
      expect(validated[0].imageUrl).toBeUndefined();
    });
  });
});
