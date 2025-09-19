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
  source?: 'cache' | 'rss' | 'ai'; // Provenance information
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

// Hot Cities feature types
export interface HotCityWebsite {
  id: string;
  name: string;
  url: string;
  categories: string[]; // Which categories this website covers
  description?: string;
  searchQuery?: string; // Custom search query for this website
  priority: number; // Higher priority websites are searched first
  isActive: boolean;
  isVenue?: boolean; // Whether this website represents a physical venue
  isVenuePrioritized?: boolean; // Whether this venue should be prioritized when events are found
}

export interface HotCity {
  id: string;
  name: string;
  country: string;
  isActive: boolean;
  websites: HotCityWebsite[];
  defaultSearchQuery?: string; // Default search query for this city
  customPrompt?: string; // Custom prompt additions for this city
  createdAt: Date;
  updatedAt: Date;
}