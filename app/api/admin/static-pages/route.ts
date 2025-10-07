import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DEFAULT_DATA_DIR = path.join(process.cwd(), 'data');
const DEFAULT_FILE = path.join(DEFAULT_DATA_DIR, 'static-pages.json');
// Fallback for read-only filesystems (e.g., Vercel)
const TMP_FILE = '/tmp/static-pages.json';

interface StaticPage {
  id: string;
  title: string;
  content: string;
  path: string;
  updatedAt: string;
}

function fileExists(p: string) {
  try {
    return fs.existsSync(p);
  } catch {
    return false;
  }
}
function ensureDir(dir: string) {
  if (!fileExists(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}
function pickReadableFile(): string {
  if (fileExists(DEFAULT_FILE)) return DEFAULT_FILE;
  if (fileExists(TMP_FILE)) return TMP_FILE;
  return DEFAULT_FILE;
}
function loadStaticPages(): StaticPage[] {
  const filePath = pickReadableFile();
  if (!fileExists(filePath)) return [];
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    if (!data?.trim()) return [];
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading static pages:', error);
    return [];
  }
}
function tryWrite(filePath: string, content: string) {
  try {
    const dir = path.dirname(filePath);
    if (filePath !== TMP_FILE) ensureDir(dir);
    fs.writeFileSync(filePath, content);
    return filePath;
  } catch (error: any) {
    const code = error?.code;
    if ((code === 'EROFS' || code === 'EPERM' || code === 'EACCES') && filePath !== TMP_FILE) {
      try {
        fs.writeFileSync(TMP_FILE, content);
        return TMP_FILE;
      } catch (e2) {
        console.error('Error saving static pages to /tmp:', e2);
        throw e2;
      }
    }
    console.error('Error saving static pages:', error);
    throw error;
  }
}
function saveStaticPages(pages: StaticPage[]) {
  const json = JSON.stringify(pages, null, 2);
  tryWrite(DEFAULT_FILE, json);
}

export async function GET() {
  try {
    const pages = loadStaticPages();
    return NextResponse.json({ pages });
  } catch (error) {
    console.error('Error in GET /api/admin/static-pages:', error);
    return NextResponse.json({ error: 'Failed to load static pages' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const pageData = (await request.json()) as Partial<StaticPage>;

    // Validation
    if (!pageData.id || !pageData.title) {
      return NextResponse.json({ error: 'Missing required fields: id, title' }, { status: 400 });
    }
    if (typeof pageData.content !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid field: content' }, { status: 400 });
    }
    if (typeof pageData.path !== 'string' || !pageData.path.startsWith('/')) {
      return NextResponse.json({ error: 'Missing or invalid field: path (must start with /)' }, { status: 400 });
    }

    const pages = loadStaticPages();
    const idx = pages.findIndex(p => p.id === pageData.id);

    const normalized: StaticPage = {
      id: pageData.id,
      title: pageData.title,
      content: pageData.content ?? '',
      path: pageData.path,
      updatedAt: new Date().toISOString(),
    };

    if (idx >= 0) pages[idx] = normalized;
    else pages.push(normalized);

    saveStaticPages(pages);
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

    const pages = loadStaticPages();
    const filtered = pages.filter(p => p.id !== pageId);

    if (pages.length === filtered.length) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    saveStaticPages(filtered);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/admin/static-pages:', error);
    return NextResponse.json({ error: 'Failed to delete static page' }, { status: 500 });
  }
}
