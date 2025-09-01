import { NextRequest, NextResponse } from 'next/server';
import { loadHotCities } from '@/lib/hotCityStore';
import { eventsCache } from '@/lib/cache';

export async function POST(request: NextRequest, { params }: { params: { cityId: string } }) {
  try {
    const cityId = params.cityId;
    
    if (!cityId) {
      return NextResponse.json(
        { error: 'City ID is required' },
        { status: 400 }
      );
    }
    
    // Find the city
    const cities = await loadHotCities();
    const city = cities.find(c => c.id === cityId);
    
    if (!city) {
      return NextResponse.json(
        { error: 'City not found' },
        { status: 404 }
      );
    }
    
    // Clear cache entries for this city
    const cache = (eventsCache as any).cache;
    let clearedCount = 0;
    
    if (cache && cache instanceof Map) {
      const keysToDelete: string[] = [];
      
      for (const [key] of cache.entries()) {
        // Cache keys format: "city_date_categories"
        const keyParts = key.split('_');
        if (keyParts.length >= 2 && keyParts[0].toLowerCase() === city.name.toLowerCase()) {
          keysToDelete.push(key);
        }
      }
      
      keysToDelete.forEach(key => {
        cache.delete(key);
        clearedCount++;
      });
    }
    
    return NextResponse.json({ 
      success: true, 
      clearedCount,
      city: city.name 
    });
  } catch (error) {
    console.error('Error clearing cache for city:', error);
    return NextResponse.json(
      { error: 'Failed to clear cache' },
      { status: 500 }
    );
  }
}