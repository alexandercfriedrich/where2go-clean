import { NextRequest, NextResponse } from 'next/server';
import { getRedisClient } from '@/lib/cache';

const REDIS_KEY = 'where2go:static-pages:v1';

interface StaticPage {
  id: string;
  title: string;
  content: string;
  path: string;
  updatedAt: string;
}

// Load static pages from Redis
async function loadStaticPages(): Promise<StaticPage[]> {
  try {
    const redis = getRedisClient();
    const data = await redis.get(REDIS_KEY);
    if (!data) {
      console.log('No static pages found in Redis, returning empty array');
      return [];
    }
    const pages = JSON.parse(data);
    console.log(`Loaded ${pages.length} static pages from Redis`);
    return pages;
  } catch (error) {
    console.error('Error loading static pages from Redis:', error);
    return [];
  }
}

// Save static pages to Redis
async function saveStaticPages(pages: StaticPage[]): Promise<void> {
  try {
    const redis = getRedisClient();
    const json = JSON.stringify(pages, null, 2);
    await redis.set(REDIS_KEY, json);
    console.log(`Saved ${pages.length} static pages to Redis`);
  } catch (error) {
    console.error('Error saving static pages to Redis:', error);
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

    const pages = await loadStaticPages();
    const idx = pages.findIndex(p => p.id === pageData.id);

    const normalized: StaticPage = {
      id: pageData.id,
      title: pageData.title,
      content: pageData.content ?? '',
      path: pageData.path,
      updatedAt: new Date().toISOString(),
    };

    if (idx >= 0) {
      pages[idx] = normalized;
      console.log(`Updated existing page: ${pageData.id}`);
    } else {
      pages.push(normalized);
      console.log(`Created new page: ${pageData.id}`);
    }

    await saveStaticPages(pages);
    
    console.log('Successfully saved page to Redis:', {
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

    const pages = await loadStaticPages();
    const filtered = pages.filter(p => p.id !== pageId);

    if (pages.length === filtered.length) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    await saveStaticPages(filtered);
    console.log(`Deleted static page: ${pageId}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/admin/static-pages:', error);
    return NextResponse.json({ error: 'Failed to delete static page' }, { status: 500 });
  }
}