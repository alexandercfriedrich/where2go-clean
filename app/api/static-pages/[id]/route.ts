import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

interface StaticPage {
  id: string;
  title: string;
  content: string;
  path: string;
  updatedAt: string;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data, error } = await (supabase
      .from('static_pages') as any)
      .select('*')
      .eq('id', params.id)
      .single();

    if (error) {
      console.error('Database error loading static page from Supabase:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }
    
    if (!data) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    const page: StaticPage = {
      id: data.id,
      title: data.title,
      content: data.content,
      path: data.path,
      updatedAt: data.updated_at,
    };

    return NextResponse.json({ page });
  } catch (error) {
    console.error('Error in GET /api/static-pages/[id]:', error);
    return NextResponse.json({ error: 'Failed to load static page' }, { status: 500 });
  }
}
