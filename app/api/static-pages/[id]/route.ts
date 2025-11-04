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

// Default content for static pages
const DEFAULT_PAGES: Record<string, Omit<StaticPage, 'updatedAt'>> = {
  'seo-footer': {
    id: 'seo-footer',
    title: 'SEO Footer (Homepage)',
    path: '/',
    content: `
      <div class="seo-footer">
        <h3>Entdecken Sie Events in Ihrer Stadt</h3>
        <p>Where2Go ist Ihre Plattform für die besten Events, Konzerte und Veranstaltungen in Wien und ganz Österreich.</p>
      </div>
    `
  },
  'datenschutz': {
    id: 'datenschutz',
    title: 'Datenschutzerklärung',
    path: '/datenschutz',
    content: `
      <h2>Datenschutzerklärung</h2>
      <p>Wir nehmen den Schutz deiner Daten ernst. Details findest du hier.</p>
    `
  },
  'agb': {
    id: 'agb',
    title: 'Allgemeine Geschäftsbedingungen',
    path: '/agb',
    content: `
      <h2>Allgemeine Geschäftsbedingungen</h2>
      <p>Hier finden Sie unsere AGBs.</p>
    `
  },
  'impressum': {
    id: 'impressum',
    title: 'Impressum',
    path: '/impressum',
    content: `
      <h2>Impressum</h2>
      <p>Angaben gemäß § 5 TMG</p>
      <p>Where2Go<br>
      Musterstraße 1<br>
      12345 Musterstadt</p>
    `
  },
  'ueber-uns': {
    id: 'ueber-uns',
    title: 'Über uns',
    path: '/ueber-uns',
    content: `
      <h2>Über uns</h2>
      <p>Where2Go hilft dir dabei, die besten Events in deiner Stadt zu finden.</p>
    `
  },
  'kontakt': {
    id: 'kontakt',
    title: 'Kontakt',
    path: '/kontakt',
    content: `
      <h2>Kontakt</h2>
      <p>Haben Sie Fragen oder Anregungen? Kontaktieren Sie uns!</p>
      <p>E-Mail: info@where2go.at</p>
    `
  },
  'premium': {
    id: 'premium',
    title: 'Premium',
    path: '/premium',
    content: `
      <h2>Premium Features</h2>
      <p>Entdecken Sie unsere Premium-Features für noch bessere Event-Empfehlungen.</p>
    `
  }
};

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

// GET /api/static-pages/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log(`GET /api/static-pages/${params.id} - Loading from Redis`);
    
    const pages = await loadStaticPages();
    const page = pages.find(p => p.id === params.id);

    if (page) {
      console.log(`Found custom page in Redis: ${params.id}`);
      return NextResponse.json({ page });
    }

    // Fallback to default content
    const defaultPage = DEFAULT_PAGES[params.id];
    if (defaultPage) {
      console.log(`Using default content for: ${params.id}`);
      return NextResponse.json({ 
        page: {
          ...defaultPage,
          updatedAt: new Date().toISOString()
        }
      });
    }

    console.log(`Page not found: ${params.id}`);
    return NextResponse.json({ error: 'Page not found' }, { status: 404 });
  } catch (error) {
    console.error('Error in GET /api/static-pages/[id]:', error);
    return NextResponse.json({ error: 'Failed to load static page' }, { status: 500 });
  }
}
