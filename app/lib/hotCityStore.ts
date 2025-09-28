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
  const normalizedUrl = url.toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
  return BLACKLISTED_URLS.some(blacklisted => {
    const normalizedBlacklisted = blacklisted.toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
    return normalizedUrl === normalizedBlacklisted;
  });
}

// Helper function to create URL-friendly slugs
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[äöüß]/g, char => ({ 'ä': 'ae', 'ö': 'oe', 'ü': 'ue', 'ß': 'ss' }[char] || char))
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
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
      const data = await redis.get(REDIS_KEY);
      return Array.isArray(data) ? data : [];
    } else {
      try {
        const data = await fs.readFile(HOT_CITIES_FILE, 'utf-8');
        return JSON.parse(data) || [];
      } catch (error) {
        return [];
      }
    }
  } catch (error) {
    console.error('Error loading hot cities:', error);
    return [];
  }
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
  if (!city) {
    return getEnhancedCityWebsitesForCategories(cityName, categories);
  }
  
  const filteredWebsites = city.websites.filter(website => 
    website.isActive && categories.some(cat => website.categories.includes(cat))
  );
  
  // Merge with enhanced websites if city is Wien/Vienna
  const enhancedWebsites = getEnhancedCityWebsitesForCategories(cityName, categories);
  
  // Combine and deduplicate by URL
  const urlSet = new Set();
  const combined: HotCityWebsite[] = [];
  
  [...filteredWebsites, ...enhancedWebsites].forEach(website => {
    if (!urlSet.has(website.url)) {
      urlSet.add(website.url);
      combined.push(website);
    }
  });
  
  return combined.sort((a, b) => (b.priority ?? 5) - (a.priority ?? 5));
}

// =============================================================================
// ENHANCED HOT CITIES CONFIGURATION - NEW OPTIMIZATIONS
// =============================================================================

export interface EnhancedHotCityWebsite {
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
  websites: EnhancedHotCityWebsite[];
  searchStrategies: string[];
  localTerms: string[];
  majorVenues: string[];
  communityGroups: string[];
  lastUpdated: string;
}

// Erweiterte Wien-Konfiguration als Beispiel
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
    },
    {
      name: 'Kurier Events Wien',
      url: 'https://kurier.at/freizeit/wien-events',
      categories: ['Open Air', 'Sport', 'Familien/Kids'],
      priority: 6,
      isActive: true,
      sourceType: 'news'
    },
    
    // Universitäten
    {
      name: 'Universität Wien Events',
      url: 'https://www.univie.ac.at/veranstaltungen/',
      categories: ['Bildung/Lernen', 'Networking/Business', 'Kultur/Traditionen'],
      priority: 6,
      isActive: true,
      sourceType: 'official'
    },
    {
      name: 'TU Wien Events',
      url: 'https://www.tuwien.at/aktuelles/events',
      categories: ['Bildung/Lernen', 'Networking/Business'],
      priority: 6,
      isActive: true,
      sourceType: 'official'
    },
    {
      name: 'WU Wien Events',
      url: 'https://www.wu.ac.at/veranstaltungen',
      categories: ['Networking/Business', 'Bildung/Lernen'],
      priority: 6,
      isActive: true,
      sourceType: 'official'
    },
    
    // Food & Nightlife
    {
      name: 'Eventbrite Wien',
      url: 'https://www.eventbrite.de/d/austria--vienna/events/',
      categories: ['Networking/Business', 'Food/Culinary', 'Bildung/Lernen', 'Wellness/Spirituell'],
      priority: 7,
      isActive: true,
      sourceType: 'ticketing',
      searchQuery: 'Wien events'
    },
    {
      name: 'Meetup Wien',
      url: 'https://www.meetup.com/cities/at/vienna/',
      categories: ['Networking/Business', 'Bildung/Lernen', 'Soziales/Community', 'Wellness/Spirituell'],
      priority: 7,
      isActive: true,
      sourceType: 'community'
    },
    
    // Shopping & Märkte
    {
      name: 'Naschmarkt Wien',
      url: 'https://www.wienernaschmarkt.eu/events',
      categories: ['Märkte/Shopping', 'Food/Culinary'],
      priority: 6,
      isActive: true,
      sourceType: 'venue'
    },
    
    // Social Media Groups (Beispiele)
    {
      name: 'Facebook Events Wien',
      url: 'https://www.facebook.com/events/search/?q=wien%20events',
      categories: ['Soziales/Community', 'Open Air', 'Clubs/Discos'],
      priority: 5,
      isActive: true,
      sourceType: 'social',
      searchQuery: 'Wien events heute'
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
): HotCityWebsite[] {
  // Für Wien verwenden wir die optimierte Konfiguration
  if (city.toLowerCase().includes('wien') || city.toLowerCase().includes('vienna')) {
    return WIEN_OPTIMIZED_CONFIG.websites
      .filter(website => 
        website.isActive && 
        categories.some(cat => website.categories.includes(cat))
      )
      .map(website => ({
        id: website.id,
        name: website.name,
        url: website.url,
        categories: website.categories,
        description: website.description || '',
        searchQuery: website.searchQuery || '',
        priority: website.priority,
        isActive: website.isActive
      }))
      .sort((a, b) => b.priority - a.priority);
  }
  
  // Für andere Städte: Generische erweiterte Quellen
  return getGenericCityWebsites(city, categories);
}

function getGenericCityWebsites(city: string, categories: string[]): HotCityWebsite[] {
  const genericSources: HotCityWebsite[] = [
    {
      name: `Eventbrite ${city}`,
      url: `https://www.eventbrite.com/d/germany--${city.toLowerCase()}/events/`,
      categories: ['Networking/Business', 'Bildung/Lernen', 'Food/Culinary'],
      priority: 8,
      isActive: true,
      description: `Eventbrite events in ${city}`,
      searchQuery: `${city} events`
    },
    {
      name: `Facebook Events ${city}`,
      url: `https://www.facebook.com/events/search/?q=${city.toLowerCase()}%20events`,
      categories: ['Soziales/Community', 'Open Air', 'Clubs/Discos'],
      priority: 7,
      isActive: true,
      description: `Facebook events in ${city}`,
      searchQuery: `${city} events heute`
    },
    {
      name: `Meetup ${city}`,
      url: `https://www.meetup.com/cities/de/${city.toLowerCase()}/`,
      categories: ['Networking/Business', 'Bildung/Lernen', 'Wellness/Spirituell'],
      priority: 7,
      isActive: true,
      description: `Meetup events in ${city}`,
      searchQuery: `${city} meetup`
    },
    {
      name: `${city} Tourism Events`,
      url: `https://www.${city.toLowerCase()}-tourism.de/events`,
      categories: ['Open Air', 'Kultur/Traditionen', 'Museen'],
      priority: 6,
      isActive: true,
      description: `Official tourism events for ${city}`,
      searchQuery: `${city} tourism events`
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
