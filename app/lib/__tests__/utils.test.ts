/**
 * Tests for utility functions
 * - isAllDayTime: Detects all-day events (only 00:00:01 marker)
 * - createEventTimestamp: Creates ISO timestamps
 * - TIME_FORMAT_REGEX: Validates HH:mm format
 */

import { describe, it, expect } from 'vitest';
import { isAllDayTime, createEventTimestamp, TIME_FORMAT_REGEX } from '../utils';

describe('TIME_FORMAT_REGEX', () => {
  it('should match valid HH:mm times', () => {
    expect(TIME_FORMAT_REGEX.test('00:00')).toBe(true);
    expect(TIME_FORMAT_REGEX.test('12:30')).toBe(true);
    expect(TIME_FORMAT_REGEX.test('23:59')).toBe(true);
    expect(TIME_FORMAT_REGEX.test('09:05')).toBe(true);
  });

  it('should not match invalid times', () => {
    expect(TIME_FORMAT_REGEX.test('24:00')).toBe(false);
    expect(TIME_FORMAT_REGEX.test('12:60')).toBe(false);
    expect(TIME_FORMAT_REGEX.test('1:30')).toBe(false);
    expect(TIME_FORMAT_REGEX.test('ganztags')).toBe(false);
    expect(TIME_FORMAT_REGEX.test('')).toBe(false);
  });
});

describe('isAllDayTime', () => {
  it('should return true for null/undefined', () => {
    expect(isAllDayTime(null)).toBe(true);
    expect(isAllDayTime(undefined)).toBe(true);
  });

  it('should return true ONLY for 00:00:01 (Supabase marker)', () => {
    expect(isAllDayTime('00:00:01')).toBe(true);
  });

  it('should return false for other times (NOT all-day)', () => {
    // Only 00:00:01 is all-day - these are regular times
    expect(isAllDayTime('00:00')).toBe(false);
    expect(isAllDayTime('00:01')).toBe(false);
    expect(isAllDayTime('01:00')).toBe(false);
    expect(isAllDayTime('12:00')).toBe(false);
    expect(isAllDayTime('19:30')).toBe(false);
  });

  it('should return true for text all-day indicators (input processing)', () => {
    expect(isAllDayTime('ganztags')).toBe(true);
    expect(isAllDayTime('Ganztags')).toBe(true);
    expect(isAllDayTime('GANZTAGS')).toBe(true);
    expect(isAllDayTime('all-day')).toBe(true);
    expect(isAllDayTime('all day')).toBe(true);
    expect(isAllDayTime('allday')).toBe(true);
    expect(isAllDayTime('ganztagig')).toBe(true);
    expect(isAllDayTime('fullday')).toBe(true);
  });

  it('should handle whitespace', () => {
    expect(isAllDayTime('  00:00:01  ')).toBe(true);
    expect(isAllDayTime('  ganztags  ')).toBe(true);
  });
});

describe('createEventTimestamp', () => {
  it('should return current timestamp for undefined date', () => {
    const result = createEventTimestamp(undefined, '12:00');
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it('should create 00:00:01 marker for all-day events', () => {
    expect(createEventTimestamp('2025-12-02', 'ganztags')).toBe('2025-12-02T00:00:01.000Z');
    expect(createEventTimestamp('2025-12-02', 'all-day')).toBe('2025-12-02T00:00:01.000Z');
    expect(createEventTimestamp('2025-12-02', undefined)).toBe('2025-12-02T00:00:01.000Z');
    expect(createEventTimestamp('2025-12-02', '')).toBe('2025-12-02T00:00:01.000Z');
  });

  it('should create proper timestamp for valid times', () => {
    expect(createEventTimestamp('2025-12-02', '19:30')).toBe('2025-12-02T19:30:00.000Z');
    expect(createEventTimestamp('2025-12-02', '00:00')).toBe('2025-12-02T00:00:00.000Z');
    expect(createEventTimestamp('2025-12-02', '12:00')).toBe('2025-12-02T12:00:00.000Z');
    expect(createEventTimestamp('2025-12-02', '23:59')).toBe('2025-12-02T23:59:00.000Z');
  });

  it('should treat invalid time format as all-day', () => {
    expect(createEventTimestamp('2025-12-02', 'invalid')).toBe('2025-12-02T00:00:01.000Z');
    expect(createEventTimestamp('2025-12-02', '25:00')).toBe('2025-12-02T00:00:01.000Z');
  });
});
