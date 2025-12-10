import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';

interface StaticPage {
  id: string;
  title: string;
  content: string;
  path: string;
  updatedAt: string;
}

// Load static pages from Supabase
async function loadStaticPages(): Promise<StaticPage[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('static_pages')
      .select('*')
      .order('updated_at', { ascending: false }) as any;

    if (error) {
      console.error('Error loading static pages from Supabase:', error);
      return [];
    }

    // Map database columns to interface
    const pages: StaticPage[] = (data || []).map((row: any) => ({
      id: row.id,
      title: row.title,
      content: row.content,
      path: row.path,
      updatedAt: row.updated_at,
    }));

    console.log(`Loaded ${pages.length} static pages from Supabase`);
    return pages;
  } catch (error) {
    console.error('Error loading static pages from Supabase:', error);
    return [];
  }
}

// Save static page to Supabase
async function saveStaticPage(page: StaticPage): Promise<void> {
  try {
    const { error } = await supabaseAdmin
      .from('static_pages')
      .upsert({
        id: page.id,
        title: page.title,
        content: page.content,
        path: page.path,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'id'
      });

    if (error) {
      console.error('Error saving static page to Supabase:', error);
      throw error;
    }

    console.log(`Saved static page to Supabase: ${page.id}`);
  } catch (error) {
    console.error('Error saving static page to Supabase:', error);
    throw error;
  }
}

// Delete static page from Supabase
async function deleteStaticPage(pageId: string): Promise<void> {
  try {
    const { error } = await supabaseAdmin
      .from('static_pages')
      .delete()
      .eq('id', pageId);

    if (error) {
      console.error('Error deleting static page from Supabase:', error);
      throw error;
    }

    console.log(`Deleted static page from Supabase: ${pageId}`);
  } catch (error) {
    console.error('Error deleting static page from Supabase:', error);
    throw error;
  }
}

export async function GET() {
  try {
    const pages = await loadStaticPages();
    return NextResponse.json({ pages });
  } catch (error) {
    console.error('Error in GET /api/admin/static-pages:', error);
    return NextResponse.json({ error: 'Failed to load static pages' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const pageData = (await request.json()) as Partial<StaticPage>;

    console.log('Received POST request with data:', {
      id: pageData.id,
      title: pageData.title,
      contentLength: pageData.content?.length || 0,
      path: pageData.path
    });

    // Validation
    if (!pageData.id || !pageData.title) {
      return NextResponse.json({ error: 'Missing required fields: id, title' }, { status: 400 });
    }
    if (typeof pageData.content !== 'string') {
      console.error('Invalid content type:', typeof pageData.content, pageData.content);
      return NextResponse.json({ error: 'Missing or invalid field: content' }, { status: 400 });
    }
    if (typeof pageData.path !== 'string' || !pageData.path.startsWith('/')) {
      return NextResponse.json({ error: 'Missing or invalid field: path (must start with /)' }, { status: 400 });
    }

    const normalized: StaticPage = {
      id: pageData.id,
      title: pageData.title,
      content: pageData.content ?? '',
      path: pageData.path,
      updatedAt: new Date().toISOString(),
    };

    await saveStaticPage(normalized);
    
    console.log('Successfully saved page to Supabase:', {
      id: normalized.id,
      title: normalized.title,
      contentLength: normalized.content.length,
      updatedAt: normalized.updatedAt
    });
    
    return NextResponse.json({ success: true, page: normalized });
  } catch (error: any) {
    console.error('Error in POST /api/admin/static-pages:', error);
    return NextResponse.json({ error: error?.message || 'Failed to save static page' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pageId = searchParams.get('id');

    if (!pageId) {
      return NextResponse.json({ error: 'Missing page ID' }, { status: 400 });
    }

    // Check if page exists before deletion
    const { data: existingPage } = await supabaseAdmin
      .from('static_pages')
      .select('id')
      .eq('id', pageId)
      .single();

    if (!existingPage) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    await deleteStaticPage(pageId);
    console.log(`Deleted static page: ${pageId}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/admin/static-pages:', error);
    return NextResponse.json({ error: 'Failed to delete static page' }, { status: 500 });
  }
}