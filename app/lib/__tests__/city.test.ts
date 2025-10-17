import { describe, it, expect } from 'vitest';
import { dateTokenToISO, formatGermanDate, capitalize, KNOWN_DATE_TOKENS } from '../city';

describe('City Utils', () => {
  describe('dateTokenToISO', () => {
    it('should convert "heute" to today\'s ISO date', () => {
      const result = dateTokenToISO('heute');
      const today = new Date().toISOString().split('T')[0];
      expect(result).toBe(today);
    });

    it('should convert "morgen" to tomorrow\'s ISO date', () => {
      const result = dateTokenToISO('morgen');
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const expected = tomorrow.toISOString().split('T')[0];
      expect(result).toBe(expected);
    });

    it('should convert "wochenende" to next Saturday', () => {
      const result = dateTokenToISO('wochenende');
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const day = today.getDay();
      const delta = (6 - day + 7) % 7;
      const saturday = new Date(today);
      saturday.setDate(saturday.getDate() + (delta === 0 ? 7 : delta));
      const expected = saturday.toISOString().split('T')[0];
      expect(result).toBe(expected);
    });

    it('should pass through valid ISO dates', () => {
      const isoDate = '2025-12-31';
      const result = dateTokenToISO(isoDate);
      expect(result).toBe(isoDate);
    });

    it('should default to today for invalid tokens', () => {
      const result = dateTokenToISO('invalid-token');
      const today = new Date().toISOString().split('T')[0];
      expect(result).toBe(today);
    });

    it('should handle empty strings', () => {
      const result = dateTokenToISO('');
      const today = new Date().toISOString().split('T')[0];
      expect(result).toBe(today);
    });

    it('should be case insensitive', () => {
      const result1 = dateTokenToISO('HEUTE');
      const result2 = dateTokenToISO('Heute');
      const result3 = dateTokenToISO('heute');
      expect(result1).toBe(result2);
      expect(result2).toBe(result3);
    });
  });

  describe('formatGermanDate', () => {
    it('should format ISO date to German format', () => {
      const result = formatGermanDate('2025-12-31');
      // Should contain day, month, year - exact format may vary by locale
      expect(result).toContain('2025');
      expect(result).toContain('31');
    });

    it('should handle invalid dates gracefully', () => {
      const result = formatGermanDate('invalid-date');
      expect(result).toBe('invalid-date');
    });
  });

  describe('capitalize', () => {
    it('should capitalize first letter', () => {
      expect(capitalize('wien')).toBe('Wien');
      expect(capitalize('berlin')).toBe('Berlin');
    });

    it('should preserve already capitalized strings', () => {
      expect(capitalize('Wien')).toBe('Wien');
    });

    it('should handle empty strings', () => {
      expect(capitalize('')).toBe('');
    });

    it('should handle single character', () => {
      expect(capitalize('w')).toBe('W');
    });
  });

  describe('KNOWN_DATE_TOKENS', () => {
    it('should contain expected date tokens', () => {
      expect(KNOWN_DATE_TOKENS).toContain('heute');
      expect(KNOWN_DATE_TOKENS).toContain('morgen');
      expect(KNOWN_DATE_TOKENS).toContain('wochenende');
      expect(KNOWN_DATE_TOKENS).toHaveLength(3);
    });
  });
});
