/**
 * Admin Scrapers Management API
 * 
 * Provides endpoints to list and manage all available event scrapers.
 * 
 * GET /api/admin/scrapers
 * Returns a list of all available scrapers with their configuration and status.
 * 
 * Authentication: Required via middleware
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

// Scraper registry - maps scraper keys to their configuration
const SCRAPER_REGISTRY = [
  {
    key: 'ibiza-spotlight',
    name: 'Ibiza Spotlight',
    city: 'Ibiza',
    country: 'Spain',
    type: 'aggregator',
    category: 'Clubs & Nachtleben',
    website: 'https://www.ibiza-spotlight.de',
    isActive: true,
    hasDedicatedScraper: true,
    description: 'Scrapes party events from Ibiza Spotlight calendar (max 7 days per request)',
  },
  {
    key: 'grelle-forelle',
    name: 'Grelle Forelle',
    city: 'Wien',
    country: 'Austria',
    type: 'venue',
    category: 'Clubs & Nachtleben',
    website: 'https://grelleforelle.com',
    isActive: true,
    hasDedicatedScraper: true,
  },
  {
    key: 'flex',
    name: 'Flex',
    city: 'Wien',
    country: 'Austria',
    type: 'venue',
    category: 'Clubs & Nachtleben',
    website: 'https://flex.at',
    isActive: true,
    hasDedicatedScraper: true,
  },
];

/**
 * GET handler - list all scrapers
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const activeOnly = searchParams.get('activeOnly') === 'true';

    let filteredScrapers = SCRAPER_REGISTRY;

    if (activeOnly) {
      filteredScrapers = filteredScrapers.filter(s => s.isActive);
    }

    const stats = {
      total: SCRAPER_REGISTRY.length,
      active: SCRAPER_REGISTRY.filter(s => s.isActive).length,
      inactive: SCRAPER_REGISTRY.filter(s => !s.isActive).length,
    };

    return NextResponse.json({
      success: true,
      scrapers: filteredScrapers,
      stats,
      count: filteredScrapers.length,
    });

  } catch (error: any) {
    console.error('[ADMIN:SCRAPERS] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch scrapers',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
