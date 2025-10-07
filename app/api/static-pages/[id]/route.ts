import { NextRequest, NextResponse } from 'next/server';
import { getPageById } from '@/lib/staticPagesStore';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const page = await getPageById(params.id);

    if (!page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    return NextResponse.json({ page });
  } catch (error) {
    console.error('Error in GET /api/static-pages/[id]:', error);
    return NextResponse.json({ error: 'Failed to load static page' }, { status: 500 });
  }
}
