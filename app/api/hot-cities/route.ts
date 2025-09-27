import { NextRequest, NextResponse } from 'next/server';
import { getActiveHotCities, filterBlacklistedUrls } from '@/lib/hotCityStore';

// GET /api/hot-cities - Get sanitized list of hot cities (public, no auth required)
export async function GET() {
  try {
    const cities = await getActiveHotCities();
    const filteredCities = filterBlacklistedUrls(cities);
    
    // Return sanitized data - enabled sites only, no notes/description
    const sanitizedCities = filteredCities.map(city => ({
      name: city.name,
      country: city.country,
      defaultSearchQuery: city.defaultSearchQuery,
      customPrompt: city.customPrompt,
      websites: city.websites
        .filter(site => site.isActive)
        .map(site => ({
          name: site.name,
          url: site.url,
          categories: site.categories,
          searchQuery: site.searchQuery,
          priority: site.priority
        }))
    }));

    return NextResponse.json({ cities: sanitizedCities });
  } catch (error) {
    console.error('Error loading hot cities:', error);
    return NextResponse.json(
      { error: 'Failed to load hot cities' },
      { status: 500 }
    );
  }
}