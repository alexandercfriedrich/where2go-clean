import { NextRequest, NextResponse } from 'next/server';
import { loadAllPages, upsertPage, deletePage, StaticPage } from '@/lib/staticPagesStore';

export async function GET() {
  try {
    const pages = await loadAllPages();
    return NextResponse.json({ pages });
  } catch (error) {
    console.error('Error in GET /api/admin/static-pages:', error);
    return NextResponse.json({ error: 'Failed to load static pages' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const pageData = (await request.json()) as Partial<StaticPage>;

    // Strict validation
    if (!pageData.id?.trim()) {
      return NextResponse.json({ error: 'Missing or invalid field: id (must be non-empty)' }, { status: 400 });
    }
    if (!pageData.title?.trim()) {
      return NextResponse.json({ error: 'Missing or invalid field: title (must be non-empty)' }, { status: 400 });
    }
    if (typeof pageData.content !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid field: content (must be a string)' }, { status: 400 });
    }
    if (typeof pageData.path !== 'string' || !pageData.path.startsWith('/')) {
      return NextResponse.json({ error: 'Missing or invalid field: path (must start with /)' }, { status: 400 });
    }

    const normalized: StaticPage = {
      id: pageData.id.trim(),
      title: pageData.title.trim(),
      content: pageData.content,
      path: pageData.path,
      updatedAt: new Date().toISOString(),
    };

    const savedPage = await upsertPage(normalized);
    return NextResponse.json({ success: true, page: savedPage });
  } catch (error: any) {
    console.error('Error in POST /api/admin/static-pages:', error);
    return NextResponse.json({ error: error?.message || 'Failed to save static page' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pageId = searchParams.get('id');

    if (!pageId?.trim()) {
      return NextResponse.json({ error: 'Missing or invalid page ID' }, { status: 400 });
    }

    const deleted = await deletePage(pageId.trim());

    if (!deleted) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in DELETE /api/admin/static-pages:', error);
    return NextResponse.json({ error: error?.message || 'Failed to delete static page' }, { status: 500 });
  }
}
