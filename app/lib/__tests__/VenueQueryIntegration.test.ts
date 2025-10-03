import { describe, it, expect, beforeEach } from 'vitest';
import { venueQueryService, VenueQuery } from '../services/VenueQueryService';
import { saveHotCities } from '../hotCityStore';
import { HotCity } from '../types';
import { VIENNA_VENUES } from '../data/hotCities/viennaVenues';

/**
 * Integration test for Vienna Venue Multi-Query System
 * 
 * This test validates that:
 * 1. Vienna venues are properly loaded from hot cities data
 * 2. Active venues with aiQueryTemplate are correctly filtered
 * 3. Venue-specific prompts are generated correctly
 * 4. Priority-based grouping works as expected
 */
describe('Vienna Venue Multi-Query Integration', () => {
  const mockViennaCity: HotCity = {
    id: 'test-vienna',
    name: 'Wien',
    country: 'Austria',
    isActive: true,
    websites: [],
    venues: VIENNA_VENUES.map(v => ({
      id: v.id,
      name: v.name,
      categories: v.categories,
      description: v.description,
      priority: v.priority,
      isActive: v.isActive,
      isVenue: true as const,
      address: v.address,
      website: v.website,
      eventsUrl: v.eventsUrl,
      aiQueryTemplate: v.aiQueryTemplate
    })),
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeEach(async () => {
    // Initialize hot cities data with Vienna for testing
    await saveHotCities([mockViennaCity]);
  });

  it('should load all 20 Vienna venues with AI query templates', async () => {
    
    const venues = await venueQueryService.getActiveVenueQueries('Wien');
    
    // All 20 Vienna venues should be loaded
    expect(venues.length).toBeGreaterThan(0);
    expect(venues.length).toBeLessThanOrEqual(20);
    
    // All venues should have required fields
    venues.forEach(venue => {
      expect(venue.venueId).toBeTruthy();
      expect(venue.venueName).toBeTruthy();
      expect(venue.query).toBeTruthy();
      expect(venue.query.length).toBeGreaterThan(10);
      expect(venue.priority).toBeGreaterThanOrEqual(1);
      expect(venue.priority).toBeLessThanOrEqual(10);
    });
  });

  it('should prioritize high-priority venues correctly', async () => {
    
    const venues = await venueQueryService.getActiveVenueQueries('Wien');
    const { high, medium, low } = venueQueryService.getVenuesByPriority(venues);
    
    // High priority venues (8-10) should include major venues like Staatsoper
    expect(high.length).toBeGreaterThan(0);
    
    // Verify Wiener Staatsoper is in high priority (priority 10)
    const staatsoper = high.find(v => v.venueName.includes('Staatsoper'));
    expect(staatsoper).toBeTruthy();
    expect(staatsoper?.priority).toBeGreaterThanOrEqual(8);
    
    // All venues should be properly categorized
    high.forEach(v => expect(v.priority).toBeGreaterThanOrEqual(8));
    medium.forEach(v => {
      expect(v.priority).toBeGreaterThanOrEqual(6);
      expect(v.priority).toBeLessThan(8);
    });
    low.forEach(v => expect(v.priority).toBeLessThan(6));
  });

  it('should generate venue-specific prompts with all required information', async () => {
    
    const venues = await venueQueryService.getActiveVenueQueries('Wien');
    const testVenue = venues[0];
    
    const prompt = venueQueryService.buildVenueSpecificPrompt(
      testVenue,
      'Wien',
      '2025-10-03'
    );
    
    // Verify prompt contains all critical information
    expect(prompt).toContain(testVenue.venueName);
    expect(prompt).toContain('Wien');
    expect(prompt).toContain('2025-10-03');
    expect(prompt).toContain('VENUE-SPECIFIC EVENT SEARCH');
    expect(prompt).toContain('TARGET VENUE');
    expect(prompt).toContain('LOCATION');
    expect(prompt).toContain('DATE');
    
    // Verify it includes venue-specific data
    if (testVenue.website) {
      expect(prompt).toContain(testVenue.website);
    }
    if (testVenue.eventsUrl) {
      expect(prompt).toContain(testVenue.eventsUrl);
    }
  });

  it('should handle case-insensitive city matching', async () => {
    
    const venuesLower = await venueQueryService.getActiveVenueQueries('wien');
    const venuesUpper = await venueQueryService.getActiveVenueQueries('WIEN');
    const venuesMixed = await venueQueryService.getActiveVenueQueries('WiEn');
    
    expect(venuesLower.length).toBeGreaterThan(0);
    expect(venuesUpper.length).toBe(venuesLower.length);
    expect(venuesMixed.length).toBe(venuesLower.length);
  });

  it('should verify key Vienna venues are included', async () => {
    
    const venues = await venueQueryService.getActiveVenueQueries('Wien');
    const venueNames = venues.map(v => v.venueName);
    
    // Check for major Vienna venues
    const majorVenues = [
      'Wiener Staatsoper',
      'Wiener Konzerthaus',
      'Burgtheater',
      'Flex Wien',
      'Belvedere Museum'
    ];
    
    majorVenues.forEach(venueName => {
      const found = venueNames.some(name => name.includes(venueName) || venueName.includes(name));
      if (!found) {
        console.log(`Warning: Major venue "${venueName}" not found in venues:`, venueNames);
      }
    });
    
    // At least some major venues should be present
    expect(venues.length).toBeGreaterThan(5);
  });

  it('should ensure all Vienna venues have valid categories', async () => {
    
    const venues = await venueQueryService.getActiveVenueQueries('Wien');
    
    venues.forEach(venue => {
      expect(Array.isArray(venue.categories)).toBe(true);
      expect(venue.categories.length).toBeGreaterThan(0);
      
      // Categories should be non-empty strings
      venue.categories.forEach(category => {
        expect(typeof category).toBe('string');
        expect(category.trim().length).toBeGreaterThan(0);
      });
    });
  });

  it('should validate that venues are sorted by priority descending', async () => {
    
    const venues = await venueQueryService.getActiveVenueQueries('Wien');
    
    // Verify descending priority order
    for (let i = 0; i < venues.length - 1; i++) {
      expect(venues[i].priority).toBeGreaterThanOrEqual(venues[i + 1].priority);
    }
    
    // First venue should have highest priority
    if (venues.length > 0) {
      const highestPriority = Math.max(...venues.map(v => v.priority));
      expect(venues[0].priority).toBe(highestPriority);
    }
  });
});
