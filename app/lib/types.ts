// Zentrale Typen für die App

// Event-Daten, wie sie in der UI und Aggregation verwendet werden
export interface EventData {
  title: string;
  category: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  venue: string;
  price: string;
  website: string;

  // optionale Felder
  endTime?: string;
  address?: string;
  ticketPrice?: string;
  eventType?: string;
  description?: string;
  bookingLink?: string;
  ageRestrictions?: string;
  city?: string; // Stadt/Ort des Events
  cacheUntil?: string; // ISO string bis wann Event gecached werden darf
  parsingWarning?: string | string[]; // Warnings from parsing/validation

  // Herkunftsmarker für Badges
  source?: 'cache' | 'ai' | 'rss' | 'ra' | string;
  
  // Optional image URL for event cards (e.g., from Wien.info)
  imageUrl?: string;
  
  // Optional geographic coordinates for GEO targeting
  latitude?: number;
  longitude?: number;
  
  // Optional slug for event detail pages
  slug?: string;
}

// Antwort eines Perplexity-Requests, wie vom Aggregator erwartet
export interface PerplexityResult {
  query: string;
  response: string;
  events?: EventData[]; // parsed events (filled by aggregator)
  timestamp?: number;   // when the query was executed
  // Venue-specific query fields
  venueId?: string;
  venueName?: string;
}

// Cache-Eintrag (wird von app/lib/cache.ts verwendet)
export interface CacheEntry<T = any> {
  data: T;
  timestamp: number; // ms since epoch
  ttl: number;       // ms duration
}

// Query-Optionen für Suche und API-Calls
export interface QueryOptions {
  temperature?: number;
  max_tokens?: number;
  debug?: boolean;
  disableCache?: boolean;
  expandedSubcategories?: boolean;
  forceAllCategories?: boolean;
  categoryTimeoutMs?: number;
  overallTimeoutMs?: number;
  maxAttempts?: number;
  categoryConcurrency?: number;
  hotCity?: any;
  additionalSources?: any[];
  fetchWienInfo?: boolean; // NEU: optionaler Opt-In für direkte wien.info HTML Events
}

// Request-Body für Suche
export interface RequestBody {
  city: string;
  date: string;
  categories?: string[];
  options?: QueryOptions;
}

// Job-Status, wie in /api/jobs/[jobId]
export interface JobStatus {
  id: string;
  status: 'pending' | 'processing' | 'done' | 'error';
  events?: EventData[];
  error?: string;
  progress?: {
    completedCategories: number;
    totalCategories: number;
    missingCategories?: string[];
    // For optimized search
    phase?: number;
    completedPhases?: number;
    totalPhases?: number;
    message?: string;
  };
  cacheInfo?: any;
  createdAt?: Date;
  lastUpdateAt?: string;
}

// Debug-Schritt für Job-Verfolgung
export interface DebugStep {
  category: string;
  query: string;
  response: string;
  parsedCount: number;
  // Venue-specific debug fields
  venueId?: string | null;
  venueName?: string | null;
  isVenueQuery?: boolean;
}

// Debug-Infos optional je Job
export interface DebugInfo {
  createdAt: Date;
  city: string;
  date: string;
  categories: string[];
  options: any;
  steps: DebugStep[];
  wienInfoData?: {
    query: string;
    response: string;
    categories: string[];
    f1Ids: number[];
    url: string;
    apiResponse?: any;
    filteredEvents?: number;
    parsedEvents?: number;
    rawCategoryCounts?: Record<string, number>;
    mappedCategoryCounts?: Record<string, number>;
    unknownRawCategories?: string[];
  };
}

// Hot Cities: Website-Konfiguration
export interface HotCityWebsite {
  id: string;
  name: string;
  url: string;
  categories: string[]; // leeres Array => gilt für alle
  description?: string;
  searchQuery?: string;
  priority: number; // 1-10, höher = wichtiger
  isActive: boolean;
  // optional: Venue-bezogene Flags (werden im Admin UI verwendet)
  isVenue?: boolean;
  isVenuePrioritized?: boolean;
}

