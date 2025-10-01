import { describe, it, expect } from 'vitest';
import { VIENNA_VENUES } from '@/lib/data/hotCities/viennaVenues';

describe('Vienna Venues Data', () => {
  it('should have at least 6 venues', () => {
    expect(VIENNA_VENUES.length).toBeGreaterThanOrEqual(6);
  });

  it('should have all venues with required fields', () => {
    VIENNA_VENUES.forEach((venue) => {
      expect(venue).toHaveProperty('id');
      expect(venue).toHaveProperty('name');
      expect(venue).toHaveProperty('categories');
      expect(venue).toHaveProperty('description');
      expect(venue).toHaveProperty('priority');
      expect(venue).toHaveProperty('isActive');
      expect(venue).toHaveProperty('address');
      expect(venue).toHaveProperty('website');
      expect(venue).toHaveProperty('eventsUrl');
      expect(venue).toHaveProperty('aiQueryTemplate');
      
      // Verify address structure
      expect(venue.address).toHaveProperty('full');
      expect(venue.address).toHaveProperty('street');
      expect(venue.address).toHaveProperty('houseNumber');
      expect(venue.address).toHaveProperty('postalCode');
      expect(venue.address).toHaveProperty('city');
      expect(venue.address).toHaveProperty('country');
      
      // Verify data types
      expect(typeof venue.id).toBe('string');
      expect(typeof venue.name).toBe('string');
      expect(Array.isArray(venue.categories)).toBe(true);
      expect(typeof venue.description).toBe('string');
      expect(typeof venue.priority).toBe('number');
      expect(typeof venue.isActive).toBe('boolean');
      expect(typeof venue.website).toBe('string');
      expect(typeof venue.eventsUrl).toBe('string');
      expect(typeof venue.aiQueryTemplate).toBe('string');
    });
  });

  it('should have unique venue IDs', () => {
    const ids = VIENNA_VENUES.map(v => v.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('should have valid priority values (1-10)', () => {
    VIENNA_VENUES.forEach((venue) => {
      expect(venue.priority).toBeGreaterThanOrEqual(1);
      expect(venue.priority).toBeLessThanOrEqual(10);
    });
  });

  it('should have all venues in Vienna', () => {
    VIENNA_VENUES.forEach((venue) => {
      expect(venue.address.city).toBe('Wien');
      expect(venue.address.country).toBe('Österreich');
    });
  });

  it('should have at least one category per venue', () => {
    VIENNA_VENUES.forEach((venue) => {
      expect(venue.categories.length).toBeGreaterThan(0);
    });
  });

  it('should have valid URLs', () => {
    VIENNA_VENUES.forEach((venue) => {
      expect(venue.website).toMatch(/^https?:\/\/.+/);
      expect(venue.eventsUrl).toMatch(/^https?:\/\/.+/);
    });
  });

  it('should include expanded venues', () => {
    const venueNames = VIENNA_VENUES.map(v => v.name);
    
    // Check for some of the original venues
    expect(venueNames).toContain('Wiener Konzerthaus');
    expect(venueNames).toContain('Wiener Staatsoper');
    
    // Check for some of the newly added venues
    expect(venueNames).toContain('Albertina Museum');
    expect(venueNames).toContain('Pratersauna');
    expect(venueNames).toContain('Grelle Forelle');
    expect(venueNames).toContain('Wiener Stadthalle');
  });
});
