import { NextRequest, NextResponse } from 'next/server';
import { loadHotCities } from '@/lib/hotCityStore';
import { eventsCache } from '@/lib/cache';
import InMemoryCache from '@/lib/cache';

interface HotCityStats {
  id: string;
  name: string;
  country: string;
  isActive: boolean;
  totalWebsites: number;
  activeWebsites: number;
  cachedSearches: number;
  totalEvents: number;
  lastSearched: string | null;
}

// Get cache stats for each city
function getCacheStatsForCity(cityName: string): { cachedSearches: number; totalEvents: number; lastSearched: string | null } {
  let cachedSearches = 0;
  let totalEvents = 0;
  let lastSearched: string | null = null;
  
  // Track unique search combinations to avoid double-counting
  const uniqueSearches = new Set<string>();
  
  // Access the internal cache map to count entries for this city
  const cache = (eventsCache as any).cache;
  if (cache && cache instanceof Map) {
    console.log(`[Admin Stats] Checking cache for city: ${cityName}, total cache entries: ${cache.size}`);
    
    for (const [key, entry] of cache.entries()) {
      // Cache keys format: "city_date_categories"
      // Since city names can contain underscores, we need to find the date pattern first
      // and work backwards to determine the city name
      
      // Look for the date pattern (YYYY-MM-DD) in the key
      const datePattern = /\d{4}-\d{2}-\d{2}/;
      const dateMatch = key.match(datePattern);
      
      if (!dateMatch) {
        console.log(`[Admin Stats] Skipping invalid cache key (no date): "${key}"`);
        continue; // Invalid date format
      }
      
      const dateStartIndex = dateMatch.index!;
      
      // The city should end just before the underscore that precedes the date
      // Find the underscore immediately before the date
      const underscoreBeforeDateIndex = key.lastIndexOf('_', dateStartIndex - 1);
      
      if (underscoreBeforeDateIndex === -1) {
        console.log(`[Admin Stats] Skipping invalid cache key (no city separator): "${key}"`);
        continue; // Invalid format
      }
      
      const city = key.substring(0, underscoreBeforeDateIndex);
      
      if (city.toLowerCase() !== cityName.toLowerCase()) {
        // This entry is for a different city, skip silently
        continue;
      }
      
      // Check that there's an underscore after the date (separating date from categories)
      const dateEndIndex = dateStartIndex + 10; // YYYY-MM-DD is 10 characters
      if (dateEndIndex >= key.length || key[dateEndIndex] !== '_') {
        console.log(`[Admin Stats] Skipping invalid cache key (invalid date format): "${key}"`);
        continue; // Invalid format
      }
      
      // Extract the date and category parts for grouping
      const date = key.substring(dateStartIndex, dateEndIndex);
      const categories = key.substring(dateEndIndex + 1);
      
      // Create a unique identifier for this search (city + date combination)
      // For per-category caches, we group by city+date, not individual categories
      const searchIdentifier = `${city}_${date}`;
      
      // We have a valid cache key for this city
      const events = entry.data || [];
      totalEvents += events.length;
      
      console.log(`[Admin Stats] Found cache entry for ${cityName}: "${key}" with ${events.length} events`);
      
      // Track unique searches - for per-category caches, count each city+date combination once
      // For legacy caches with multiple categories, also count once per city+date combination
      if (!uniqueSearches.has(searchIdentifier)) {
        uniqueSearches.add(searchIdentifier);
        cachedSearches++;
        console.log(`[Admin Stats] New unique search for ${cityName}: ${searchIdentifier}`);
      } else {
        console.log(`[Admin Stats] Duplicate search identifier for ${cityName}: ${searchIdentifier}`);
      }
      
      // Track the most recent cache entry
      if (!lastSearched || entry.timestamp > new Date(lastSearched).getTime()) {
        lastSearched = new Date(entry.timestamp).toISOString();
      }
    }
    
    console.log(`[Admin Stats] Final stats for ${cityName}: ${cachedSearches} searches, ${totalEvents} events, last searched: ${lastSearched}`);
  } else {
    console.log(`[Admin Stats] Cache not accessible for ${cityName}`);
  }
  
  return { cachedSearches, totalEvents, lastSearched };
}

