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
  
  // Access the internal cache map to count entries for this city
  const cache = (eventsCache as any).cache;
  if (cache && cache instanceof Map) {
    for (const [key, entry] of cache.entries()) {
      // Cache keys format: "city_date_categories"
      // Since city names can contain underscores, we need to find the date pattern first
      // and work backwards to determine the city name
      
      // Look for the date pattern (YYYY-MM-DD) in the key
      const datePattern = /\d{4}-\d{2}-\d{2}/;
      const dateMatch = key.match(datePattern);
      
      if (!dateMatch) continue; // Invalid date format
      
      const dateStartIndex = dateMatch.index!;
      
      // The city should end just before the underscore that precedes the date
      // Find the underscore immediately before the date
      const underscoreBeforeDateIndex = key.lastIndexOf('_', dateStartIndex - 1);
      
      if (underscoreBeforeDateIndex === -1) continue; // Invalid format
      
      const city = key.substring(0, underscoreBeforeDateIndex);
      
      if (city.toLowerCase() !== cityName.toLowerCase()) continue;
      
      // Check that there's an underscore after the date (separating date from categories)
      const dateEndIndex = dateStartIndex + 10; // YYYY-MM-DD is 10 characters
      if (dateEndIndex >= key.length || key[dateEndIndex] !== '_') continue; // Invalid format
      
      // We have a valid cache key for this city
      cachedSearches++;
      const events = entry.data || [];
      totalEvents += events.length;
      
      // Track the most recent cache entry
      if (!lastSearched || entry.timestamp > new Date(lastSearched).getTime()) {
        lastSearched = new Date(entry.timestamp).toISOString();
      }
    }
  }
  
  return { cachedSearches, totalEvents, lastSearched };
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