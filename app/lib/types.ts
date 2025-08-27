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
  };
}

export interface JobStatus {
  id: string;
  status: 'pending' | 'done' | 'error';
  events?: EventData[];
  error?: string;
  createdAt: Date;
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
}