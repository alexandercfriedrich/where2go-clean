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
  };
}

export interface JobStatus {
  id: string;
  status: 'pending' | 'done' | 'error';
  events?: EventData[];
  error?: string;
  createdAt: Date;
  debug?: DebugInfo; // New debug info
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