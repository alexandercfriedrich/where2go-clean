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
 * Generates a unique, SEO-friendly slug for an event
 * Format: {title-slug}-{venue-slug}-{date}
 * Maximum length: 150 characters
 * 
 * @param event - Event data object
 * @returns URL-safe slug string
 * 
 * @example
 * generateEventSlug({
 *   title: "Wiener Mozart Konzert",
 *   venue: "Musikverein",
 *   date: "2025-11-20",
 *   ...
 * })
 * // Returns: "wiener-mozart-konzert-musikverein-2025-11-20"
 */
export function generateEventSlug(event: {
  title: string;
  venue?: string;
  date: string;
}): string {
  const titleSlug = normalizeForSlug(event.title);
  const venueSlug = event.venue ? normalizeForSlug(event.venue) : '';
  const dateSlug = event.date.slice(0, 10); // YYYY-MM-DD

  // Combine parts, filtering out empty strings
  const parts = [titleSlug, venueSlug, dateSlug].filter(Boolean);
  const fullSlug = parts.join('-');
  
  // Limit to 150 characters, but ensure we keep the date intact
  if (fullSlug.length <= 150) {
    return fullSlug;
  }
  
  // If too long, truncate but preserve the date at the end
  // Date is 10 chars, need 1 char for hyphen = 11 chars reserved
  const maxLengthBeforeDate = 150 - 11;
  const slugWithoutDate = [titleSlug, venueSlug].filter(Boolean).join('-');
  const truncatedSlug = slugWithoutDate.substring(0, maxLengthBeforeDate);
  
  // Remove trailing hyphen if present after truncation
  const cleanedSlug = truncatedSlug.replace(/-+$/, '');
  
  return `${cleanedSlug}-${dateSlug}`;
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
