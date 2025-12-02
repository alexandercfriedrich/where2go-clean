/**
 * Slug Generator for Events
 * Generates SEO-friendly slugs for event detail pages
 * Format: event-title-venue-date
 * Example: wiener-mozart-konzert-musikverein-2025-11-20
 */

import type { EventData } from './types';

/**
 * Normalize a string for URL slugs
 * - Converts to lowercase
 * - Removes diacritics (ä, ö, ü -> a, o, u)
 * - Removes special characters
 * - Replaces spaces with hyphens
 * - Removes duplicate hyphens
 */
function normalizeForSlug(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFKD') // Decompose combined characters
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9\s-]/g, '') // Remove special chars (keep spaces and hyphens)
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Remove duplicate hyphens
    .trim()
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/**
 * @deprecated NEVER USE THIS FUNCTION
 * 
 * Slugs MUST come from the database (events.slug column).
 * The database generates slugs with UUID suffix for uniqueness:
 * Format: {title}-{venue}-{date}-{uuid}
 * Example: "event-title-venue-2025-12-03-abc12345"
 * 
 * This function generates slugs WITHOUT UUID suffix, causing URL mismatch:
 * Format: {title}-{venue}-{date}
 * Example: "event-title-venue-2025-12-03"
 * 
 * Result: Frontend-generated URLs don't match database slugs → 404 errors
 * 
 * SOLUTION: Always use event.slug from database query result.
 * See: lib/events/queries.ts - convertToEventData()
 */
export function generateEventSlug(event: {
  title: string;
  venue?: string;
  date: string;
}): string {
  console.error('❌ generateEventSlug() called - this should NEVER happen!');
  console.error('Event:', event);
  console.error('Stack trace:', new Error().stack);
  
  throw new Error(
    'Slug generation moved to database. Use event.slug from database query. ' +
    'See app/lib/slugGenerator.ts for details.'
  );
}

/**
 * Generates a slug from event title and date only (when venue is missing)
 * Fallback method for events without venue information
 * 
 * @param title - Event title
 * @param date - Event date (YYYY-MM-DD)
 * @returns URL-safe slug string
 */
export function generateEventSlugSimple(title: string, date: string): string {
  const titleSlug = normalizeForSlug(title);
  const dateSlug = date.slice(0, 10);
  
  return `${titleSlug}-${dateSlug}`.substring(0, 150);
}

/**
 * Validates if a string is a valid slug format
 * - Only lowercase letters, numbers, and hyphens
 * - No leading/trailing hyphens
 * - No consecutive hyphens
 * 
 * @param slug - String to validate
 * @returns true if valid slug format
 */
export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug);
}

/**
 * Extract date from slug (assumes date is at the end in YYYY-MM-DD format)
 * 
 * @param slug - Event slug
 * @returns Date string (YYYY-MM-DD) or null if not found
 */
export function extractDateFromSlug(slug: string): string | null {
  const dateMatch = slug.match(/(\d{4}-\d{2}-\d{2})$/);
  return dateMatch ? dateMatch[1] : null;
}

/**
 * Normalize city name to URL-safe slug
 * Used for consistent city slug generation across the application
 * 
 * @param city - City name to normalize
 * @returns URL-safe city slug
 * 
 * @example
 * normalizeCitySlug("Wien") // "wien"
 * normalizeCitySlug("Köln") // "koln"
 */
export function normalizeCitySlug(city: string): string {
  return city
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Remove duplicate hyphens
    .trim()
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}
