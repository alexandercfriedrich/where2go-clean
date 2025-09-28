// Hot Cities data store with Upstash Redis when configured, otherwise file-based storage
import { promises as fs } from 'fs';
import path from 'path';
import { Redis } from '@upstash/redis';
import { HotCity, HotCityWebsite } from './types';

// Blacklisted URLs that should never appear in Hot Cities (Wien.gv.at VADB/Events sources)
const BLACKLISTED_URLS = [
  'https://www.wien.gv.at/kultur/abteilung/veranstaltungen/',
  'https://www.wien.gv.at/vadb/internet/AdvPrSrv.asp'
];

/**
 * Checks if a URL is blacklisted (case-insensitive, ignores protocol and trailing slash)
 */
function isUrlBlacklisted(url: string): boolean {
  if (!url) return false;
  
  // Normalize URL for comparison
  const normalizeUrl = (u: string) => u
    .toLowerCase()
    .replace(/^https?:\/\//, '') // Remove protocol
    .replace(/\/$/, ''); // Remove trailing slash
  
  const normalizedUrl = normalizeUrl(url);
  return BLACKLISTED_URLS.some(blacklistedUrl => 
    normalizeUrl(blacklistedUrl) === normalizedUrl
  );
}

// Helper function to create URL-friendly slugs
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special chars
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

// Helper function to create empty city
export function createEmptyCity(): Omit<HotCity, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    name: '',
    country: '',
    isActive: true,
    websites: [],
    venues: [],
    defaultSearchQuery: '',
    customPrompt: '',
  };
}

// Helper function to create empty website
export function createSite(): Omit<HotCityWebsite, 'id'> {
  return {
    name: '',
    url: '',
    categories: [],
    description: '',
    searchQuery: '',
    priority: 5,
    isActive: true,
  };
}

const DATA_DIR = path.join(process.cwd(), 'data');
const HOT_CITIES_FILE = path.join(DATA_DIR, 'hot-cities.json');
const REDIS_KEY = 'hot-cities';

// Initialize Redis client if environment variables are present
const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

console.log(redis ? 'Using Redis for Hot Cities storage' : 'Using file-based storage for Hot Cities');

// Ensure data directory exists
async function ensureDataDir(): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (error) {
    // Directory might already exist, ignore error
  }
}

// Load hot cities from Redis or file
export async function loadHotCities(): Promise<HotCity[]> {
  try {
    if (redis) {
      const data = await redis.get<HotCity[]>(REDIS_KEY);
      if (data) {
        // Convert date strings back to Date objects
        return data.map(city => ({
          ...city,
          createdAt: new Date(city.createdAt),
          updatedAt: new Date(city.updatedAt)
        }));
      }
    } else {
      await ensureDataDir();
      const data = await fs.readFile(HOT_CITIES_FILE, 'utf-8');
      const cities = JSON.parse(data) as HotCity[];
      // Convert date strings back to Date objects
      return cities.map(city => ({
        ...city,
        createdAt: new Date(city.createdAt),
        updatedAt: new Date(city.updatedAt)
      }));
    }
  } catch (error) {
    console.log('No hot cities data found, returning empty array');
  }
  return [];
}

// Save hot cities to Redis or file
export async function saveHotCities(cities: HotCity[]): Promise<void> {
  if (redis) {
    await redis.set(REDIS_KEY, cities);
  } else {
    await ensureDataDir();
    await fs.writeFile(HOT_CITIES_FILE, JSON.stringify(cities, null, 2));
  }
}

// Get a specific hot city by name (case-insensitive)
export async function getHotCity(cityName: string): Promise<HotCity | null> {
  const cities = await loadHotCities();
  return cities.find(city => 
    city.name.toLowerCase() === cityName.toLowerCase() && city.isActive
  ) || null;
}

// Get a specific hot city by slug
export async function getHotCityBySlug(slug: string): Promise<HotCity | null> {
  const cities = await loadHotCities();
  return cities.find(city => 
    slugify(city.name) === slug
  ) || null;
}

// Get all active hot cities
export async function getActiveHotCities(): Promise<HotCity[]> {
  const cities = await loadHotCities();
  return cities.filter(city => city.isActive);
}

