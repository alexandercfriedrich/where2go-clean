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
}

// Antwort eines Perplexity-Requests, wie vom Aggregator erwartet
export interface PerplexityResult {
  query: string;
  response: string;
  events?: EventData[]; // parsed events (filled by aggregator)
  timestamp?: number;   // when the query was executed
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
  minEventsPerCategory?: number;
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
}

// Debug-Infos optional je Job
export interface DebugInfo {
  createdAt: Date;
  city: string;
  date: string;
  categories: string[];
  options: any;
  steps: DebugStep[];
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
