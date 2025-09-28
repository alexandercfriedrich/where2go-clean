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
