// scripts/testVenueIntegration.ts

import { scrapeVenueFromDetailPage } from '../app/lib/sources/wienInfoVenueScraper';
import { scrapeWienInfoDetailPage } from '../app/lib/sources/wienInfoDetailScraper';
import { upsertVenue } from '../app/lib/venueStore';

async function testVenueIntegration() {
  console.log('🧪 TESTING VENUE INTEGRATION\n');

  // Test with real wien.info event
  const testUrl = 'https://www.wien.info/de/aktuell/veranstaltungen/mivos-quartet-1-1024824';
  const testVenue = 'Arnold Schönberg Center';

  console.log(`URL: ${testUrl}`);
  console.log(`Venue: ${testVenue}\n`);

  // Test 1: Venue Scraping
  console.log('━'.repeat(60));
  console.log('TEST 1: Venue Scraping');
  console.log('━'.repeat(60));
  
  const venueData = await scrapeVenueFromDetailPage(testUrl, testVenue);
  console.log('\n✓ Venue Data:');
  console.log(JSON.stringify(venueData, null, 2));

  // Test 2: Event Details Scraping
  console.log('\n' + '━'.repeat(60));
  console.log('TEST 2: Event Details Scraping');
  console.log('━'.repeat(60));
  
  const detailData = await scrapeWienInfoDetailPage(testUrl);
  console.log('\n✓ Detail Data:');
  console.log(JSON.stringify(detailData, null, 2));

  // Test 3: Database Insert
  if (process.env.TEST_DATABASE === 'true') {
    console.log('\n' + '━'.repeat(60));
    console.log('TEST 3: Database Insert');
    console.log('━'.repeat(60));
    
    const venueId = await upsertVenue(venueData);
    
    if (venueId) {
      console.log(`\n✓ Venue inserted with ID: ${venueId}`);
    } else {
      console.error('\n✗ Failed to insert venue');
    }
  } else {
    console.log('\n⚠️  Skipping database test (set TEST_DATABASE=true to enable)');
  }

  console.log('\n' + '━'.repeat(60));
  console.log('✨ ALL TESTS COMPLETED');
  console.log('━'.repeat(60));
}

testVenueIntegration().catch(error => {
  console.error('\n❌ TEST FAILED:', error);
  process.exit(1);
});
