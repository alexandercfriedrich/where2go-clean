import { NextRequest, NextResponse } from 'next/server';
import { 
  loadHotCities, 
  saveHotCity, 
  deleteHotCity, 
  getActiveHotCities 
} from '@/lib/hotCityStore';
import { HotCity } from '@/lib/types';

// GET /api/admin/cities - Get all hot cities
export async function GET() {
  try {
    const cities = await loadHotCities();
    return NextResponse.json({ cities });
  } catch (error) {
    console.error('Error loading hot cities:', error);
    return NextResponse.json(
      { error: 'Failed to load hot cities' },
      { status: 500 }
    );
  }
}

// POST /api/admin/cities - Create a new hot city
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, country, isActive = true, websites = [], defaultSearchQuery, customPrompt } = body;

    if (!name || !country) {
      return NextResponse.json(
        { error: 'Name and country are required' },
        { status: 400 }
      );
    }

    const newCity: HotCity = {
      id: `city-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: name.trim(),
      country: country.trim(),
      isActive,
      websites: websites || [],
      defaultSearchQuery: defaultSearchQuery?.trim() || '',
      customPrompt: customPrompt?.trim() || '',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await saveHotCity(newCity);

    return NextResponse.json({ 
      success: true, 
      city: newCity,
      message: 'Hot city created successfully' 
    });
  } catch (error) {
    console.error('Error creating hot city:', error);
    return NextResponse.json(
      { error: 'Failed to create hot city' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/cities - Update an existing hot city
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, country, isActive, websites, defaultSearchQuery, customPrompt } = body;

    if (!id || !name || !country) {
      return NextResponse.json(
        { error: 'ID, name and country are required' },
        { status: 400 }
      );
    }

    const updatedCity: HotCity = {
      id,
      name: name.trim(),
      country: country.trim(),
      isActive: isActive !== undefined ? isActive : true,
      websites: websites || [],
      defaultSearchQuery: defaultSearchQuery?.trim() || '',
      customPrompt: customPrompt?.trim() || '',
      createdAt: new Date(), // Will be overwritten with actual created date from existing data
      updatedAt: new Date()
    };

    await saveHotCity(updatedCity);

    return NextResponse.json({ 
      success: true, 
      city: updatedCity,
      message: 'Hot city updated successfully' 
    });
  } catch (error) {
    console.error('Error updating hot city:', error);
    return NextResponse.json(
      { error: 'Failed to update hot city' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/cities?id=cityId - Delete a hot city
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cityId = searchParams.get('id');

    if (!cityId) {
      return NextResponse.json(
        { error: 'City ID is required' },
        { status: 400 }
      );
    }

    const deleted = await deleteHotCity(cityId);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Hot city not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Hot city deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting hot city:', error);
    return NextResponse.json(
      { error: 'Failed to delete hot city' },
      { status: 500 }
    );
  }
}