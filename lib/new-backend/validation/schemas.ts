/**
 * Zod validation schemas for strict input validation in the new backend system.
 * This module provides comprehensive validation for all input parameters.
 * 
 * @fileoverview Input validation schemas with explicit constraints and error messages.
 */

import { z } from 'zod';

/**
 * Schema for validating city names.
 * Cities must be non-empty strings with reasonable length limits.
 */
export const CitySchema = z
  .string()
  .trim()
  .min(1, 'City name is required')
  .max(100, 'City name must be less than 100 characters')
  .regex(/^[a-zA-ZäöüÄÖÜß\s\-']+$/, 'City name contains invalid characters');

/**
 * Schema for validating dates in YYYY-MM-DD format.
 * Dates must be valid and not too far in the past or future.
 */
export const DateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
  .refine((date) => {
    const parsed = new Date(date);
    const now = new Date();
    const minDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    const maxDate = new Date(now.getFullYear() + 2, now.getMonth(), now.getDate());
    
    return parsed >= minDate && parsed <= maxDate;
  }, 'Date must be within reasonable range (1 year ago to 2 years ahead)');

/**
 * Schema for validating individual category names.
 * Categories must be non-empty strings with length limits.
 */
export const CategorySchema = z
  .string()
  .trim()
  .min(1, 'Category name is required')
  .max(50, 'Category name must be less than 50 characters');

/**
 * Schema for validating arrays of categories.
 * Must have at least one category and not exceed reasonable limits.
 */
export const CategoriesSchema = z
  .array(CategorySchema)
  .min(1, 'At least one category is required')
  .max(20, 'Maximum 20 categories allowed')
  .transform((categories) => [...new Set(categories)]); // Remove duplicates

/**
 * Schema for validating TTL values in seconds.
 * TTL must be positive and within reasonable bounds.
 */
export const TTLSchema = z
  .number()
  .int('TTL must be an integer')
  .min(300, 'TTL must be at least 300 seconds (5 minutes)')
  .max(86400, 'TTL must not exceed 86400 seconds (24 hours)')
  .default(3600); // Default: 1 hour

/**
 * Schema for job creation parameters.
 */
export const CreateJobParamsSchema = z.object({
  city: CitySchema,
  date: DateSchema,
  categories: CategoriesSchema,
  ttlSeconds: TTLSchema.optional()
});

/**
 * Schema for validating job IDs.
 * Job IDs must follow a specific format for consistency.
 */
export const JobIdSchema = z
  .string()
  .regex(/^job_\d+_[a-z0-9]+$/, 'Invalid job ID format');

/**
 * Schema for API request bodies to create jobs.
 * Includes all required fields with proper validation.
 */
export const CreateJobRequestSchema = z.object({
  city: CitySchema,
  date: DateSchema,
  categories: CategoriesSchema,
  options: z.object({
    ttlSeconds: TTLSchema.optional()
  }).optional()
});

/**
 * Schema for validating category normalization input.
 */
export const NormalizeCategoryInputSchema = z
  .string()
  .trim()
  .min(1, 'Category input cannot be empty');

/**
 * Type inference for validated create job parameters.
 */
export type ValidatedCreateJobParams = z.infer<typeof CreateJobParamsSchema>;

/**
 * Type inference for validated create job request.
 */
export type ValidatedCreateJobRequest = z.infer<typeof CreateJobRequestSchema>;

/**
 * Validation result type for consistent error handling.
 */
export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: string[];
}

/**
 * Validates and parses input data using a Zod schema.
 * Returns a consistent result structure with parsed data or errors.
 */
export function validateInput<T>(
  schema: z.ZodSchema<T>,
  input: unknown
): ValidationResult<T> {
  try {
    const result = schema.parse(input);
    return {
      success: true,
      data: result
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.errors.map(err => `${err.path.join('.')}: ${err.message}`)
      };
    }
    
    return {
      success: false,
      errors: ['Unknown validation error']
    };
  }
}

/**
 * Safely validates input with detailed error context.
 * Useful for API endpoints that need to return specific error messages.
 */
export function safeValidate<T>(
  schema: z.ZodSchema<T>,
  input: unknown,
  context: string = 'input'
): ValidationResult<T> {
  const result = validateInput(schema, input);
  
  if (!result.success && result.errors) {
    // Add context to error messages
    result.errors = result.errors.map(error => `${context}: ${error}`);
  }
  
  return result;
}