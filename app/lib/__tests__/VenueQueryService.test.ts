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

  describe('Venue Grouping and Strategy', () => {
    it('should group venues by category', () => {
      const venues: VenueQuery[] = [
        { venueId: '1', venueName: 'Concert Hall 1', query: 'q1', priority: 8, categories: ['Live-Konzerte'], website: 'https://test1.com' },
        { venueId: '2', venueName: 'Concert Hall 2', query: 'q2', priority: 7, categories: ['Live-Konzerte'], website: 'https://test2.com' },
        { venueId: '3', venueName: 'Museum 1', query: 'q3', priority: 8, categories: ['Museen'], website: 'https://test3.com' },
        { venueId: '4', venueName: 'Club 1', query: 'q4', priority: 7, categories: ['DJ Sets/Electronic'], website: 'https://test4.com' }
      ];
      
      const grouped = service.groupVenuesByCategory(venues);
      
      expect(grouped.size).toBe(3);
      expect(grouped.get('Live-Konzerte')).toHaveLength(2);
      expect(grouped.get('Museen')).toHaveLength(1);
      expect(grouped.get('DJ Sets/Electronic')).toHaveLength(1);
    });

    it('should create optimized venue strategy', () => {
      const venues: VenueQuery[] = [
        // High priority (≥9) - individual queries
        { venueId: '1', venueName: 'Staatsoper', query: 'q1', priority: 10, categories: ['Live-Konzerte'] },
        { venueId: '2', venueName: 'Konzerthaus', query: 'q2', priority: 9, categories: ['Live-Konzerte'] },
        // Medium priority (7-8) - grouped queries
        { venueId: '3', venueName: 'Flex', query: 'q3', priority: 8, categories: ['DJ Sets/Electronic'] },
        { venueId: '4', venueName: 'Grelle Forelle', query: 'q4', priority: 7, categories: ['DJ Sets/Electronic'] },
        { venueId: '5', venueName: 'Arena', query: 'q5', priority: 7, categories: ['Live-Konzerte'] },
        // Low priority (≤6) - skipped
        { venueId: '6', venueName: 'Chelsea', query: 'q6', priority: 6, categories: ['Clubs/Discos'] }
      ];
      
      const strategy = service.createVenueStrategy(venues);
      
      expect(strategy.individualQueries).toHaveLength(2);
      expect(strategy.individualQueries[0].priority).toBeGreaterThanOrEqual(9);
      
      expect(strategy.groupedQueries.length).toBeGreaterThan(0);
      expect(strategy.groupedQueries.every(g => g.venueCount > 0)).toBe(true);
      
      expect(strategy.skippedVenues).toHaveLength(1);
      expect(strategy.skippedVenues[0].priority).toBeLessThan(7);
      
      expect(strategy.totalQueries).toBe(5); // 2 individual + 3 medium priority
      expect(strategy.estimatedApiCalls).toBeLessThan(strategy.totalQueries); // Should be fewer due to grouping
    });

    it('should build group prompt correctly', () => {
      const group = {
        category: 'DJ Sets/Electronic',
        venues: [
          { venueId: '1', venueName: 'Flex Wien', query: 'q1', priority: 8, categories: ['DJ Sets/Electronic'], website: 'https://flex.at' },
          { venueId: '2', venueName: 'Grelle Forelle', query: 'q2', priority: 7, categories: ['DJ Sets/Electronic'], website: 'https://grelleforelle.at' }
        ],
        groupPrompt: '',
        totalPriority: 15,
        venueCount: 2
      };
      
      const prompt = service.buildGroupPrompt(group, 'Wien', '2025-10-03');
      
      expect(prompt).toContain('DJ Sets/Electronic');
      expect(prompt).toContain('Flex Wien');
      expect(prompt).toContain('Grelle Forelle');
      expect(prompt).toContain('Wien');
      expect(prompt).toContain('2025-10-03');
      expect(prompt).toContain('https://flex.at');
      expect(prompt).toContain('https://grelleforelle.at');
    });

    it('should sort grouped queries by total priority', () => {
      const venues: VenueQuery[] = [
        { venueId: '1', venueName: 'V1', query: 'q1', priority: 8, categories: ['Cat A'] },
        { venueId: '2', venueName: 'V2', query: 'q2', priority: 7, categories: ['Cat A'] }, // Total: 15
        { venueId: '3', venueName: 'V3', query: 'q3', priority: 8, categories: ['Cat B'] },
        { venueId: '4', venueName: 'V4', query: 'q4', priority: 8, categories: ['Cat B'] },
        { venueId: '5', venueName: 'V5', query: 'q5', priority: 8, categories: ['Cat B'] } // Total: 24
      ];
      
      const strategy = service.createVenueStrategy(venues);
      
      expect(strategy.groupedQueries[0].totalPriority).toBeGreaterThanOrEqual(
        strategy.groupedQueries[strategy.groupedQueries.length - 1].totalPriority
      );
    });
  });
});
