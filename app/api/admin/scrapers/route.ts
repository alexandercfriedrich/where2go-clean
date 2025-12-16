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
// Note: Keep in sync with website-scrapers/run_all_scrapers.py scraper_map
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
    description: 'Scrapes party events from Ibiza Spotlight calendar',
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
  {
    key: 'pratersauna',
    name: 'Pratersauna',
    city: 'Wien',
    country: 'Austria',
    type: 'venue',
    category: 'Clubs & Nachtleben',
    website: 'https://pratersauna.tv',
    isActive: true,
    hasDedicatedScraper: true,
  },
  {
    key: 'das-werk',
    name: 'Das Werk',
    city: 'Wien',
    country: 'Austria',
    type: 'venue',
    category: 'Clubs & Nachtleben',
    website: 'https://daswerk.org',
    isActive: true,
    hasDedicatedScraper: true,
  },
  {
    key: 'u4',
    name: 'U4',
    city: 'Wien',
    country: 'Austria',
    type: 'venue',
    category: 'Clubs & Nachtleben',
    website: 'https://u-4.at',
    isActive: true,
    hasDedicatedScraper: true,
  },
  {
    key: 'o-der-klub',
    name: 'O - Der Klub',
    city: 'Wien',
    country: 'Austria',
    type: 'venue',
    category: 'Clubs & Nachtleben',
    website: 'https://oderklub.at',
    isActive: true,
    hasDedicatedScraper: true,
  },
  {
    key: 'volksgarten',
    name: 'Volksgarten',
    city: 'Wien',
    country: 'Austria',
    type: 'venue',
    category: 'Clubs & Nachtleben',
    website: 'https://volksgarten.at',
    isActive: true,
    hasDedicatedScraper: true,
  },
  {
    key: 'flucc',
    name: 'Flucc & Fluc Wanne',
    city: 'Wien',
    country: 'Austria',
    type: 'venue',
    category: 'Clubs & Nachtleben',
    website: 'https://flucc.at',
    isActive: true,
    hasDedicatedScraper: true,
  },
  {
    key: 'camera-club',
    name: 'Camera Club',
    city: 'Wien',
    country: 'Austria',
    type: 'venue',
    category: 'Clubs & Nachtleben',
    website: 'https://camera-club.at',
    isActive: true,
    hasDedicatedScraper: true,
  },
  {
    key: 'chelsea',
    name: 'Chelsea',
    city: 'Wien',
    country: 'Austria',
    type: 'venue',
    category: 'Clubs & Nachtleben',
    website: 'https://chelsea.at',
    isActive: true,
    hasDedicatedScraper: true,
  },
  {
    key: 'celeste',
    name: 'Celeste',
    city: 'Wien',
    country: 'Austria',
    type: 'venue',
    category: 'Clubs & Nachtleben',
    website: 'https://celeste.at',
    isActive: true,
    hasDedicatedScraper: true,
  },
  {
    key: 'donau',
    name: 'Donau',
    city: 'Wien',
    country: 'Austria',
    type: 'venue',
    category: 'Clubs & Nachtleben',
    website: 'https://donauhalle.at',
    isActive: true,
    hasDedicatedScraper: true,
  },
  {
    key: 'the-loft',
    name: 'The Loft',
    city: 'Wien',
    country: 'Austria',
    type: 'venue',
    category: 'Clubs & Nachtleben',
    website: 'https://theloft.at',
    isActive: true,
    hasDedicatedScraper: true,
  },
  {
    key: 'rhiz',
    name: 'Rhiz',
    city: 'Wien',
    country: 'Austria',
    type: 'venue',
    category: 'Clubs & Nachtleben',
    website: 'https://rhiz.wien',
    isActive: true,
    hasDedicatedScraper: true,
  },
  {
    key: 'praterstrasse',
    name: 'Praterstrasse',
    city: 'Wien',
    country: 'Austria',
    type: 'venue',
    category: 'Clubs & Nachtleben',
    website: 'https://praterstrasse.at',
    isActive: true,
    hasDedicatedScraper: true,
  },
  {
    key: 'prater-dome',
    name: 'Prater Dome',
    city: 'Wien',
    country: 'Austria',
    type: 'venue',
    category: 'Clubs & Nachtleben',
    website: 'https://praterdome.at',
    isActive: true,
    hasDedicatedScraper: true,
  },
  {
    key: 'sass-music-club',
    name: 'Sass Music Club',
    city: 'Wien',
    country: 'Austria',
    type: 'venue',
    category: 'Clubs & Nachtleben',
    website: 'https://sassvienna.com',
    isActive: true,
    hasDedicatedScraper: true,
  },
  {
    key: 'ponyhof',
    name: 'Ponyhof',
    city: 'Wien',
    country: 'Austria',
    type: 'venue',
    category: 'Clubs & Nachtleben',
    website: 'https://ponyhof-club.at',
    isActive: true,
    hasDedicatedScraper: true,
  },
  {
    key: 'vieipee',
    name: 'VIEIPEE',
    city: 'Wien',
    country: 'Austria',
    type: 'venue',
    category: 'Clubs & Nachtleben',
    website: 'https://vieipee.at',
    isActive: true,
    hasDedicatedScraper: true,
  },
  {
    key: 'babenberger-passage',
    name: 'Babenberger Passage',
    city: 'Wien',
    country: 'Austria',
    type: 'venue',
    category: 'Clubs & Nachtleben',
    website: 'https://babenbergerpassage.at',
    isActive: true,
    hasDedicatedScraper: true,
  },
  {
    key: 'patroc-wien-gay',
    name: 'Patroc Wien Gay',
    city: 'Wien',
    country: 'Austria',
    type: 'venue',
    category: 'Clubs & Nachtleben',
    website: 'https://patroc.at',
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