// Add or update a hot city
export async function saveHotCity(city: HotCity): Promise<void> {
  const cities = await loadHotCities();
  const existingIndex = cities.findIndex(c => c.id === city.id);
  
  if (existingIndex >= 0) {
    cities[existingIndex] = { ...city, updatedAt: new Date() };
  } else {
    cities.push({ ...city, createdAt: new Date(), updatedAt: new Date() });
  }
  
  await saveHotCities(cities);
}

// Delete a hot city
export async function deleteHotCity(cityId: string): Promise<boolean> {
  const cities = await loadHotCities();
  const filteredCities = cities.filter(c => c.id !== cityId);
  
  if (filteredCities.length < cities.length) {
    await saveHotCities(filteredCities);
    return true;
  }
  
  return false;
}

/**
 * Filters out blacklisted URLs from a city's websites
 */
function filterBlacklistedWebsites(city: HotCity): HotCity {
  return {
    ...city,
    websites: city.websites.filter(website => !isUrlBlacklisted(website.url))
  };
}

/**
 * Filters out blacklisted URLs from all cities' websites
 */
export function filterBlacklistedUrls(cities: HotCity[]): HotCity[] {
  return cities.map(filterBlacklistedWebsites);
}

// Get websites for a specific city and categories
export async function getCityWebsitesForCategories(
  cityName: string, 
  categories: string[]
): Promise<HotCityWebsite[]> {
  const city = await getHotCity(cityName);
  if (!city) return [];
  
  return city.websites
    .filter(website => 
      website.isActive && 
      !isUrlBlacklisted(website.url) && // Filter out blacklisted URLs
      (website.categories.length === 0 || // Empty categories means it covers all
       website.categories.some(cat => categories.includes(cat)))
    )
    .sort((a, b) => b.priority - a.priority); // Higher priority first
}

// Erweiterte Hot Cities Konfiguration für Wien
export interface HotCityWebsiteOptimized {
  id?: string;
  name: string;
  url: string;
  categories: string[];
  priority: number;
  isActive: boolean;
  searchQuery?: string;
  description?: string;
  sourceType: 'official' | 'ticketing' | 'social' | 'community' | 'news' | 'venue' | 'aggregator';
  updateFrequency?: 'daily' | 'weekly' | 'realtime';
  language?: 'de' | 'en' | 'both';
}

export interface OptimizedHotCity {
  id: string;
  name: string;
  websites: HotCityWebsiteOptimized[];
  searchStrategies: string[];
  localTerms: string[];
  majorVenues: string[];
  communityGroups: string[];
  lastUpdated: string;
}

