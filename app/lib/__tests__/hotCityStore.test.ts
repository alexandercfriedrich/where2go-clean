import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { slugify, createEmptyCity, createSite, loadHotCities, saveHotCities, saveHotCity, deleteHotCity, getHotCity, getHotCityBySlug } from '@/lib/hotCityStore';
import { HotCity } from '@/lib/types';

// Mock data for testing
const mockCity: HotCity = {
  id: 'test-city-1',
  name: 'Test City',
  country: 'Test Country',
  isActive: true,
  websites: [
    {
      id: 'test-website-1',
      name: 'Test Website',
      url: 'https://test.com',
      categories: ['Live-Konzerte'],
      description: 'Test description',
      searchQuery: 'test query',
      priority: 8,
      isActive: true,
    }
  ],
  defaultSearchQuery: 'test search',
  customPrompt: 'test prompt',
  createdAt: new Date(),
  updatedAt: new Date()
};

describe('Hot Cities Store Helpers', () => {
  describe('slugify', () => {
    it('should convert text to URL-friendly slug', () => {
      expect(slugify('Wien')).toBe('wien');
      expect(slugify('Berlin')).toBe('berlin');
      expect(slugify('New York')).toBe('new-york');
      expect(slugify('São Paulo')).toBe('so-paulo');
    });

    it('should handle special characters', () => {
      expect(slugify('Café & Restaurant')).toBe('caf-restaurant');
      expect(slugify('Music/Arts & Events!')).toBe('musicarts-events');
      expect(slugify('100% Pure Fun')).toBe('100-pure-fun');
    });

    it('should handle multiple spaces and dashes', () => {
      expect(slugify('  Multiple   Spaces  ')).toBe('multiple-spaces');
      expect(slugify('Already-Has-Dashes')).toBe('already-has-dashes');
      expect(slugify('Mixed_Under_scores')).toBe('mixed-under-scores');
    });

    it('should handle edge cases', () => {
      expect(slugify('')).toBe('');
      expect(slugify('   ')).toBe('');
      expect(slugify('---')).toBe('');
      expect(slugify('A')).toBe('a');
    });
  });

  describe('createEmptyCity', () => {
    it('should create a valid empty city template', () => {
      const city = createEmptyCity();
      
      expect(city).toEqual({
        name: '',
        country: '',
        isActive: true,
        websites: [],
        venues: [],
        defaultSearchQuery: '',
        customPrompt: '',
      });
    });

    it('should not include id, createdAt, or updatedAt', () => {
      const city = createEmptyCity();
      
      expect(city).not.toHaveProperty('id');
      expect(city).not.toHaveProperty('createdAt');
      expect(city).not.toHaveProperty('updatedAt');
    });
  });

  describe('createSite', () => {
    it('should create a valid empty website template', () => {
      const site = createSite();
      
      expect(site).toEqual({
        name: '',
        url: '',
        categories: [],
        description: '',
        searchQuery: '',
        priority: 5,
        isActive: true,
      });
    });

    it('should not include id', () => {
      const site = createSite();
      
      expect(site).not.toHaveProperty('id');
    });

    it('should have default priority of 5', () => {
      const site = createSite();
      
      expect(site.priority).toBe(5);
    });

    it('should be active by default', () => {
      const site = createSite();
      
      expect(site.isActive).toBe(true);
    });
  });
});

describe('Hot Cities Store Operations', () => {
  // Note: These tests work with the actual store (file-based in test environment)
  // In a production environment with Redis, these would test Redis operations
  
  beforeEach(async () => {
    // Clear any existing data
    await saveHotCities([]);
  });

  afterEach(async () => {
    // Clean up after tests
    await saveHotCities([]);
  });

  describe('Basic CRUD operations', () => {
    it('should save and load cities', async () => {
      const cities = [mockCity];
      await saveHotCities(cities);
      
      const loadedCities = await loadHotCities();
      expect(loadedCities).toHaveLength(1);
      expect(loadedCities[0].name).toBe(mockCity.name);
      expect(loadedCities[0].country).toBe(mockCity.country);
    });

    it('should handle empty cities list', async () => {
      const cities = await loadHotCities();
      expect(cities).toEqual([]);
    });

    it('should save individual city (upsert)', async () => {
      await saveHotCity(mockCity);
      
      const cities = await loadHotCities();
      expect(cities).toHaveLength(1);
      expect(cities[0].name).toBe(mockCity.name);
    });

    it('should update existing city', async () => {
      await saveHotCity(mockCity);
      
      const updatedCity = { ...mockCity, name: 'Updated City' };
      await saveHotCity(updatedCity);
      
      const cities = await loadHotCities();
      expect(cities).toHaveLength(1);
      expect(cities[0].name).toBe('Updated City');
    });

    it('should delete city by id', async () => {
      await saveHotCity(mockCity);
      
      const deleted = await deleteHotCity(mockCity.id);
      expect(deleted).toBe(true);
      
      const cities = await loadHotCities();
      expect(cities).toHaveLength(0);
    });

    it('should return false when deleting non-existent city', async () => {
      const deleted = await deleteHotCity('non-existent-id');
      expect(deleted).toBe(false);
    });
  });

  describe('City lookup operations', () => {
    beforeEach(async () => {
      await saveHotCity(mockCity);
    });

    it('should get city by name (case insensitive)', async () => {
      const city = await getHotCity('test city');
      expect(city).toBeTruthy();
      expect(city?.name).toBe(mockCity.name);
      
      const cityUpper = await getHotCity('TEST CITY');
      expect(cityUpper).toBeTruthy();
      expect(cityUpper?.name).toBe(mockCity.name);
    });

    it('should get city by slug', async () => {
      const city = await getHotCityBySlug('test-city');
      expect(city).toBeTruthy();
      expect(city?.name).toBe(mockCity.name);
    });

    it('should return null for non-existent city', async () => {
      const city = await getHotCity('non-existent');
      expect(city).toBeNull();
      
      const cityBySlug = await getHotCityBySlug('non-existent');
      expect(cityBySlug).toBeNull();
    });

    it('should only return active cities', async () => {
      const inactiveCity = { ...mockCity, id: 'inactive', name: 'Inactive City', isActive: false };
      await saveHotCity(inactiveCity);
      
      const city = await getHotCity('Inactive City');
      expect(city).toBeNull(); // Should not return inactive cities
    });
  });
});