import { Metadata } from 'next';
import {
  CATEGORY_NAMES,
  DATE_LABELS,
  CITY_NAMES,
  isValidCategory as validateCategory,
  isValidDateFilter as validateDateFilter,
  getCategoryName as getCategoryDisplayName,
  getDateLabel as getDateDisplayLabel,
} from '@/lib/categoryMappings';

/**
 * SEO Metadata Generator for City Pages with Date & Category Filters
 * Generates unique, optimized metadata for each route combination
 * 
 * Routes supported:
 * - /wien
 * - /wien/heute
 * - /wien/clubs-nachtleben
 * - /wien/clubs-nachtleben/heute
 * - /ibiza/live-konzerte/morgen
 * etc.
 */

export interface MetadataParams {
  city: string;
  date?: string;
  category?: string;
}

/**
 * Generate optimized SEO metadata for city + optional date + optional category
 * 
 * @example
 * generateCityMetadata({ city: 'wien', date: 'heute', category: 'clubs-nachtleben' })
 * Returns metadata for: /wien/clubs-nachtleben/heute
 */
export function generateCityMetadata(params: MetadataParams): Metadata {
  const { city, date, category } = params;

  const cityName = CITY_NAMES[city] || capitalize(city);
  const dateLabel = date ? DATE_LABELS[date] : null;
  const categoryLabel = category ? CATEGORY_NAMES[category] : null;
  const canonical = buildCanonicalURL(city, date, category);

  // Build dynamic Title
  let title: string;
  let description: string;
  let keywords: string[] = [
    `events ${cityName.toLowerCase()}`,
    `${cityName} veranstaltungen`,
    `konzerte ${cityName.toLowerCase()}`,
  ];

  // Title & Description Logic
  if (categoryLabel && dateLabel) {
    // Full: Category + Date
    title = `${categoryLabel} in ${cityName} ${dateLabel} | Where2Go`;
    description = `${categoryLabel} in ${cityName} ${dateLabel}. Live und aktuell auf Where2Go entdecken!`;
    keywords.push(`${categoryLabel.toLowerCase()} ${cityName.toLowerCase()} ${dateLabel}`);
    keywords.push(`${categoryLabel.toLowerCase()} ${dateLabel}`);
  } else if (categoryLabel && !dateLabel) {
    // Category only
    title = `${categoryLabel} in ${cityName} | Where2Go`;
    description = `Entdecke die besten ${categoryLabel.toLowerCase()} in ${cityName}. Live-Events, Veranstaltungen und mehr auf Where2Go.`;
    keywords.push(`${categoryLabel.toLowerCase()} ${cityName.toLowerCase()}`);
  } else if (!categoryLabel && dateLabel) {
    // Date only
    title = `Events in ${cityName} ${dateLabel} | Where2Go`;
    description = `Alle Events in ${cityName} ${dateLabel}. Konzerte, Theater, Ausstellungen und mehr. Entdecke, was los ist!`;
    keywords.push(`events ${cityName.toLowerCase()} ${dateLabel}`);
  } else {
    // City only
    title = `Events in ${cityName} | Where2Go - Konzerte & Veranstaltungen`;
    description = `Entdecke aktuelle Events in ${cityName}. Konzerte, Theater, Ausstellungen, Partys und mehr auf Where2Go.`;
  }

  return {
    title,
    description,
    keywords,
    alternates: {
      canonical,
      languages: {
        'de-AT': canonical,
      },
    },
    openGraph: {
      title,
      description,
      url: canonical,
      type: 'website',
      locale: 'de_AT',
      siteName: 'Where2Go',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
      },
    },
  };
}

/**
 * Build canonical URL for the route
 * Uses SITE_URL environment variable with fallback to production URL
 */
function buildCanonicalURL(city: string, date?: string, category?: string): string {
  const baseUrl = (process.env.SITE_URL || 'https://www.where2go.at').replace(/\/$/, '');
  
  if (category && date) {
    return `${baseUrl}/${city.toLowerCase()}/${category}/${date}`;
  }
  
  if (category) {
    return `${baseUrl}/${city.toLowerCase()}/${category}`;
  }
  
  if (date) {
    return `${baseUrl}/${city.toLowerCase()}/${date}`;
  }
  
  return `${baseUrl}/${city.toLowerCase()}`;
}

/**
 * Capitalize first letter
 */
function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Validate if category exists
 */
export function isValidCategory(category: string): boolean {
  return validateCategory(category);
}

/**
 * Validate if date filter is valid
 */
export function isValidDateFilter(date: string): boolean {
  return validateDateFilter(date);
}

/**
 * Get all valid categories
 */
export function getAllCategories(): string[] {
  return Object.keys(CATEGORY_NAMES);
}

/**
 * Get all valid date filters
 */
export function getAllDateFilters(): string[] {
  return Object.keys(DATE_LABELS);
}

/**
 * Get category display name
 */
export function getCategoryName(slug: string): string {
  return getCategoryDisplayName(slug) || slug;
}

/**
 * Get date label
 */
export function getDateLabel(slug: string): string {
  return getDateDisplayLabel(slug) || slug;
}