// NEU: einzelnes Venue in einer Hot City
export interface HotCityVenue {
  id: string;
  name: string;
  categories: string[];
  description?: string;
  priority: number;
  isActive: boolean;
  isVenue: true;
  isVenuePrioritized?: boolean;
  address: {
    full: string;
    street: string;
    houseNumber: string;
    postalCode: string;
    city: string;
    country: string;
  };
  website?: string;
  eventsUrl?: string;
  aiQueryTemplate?: string;
}

// Hot City Datensatz
export interface HotCity {
  id: string;
  name: string;
  country?: string;
  isActive: boolean;
  // bisher: websites (verwaltet in Admin)
  websites: HotCityWebsite[];
  // NEU: strukturierte Venues
  venues?: HotCityVenue[];
  defaultSearchQuery?: string;
  customPrompt?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Day-Bucket Cache: materialized view of all events for a city+date
export interface DayBucket {
  eventsById: { [eventId: string]: EventData };
  index: { [category: string]: string[] }; // sorted unique eventIds per category
  updatedAt: string; // ISO timestamp
}

// Venue types for venue discovery and detail pages
// Note: These types match the RPC function return values, not the raw table columns
export interface VenueStats {
  venue_id: string;
  venue_slug: string;
  name: string;
  full_address: string;  // RPC returns address as full_address
  city: string;
  total_events: number;
  upcoming_events: number;
  next_event_date?: string;
  categories: string[];
  sources: string[];
}

// Venue type matching RPC get_venue_with_events output
export interface Venue {
  id: string;
  slug: string;  // RPC returns venue_slug as slug (see line 32 of 007_update_venue_functions_for_slug.sql)
  name: string;
  full_address: string;  // RPC returns address as full_address
  city: string;
  country?: string;
  phone?: string;
  email?: string;
  website?: string;
  latitude?: number;
  longitude?: number;
}

export interface VenueDetail {
  venue: Venue;
  stats: {
    total_events: number;
    upcoming_events: number;
    categories: string[];
    sources: string[];
  };
  upcoming_events: EventData[];
}

// Blog Article Types
/**
 * Represents a blog article about events in a specific city and category.
 * Articles can be AI-generated or manually created and support SEO optimization.
 */
export interface BlogArticle {
  /** Unique identifier (UUID) */
  id: string;
  
  /** City slug - must be one of: wien, berlin, linz, ibiza */
  city: string;
  
  /** Event category - must match one of the 12 EVENT_CATEGORIES */
  category: string;
  
  /** URL-safe slug in format: {city}-{category}-{normalized-title} */
  slug: string;
  
  /** Article title */
  title: string;
  
  /** Article content as HTML from React-Quill editor */
  content: string;
  
  /** Comma-separated SEO keywords for search optimization */
  seo_keywords?: string;
  
  /** Meta description for search engines (recommended: 160 chars, max: 500) */
  meta_description?: string;
  
  /** URL to featured image */
  featured_image?: string;
  
  /** Publication status - only 'draft' or 'published' allowed */
  status: 'draft' | 'published';
  
  /** AI model or system that generated the article (e.g., 'claude-3-5-sonnet', 'manual') */
  generated_by: string;
  
  /** ISO 8601 timestamp when article was first created - never updated after creation */
  generated_at: string;
  
  /** ISO 8601 timestamp when article was published - set automatically when status changes to 'published' */
  published_at?: string;
  
  /** ISO 8601 timestamp of last update - managed automatically by database trigger */
  updated_at: string;
  
  /** Array of event UUIDs referenced in the article content */
  event_ids?: string[];
}

export interface BlogArticleCreatePayload {
  city: string;
  category: string;
  title: string;
  content: string;
  seo_keywords?: string;
  meta_description?: string;
  featured_image?: string;
}

export interface BlogArticleUpdatePayload extends Partial<BlogArticleCreatePayload> {
  status?: 'draft' | 'published';
}

export interface BlogArticleListRequest {
  city?: string;
  category?: string;
  status?: 'draft' | 'published';
  limit?: number;
  offset?: number;
}

export interface BlogArticleListResponse {
  articles: BlogArticle[];
  total: number;
  hasMore: boolean;
}
