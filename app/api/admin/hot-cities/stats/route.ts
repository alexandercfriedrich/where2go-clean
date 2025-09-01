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
      const keyParts = key.split('_');
      if (keyParts.length >= 2 && keyParts[0].toLowerCase() === cityName.toLowerCase()) {
        cachedSearches++;
        const events = entry.data || [];
        totalEvents += events.length;
        
        // Track the most recent cache entry
        if (!lastSearched || entry.timestamp > new Date(lastSearched).getTime()) {
          lastSearched = new Date(entry.timestamp).toISOString();
        }
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