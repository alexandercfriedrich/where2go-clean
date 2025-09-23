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

  // New: parsing tolerance diagnostics (non-breaking, optional)
  // Populated when we accept minimally valid events (e.g., missing title or category)
  parsingWarning?: string | string[];
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
  options?: any;
}

export interface JobStatus {
  id: string;
  status: 'pending' | 'processing' | 'done' | 'error';
  createdAt: Date;
  events?: EventData[];
  error?: string;
  progress?: {
    completedCategories: number;
    totalCategories: number;
  };
  lastUpdateAt?: string;
  debug?: DebugInfo;
}

export interface CacheEntry<T> {
  value: T;
  expiresAt: number;
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
  categories: string[];
  description?: string;
  searchQuery?: string;
  priority?: number; // 1-10
  isActive?: boolean;
}

export interface HotCity {
  id: string;
  name: string;
  country: string;
  isActive: boolean;
  websites: HotCityWebsite[];
  defaultSearchQuery?: string;
  customPrompt?: string;
  createdAt: Date;
  updatedAt: Date;
}
