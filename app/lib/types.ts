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
  cacheUntil?: string; // ISO string bis wann Event gecached werden darf

  // Herkunftsmarker für Badges
  source?: 'cache' | 'ai' | 'rss' | 'ra' | string;
}

// Antwort eines Perplexity-Requests, wie vom Aggregator erwartet
export interface PerplexityResult {
  query: string;
  response: string;
}

// Cache-Eintrag (wird von app/lib/cache.ts verwendet)
export interface CacheEntry<T = any> {
  data: T;
  timestamp: number; // ms since epoch
  ttl: number;       // ms duration
}

// Request-Body für Suche
export interface RequestBody {
  city: string;
  date: string;
  categories?: string[];
  options?: any;
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
  };
  cacheInfo?: any;
  createdAt?: Date;
  lastUpdateAt?: string;
}

// Debug-Infos optional je Job
export interface DebugInfo {
  createdAt: Date;
  city: string;
  date: string;
  categories: string[];
  options: any;
  steps: any[];
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

// Hot City Datensatz
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
