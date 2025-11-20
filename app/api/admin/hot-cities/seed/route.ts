import { NextRequest, NextResponse } from 'next/server';
import { saveHotCities } from '@/lib/hotCityStore';
import { HotCity } from '@/lib/types';
import { generateWebsiteId } from '@/lib/utils';
import { VIENNA_VENUES } from '@/lib/data/hotCities/viennaVenues';

const generateId = () => `city-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const seedCities: HotCity[] = [
  {
    id: generateId(),
    name: 'Wien',
    country: 'Austria',
    isActive: true,
    defaultSearchQuery: 'Wien Vienna events Veranstaltungen heute today',
    customPrompt: 'Focus on Vienna\'s rich cultural scene including classical music, museums, and traditional Austrian venues.',
    websites: [
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
    // NEU: venues
    venues: VIENNA_VENUES.map(v => ({
      id: v.id,
      name: v.name,
      categories: v.categories,
      description: v.description,
      priority: v.priority,
      isActive: v.isActive,
      isVenue: true,
      address: v.address,
      website: v.website,
      eventsUrl: v.eventsUrl,
      aiQueryTemplate: v.aiQueryTemplate
    })),
    createdAt: new Date(),
    updatedAt: new Date()
  },
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
      },
      {
        id: generateWebsiteId(),
        name: 'Ars Electronica',
        url: 'https://ars.electronica.art',
        categories: ['Kunst/Design', 'Bildung/Lernen', 'DJ Sets/Electronic'],
        description: 'Digital arts and technology events',
        priority: 9,
        isActive: true
      },
      {
        id: generateWebsiteId(),
        name: 'Brucknerhaus',
        url: 'https://www.brucknerhaus.at',
        categories: ['Live-Konzerte', 'Kultur/Traditionen'],
        description: 'Concert hall and classical music',
        priority: 9,
        isActive: true
      },
      {
        id: generateWebsiteId(),
        name: 'Lentos Kunstmuseum',
        url: 'https://www.lentos.at',
        categories: ['Museen', 'Kunst/Design'],
        description: 'Modern and contemporary art',
        priority: 8,
        isActive: true
      },
      {
        id: generateWebsiteId(),
        name: 'Posthof Linz',
        url: 'https://www.posthof.at',
        categories: ['Live-Konzerte', 'Theater/Performance', 'DJ Sets/Electronic'],
        description: 'Cultural center with diverse events',
        priority: 8,
        isActive: true
      },
      {
        id: generateWebsiteId(),
        name: 'Tourism Linz',
        url: 'https://www.linztourismus.at',
        categories: [],
        description: 'Tourist events and city attractions',
        priority: 7,
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
      },
      {
        id: generateWebsiteId(),
        name: 'Amnesia Ibiza',
        url: 'https://www.amnesia.es',
        categories: ['DJ Sets/Electronic', 'Clubs/Discos'],
        description: 'World-famous superclub events',
        priority: 9,
        isActive: true
      },
      {
        id: generateWebsiteId(),
        name: 'Pacha Ibiza',
        url: 'https://www.pacha.com',
        categories: ['DJ Sets/Electronic', 'Clubs/Discos'],
        description: 'Iconic club with international DJs',
        priority: 9,
        isActive: true
      },
      {
        id: generateWebsiteId(),
        name: 'Ushuaïa Ibiza',
        url: 'https://www.ushuaiabeachhotel.com',
        categories: ['DJ Sets/Electronic', 'Open Air'],
        description: 'Beach club and outdoor parties',
        priority: 9,
        isActive: true
      },
      {
        id: generateWebsiteId(),
        name: 'DC10 Ibiza',
        url: 'https://www.dc10ibiza.com',
        categories: ['DJ Sets/Electronic', 'Clubs/Discos'],
        description: 'Underground techno club',
        priority: 8,
        isActive: true
      },
      {
        id: generateWebsiteId(),
        name: 'Ibiza Official Tourism',
        url: 'https://www.ibiza.travel',
        categories: [],
        description: 'Official tourism events and attractions',
        priority: 7,
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
      },
      {
        id: generateWebsiteId(),
        name: 'Berghain',
        url: 'https://www.berghain.berlin',
        categories: ['DJ Sets/Electronic', 'Clubs/Discos'],
        description: 'World-famous techno club',
        priority: 9,
        isActive: true
      },
      {
        id: generateWebsiteId(),
        name: 'Watergate',
        url: 'https://water-gate.de',
        categories: ['DJ Sets/Electronic', 'Clubs/Discos'],
        description: 'Techno and electronic music club',
        priority: 8,
        isActive: true
      },
      {
        id: generateWebsiteId(),
        name: 'Berlin Philharmonic',
        url: 'https://www.berliner-philharmoniker.de',
        categories: ['Live-Konzerte', 'Kultur/Traditionen'],
        description: 'Classical music and orchestra performances',
        priority: 9,
        isActive: true
      },
      {
        id: generateWebsiteId(),
        name: 'Museum Island Berlin',
        url: 'https://www.smb.museum/museumsinsel-berlin/',
        categories: ['Museen', 'Kunst/Design'],
        description: 'Museum exhibitions and cultural events',
        priority: 8,
        isActive: true
      },
      {
        id: generateWebsiteId(),
        name: 'SO36 Berlin',
        url: 'https://www.so36.com',
        categories: ['Live-Konzerte', 'LGBTQ+', 'Kultur/Traditionen'],
        description: 'Alternative venue for punk, indie, and LGBTQ+ events',
        priority: 8,
        isActive: true
      },
      {
        id: generateWebsiteId(),
        name: 'Visit Berlin',
        url: 'https://www.visitberlin.de',
        categories: [],
        description: 'Tourist events and attractions',
        priority: 7,
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