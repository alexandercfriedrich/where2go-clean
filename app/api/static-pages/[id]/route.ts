import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DEFAULT_DATA_DIR = path.join(process.cwd(), 'data');
const DEFAULT_FILE = path.join(DEFAULT_DATA_DIR, 'static-pages.json');
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

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const pages = loadStaticPages();
    const page = pages.find(p => p.id === params.id);

    if (!page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    return NextResponse.json({ page });
  } catch (error) {
    console.error('Error in GET /api/static-pages/[id]:', error);
    return NextResponse.json({ error: 'Failed to load static page' }, { status: 500 });
  }
}
