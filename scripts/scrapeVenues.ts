// scripts/scrapeVenues.ts
// Script to scrape and store venues from Wien.info event URLs

import { scrapeAndStoreVenue, batchScrapeAndStoreVenues } from '../app/lib/db/venueStore';

/**
 * Example event URLs to scrape
 * Replace these with actual Wien.info event URLs
 */
const EXAMPLE_EVENT_URLS = [
  // Add Wien.info event URLs here
  // Example: 'https://www.wien.info/de/locations/beispiel-location'
];

async function main() {
  console.log('=== Wien.info Venue Scraper ===\n');

  const args = process.argv.slice(2);
  
  // Check for --help flag
  if (args.includes('--help') || args.includes('-h')) {
    console.log('Usage:');
    console.log('  npm run venues:scrape -- <url>           Scrape single event URL');
    console.log('  npm run venues:scrape -- --batch         Scrape batch of URLs from EXAMPLE_EVENT_URLS');
    console.log('  npm run venues:scrape -- --help          Show this help message');
    console.log('\nExamples:');
    console.log('  npm run venues:scrape -- https://www.wien.info/de/locations/example');
    console.log('  npm run venues:scrape -- --batch');
    return;
  }

  // Single URL mode
  if (args.length > 0 && !args[0].startsWith('--')) {
    const eventUrl = args[0];
    console.log(`Scraping venue from: ${eventUrl}\n`);
    
    const venueId = await scrapeAndStoreVenue(eventUrl);
    
    if (venueId) {
      console.log('\n✓ Success!');
      console.log(`Venue stored with ID: ${venueId}`);
    } else {
      console.log('\n✗ Failed to scrape or store venue');
      process.exit(1);
    }
    return;
  }

  // Batch mode
  if (args.includes('--batch')) {
    if (EXAMPLE_EVENT_URLS.length === 0) {
      console.log('✗ Error: No URLs configured in EXAMPLE_EVENT_URLS array');
      console.log('Edit scripts/scrapeVenues.ts and add URLs to the EXAMPLE_EVENT_URLS array');
      process.exit(1);
    }

    console.log(`Batch scraping ${EXAMPLE_EVENT_URLS.length} URLs...\n`);
    
    const results = await batchScrapeAndStoreVenues(EXAMPLE_EVENT_URLS);
    
    console.log('\n=== Results ===');
    console.log(`Successful: ${results.size}/${EXAMPLE_EVENT_URLS.length}`);
    console.log(`Failed: ${EXAMPLE_EVENT_URLS.length - results.size}/${EXAMPLE_EVENT_URLS.length}`);
    
    if (results.size > 0) {
      console.log('\nVenue IDs:');
      for (const [url, venueId] of results) {
        console.log(`  ${venueId} <- ${url}`);
      }
    }
    return;
  }

  // No arguments - show usage
  console.log('Error: No URL or mode specified\n');
  console.log('Usage:');
  console.log('  npm run venues:scrape -- <url>           Scrape single event URL');
  console.log('  npm run venues:scrape -- --batch         Scrape batch of URLs');
  console.log('  npm run venues:scrape -- --help          Show help');
  process.exit(1);
}

// Run the script
main().catch((error) => {
  console.error('\n✗ Error:', error);
  process.exit(1);
});
