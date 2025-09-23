// Shared types for the where2go application

export interface EventData {
  title: string;
  category: string;
  date: string;
  time: string;
  venue: string;
  price: string;
  website: string;
  cacheUntil?: string; // Optional ISO date string for cache expiration
  // New optional fields for enhanced UI
  endTime?: string;
  address?: string;
  ticketPrice?: string;
  eventType?: string;
  description?: string;
  bookingLink?: string;
  ageRestrictions?: string;
  parsingWarning?: string; // Warnings from tolerant parsing
  // Widened to cover UI badges and various sources safely
  source?: 'cache' | 'rss' | 'ai' | 'ra' | string; // Provenance information
}

export interface PerplexityResult {
  query: string;
  response: string;
  events: EventData[];
  timestamp: number;
}

export interface RequestBody {
  city: string;
  date: string;
  categories?: string[];
  options?: {
    includeNearbyEvents?: boolean;
    maxResults?: number;
    priceRange?: string;
    accessibility?: string;
    debug?: boolean; // New debug flag
    disableCache?: boolean; // Cache bypass flag
    progressive?: boolean; // New progressive results flag
  };
}

export interface JobStatus {
  id: string;
  status: 'pending' | 'done' | 'error' | 'processing';
  events?: EventData[];
  error?: string;
  message?: string;
  createdAt: Date;
  debug?: DebugInfo; // New debug info
  cacheInfo?: {
    fromCache: boolean;
    totalEvents: number;
    cachedEvents: number;
    categoriesFromCache?: string[];     // NEW: Categories that came from cache
    categoriesSearched?: string[];      // NEW: Categories that were searched
    cacheBreakdown?: {                  // NEW: Per-category breakdown
      [category: string]: {
        fromCache: boolean;
        eventCount: number;
      }
    }
  };
  progress?: {
    completedCategories: number;
    totalCategories: number;
    missingCategories?: string[];
  };
  lastUpdateAt?: string; // ISO date string
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export interface QueryOptions {
  includeNearbyEvents?: boolean;
  maxResults?: number;
  priceRange?: string;
  accessibility?: string;
  temperature?: number;
  max_tokens?: number;
  debug?: boolean;
  categoryConcurrency?: number;
  categoryTimeoutMs?: number | { [key: string]: number };
  overallTimeoutMs?: number; // Overall timeout for entire processing job
  maxAttempts?: number;
}

export interface DebugStep {
  category: string;
  query: string;
  response: string;
  parsedCount: number;
  addedCount?: number;
  totalAfter?: number;
}

export interface DebugInfo {
  createdAt: Date;
  city: string;
  date: string;
  categories: string[];
  options?: any;
  steps: DebugStep[];
}

export interface HotCity {
  id: string;
  name: string;
  country: string;
  websites: HotCityWebsite[];
  categories?: string[];
  defaultSearchQuery: string;
  customPrompt: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface HotCityWebsite {
  id: string;
  url: string;
  name: string;
  categories: string[];
  description: string;
  searchQuery?: string;
  priority: number;
  isActive: boolean;
  isVenue?: boolean;
  isVenuePrioritized?: boolean;
  lastChecked?: Date;
  status?: 'working' | 'broken' | 'unknown';
  createdAt?: Date;
  updatedAt?: Date;
}
