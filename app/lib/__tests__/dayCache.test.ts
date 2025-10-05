import { describe, it, expect, beforeEach, vi } from 'vitest';
import { computeEventId, isEventValidNow, clampDayEnd, getDayKey } from '../dayCache';
import { EventData } from '../types';

describe('dayCache utilities', () => {
  describe('computeEventId', () => {
    it('should compute stable event IDs', () => {
      const event: EventData = {
        title: 'Test Event',
        category: 'Music',
        date: '2025-01-20',
        time: '19:00',
        venue: 'Test Venue',
        price: '20€',
        website: 'test.com'
      };

      const id1 = computeEventId(event);
      const id2 = computeEventId(event);
      
      expect(id1).toBe(id2);
      expect(id1).toBeTruthy();
    });
  });

  describe('isEventValidNow', () => {
    it('should prioritize cacheUntil field', () => {
      const now = new Date('2025-01-20T12:00:00Z');
      
      const validEvent: EventData = {
        title: 'Test',
        category: 'Music',
        date: '2025-01-20',
        time: '10:00',
        venue: 'Venue',
        price: '10€',
        website: 'test.com',
        cacheUntil: '2025-01-20T15:00:00Z' // Valid until 15:00
      };
      
      expect(isEventValidNow(validEvent, now)).toBe(true);
      
      const expiredEvent: EventData = {
        ...validEvent,
        cacheUntil: '2025-01-20T11:00:00Z' // Already expired
      };
      
      expect(isEventValidNow(expiredEvent, now)).toBe(false);
    });

    it('should use endTime as second priority', () => {
      const now = new Date('2025-01-20T12:00:00Z');
      
      const validEvent: EventData = {
        title: 'Test',
        category: 'Music',
        date: '2025-01-20',
        time: '10:00',
        venue: 'Venue',
        price: '10€',
        website: 'test.com',
        endTime: '2025-01-20T15:00:00Z'
      };
      
      expect(isEventValidNow(validEvent, now)).toBe(true);
      
      const expiredEvent: EventData = {
        ...validEvent,
        endTime: '2025-01-20T11:00:00Z'
      };
      
      expect(isEventValidNow(expiredEvent, now)).toBe(false);
    });

    it('should add 3 hours to start time as default duration', () => {
      const now = new Date('2025-01-20T12:00:00');
      
      const validEvent: EventData = {
        title: 'Test',
        category: 'Music',
        date: '2025-01-20',
        time: '10:00', // Ends at 13:00 (10:00 + 3h)
        venue: 'Venue',
        price: '10€',
        website: 'test.com'
      };
      
      // Event ends at 13:00, now is 12:00 -> still valid
      expect(isEventValidNow(validEvent, now)).toBe(true);
      
      // Event ends at 13:00, now is 14:00 -> expired
      const laterTime = new Date('2025-01-20T14:00:00');
      expect(isEventValidNow(validEvent, laterTime)).toBe(false);
    });

    it('should use 23:59 as fallback when no time specified', () => {
      const morningTime = new Date('2025-01-20T10:00:00');
      const eveningTime = new Date('2025-01-20T22:00:00');
      const afterMidnight = new Date('2025-01-21T00:01:00');
      
      const event: EventData = {
        title: 'Test',
        category: 'Music',
        date: '2025-01-20',
        time: '', // No time
        venue: 'Venue',
        price: '10€',
        website: 'test.com'
      };
      
      expect(isEventValidNow(event, morningTime)).toBe(true);
      expect(isEventValidNow(event, eveningTime)).toBe(true);
      expect(isEventValidNow(event, afterMidnight)).toBe(false);
    });

    it('should handle missing date gracefully', () => {
      const event: EventData = {
        title: 'Test',
        category: 'Music',
        date: '',
        time: '10:00',
        venue: 'Venue',
        price: '10€',
        website: 'test.com'
      };
      
      // Should assume valid when date is missing
      expect(isEventValidNow(event)).toBe(true);
    });
  });

  describe('clampDayEnd', () => {
    it('should return 23:59:00 for given date', () => {
      const dayEnd = clampDayEnd('2025-01-20');
      
      expect(dayEnd.getFullYear()).toBe(2025);
      expect(dayEnd.getMonth()).toBe(0); // January (0-indexed)
      expect(dayEnd.getDate()).toBe(20);
      expect(dayEnd.getHours()).toBe(23);
      expect(dayEnd.getMinutes()).toBe(59);
      expect(dayEnd.getSeconds()).toBe(0);
    });

    it('should handle date with time component', () => {
      const dayEnd = clampDayEnd('2025-01-20T14:30:00');
      
      expect(dayEnd.getDate()).toBe(20);
      expect(dayEnd.getHours()).toBe(23);
      expect(dayEnd.getMinutes()).toBe(59);
    });
  });

  describe('getDayKey', () => {
    it('should generate correct cache key format', () => {
      const key = getDayKey('Wien', '2025-01-20');
      expect(key).toBe('events:v3:day:wien_2025-01-20');
    });

    it('should normalize city name to lowercase', () => {
      const key1 = getDayKey('WIEN', '2025-01-20');
      const key2 = getDayKey('wien', '2025-01-20');
      const key3 = getDayKey('Wien', '2025-01-20');
      
      expect(key1).toBe(key2);
      expect(key2).toBe(key3);
    });

    it('should trim city name', () => {
      const key = getDayKey('  Wien  ', '2025-01-20');
      expect(key).toBe('events:v3:day:wien_2025-01-20');
    });

    it('should extract first 10 chars of date', () => {
      const key1 = getDayKey('Wien', '2025-01-20T14:30:00');
      const key2 = getDayKey('Wien', '2025-01-20');
      
      expect(key1).toBe(key2);
    });
  });
});
