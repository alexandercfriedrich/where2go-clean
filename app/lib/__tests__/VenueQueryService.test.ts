import { describe, it, expect, beforeEach, vi } from 'vitest';
import { VenueQueryService, VenueQuery } from '../services/VenueQueryService';
import { loadHotCities } from '../hotCityStore';

// Mock the hotCityStore
vi.mock('../hotCityStore', () => ({
  loadHotCities: vi.fn()
}));

describe('VenueQueryService', () => {
  let service: VenueQueryService;
  
  beforeEach(() => {
    service = new VenueQueryService();
    vi.clearAllMocks();
  });

  const mockHotCities = [
    {
      id: 'vienna-test',
      name: 'Wien',
      isActive: true,
      websites: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      venues: [
        {
          id: 'venue-test-1',
          name: 'Test Venue 1',
          categories: ['Live-Konzerte'],
          description: 'Test venue',
          priority: 9,
          isActive: true,
          isVenue: true as const,
          address: {
            full: 'Test Address 1, Wien',
            street: 'Test Street',
            houseNumber: '1',
            postalCode: '1010',
            city: 'Wien',
            country: 'Österreich'
          },
          website: 'https://test1.com',
          eventsUrl: 'https://test1.com/events',
          aiQueryTemplate: 'Classical music events at Test Venue 1 Vienna'
        },
        {
          id: 'venue-test-2',
          name: 'Test Venue 2',
          categories: ['DJ Sets/Electronic'],
          description: 'Electronic venue',
          priority: 7,
          isActive: false, // INACTIVE - should be filtered out
          isVenue: true as const,
          address: {
            full: 'Test Address 2, Wien',
            street: 'Test Street',
            houseNumber: '2',
            postalCode: '1020',
            city: 'Wien',
            country: 'Österreich'
          },
          aiQueryTemplate: 'Electronic music at Test Venue 2'
        }
      ]
    }
  ];

  it('should return active venue queries for a city', async () => {
    vi.mocked(loadHotCities).mockResolvedValue(mockHotCities);
    
    const result = await service.getActiveVenueQueries('Wien');
    
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      venueId: 'venue-test-1',
      venueName: 'Test Venue 1',
      query: 'Classical music events at Test Venue 1 Vienna',
      priority: 9,
      categories: ['Live-Konzerte'],
      website: 'https://test1.com',
      eventsUrl: 'https://test1.com/events'
    });
  });

  it('should filter out inactive venues', async () => {
    vi.mocked(loadHotCities).mockResolvedValue(mockHotCities);
    
    const result = await service.getActiveVenueQueries('Wien');
    
    expect(result.every(v => v.venueId !== 'venue-test-2')).toBe(true);
  });

  it('should sort venues by priority descending', async () => {
    const mockCityWithMultipleVenues = [
      {
        ...mockHotCities[0],
        venues: [
          { ...mockHotCities[0].venues![0], priority: 5 },
          { ...mockHotCities[0].venues![0], id: 'venue-high', priority: 10, isActive: true, aiQueryTemplate: 'High priority venue' }
        ]
      }
    ];
    
    vi.mocked(loadHotCities).mockResolvedValue(mockCityWithMultipleVenues);
    
    const result = await service.getActiveVenueQueries('Wien');
    
    expect(result[0].priority).toBeGreaterThan(result[1].priority);
  });

  it('should group venues by priority correctly', () => {
    const venues: VenueQuery[] = [
      { venueId: '1', venueName: 'High1', query: 'q1', priority: 9, categories: [] },
      { venueId: '2', venueName: 'High2', query: 'q2', priority: 8, categories: [] },
      { venueId: '3', venueName: 'Med1', query: 'q3', priority: 7, categories: [] },
      { venueId: '4', venueName: 'Low1', query: 'q4', priority: 4, categories: [] }
    ];
    
    const grouped = service.getVenuesByPriority(venues);
    
    expect(grouped.high).toHaveLength(2);
    expect(grouped.medium).toHaveLength(1);
    expect(grouped.low).toHaveLength(1);
  });

  it('should build venue-specific prompt correctly', () => {
    const venue: VenueQuery = {
      venueId: 'test-venue',
      venueName: 'Test Concert Hall',
      query: 'Classical concerts at Test Concert Hall',
      priority: 8,
      categories: ['Live-Konzerte'],
      website: 'https://testconcerthall.com',
      eventsUrl: 'https://testconcerthall.com/events'
    };
    
    const prompt = service.buildVenueSpecificPrompt(venue, 'Wien', '2025-10-03');
    
    expect(prompt).toContain('Test Concert Hall');
    expect(prompt).toContain('Wien');
    expect(prompt).toContain('2025-10-03');
    expect(prompt).toContain('https://testconcerthall.com');
    expect(prompt).toContain('Live-Konzerte');
  });

  it('should return empty array for city with no venues', async () => {
    const mockCityNoVenues = [
      {
        ...mockHotCities[0],
        venues: undefined
      }
    ];
    
    vi.mocked(loadHotCities).mockResolvedValue(mockCityNoVenues);
    
    const result = await service.getActiveVenueQueries('Wien');
    
    expect(result).toEqual([]);
  });

  it('should return empty array for inactive city', async () => {
    const mockInactiveCity = [
      {
        ...mockHotCities[0],
        isActive: false
      }
    ];
    
    vi.mocked(loadHotCities).mockResolvedValue(mockInactiveCity);
    
    const result = await service.getActiveVenueQueries('Wien');
    
    expect(result).toEqual([]);
  });

  it('should handle errors gracefully', async () => {
    vi.mocked(loadHotCities).mockRejectedValue(new Error('Test error'));
    
    const result = await service.getActiveVenueQueries('Wien');
    
    expect(result).toEqual([]);
  });

  it('should filter out venues with short or empty aiQueryTemplate', async () => {
    const mockCityWithInvalidTemplates = [
      {
        ...mockHotCities[0],
        venues: [
          { ...mockHotCities[0].venues![0], aiQueryTemplate: 'short' }, // too short
          { ...mockHotCities[0].venues![0], id: 'venue-empty', aiQueryTemplate: '' }, // empty
          { ...mockHotCities[0].venues![0], id: 'venue-valid', aiQueryTemplate: 'This is a valid template with enough characters' }
        ]
      }
    ];
    
    vi.mocked(loadHotCities).mockResolvedValue(mockCityWithInvalidTemplates);
    
    const result = await service.getActiveVenueQueries('Wien');
    
    expect(result).toHaveLength(1);
    expect(result[0].venueId).toBe('venue-valid');
  });
});