// Erweiterte Wien-Konfiguration
export const WIEN_OPTIMIZED_CONFIG: OptimizedHotCity = {
  id: 'wien',
  name: 'Wien',
  websites: [
    // Offizielle Stadt-Quellen
    {
      name: 'Stadt Wien Events',
      url: 'https://www.wien.gv.at/vadb/internet/AdvPrSrv.asp',
      categories: ['Kultur/Traditionen', 'Open Air', 'Museen', 'Theater/Performance'],
      priority: 10,
      isActive: true,
      sourceType: 'official',
      description: 'Offizielle Veranstaltungsdatenbank der Stadt Wien',
      updateFrequency: 'daily'
    },
    {
      name: 'Wien.info Events',
      url: 'https://www.wien.info/de/sightseeing/events-wien',
      categories: ['Live-Konzerte', 'Theater/Performance', 'Museen', 'Open Air'],
      priority: 9,
      isActive: true,
      sourceType: 'official',
      description: 'Wiener Tourismus-Events'
    },
    
    // Ticketing-Plattformen
    {
      name: 'oeticket Events Wien',
      url: 'https://www.oeticket.com',
      categories: ['Live-Konzerte', 'Theater/Performance', 'Comedy/Kabarett', 'Sport'],
      priority: 8,
      isActive: true,
      sourceType: 'ticketing',
      searchQuery: 'Wien events tickets',
      description: 'Österreichs größte Ticketing-Plattform'
    },
    
    // Kultur-Institutionen
    {
      name: 'Wiener Staatsoper',
      url: 'https://www.wiener-staatsoper.at/spielplan/',
      categories: ['Theater/Performance', 'Live-Konzerte'],
      priority: 9,
      isActive: true,
      sourceType: 'venue',
      description: 'Spielplan der Wiener Staatsoper'
    },
    {
      name: 'Burgtheater Wien',
      url: 'https://www.burgtheater.at/spielplan',
      categories: ['Theater/Performance'],
      priority: 9,
      isActive: true,
      sourceType: 'venue',
      description: 'Burgtheater Spielplan'
    },
    {
      name: 'Volkstheater Wien',
      url: 'https://www.volkstheater.at/spielplan',
      categories: ['Theater/Performance'],
      priority: 8,
      isActive: true,
      sourceType: 'venue'
    },
    
    // Museen
    {
      name: 'Belvedere Museum',
      url: 'https://www.belvedere.at/veranstaltungen',
      categories: ['Museen', 'Kunst/Design'],
      priority: 8,
      isActive: true,
      sourceType: 'venue'
    },
    {
      name: 'Albertina Museum',
      url: 'https://www.albertina.at/veranstaltungen',
      categories: ['Museen', 'Kunst/Design'],
      priority: 8,
      isActive: true,
      sourceType: 'venue'
    },
    {
      name: 'Leopold Museum',
      url: 'https://www.leopoldmuseum.org/de/veranstaltungen',
      categories: ['Museen', 'Kunst/Design'],
      priority: 7,
      isActive: true,
      sourceType: 'venue'
    },
    
    // Musik-Venues
    {
      name: 'Wiener Konzerthaus',
      url: 'https://konzerthaus.at/kalender',
      categories: ['Live-Konzerte', 'Theater/Performance'],
      priority: 9,
      isActive: true,
      sourceType: 'venue'
    },
    {
      name: 'Musikverein Wien',
      url: 'https://www.musikverein.at/konzerte',
      categories: ['Live-Konzerte'],
      priority: 9,
      isActive: true,
      sourceType: 'venue'
    },
    {
      name: 'Arena Wien',
      url: 'https://arena.wien/programm',
      categories: ['Live-Konzerte', 'DJ Sets/Electronic', 'Clubs/Discos'],
      priority: 8,
      isActive: true,
      sourceType: 'venue'
    },
    {
      name: 'Flex Wien',
      url: 'https://flex.at/events',
      categories: ['DJ Sets/Electronic', 'Live-Konzerte', 'Clubs/Discos'],
      priority: 8,
      isActive: true,
      sourceType: 'venue'
    },
    {
      name: 'Chelsea Wien',
      url: 'https://chelsea.co.at/events',
      categories: ['DJ Sets/Electronic', 'Live-Konzerte', 'Clubs/Discos'],
      priority: 7,
      isActive: true,
      sourceType: 'venue'
    },
    {
      name: 'Grelle Forelle',
      url: 'https://www.grelle-forelle.com/events',
      categories: ['DJ Sets/Electronic', 'Clubs/Discos'],
      priority: 7,
      isActive: true,
      sourceType: 'venue'
    },
    
    // Event-Magazine und -Portale
    {
      name: 'Falter Event Guide',
      url: 'https://www.falter.at/events',
      categories: ['Live-Konzerte', 'Theater/Performance', 'Clubs/Discos', 'Kunst/Design', 'Film'],
      priority: 8,
      isActive: true,
      sourceType: 'news',
      description: 'Wiens wichtigstes Kulturmagazin'
    },
    {
      name: 'Vienna Online Events',
      url: 'https://www.vienna.at/events',
      categories: ['Open Air', 'Live-Konzerte', 'Kultur/Traditionen'],
      priority: 6,
      isActive: true,
      sourceType: 'news'
    }
  ],
  
  searchStrategies: [
    'events wien heute',
    'veranstaltungen wien',
    'was läuft wien',
    'vienna events today',
    'wien programm',
    'kulturprogramm wien',
    'konzerte wien',
    'theater wien',
    'ausstellungen wien',
    'party wien',
    'clubs wien'
  ],
  
  localTerms: [
    'Veranstaltung', 'Programm', 'Aufführung', 'Konzert', 'Ausstellung',
    'Vernissage', 'Premiere', 'Festival', 'Matinee', 'Soirée'
  ],
  
  majorVenues: [
    'Staatsoper', 'Burgtheater', 'Volkstheater', 'Konzerthaus', 'Musikverein',
    'Arena', 'Flex', 'Chelsea', 'Grelle Forelle', 'Porgy & Bess',
    'Belvedere', 'Albertina', 'Leopold Museum', 'Kunst Haus Wien',
    'Stadthalle', 'Gasometer', 'Marx Halle', 'Prater'
  ],
  
  communityGroups: [
    'Wien Events Community',
    'Vienna Expats Events',
    'Wien Kultur Tipps',
    'Vienna Nightlife',
    'Students Vienna Events'
  ],
  
  lastUpdated: '2025-09-28'
};

