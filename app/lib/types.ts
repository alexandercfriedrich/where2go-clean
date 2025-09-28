// Event-Datenstruktur
export interface EventData {
  title: string;
  category: string;
  date: string;
  time: string;
  venue: string;
  price: string;
  website: string;
  endTime?: string;
  address?: string;
  ticketPrice?: string;
  eventType?: string;
  description?: string;
  bookingLink?: string;
  ageRestrictions?: string;
  source?: 'ai' | 'ai-fallback' | 'cache' | 'wien-info' | 'fallback';
}

// Query-Optionen für Anfragen
export interface QueryOptions {
  temperature?: number;
  max_tokens?: number;
  debug?: boolean;
  debugVerbose?: boolean;
  disableCache?: boolean;
  expandedSubcategories?: boolean;
  forceAllCategories?: boolean;
  progressive?: boolean;
  categoryConcurrency?: number;
  timePeriod?: string;
  customDate?: string;
  fetchWienInfo?: boolean;
  hotCity?: any;
  additionalSources?: any[];
  // Erweiterte Optionen für Optimierungen
  enhancedSearch?: boolean;
  fallbackEnabled?: boolean;
  diversityBoost?: boolean;
}

// Request-Body für Suche
export interface RequestBody {
  city: string;
  date: string;
  categories?: string[];
  options?: QueryOptions;
}

// Erweiterte Metriken für optimierte Verarbeitung
export interface EnhancedMetrics {
  totalEventsFound?: number;
  averageEventsPerCategory?: number;
  processingSpeed?: number;
  currentConcurrency?: number;
}

// Finale Statistiken
export interface FinalStats {
  totalEventsFound: number;
  totalUniqueEvents: number;
  averageEventsPerCategory: number;
  processingTimeSeconds: number;
  categoriesProcessed: number;
  optimizationsApplied: string[];
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
  // Erweiterte Felder für Optimierungen (optional)
  enhancedMetrics?: EnhancedMetrics;
  finalStats?: FinalStats;
}

// Debug-Schritt für Job-Verfolgung
export interface DebugStep {
  category: string;
  query: string;
  response: string;
  parsedCount: number;
  // Erweiterte Debug-Informationen (optional)
  enhancedMetrics?: {
    queryLength: number;
    responseLength: number;
    processingTime: number;
  };
}

// Debug-Infos optional je Job
export interface DebugInfo {
  createdAt: Date;
  city: string;
  date: string;
  categories: string[];
  options: any;
  steps: DebugStep[];
  // Erweiterte Debug-Informationen (optional)
  wienInfoData?: {
    url: string;
    scrapedContent: string;
    events: any[];
    error?: string;
  };
}

// Hot City Website Datensatz
export interface HotCityWebsite {
  id: string;
  name: string;
  url: string;
  categories: string[];
  description?: string;
  searchQuery?: string;
  priority: number;
  isActive: boolean;
}

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

// Event-Suche - Hauptschnittstelle für Event-Kategorien
export type EventCategory = 
  | 'Live-Konzerte'
  | 'DJ Sets/Electronic'
  | 'Clubs/Discos'
  | 'Open Air'
  | 'Museen'
  | 'LGBTQ+'
  | 'Comedy/Kabarett'
  | 'Theater/Performance'
  | 'Film'
  | 'Food/Culinary'
  | 'Sport'
  | 'Familien/Kids'
  | 'Märkte/Shopping'
  | 'Kunst/Design'
  | 'Wellness/Spirituell'
  | 'Networking/Business'
  | 'Bildung/Lernen'
  | 'Kultur/Traditionen'
  | 'Soziales/Community'
  | 'Natur/Outdoor';

// Erweiterte Event-Quelle Typen
export type EventSource = 'ai' | 'ai-fallback' | 'cache' | 'wien-info' | 'fallback' | 'enhanced' | 'hot-cities';

// Wien.info spezifische Typen
export interface WienInfoEvent {
  title: string;
  date: string;
  time?: string;
  venue?: string;
  address?: string;
  description?: string;
  url?: string;
  category?: string;
  price?: string;
  source: 'wien-info';
}

export interface WienInfoResponse {
  events: WienInfoEvent[];
  error?: string;
  totalFound: number;
  searchParams: {
    fromISO: string;
    toISO: string;
    categories: string[];
    limit?: number;
  };
}

// Cache-Informationen
export interface CacheInfo {
  fromCache: boolean;
  totalEvents: number;
  cachedEvents: number;
  cacheBreakdown: Record<string, { fromCache: boolean; eventCount: number }>;
}

// API Response Typen
export interface EventSearchResponse {
  events: EventData[];
  cached?: boolean;
  status: 'completed' | 'processing' | 'error';
  newlyFetched?: string[];
  cacheInfo?: CacheInfo;
  ttlApplied?: number;
  enhancedSearch?: boolean;
  jobId?: string;
  enhancedStats?: FinalStats;
}

// Job Response Typen
export interface JobResponse {
  jobId: string;
  status: 'pending' | 'processing' | 'done' | 'error';
  events?: EventData[];
  categoriesProcessed?: string[];
  enhancedStats?: FinalStats;
  progress?: {
    completedCategories: number;
    totalCategories: number;
  };
}

// Fallback Provider Interface
export interface FallbackProvider {
  name: string;
  searchEvents(city: string, date: string, options?: QueryOptions): Promise<EventData[]>;
}
