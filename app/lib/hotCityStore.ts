// Hot Cities data store - simple file-based storage for now
import { promises as fs } from 'fs';
import path from 'path';
import { HotCity, HotCityWebsite } from './types';

const DATA_DIR = path.join(process.cwd(), 'data');
const HOT_CITIES_FILE = path.join(DATA_DIR, 'hot-cities.json');

// Ensure data directory exists
async function ensureDataDir(): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (error) {
    // Directory might already exist, ignore error
  }
}

// Load hot cities from file
export async function loadHotCities(): Promise<HotCity[]> {
  try {
    await ensureDataDir();
    const data = await fs.readFile(HOT_CITIES_FILE, 'utf-8');
    const cities = JSON.parse(data) as HotCity[];
    // Convert date strings back to Date objects
    return cities.map(city => ({
      ...city,
      createdAt: new Date(city.createdAt),
      updatedAt: new Date(city.updatedAt)
    }));
  } catch (error) {
    console.log('No hot cities file found, returning empty array');
    return [];
  }
}

// Save hot cities to file
export async function saveHotCities(cities: HotCity[]): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(HOT_CITIES_FILE, JSON.stringify(cities, null, 2));
}

// Get a specific hot city by name (case-insensitive)
export async function getHotCity(cityName: string): Promise<HotCity | null> {
  const cities = await loadHotCities();
  return cities.find(city => 
    city.name.toLowerCase() === cityName.toLowerCase() && city.isActive
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
      (website.categories.length === 0 || // Empty categories means it covers all
       website.categories.some(cat => categories.includes(cat)))
    )
    .sort((a, b) => b.priority - a.priority); // Higher priority first
}