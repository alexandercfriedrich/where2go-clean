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
  };
}

export interface JobStatus {
  id: string;
  status: 'pending' | 'done' | 'error';
  events?: EventData[];
  error?: string;
  createdAt: Date;
  debug?: DebugInfo; // New debug info
  progress?: {
    completedCategories: number;
    totalCategories: number;
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