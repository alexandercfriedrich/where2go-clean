/**
 * Blog Article Slug Generator
 * Generates URL-safe slugs for blog articles
 * Format: {city}-{category}-{normalized-title}
 */

import { slugify } from './slugify';

/**
 * Maximum length for the title portion of the slug
 * This prevents excessively long URLs while maintaining SEO value
 */
const TITLE_SLUG_MAX_LENGTH = 100;

/**
 * Generate slug for blog article
 * 
 * @param city - City name (e.g., 'wien', 'berlin'). Must not be empty.
 * @param category - Event category (e.g., 'Clubs & Nachtleben'). Must not be empty.
 * @param title - Article title. Must not be empty.
 * @returns URL-safe slug in format: {city}-{category}-{normalized-title}
 * 
 * @throws {Error} If any parameter is empty or contains only whitespace
 * 
 * @example
 * generateBlogSlug('wien', 'Clubs & Nachtleben', 'Die besten Clubs')
 * // Returns: 'wien-clubs-nachtleben-die-besten-clubs'
 */
export function generateBlogSlug(city: string, category: string, title: string): string {
  // Validate inputs
  if (!city?.trim()) {
    throw new Error('City parameter is required and must not be empty');
  }
  if (!category?.trim()) {
    throw new Error('Category parameter is required and must not be empty');
  }
  if (!title?.trim()) {
    throw new Error('Title parameter is required and must not be empty');
  }

  const citySlug = slugify(city);
  const categorySlug = slugify(category);
  const titleSlug = slugify(title).substring(0, TITLE_SLUG_MAX_LENGTH);
  
  return `${citySlug}-${categorySlug}-${titleSlug}`;
}
