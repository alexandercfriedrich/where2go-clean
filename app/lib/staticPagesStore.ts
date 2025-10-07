/**
 * Storage layer for static pages with Vercel KV (Upstash REST API) and filesystem fallback
 * 
 * Uses KV when KV_REST_API_URL and KV_REST_API_TOKEN are configured.
 * Falls back to filesystem (data/static-pages.json or /tmp/static-pages.json) otherwise.
 */

import fs from 'fs';
import path from 'path';

export interface StaticPage {
  id: string;
  title: string;
  content: string;
  path: string;
  updatedAt: string;
}

const KV_KEY = 'where2go:static-pages:v1';
const DEFAULT_DATA_DIR = path.join(process.cwd(), 'data');
const DEFAULT_FILE = path.join(DEFAULT_DATA_DIR, 'static-pages.json');
const TMP_FILE = '/tmp/static-pages.json';

// Check if KV is configured
const KV_REST_API_URL = process.env.KV_REST_API_URL;
const KV_REST_API_TOKEN = process.env.KV_REST_API_TOKEN;
const USE_KV = !!(KV_REST_API_URL && KV_REST_API_TOKEN);

console.log(USE_KV ? 'Using Vercel KV for static pages storage' : 'Using filesystem for static pages storage');

/**
 * KV Storage implementation using direct REST API calls
 */
async function kvGet(key: string): Promise<StaticPage[] | null> {
  if (!KV_REST_API_URL || !KV_REST_API_TOKEN) {
    throw new Error('KV credentials not configured');
  }

  try {
    const response = await fetch(`${KV_REST_API_URL}/get/${key}`, {
      headers: {
        'Authorization': `Bearer ${KV_REST_API_TOKEN}`,
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`KV GET failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    // Upstash KV REST API returns {"value": "..."} where value is a JSON string
    // Check for both 'result' and 'value' keys for compatibility
    const result = data.value !== undefined ? data.value : (data.result !== undefined ? data.result : data);
    
    if (!result) {
      return null;
    }

    // Parse if it's a string, otherwise use as-is
    const parsed = typeof result === 'string' ? JSON.parse(result) : result;
    
    // Ensure we always return an array or null
    if (Array.isArray(parsed)) {
      return parsed;
    }
    
    // If parsed is not an array, return null (empty state)
    console.warn('KV returned non-array value:', parsed);
    return null;
  } catch (error) {
    console.error('KV GET error:', error);
    throw error;
  }
}

async function kvSet(key: string, value: StaticPage[]): Promise<void> {
  if (!KV_REST_API_URL || !KV_REST_API_TOKEN) {
    throw new Error('KV credentials not configured');
  }

  try {
    const response = await fetch(`${KV_REST_API_URL}/set/${key}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${KV_REST_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        value: JSON.stringify(value),
      }),
    });

    if (!response.ok) {
      throw new Error(`KV SET failed: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.error('KV SET error:', error);
    throw error;
  }
}

/**
 * Filesystem storage implementation
 */
function fileExists(p: string): boolean {
  try {
    return fs.existsSync(p);
  } catch {
    return false;
  }
}

function ensureDir(dir: string): void {
  if (!fileExists(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch (error) {
      // Ignore errors for read-only filesystems
    }
  }
}

function pickReadableFile(): string {
  if (fileExists(DEFAULT_FILE)) return DEFAULT_FILE;
  if (fileExists(TMP_FILE)) return TMP_FILE;
  return DEFAULT_FILE;
}

function fsLoad(): StaticPage[] {
  const filePath = pickReadableFile();
  if (!fileExists(filePath)) return [];
  
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    if (!data?.trim()) return [];
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading static pages from filesystem:', error);
    return [];
  }
}

function fsSave(pages: StaticPage[]): void {
  const json = JSON.stringify(pages, null, 2);
  
  // Try to write to default location first
  try {
    ensureDir(DEFAULT_DATA_DIR);
    fs.writeFileSync(DEFAULT_FILE, json);
    return;
  } catch (error: any) {
    const code = error?.code;
    // If read-only filesystem, try /tmp
    if (code === 'EROFS' || code === 'EPERM' || code === 'EACCES') {
      try {
        fs.writeFileSync(TMP_FILE, json);
        return;
      } catch (e2) {
        console.error('Error saving static pages to /tmp:', e2);
        throw e2;
      }
    }
    console.error('Error saving static pages:', error);
    throw error;
  }
}

/**
 * Load all static pages
 */
export async function loadAllPages(): Promise<StaticPage[]> {
  try {
    if (USE_KV) {
      const pages = await kvGet(KV_KEY);
      return pages || [];
    } else {
      return fsLoad();
    }
  } catch (error) {
    console.error('Error loading all pages:', error);
    throw error;
  }
}

/**
 * Get a single page by ID
 */
export async function getPageById(id: string): Promise<StaticPage | null> {
  try {
    const pages = await loadAllPages();
    return pages.find(p => p.id === id) || null;
  } catch (error) {
    console.error(`Error getting page ${id}:`, error);
    throw error;
  }
}

/**
 * Create or update a page (upsert)
 */
export async function upsertPage(page: StaticPage): Promise<StaticPage> {
  try {
    const pages = await loadAllPages();
    const idx = pages.findIndex(p => p.id === page.id);
    
    const normalized: StaticPage = {
      id: page.id,
      title: page.title,
      content: page.content,
      path: page.path,
      updatedAt: new Date().toISOString(),
    };
    
    if (idx >= 0) {
      pages[idx] = normalized;
    } else {
      pages.push(normalized);
    }
    
    if (USE_KV) {
      await kvSet(KV_KEY, pages);
    } else {
      fsSave(pages);
    }
    
    return normalized;
  } catch (error) {
    console.error('Error upserting page:', error);
    throw error;
  }
}

/**
 * Delete a page by ID
 */
export async function deletePage(id: string): Promise<boolean> {
  try {
    const pages = await loadAllPages();
    const filtered = pages.filter(p => p.id !== id);
    
    if (pages.length === filtered.length) {
      // Page not found
      return false;
    }
    
    if (USE_KV) {
      await kvSet(KV_KEY, filtered);
    } else {
      fsSave(filtered);
    }
    
    return true;
  } catch (error) {
    console.error(`Error deleting page ${id}:`, error);
    throw error;
  }
}
