import { NextRequest, NextResponse } from 'next/server';
import { 
  getHotCityBySlug, 
  deleteHotCity, 
  loadHotCities 
} from '@/lib/hotCityStore';

// GET /api/admin/hot-cities/[slug] - Get single hot city by slug
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const city = await getHotCityBySlug(params.slug);
    
    if (!city) {
      return NextResponse.json(
        { error: 'Hot city not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ city });
  } catch (error) {
    console.error('Error fetching hot city:', error);
    return NextResponse.json(
      { error: 'Failed to fetch hot city' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/hot-cities/[slug] - Delete hot city by slug
export async function DELETE(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const city = await getHotCityBySlug(params.slug);
    
    if (!city) {
      return NextResponse.json(
        { error: 'Hot city not found' },
        { status: 404 }
      );
    }

    const deleted = await deleteHotCity(city.id);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Failed to delete hot city' },
        { status: 500 }
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