// Enhanced function that provides detailed breakdown of cache statistics
function getDetailedCacheStatsForCity(cityName: string): {
  cachedSearches: number;
  totalEvents: number;
  lastSearched: string | null;
  perCategoryEntries: number;
  legacyEntries: number;
  categoryBreakdown: { [category: string]: { entries: number; events: number } };
} {
  let totalEvents = 0;
  let lastSearched: string | null = null;
  let perCategoryEntries = 0;
  let legacyEntries = 0;
  const categoryBreakdown: { [category: string]: { entries: number; events: number } } = {};
  const uniqueSearches = new Set<string>();
  
  // Access the internal cache map to count entries for this city
  const cache = (eventsCache as any).cache;
  if (cache && cache instanceof Map) {
    for (const [key, entry] of cache.entries()) {
      // Cache keys format: "city_date_categories"
      // Look for the date pattern (YYYY-MM-DD) in the key
      const datePattern = /\d{4}-\d{2}-\d{2}/;
      const dateMatch = key.match(datePattern);
      
      if (!dateMatch) continue;
      
      const dateStartIndex = dateMatch.index!;
      const underscoreBeforeDateIndex = key.lastIndexOf('_', dateStartIndex - 1);
      
      if (underscoreBeforeDateIndex === -1) continue;
      
      const city = key.substring(0, underscoreBeforeDateIndex);
      
      if (city.toLowerCase() !== cityName.toLowerCase()) continue;
      
      const dateEndIndex = dateStartIndex + 10;
      if (dateEndIndex >= key.length || key[dateEndIndex] !== '_') continue;
      
      const date = key.substring(dateStartIndex, dateEndIndex);
      const categories = key.substring(dateEndIndex + 1);
      const searchIdentifier = `${city}_${date}`;
      
      const events = entry.data || [];
      totalEvents += events.length;
      
      // Determine if this is a per-category cache or legacy cache
      if (categories.includes(',') || categories === 'all') {
        // Legacy cache entry (multiple categories or 'all')
        legacyEntries++;
      } else {
        // Per-category cache entry (single category)
        perCategoryEntries++;
        
        // Track category breakdown
        if (!categoryBreakdown[categories]) {
          categoryBreakdown[categories] = { entries: 0, events: 0 };
        }
        categoryBreakdown[categories].entries++;
        categoryBreakdown[categories].events += events.length;
      }
      
      uniqueSearches.add(searchIdentifier);
      
      if (!lastSearched || entry.timestamp > new Date(lastSearched).getTime()) {
        lastSearched = new Date(entry.timestamp).toISOString();
      }
    }
  }
  
  return {
    cachedSearches: uniqueSearches.size,
    totalEvents,
    lastSearched,
    perCategoryEntries,
    legacyEntries,
    categoryBreakdown
  };
}

export async function GET(request: NextRequest) {
  try {
    const cities = await loadHotCities();
    
    const stats: HotCityStats[] = cities.map(city => {
      const activeWebsites = city.websites.filter(w => w.isActive).length;
      const cacheStats = getCacheStatsForCity(city.name);
      
      return {
        id: city.id,
        name: city.name,
        country: city.country,
        isActive: city.isActive,
        totalWebsites: city.websites.length,
        activeWebsites,
        cachedSearches: cacheStats.cachedSearches,
        totalEvents: cacheStats.totalEvents,
        lastSearched: cacheStats.lastSearched
      };
    });
    
    return NextResponse.json({ stats });
  } catch (error) {
    console.error('Error in GET /api/admin/hot-cities/stats:', error);
    return NextResponse.json(
      { error: 'Failed to load hot cities stats' },
      { status: 500 }
    );
  }
}