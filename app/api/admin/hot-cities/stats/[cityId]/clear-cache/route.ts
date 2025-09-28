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
    let clearedCount = 0;
    
    try {
      // Get all keys from Redis
      const allKeys = await (eventsCache as any).redis.keys('*');
      const keysToDelete: string[] = [];
      
      for (const key of allKeys) {
        // Cache keys format: "city_date_categories"
        const keyParts = key.split('_');
        if (keyParts.length >= 2 && keyParts[0].toLowerCase() === city.name.toLowerCase()) {
          keysToDelete.push(key);
        }
      }
      
      if (keysToDelete.length > 0) {
        await (eventsCache as any).redis.del(...keysToDelete);
        clearedCount = keysToDelete.length;
      }
    } catch (redisError) {
      console.error('Redis clear cache error:', redisError);
      // Continue with the response even if Redis fails
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