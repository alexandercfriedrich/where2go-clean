/**
 * Domain types for event data in the new backend system.
 * This module defines the core EventData structure and related types.
 * 
 * @fileoverview Event domain models with explicit TypeScript types and JSDoc documentation.
 */

/**
 * Core event data structure returned by the search system.
 * Represents a single event with all required and optional metadata.
 */
export interface EventData {
  /** Event title/name */
  title: string;
  
  /** Event category (normalized) */
  category: string;
  
  /** Event date in YYYY-MM-DD format */
  date: string;
  
  /** Event start time (HH:MM format) */
  time: string;
  
  /** Venue/location name */
  venue: string;
  
  /** Price information as string */
  price: string;
  
  /** Event website URL */
  website: string;
  
  /** Optional end time (HH:MM format) */
  endTime?: string;
  
  /** Optional venue address */
  address?: string;
  
  /** Optional specific ticket price (may differ from general price) */
  ticketPrice?: string;
  
  /** Optional event type/subgenre */
  eventType?: string;
  
  /** Optional event description */
  description?: string;
  
  /** Optional booking/ticket link */
  bookingLink?: string;
  
  /** Optional age restrictions */
  ageRestrictions?: string;
  
  /** Optional cache expiration timestamp (ISO string) */
  cacheUntil?: string;
}

/**
 * Metadata about cached events for a specific category.
 */
export interface EventCacheMetadata {
  /** When the events were cached (ISO timestamp) */
  cachedAt: string;
  
  /** TTL in seconds */
  ttlSeconds: number;
  
  /** Absolute expiration timestamp (ISO string) */
  expireAt: string;
  
  /** Number of events in this cache entry */
  eventCount: number;
}

/**
 * Result from checking cache for events in specific categories.
 */
export interface CacheCheckResult {
  /** Events found in cache, organized by category */
  cachedEvents: Record<string, EventData[]>;
  
  /** Categories that were not found in cache */
  missingCategories: string[];
  
  /** Cache metadata for found categories */
  cacheMetadata: Record<string, EventCacheMetadata>;
}