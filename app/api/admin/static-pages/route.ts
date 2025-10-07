import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DEFAULT_DATA_DIR = path.join(process.cwd(), 'data');
const DEFAULT_FILE = path.join(DEFAULT_DATA_DIR, 'static-pages.json');
// Fallback für schreibgeschützte Deployments (z. B. Vercel)
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
  // Bevorzugt DEFAULT_FILE, sonst Fallback
  if (fileExists(DEFAULT_FILE)) return DEFAULT_FILE;
  if (fileExists(TMP_FILE)) return TMP_FILE;
  // Keins vorhanden → standardmäßig DEFAULT_FILE
  return DEFAULT_FILE;
}

function loadStaticPages(): StaticPage[] {
  const filePath = pickReadableFile();
  if (!fileExists(filePath)) {
    return [];
  }
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
  // Versuche zu schreiben; bei EROFS/EPERM auf /tmp ausweichen
  try {
    const dir = path.dirname(filePath);
    if (filePath !== TMP_FILE) ensureDir(dir);
    fs.writeFileSync(filePath, content);
    return filePath;
  } catch (error: any) {
    const code = error?.code;
    const msg = error?.message || String(error);
    // Nur bei schreibgeschütztem Dateisystem auf /tmp ausweichen
    if ((code === 'EROFS' || code === 'EPERM' || code === 'EACCES') && filePath !== TMP_FILE) {
      try {
        fs.writeFileSync(TMP_FILE, content);
        return TMP_FILE;
      } catch (e2) {
        console.error('Error saving static pages to /tmp:', e2);
        throw e2;
      }
    }
    console.error('Error saving static pages:', msg);
    throw error;
  }
}

function saveStaticPages(pages: StaticPage[]) {
  const json = JSON.stringify(pages, null, 2);
  // Versuche zuerst im data/-Verzeichnis, dann fallback
  tryWrite(DEFAULT_FILE, json);
}

export async function GET(_request: NextRequest) {
  try {
    const pages = loadStaticPages();
    return NextResponse.json({ pages });
  } catch (error) {
    console.error('Error in GET /api/admin/static-pages:', error);
    return NextResponse.json(
      { error: 'Failed to load static pages' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const pageData = (await request.json()) as Partial<StaticPage>;

    // Validierung
    if (!pageData.id || !pageData.title) {
      return NextResponse.json(
        { error: 'Missing required fields: id, title' },
        { status: 400 }
      );
    }
    if (typeof pageData.content !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid field: content' },
        { status: 400 }
      );
    }
    if (typeof pageData.path !== 'string' || !pageData.path.startsWith('/')) {
      return NextResponse.json(
        { error: 'Missing or invalid field: path (must start with /)' },
        { status: 400 }
      );
    }

    const pages = loadStaticPages();
    const existingIndex = pages.findIndex(p => p.id === pageData.id);

    const normalized: StaticPage = {
      id: pageData.id,
      title: pageData.title,
      content: pageData.content ?? '',
      path: pageData.path,
      updatedAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      pages[existingIndex] = normalized;
    } else {
      pages.push(normalized);
    }

    saveStaticPages(pages);

    return NextResponse.json({ success: true, page: normalized });
  } catch (error: any) {
    console.error('Error in POST /api/admin/static-pages:', error);
    const message = error?.message || 'Failed to save static page';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pageId = searchParams.get('id');

    if (!pageId) {
      return NextResponse.json(
        { error: 'Missing page ID' },
        { status: 400 }
      );
    }

    const pages = loadStaticPages();
    const filteredPages = pages.filter(p => p.id !== pageId);

    if (pages.length === filteredPages.length) {
      return NextResponse.json(
        { error: 'Page not found' },
        { status: 404 }
      );
    }

    saveStaticPages(filteredPages);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/admin/static-pages:', error);
    return NextResponse.json(
      { error: 'Failed to delete static page' },
      { status: 500 }
    );
  }
}
