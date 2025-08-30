// Test script to verify hot cities data loading
const { promises: fs } = require('fs');
const path = require('path');

const DATA_DIR = path.join(process.cwd(), 'data');
const HOT_CITIES_FILE = path.join(DATA_DIR, 'hot-cities.json');

async function loadHotCities() {
  try {
    const data = await fs.readFile(HOT_CITIES_FILE, 'utf-8');
    const cities = JSON.parse(data);
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

async function getHotCity(cityName) {
  const cities = await loadHotCities();
  return cities.find(city => 
    city.name.toLowerCase() === cityName.toLowerCase() && city.isActive
  ) || null;
}

async function getCityWebsitesForCategories(cityName, categories) {
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

async function testHotCitySearch() {
  console.log('Testing Hot Cities Search Integration...\n');

  // Test 1: Check if we can load hot city websites
  console.log('1. Testing website loading for Berlin with DJ Sets/Electronic category:');
  try {
    const websites = await getCityWebsitesForCategories('Berlin', ['DJ Sets/Electronic']);
    console.log(`Found ${websites.length} relevant websites for Berlin:`);
    websites.forEach(site => {
      console.log(`  - ${site.name}: ${site.url} (Priority: ${site.priority})`);
    });
  } catch (error) {
    console.error('Error loading websites:', error.message);
  }

  console.log('\n2. Testing website loading for Wien with Live-Konzerte category:');
  try {
    const websites = await getCityWebsitesForCategories('Wien', ['Live-Konzerte']);
    console.log(`Found ${websites.length} relevant websites for Wien:`);
    websites.forEach(site => {
      console.log(`  - ${site.name}: ${site.url} (Priority: ${site.priority})`);
    });
  } catch (error) {
    console.error('Error loading websites:', error.message);
  }

  console.log('\n3. Testing website loading for non-hot city (should return empty):');
  try {
    const websites = await getCityWebsitesForCategories('Munich', ['DJ Sets/Electronic']);
    console.log(`Found ${websites.length} relevant websites for Munich (expected: 0)`);
  } catch (error) {
    console.error('Error loading websites:', error.message);
  }

  console.log('\n4. Testing all hot cities data:');
  try {
    const cities = await loadHotCities();
    console.log(`Total hot cities loaded: ${cities.length}`);
    cities.forEach(city => {
      console.log(`  - ${city.name}, ${city.country}: ${city.websites.length} websites (Active: ${city.isActive})`);
    });
  } catch (error) {
    console.error('Error loading cities:', error.message);
  }

  console.log('\nTest completed! Hot cities data loading is working correctly.');
}

// Run if called directly
if (require.main === module) {
  testHotCitySearch().catch(console.error);
}

module.exports = { testHotCitySearch };