// Funktion zur Erweiterung der Hot Cities mit lokalen Quellen
export function getEnhancedCityWebsitesForCategories(
  city: string, 
  categories: string[]
): HotCityWebsiteOptimized[] {
  // Für Wien verwenden wir die optimierte Konfiguration
  if (city.toLowerCase().includes('wien') || city.toLowerCase().includes('vienna')) {
    return WIEN_OPTIMIZED_CONFIG.websites.filter(website => 
      website.isActive && 
      categories.some(cat => website.categories.includes(cat))
    ).sort((a, b) => b.priority - a.priority);
  }
  
  // Für andere Städte: Generische erweiterte Quellen
  return getGenericCityWebsites(city, categories);
}

function getGenericCityWebsites(city: string, categories: string[]): HotCityWebsiteOptimized[] {
  const genericSources: HotCityWebsiteOptimized[] = [
    {
      name: `Eventbrite ${city}`,
      url: `https://www.eventbrite.com/d/germany--${city.toLowerCase()}/events/`,
      categories: ['Networking/Business', 'Bildung/Lernen', 'Food/Culinary'],
      priority: 8,
      isActive: true,
      sourceType: 'ticketing'
    },
    {
      name: `Facebook Events ${city}`,
      url: `https://www.facebook.com/events/search/?q=${city.toLowerCase()}%20events`,
      categories: ['Soziales/Community', 'Open Air', 'Clubs/Discos'],
      priority: 7,
      isActive: true,
      sourceType: 'social'
    },
    {
      name: `Meetup ${city}`,
      url: `https://www.meetup.com/cities/de/${city.toLowerCase()}/`,
      categories: ['Networking/Business', 'Bildung/Lernen', 'Wellness/Spirituell'],
      priority: 7,
      isActive: true,
      sourceType: 'community'
    },
    {
      name: `${city} Tourism Events`,
      url: `https://www.${city.toLowerCase()}-tourism.de/events`,
      categories: ['Open Air', 'Kultur/Traditionen', 'Museen'],
      priority: 6,
      isActive: true,
      sourceType: 'official'
    }
  ];
  
  return genericSources.filter(website => 
    categories.some(cat => website.categories.includes(cat))
  ).sort((a, b) => b.priority - a.priority);
}

// Erweiterte Suchstrategien für verschiedene Städte
export function getCitySpecificSearchStrategies(city: string): string[] {
  const cityStrategies: { [key: string]: string[] } = {
    'wien': [
      'events wien heute',
      'veranstaltungen wien',
      'was läuft wien',
      'vienna events today',
      'wien programm',
      'kulturprogramm wien',
      'konzerte wien heute',
      'theater wien programm',
      'ausstellungen wien',
      'party wien heute',
      'clubs wien events'
    ],
    'berlin': [
      'events berlin heute',
      'veranstaltungen berlin',
      'was läuft berlin',
      'berlin events today',
      'berlin programm',
      'kulturprogramm berlin',
      'konzerte berlin heute',
      'theater berlin',
      'ausstellungen berlin',
      'party berlin heute',
      'clubs berlin events'
    ],
    'münchen': [
      'events münchen heute',
      'veranstaltungen münchen',
      'was läuft münchen',
      'munich events today',
      'münchen programm',
      'kulturprogramm münchen',
      'konzerte münchen',
      'theater münchen',
      'ausstellungen münchen'
    ]
  };
  
  const cityKey = city.toLowerCase();
  return cityStrategies[cityKey] || [
    `events ${city} heute`,
    `veranstaltungen ${city}`,
    `was läuft ${city}`,
    `${city} events today`,
    `${city} programm`,
    `kulturprogramm ${city}`
  ];
}
