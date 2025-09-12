/**
 * Unit tests for validation schemas.
 * Tests Zod validation schemas for input validation and error handling.
 * 
 * @fileoverview Validation schema test suite.
 */

import { describe, it, expect } from 'vitest';
import {
  CitySchema,
  DateSchema,
  CategorySchema,
  CategoriesSchema,
  TTLSchema,
  CreateJobParamsSchema,
  CreateJobRequestSchema,
  JobIdSchema,
  validateInput,
  safeValidate
} from '../../../lib/new-backend/validation/schemas';

describe('Validation Schemas', () => {
  describe('CitySchema', () => {
    it('should accept valid city names', () => {
      const validCities = [
        'Berlin',
        'München',
        'New York',
        'São Paulo',
        "St. John's",
        'Zürich',
        'Malmö'
      ];

      validCities.forEach(city => {
        const result = validateInput(CitySchema, city);
        expect(result.success).toBe(true);
        expect(result.data).toBe(city);
      });
    });

    it('should trim whitespace from city names', () => {
      const result = validateInput(CitySchema, '  Berlin  ');
      expect(result.success).toBe(true);
      expect(result.data).toBe('Berlin');
    });

    it('should reject invalid city names', () => {
      const invalidCities = [
        '', // Empty
        '   ', // Whitespace only
        'A'.repeat(101), // Too long
        'Berlin123', // Contains numbers
        'Berlin@City', // Contains special chars
        'Berlin_City' // Contains underscore
      ];

      invalidCities.forEach(city => {
        const result = validateInput(CitySchema, city);
        expect(result.success).toBe(false);
        expect(result.errors).toBeDefined();
      });
    });
  });

  describe('DateSchema', () => {
    it('should accept valid dates in YYYY-MM-DD format', () => {
      const validDates = [
        '2024-01-15',
        '2024-12-31',
        '2025-06-15',
        '2023-02-28'
      ];

      validDates.forEach(date => {
        const result = validateInput(DateSchema, date);
        expect(result.success).toBe(true);
        expect(result.data).toBe(date);
      });
    });

    it('should reject invalid date formats', () => {
      const invalidDates = [
        '2024/01/15', // Wrong separator
        '01-15-2024', // Wrong order
        '2024-1-15', // Missing zero padding
        '2024-13-01', // Invalid month
        '2024-01-32', // Invalid day
        'not-a-date', // Not a date
        '' // Empty
      ];

      invalidDates.forEach(date => {
        const result = validateInput(DateSchema, date);
        expect(result.success).toBe(false);
        expect(result.errors).toBeDefined();
      });
    });

    it('should reject dates outside reasonable range', () => {
      const currentYear = new Date().getFullYear();
      const tooOld = `${currentYear - 2}-01-01`;
      const tooFuture = `${currentYear + 3}-01-01`;

      expect(validateInput(DateSchema, tooOld).success).toBe(false);
      expect(validateInput(DateSchema, tooFuture).success).toBe(false);
    });
  });

  describe('CategorySchema', () => {
    it('should accept valid category names', () => {
      const validCategories = [
        'DJ Sets/Electronic',
        'Live-Konzerte',
        'Comedy',
        'A'
      ];

      validCategories.forEach(category => {
        const result = validateInput(CategorySchema, category);
        expect(result.success).toBe(true);
        expect(result.data).toBe(category);
      });
    });

    it('should trim whitespace from categories', () => {
      const result = validateInput(CategorySchema, '  Music  ');
      expect(result.success).toBe(true);
      expect(result.data).toBe('Music');
    });

    it('should reject invalid categories', () => {
      const invalidCategories = [
        '', // Empty
        '   ', // Whitespace only
        'A'.repeat(51) // Too long
      ];

      invalidCategories.forEach(category => {
        const result = validateInput(CategorySchema, category);
        expect(result.success).toBe(false);
        expect(result.errors).toBeDefined();
      });
    });
  });

  describe('CategoriesSchema', () => {
    it('should accept valid category arrays', () => {
      const validArrays = [
        ['Music'],
        ['Music', 'Art'],
        ['DJ Sets/Electronic', 'Clubs/Discos', 'Live-Konzerte']
      ];

      validArrays.forEach(categories => {
        const result = validateInput(CategoriesSchema, categories);
        expect(result.success).toBe(true);
        expect(result.data).toEqual(categories);
      });
    });

    it('should remove duplicates from category arrays', () => {
      const input = ['Music', 'Art', 'Music', 'Theater'];
      const result = validateInput(CategoriesSchema, input);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(['Music', 'Art', 'Theater']);
    });

    it('should reject invalid category arrays', () => {
      const invalidArrays = [
        [], // Empty array
        Array(21).fill('Music'), // Too many categories
        [''], // Invalid category
        'not-an-array' // Not an array
      ];

      invalidArrays.forEach(categories => {
        const result = validateInput(CategoriesSchema, categories);
        expect(result.success).toBe(false);
        expect(result.errors).toBeDefined();
      });
    });
  });

  describe('TTLSchema', () => {
    it('should accept valid TTL values', () => {
      const validTTLs = [300, 3600, 7200, 86400];

      validTTLs.forEach(ttl => {
        const result = validateInput(TTLSchema, ttl);
        expect(result.success).toBe(true);
        expect(result.data).toBe(ttl);
      });
    });

    it('should use default TTL when not provided', () => {
      const result = validateInput(TTLSchema, undefined);
      expect(result.success).toBe(true);
      expect(result.data).toBe(3600); // Default value
    });

    it('should reject invalid TTL values', () => {
      const invalidTTLs = [
        299, // Too small
        86401, // Too large
        3600.5, // Not integer
        'not-a-number', // Not a number
        -1 // Negative
      ];

      invalidTTLs.forEach(ttl => {
        const result = validateInput(TTLSchema, ttl);
        expect(result.success).toBe(false);
        expect(result.errors).toBeDefined();
      });
    });
  });

  describe('CreateJobParamsSchema', () => {
    it('should accept valid job creation parameters', () => {
      const validParams = {
        city: 'Berlin',
        date: '2024-01-15',
        categories: ['Music', 'Art'],
        ttlSeconds: 3600
      };

      const result = validateInput(CreateJobParamsSchema, validParams);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validParams);
    });

    it('should work without optional ttlSeconds', () => {
      const params = {
        city: 'Berlin',
        date: '2024-01-15',
        categories: ['Music']
      };

      const result = validateInput(CreateJobParamsSchema, params);
      expect(result.success).toBe(true);
      expect(result.data?.city).toBe('Berlin');
      expect(result.data?.ttlSeconds).toBeUndefined();
    });

    it('should reject invalid job parameters', () => {
      const invalidParams = [
        {}, // Missing required fields
        { city: 'Berlin' }, // Missing date and categories
        { 
          city: 'Berlin',
          date: 'invalid-date',
          categories: ['Music']
        }, // Invalid date
        {
          city: '',
          date: '2024-01-15',
          categories: ['Music']
        }, // Invalid city
        {
          city: 'Berlin',
          date: '2024-01-15',
          categories: []
        } // Empty categories
      ];

      invalidParams.forEach(params => {
        const result = validateInput(CreateJobParamsSchema, params);
        expect(result.success).toBe(false);
        expect(result.errors).toBeDefined();
      });
    });
  });

  describe('CreateJobRequestSchema', () => {
    it('should accept valid job request', () => {
      const validRequest = {
        city: 'Berlin',
        date: '2024-01-15',
        categories: ['Music', 'Art'],
        options: {
          ttlSeconds: 3600
        }
      };

      const result = validateInput(CreateJobRequestSchema, validRequest);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validRequest);
    });

    it('should work without options', () => {
      const request = {
        city: 'Berlin',
        date: '2024-01-15',
        categories: ['Music']
      };

      const result = validateInput(CreateJobRequestSchema, request);
      expect(result.success).toBe(true);
      expect(result.data?.options).toBeUndefined();
    });

    it('should reject invalid requests', () => {
      const invalidRequests = [
        {}, // Missing required fields
        {
          city: 'Berlin',
          date: '2024-01-15',
          categories: ['Music'],
          options: {
            ttlSeconds: 'invalid' // Invalid TTL type
          }
        }
      ];

      invalidRequests.forEach(request => {
        const result = validateInput(CreateJobRequestSchema, request);
        expect(result.success).toBe(false);
        expect(result.errors).toBeDefined();
      });
    });
  });

  describe('JobIdSchema', () => {
    it('should accept valid job IDs', () => {
      const validJobIds = [
        'job_1234567890_abc123',
        'job_9876543210_xyz789',
        'job_1000000000_a1b2c3'
      ];

      validJobIds.forEach(jobId => {
        const result = validateInput(JobIdSchema, jobId);
        expect(result.success).toBe(true);
        expect(result.data).toBe(jobId);
      });
    });

    it('should reject invalid job IDs', () => {
      const invalidJobIds = [
        'invalid-format',
        'job_123_abc', // Timestamp too short
        'job_abc_123', // Invalid timestamp
        'job_1234567890_ABC', // Uppercase random part
        'job_1234567890_', // Missing random part
        '_1234567890_abc123', // Missing job prefix
        ''
      ];

      invalidJobIds.forEach(jobId => {
        const result = validateInput(JobIdSchema, jobId);
        expect(result.success).toBe(false);
        expect(result.errors).toBeDefined();
      });
    });
  });

  describe('safeValidate', () => {
    it('should add context to error messages', () => {
      const result = safeValidate(CitySchema, '', 'test input');
      
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0]).toContain('test input:');
    });

    it('should work without context', () => {
      const result = safeValidate(CitySchema, '');
      
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0]).toContain('input:');
    });

    it('should return successful results without modification', () => {
      const result = safeValidate(CitySchema, 'Berlin', 'test city');
      
      expect(result.success).toBe(true);
      expect(result.data).toBe('Berlin');
      expect(result.errors).toBeUndefined();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle null and undefined inputs', () => {
      expect(validateInput(CitySchema, null).success).toBe(false);
      expect(validateInput(CitySchema, undefined).success).toBe(false);
    });

    it('should handle non-string inputs for string schemas', () => {
      expect(validateInput(CitySchema, 123).success).toBe(false);
      expect(validateInput(CitySchema, {}).success).toBe(false);
      expect(validateInput(CitySchema, []).success).toBe(false);
    });

    it('should handle complex nested validation errors', () => {
      const invalidRequest = {
        city: '', // Invalid
        date: 'not-a-date', // Invalid
        categories: [], // Invalid
        options: {
          ttlSeconds: -1 // Invalid
        }
      };

      const result = validateInput(CreateJobRequestSchema, invalidRequest);
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(1); // Multiple errors
    });
  });
});