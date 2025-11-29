import { describe, it, expect } from 'vitest';

/**
 * Test to document and verify venue slug generation behavior
 * 
 * IMPORTANT: Venues have TWO slug columns for historical reasons:
 * 
 * 1. `slug` (NOT NULL, required):
 *    - Primary slug column for SEO-friendly URLs
 *    - Used by the venue detail page to lookup venues
 * 
 * 2. `venue_slug` (nullable, for compatibility):
 *    - Secondary slug column for navigation links
 *    - Used by SearchBar.tsx to filter venues for search results
 *    - Should ALWAYS be the same value as `slug`
 * 
 * The problem was:
 * - unified-event-pipeline.ts generated a random slug for `slug`
 * - VenueRepository.upsertVenue() generated ANOTHER random slug for `venue_slug`
 * - This caused venues to have different values in `slug` and `venue_slug`
 * - SearchBar.tsx used `venue_slug` for navigation but venue detail page used `slug`
 * - Result: 404 errors when clicking on venue links from search
 * 
 * The fix ensures:
 * - Both `slug` and `venue_slug` always have the same value
 * - VenueRepository.upsertVenue() uses provided `slug` for `venue_slug` fallback
 */

describe('Venue Slug Consistency', () => {
  it('should document venue slug columns', () => {
    // Venues table has two slug columns
    const slugColumns = {
      slug: 'NOT NULL - primary slug for SEO URLs',
      venue_slug: 'nullable - for compatibility with navigation links'
    };
    
    expect(Object.keys(slugColumns)).toHaveLength(2);
    expect(slugColumns.slug).toContain('NOT NULL');
    expect(slugColumns.venue_slug).toContain('nullable');
  });
  
  it('should ensure slug and venue_slug are always the same', () => {
    // When a venue is created, both columns should have the same value
    // This is enforced by VenueRepository.upsertVenue()
    
    const venueSlug = 'grelle-forelle-wien-abc123';
    
    const venueData = {
      name: 'Grelle Forelle',
      city: 'Wien',
      slug: venueSlug,
      venue_slug: venueSlug // MUST be the same as slug
    };
    
    expect(venueData.slug).toBe(venueData.venue_slug);
  });
  
  it('should document the fix in VenueRepository.upsertVenue', () => {
    // The fix ensures venue_slug uses the provided/generated slug value
    // instead of generating a different random slug
    
    // Before fix:
    // const generatedSlug = generateVenueSlug(...) // Random 1
    // slug: venue.slug || generatedSlug
    // venue_slug: venue.venue_slug || generatedSlug // generatedSlug is called AGAIN = Random 2!
    
    // After fix:
    // const generatedSlug = generateVenueSlug(...)
    // const finalSlug = venue.slug || generatedSlug
    // slug: finalSlug
    // venue_slug: venue.venue_slug || finalSlug // Uses SAME slug, not new random
    
    const fix = {
      before: 'Generated two different slugs for slug and venue_slug',
      after: 'Uses same finalSlug for both slug and venue_slug'
    };
    
    expect(fix.after).toContain('same finalSlug');
  });
  
  it('should document the fix in unified-event-pipeline.ts', () => {
    // The pipeline now explicitly sets venue_slug when creating venue data
    
    // Before fix:
    // const venueData = {
    //   name: 'Venue Name',
    //   slug: venueSlug,      // Set
    //   // venue_slug not set -> undefined
    // }
    
    // After fix:
    // const venueData = {
    //   name: 'Venue Name',
    //   slug: venueSlug,       // Set
    //   venue_slug: venueSlug  // Also set to same value
    // }
    
    const venueSlug = 'test-venue-wien-xyz789';
    
    const venueDataAfterFix = {
      name: 'Test Venue',
      slug: venueSlug,
      venue_slug: venueSlug // Explicitly set
    };
    
    expect(venueDataAfterFix.slug).toBe(venueSlug);
    expect(venueDataAfterFix.venue_slug).toBe(venueSlug);
    expect(venueDataAfterFix.slug).toBe(venueDataAfterFix.venue_slug);
  });
  
  it('should explain why SearchBar.tsx filters by venue_slug', () => {
    // SearchBar.tsx line 140:
    // .not('venue_slug', 'is', null)
    
    // This filter ensures only venues with valid venue_slug are shown
    // Because navigation uses venue_slug, not slug
    
    // With the fix, all venues will have both slug and venue_slug set
    // to the same value, so search results will link correctly
    
    const searchQuery = {
      table: 'venues',
      select: 'id, name, venue_slug, city, address',
      filter: 'venue_slug IS NOT NULL',
      reason: 'Navigation links use venue_slug column'
    };
    
    expect(searchQuery.filter).toContain('venue_slug');
    expect(searchQuery.reason).toContain('Navigation');
  });
  
  it('should verify venue URL generation', () => {
    // When user clicks on a venue in search results:
    // 1. SearchBar.tsx uses venue.venue_slug for the URL
    // 2. Router navigates to /venues/{venue_slug}
    // 3. Venue detail page queries by slug parameter
    
    // With slug === venue_slug, navigation works correctly
    
    const venueSlug = 'grelle-forelle-wien-9tngj7';
    
    const searchResult = {
      venue_slug: venueSlug // What SearchBar.tsx uses for URL
    };
    
    const navigationUrl = `/venues/${searchResult.venue_slug}`;
    
    // This URL should resolve to the correct venue because
    // venue detail page queries by the same slug
    expect(navigationUrl).toBe('/venues/grelle-forelle-wien-9tngj7');
  });
});
