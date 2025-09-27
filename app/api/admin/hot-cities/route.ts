import { NextRequest, NextResponse } from 'next/server';
import { 
  loadHotCities, 
  saveHotCity, 
  deleteHotCity, 
  getActiveHotCities,
  filterBlacklistedUrls
} from '@/lib/hotCityStore';
import { HotCity } from '@/lib/types';

// GET /api/admin/hot-cities - Get all hot cities
export async function GET() {
  try {
    const cities = await loadHotCities();
    const filteredCities = filterBlacklistedUrls(cities);
    return NextResponse.json({ cities: filteredCities });
  } catch (error) {
    console.error('Error loading hot cities:', error);
    return NextResponse.json(
      { error: 'Failed to load hot cities' },
      { status: 500 }
    );
  }
}

// POST /api/admin/hot-cities - Upsert (create or update) hot city
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, country, isActive = true, websites = [], defaultSearchQuery, customPrompt } = body;

    if (!name || !country) {
      return NextResponse.json(
        { error: 'Name and country are required' },
        { status: 400 }
      );
    }

    const cityData: HotCity = {
      id: id || `city-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: name.trim(),
      country: country.trim(),
      isActive,
      websites: websites || [],
      defaultSearchQuery: defaultSearchQuery?.trim() || '',
      customPrompt: customPrompt?.trim() || '',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await saveHotCity(cityData);

    return NextResponse.json({ 
      success: true, 
      city: cityData,
      message: id ? 'Hot city updated successfully' : 'Hot city created successfully'
    });
  } catch (error) {
    console.error('Error upserting hot city:', error);
    return NextResponse.json(
      { error: 'Failed to save hot city' },
      { status: 500 }
    );
  }
}