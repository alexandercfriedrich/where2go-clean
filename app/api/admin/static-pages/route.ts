import { NextRequest, NextResponse } from 'next/server';
import { loadAllPages, upsertPage, deletePage, StaticPage } from '@/lib/staticPagesStore';

export async function GET() {
  try {
    console.log('[Admin API GET] Starting to load pages...');
    const pages = await loadAllPages();
    console.log('[Admin API GET] Loaded pages count:', pages.length);
    if (pages.length > 0) {
      console.log('[Admin API GET] First page:', {
        id: pages[0].id,
        title: pages[0].title,
        contentLength: pages[0].content?.length || 0,
        path: pages[0].path
      });
    }
    console.log('[Admin API GET] Returning response with', pages.length, 'pages');
    return NextResponse.json({ pages });
  } catch (error) {
    console.error('[Admin API GET] Error in GET /api/admin/static-pages:', error);
    return NextResponse.json({ error: 'Failed to load static pages' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const pageData = (await request.json()) as Partial<StaticPage>;
    console.log('[Admin API POST] Received page data:', {
      id: pageData.id,
      title: pageData.title,
      contentLength: pageData.content?.length || 0,
      path: pageData.path
    });

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

    console.log('[Admin API POST] Saving page:', {
      id: normalized.id,
      contentLength: normalized.content.length
    });
    const savedPage = await upsertPage(normalized);
    console.log('[Admin API POST] Page saved successfully');
    return NextResponse.json({ success: true, page: savedPage });
  } catch (error: any) {
    console.error('[Admin API POST] Error in POST /api/admin/static-pages:', error);
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
