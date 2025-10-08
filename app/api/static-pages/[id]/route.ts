import { NextRequest, NextResponse } from 'next/server';
import { getPageById, upsertPage } from '@/lib/staticPagesStore';
import { getDefaultStaticPage } from '@/lib/staticPageDefaults';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    // 1) Try to read from KV/filesystem
    const page = await getPageById(id);
    if (page) {
      return NextResponse.json({ page });
    }

    // 2) If not found, try to get default content
    const defaultPage = getDefaultStaticPage(id);
    if (defaultPage) {
      // 3) Automatically seed the default into KV (one-time initialization)
      console.log(`[Public API] Seeding default content for page: ${id}`);
      const pageWithTimestamp = {
        id: defaultPage.id,
        title: defaultPage.title,
        content: defaultPage.content,
        path: defaultPage.path,
        updatedAt: new Date().toISOString()
      };
      await upsertPage(pageWithTimestamp);

      return NextResponse.json({ page: pageWithTimestamp });
    }

    // 4) No page in storage and no default available
    return NextResponse.json({ error: 'Page not found' }, { status: 404 });
  } catch (error) {
    console.error('Error in GET /api/static-pages/[id]:', error);
    return NextResponse.json({ error: 'Failed to load static page' }, { status: 500 });
  }
}
