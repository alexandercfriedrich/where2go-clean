// scripts/testVenueScraper.ts
// Test script for the Wien.info venue scraper

import { 
  scrapeVenueFromUrl, 
  generateVenueSlug, 
  isValidVenueResult 
} from '../lib/sources/wienInfoVenueScraper';

/**
 * Test URLs for venue scraping
 * These should be real Wien.info event URLs
 */
const TEST_URLS = [
  'https://www.wien.info/de/shopping-mode-genuss/events/beispiel-event-1',
  // Add more test URLs here
];

async function testVenueScraper() {
  console.log('=== Wien.info Venue Scraper Test ===\n');

  // Test 1: Test slug generation
  console.log('Test 1: Venue Slug Generation');
  const testNames = [
    'Arnold Schönberg Center',
    'Café Landtmann',
    'Wiener Staatsoper',
    'Theater an der Wien'
  ];

  for (const name of testNames) {
    const slug = generateVenueSlug(name);
    console.log(`  "${name}" -> "${slug}"`);
  }
  console.log('');

  // Test 2: Test URL scraping
  console.log('Test 2: URL Scraping');
  if (TEST_URLS.length === 0) {
    console.log('  No test URLs configured. Add real Wien.info URLs to TEST_URLS array.');
    console.log('  Example: https://www.wien.info/de/locations/...\n');
    return;
  }

  for (const url of TEST_URLS) {
    console.log(`\n  Scraping: ${url}`);
    try {
      const result = await scrapeVenueFromUrl(url);
      
      if (isValidVenueResult(result)) {
        console.log('  ✓ Successfully scraped venue:');
        console.log('    Name:', result.name);
        console.log('    Address:', result.full_address);
        console.log('    City:', result.city);
        console.log('    Slug:', generateVenueSlug(result.name));
        
        if (result.phone) console.log('    Phone:', result.phone);
        if (result.email) console.log('    Email:', result.email);
        if (result.website) console.log('    Website:', result.website);
        if (result.latitude && result.longitude) {
          console.log('    Coordinates:', result.latitude, result.longitude);
        }
      } else {
        console.log('  ✗ Failed to scrape venue or invalid result');
      }
    } catch (error) {
      console.log('  ✗ Error:', error);
    }
  }

  console.log('\n=== Test Complete ===');
}

// Run the test
testVenueScraper().catch(console.error);
