import { NextRequest, NextResponse } from 'next/server';
import { saveHotCities } from '@/lib/hotCityStore';
import { HotCity } from '@/lib/types';

const generateId = () => `city-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
const generateWebsiteId = () => `website-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const seedCities: HotCity[] = [
  {
    id: generateId(),
    name: 'Wien',
    country: 'Austria',
    isActive: true,
    defaultSearchQuery: 'Wien Vienna events Veranstaltungen heute today',
    customPrompt: 'Focus on Vienna\'s rich cultural scene including classical music, museums, and traditional Austrian venues.',
    websites: [
      // Administrierbare RSS-Quelle: Parameter via searchQuery; from/to setzt das Backend dynamisch
      {
        id: generateWebsiteId(),
        name: 'Wien.at RSS (Official)',
        url: 'http://www.wien.gv.at/vadb/internet/AdvPrSrv.asp',
        searchQuery: 'Layout=rss-vadb_neu&Type=R&hmwd=d',
        categories: [],
        description: 'Official Vienna RSS from VADB',
        priority: 10,
        isActive: true
      },
      {
        id: generateWebsiteId(),
        name: 'Wien.gv.at Events',
        url: 'https://www.wien.gv.at/kultur/abteilung/veranstaltungen/',
        categories: [],
        description: 'Official Vienna city events',
        priority: 9,
        isActive: true
      },
      {
        id: generateWebsiteId(),
        name: 'Wiener Staatsoper',
        url: 'https://www.wiener-staatsoper.at',
        categories: ['Live-Konzerte', 'Theater/Performance', 'Kultur/Traditionen'],
        description: 'Vienna State Opera performances',
        priority: 9,
        isActive: true
      },
      {
        id: generateWebsiteId(),
        name: 'Wiener Konzerthaus',
        url: 'https://konzerthaus.at',
        categories: ['Live-Konzerte', 'Kultur/Traditionen'],
        description: 'Vienna Concert House events',
        priority: 9,
        isActive: true
      },
      {
        id: generateWebsiteId(),
        name: 'Flex Wien',
        url: 'https://flex.at',
        categories: ['DJ Sets/Electronic', 'Clubs/Discos', 'Live-Konzerte'],
        description: 'Electronic music and club events',
        priority: 8,
        isActive: true
      },
      {
        id: generateWebsiteId(),
        name: 'Belvedere Museum',
        url: 'https://www.belvedere.at',
        categories: ['Museen', 'Kunst/Design'],
        description: 'Art exhibitions and cultural events',
        priority: 8,
        isActive: true
      },
      {
        id: generateWebsiteId(),
        name: 'Vienna Tourist Board',
        url: 'https://www.vienna.info',
        categories: [],
        description: 'Tourist events and attractions',
        priority: 7,
        isActive: true
      }
    ],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  // Bestehende Seed-Städte exemplarisch (abgekürzt auf die wichtigsten)
  {
    id: generateId(),
    name: 'Linz',
    country: 'Austria',
    isActive: true,
    defaultSearchQuery: 'Linz events Veranstaltungen heute today',
    customPrompt: 'Focus on Linz as UNESCO City of Media Arts with emphasis on technology, arts, and cultural events.',
    websites: [
      {
        id: generateWebsiteId(),
        name: 'Linz.at Events',
        url: 'https://www.linz.at/kultur/',
        categories: [],
        description: 'Official Linz city cultural events',
        priority: 10,
        isActive: true
      }
    ],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: generateId(),
    name: 'Ibiza',
    country: 'Spain',
    isActive: true,
    defaultSearchQuery: 'Ibiza events parties clubs today hoy',
    customPrompt: 'Focus on Ibiza\'s world-famous electronic music scene, beach clubs, and nightlife events.',
    websites: [
      {
        id: generateWebsiteId(),
        name: 'Ibiza Spotlight',
        url: 'https://www.ibiza-spotlight.com',
        categories: [],
        description: 'Comprehensive Ibiza events and club listings',
        priority: 10,
        isActive: true
      }
    ],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: generateId(),
    name: 'Berlin',
    country: 'Germany',
    isActive: true,
    defaultSearchQuery: 'Berlin events Veranstaltungen heute today',
    customPrompt: 'Focus on Berlin\'s diverse cultural scene including techno clubs, galleries, alternative venues, and cultural institutions.',
    websites: [
      {
        id: generateWebsiteId(),
        name: 'Berlin.de Events',
        url: 'https://www.berlin.de/kultur-und-tickets/',
        categories: [],
        description: 'Official Berlin city events portal',
        priority: 10,
        isActive: true
      }
    ],
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

// POST /api/admin/hot-cities/seed - Seed initial cities data
export async function POST(request: NextRequest) {
  try {
    await saveHotCities(seedCities);
    
    return NextResponse.json({
      success: true,
      message: `Seeded ${seedCities.length} hot cities with websites`,
      cities: seedCities.map(city => ({
        name: city.name,
        websiteCount: city.websites.length
      }))
    });
  } catch (error) {
    console.error('Error seeding hot cities:', error);
    return NextResponse.json(
      { error: 'Failed to seed hot cities' },
      { status: 500 }
    );
  }
}
