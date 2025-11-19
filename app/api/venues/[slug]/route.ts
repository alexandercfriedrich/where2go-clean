import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export const revalidate = 1800; // Cache 30 min

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const source = request.nextUrl.searchParams.get('source') || null;

    const { data, error } = await (supabase as any)
      .rpc('get_venue_with_events', {
        p_venue_slug: params.slug,
        p_source: source
      })
      .single();

    if (error) throw error;

    const venueData = data as any;
    if (!venueData || !venueData.venue) {
      return NextResponse.json(
        { success: false, error: 'Venue not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: venueData });
  } catch (error: any) {
    console.error(`[API] Venue ${params.slug} error:`, error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.code === 'PGRST116' ? 404 : 500 }
    );
  }
}
