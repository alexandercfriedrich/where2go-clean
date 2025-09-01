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

// Ensure data directory exists
function ensureDataDirectory() {
  const dataDir = path.dirname(STATIC_PAGES_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

// Load static pages from file
function loadStaticPages(): StaticPage[] {
  ensureDataDirectory();
  
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

// Save static pages to file
function saveStaticPages(pages: StaticPage[]) {
  ensureDataDirectory();
  
  try {
    fs.writeFileSync(STATIC_PAGES_FILE, JSON.stringify(pages, null, 2));
  } catch (error) {
    console.error('Error saving static pages:', error);
    throw error;
  }
}

export async function GET(request: NextRequest) {
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
    const pageData: StaticPage = await request.json();
    
    // Validate required fields
    if (!pageData.id || !pageData.title) {
      return NextResponse.json(
        { error: 'Missing required fields: id, title' },
        { status: 400 }
      );
    }
    
    const pages = loadStaticPages();
    const existingIndex = pages.findIndex(p => p.id === pageData.id);
    
    // Update timestamp
    pageData.updatedAt = new Date().toISOString();
    
    if (existingIndex >= 0) {
      // Update existing page
      pages[existingIndex] = pageData;
    } else {
      // Add new page
      pages.push(pageData);
    }
    
    saveStaticPages(pages);
    
    return NextResponse.json({ success: true, page: pageData });
  } catch (error) {
    console.error('Error in POST /api/admin/static-pages:', error);
    return NextResponse.json(
      { error: 'Failed to save static page' },
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