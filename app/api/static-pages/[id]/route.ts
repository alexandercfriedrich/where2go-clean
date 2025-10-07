import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const STATIC_PAGES_FILE = path.join(process.cwd(), 'data', 'static-pages.json');

interface StaticPage {
  id: string;
  title: string;
  content: string;
  path: string;
  updatedAt: string;
}

function loadStaticPages(): StaticPage[] {
  if (!fs.existsSync(STATIC_PAGES_FILE)) {
    return [];
  }
  
  try {
    const data = fs.readFileSync(STATIC_PAGES_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading static pages:', error);
    return [];
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const pages = loadStaticPages();
    const page = pages.find(p => p.id === params.id);
    
    if (!page) {
      return NextResponse.json(
        { error: 'Page not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ page });
  } catch (error) {
    console.error('Error in GET /api/static-pages/[id]:', error);
    return NextResponse.json(
      { error: 'Failed to load static page' },
      { status: 500 }
    );
  }
}
