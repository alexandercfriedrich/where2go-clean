/**
 * Hashing utilities for the new backend system.
 * This module provides deterministic signature generation for job deduplication.
 * 
 * @fileoverview Signature hashing for idempotent job creation.
 */

import { createHash } from 'crypto';

/**
 * Generate a deterministic signature for job deduplication.
 * The signature is based on city, date, and sorted categories.
 * 
 * This ensures that jobs with the same parameters (regardless of category order)
 * will have the same signature and can be deduplicated.
 * 
 * @param city - The target city (case-insensitive)
 * @param date - The event date in YYYY-MM-DD format
 * @param categories - Array of category names (will be sorted)
 * @returns A deterministic hash signature
 */
export function generateJobSignature(
  city: string,
  date: string,
  categories: string[]
): string {
  // Normalize inputs for consistent hashing
  const normalizedCity = city.trim().toLowerCase();
  const normalizedDate = date.trim();
  const sortedCategories = [...categories]
    .map(cat => cat.trim())
    .filter(cat => cat.length > 0)
    .sort(); // Sort categories for deterministic ordering
  
  // Create a deterministic string for hashing
  const signatureInput = `${normalizedCity}|${normalizedDate}|${sortedCategories.join(',')}`;
  
  // Generate SHA-256 hash
  const hash = createHash('sha256')
    .update(signatureInput, 'utf8')
    .digest('hex');
  
  // Return first 16 characters for shorter signatures
  return hash.substring(0, 16);
}

/**
 * Generate a unique job ID with timestamp and random component.
 * Format: job_{timestamp}_{randomString}
 * 
 * @returns A unique job identifier
 */
export function generateJobId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `job_${timestamp}_${random}`;
}

/**
 * Validate that a job signature matches the expected parameters.
 * Used to verify job integrity when retrieving from cache.
 * 
 * @param signature - The stored signature
 * @param city - The city parameter
 * @param date - The date parameter
 * @param categories - The categories parameter
 * @returns True if the signature matches the parameters
 */
export function validateJobSignature(
  signature: string,
  city: string,
  date: string,
  categories: string[]
): boolean {
  const expectedSignature = generateJobSignature(city, date, categories);
  return signature === expectedSignature;
}

/**
 * Extract components from a signature input string (for debugging).
 * This is mainly useful for testing and diagnostics.
 * 
 * @param city - The city parameter
 * @param date - The date parameter  
 * @param categories - The categories parameter
 * @returns The signature components for debugging
 */
export function getSignatureComponents(
  city: string,
  date: string,
  categories: string[]
): {
  normalizedCity: string;
  normalizedDate: string;
  sortedCategories: string[];
  signatureInput: string;
} {
  const normalizedCity = city.trim().toLowerCase();
  const normalizedDate = date.trim();
  const sortedCategories = [...categories]
    .map(cat => cat.trim())
    .filter(cat => cat.length > 0)
    .sort();
  
  const signatureInput = `${normalizedCity}|${normalizedDate}|${sortedCategories.join(',')}`;
  
  return {
    normalizedCity,
    normalizedDate,
    sortedCategories,
    signatureInput
  };
}