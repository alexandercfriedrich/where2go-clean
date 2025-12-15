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
 * @param city - City name (e.g., 'wien', 'berlin')
 * @param category - Event category (e.g., 'Clubs & Nachtleben')
 * @param title - Article title
 * @returns URL-safe slug
 * 
 * @example
 * generateBlogSlug('wien', 'Clubs & Nachtleben', 'Die besten Clubs')
 * // Returns: 'wien-clubs-nachtleben-die-besten-clubs'
 */
export function generateBlogSlug(city: string, category: string, title: string): string {
  const citySlug = slugify(city);
  const categorySlug = slugify(category);
  const titleSlug = slugify(title).substring(0, TITLE_SLUG_MAX_LENGTH);
  
  return `${citySlug}-${categorySlug}-${titleSlug}`;
}
