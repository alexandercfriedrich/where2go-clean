import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export const runtime = 'nodejs';
export const revalidate = 3600; // Cache 1 hour

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const city = searchParams.get('city') || 'Wien';
    const limit = Math.min(parseInt(searchParams.get('limit') || '15'), 50);
    const source = searchParams.get('source') || null;

    // Type assertion needed: Supabase RPC functions are not in the generated types
    const { data, error } = await (supabase as any).rpc('get_top_venues', {
      p_city: city,
      p_limit: limit,
      p_source: source
    });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: data || [],
      meta: { city, source: source || 'all', count: data?.length || 0 }
    });
  } catch (error: any) {
    console.error('[API] Venue stats error:', error);
    return NextResponse.json(
      { success: false, error: error.message, data: [] },
      { status: 500 }
    );
  }
}
