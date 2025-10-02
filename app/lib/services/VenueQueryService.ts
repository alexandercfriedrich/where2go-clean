import { HotCity, HotCityVenue } from '@/lib/types';
import { loadHotCities } from '@/lib/hotCityStore';

export interface VenueQuery {
  venueId: string;
  venueName: string;
  query: string;
  priority: number;
  categories: string[];
  website?: string;
  eventsUrl?: string;
}

export interface VenueGroup {
  category: string;
  venues: VenueQuery[];
  groupPrompt: string;
  totalPriority: number;
  venueCount: number;
}

export interface VenueStrategy {
  individualQueries: VenueQuery[]; // High priority venues (≥9)
  groupedQueries: VenueGroup[]; // Medium priority venues (7-8)
  skippedVenues: VenueQuery[]; // Low priority venues (≤6)
  totalQueries: number;
  estimatedApiCalls: number;
}

export class VenueQueryService {
  private cache = new Map<string, VenueQuery[]>();
  private cacheTTL = 3600000; // 1 hour

  async getActiveVenueQueries(city: string): Promise<VenueQuery[]> {
    const cacheKey = `venues:${city.toLowerCase()}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const hotCities = await loadHotCities();
      const hotCity = hotCities.find(hc => 
        hc.name.toLowerCase() === city.toLowerCase() && hc.isActive
      );

      if (!hotCity?.venues) {
        return [];
      }

      const venueQueries: VenueQuery[] = hotCity.venues
        .filter((venue: HotCityVenue) => 
          venue.isActive && 
          venue.aiQueryTemplate && 
          venue.aiQueryTemplate.trim().length > 10
        )
        .map((venue: HotCityVenue) => ({
          venueId: venue.id,
          venueName: venue.name,
          query: venue.aiQueryTemplate!,
          priority: venue.priority || 5,
          categories: venue.categories || [],
          website: venue.website,
          eventsUrl: venue.eventsUrl
        }))
        .sort((a, b) => b.priority - a.priority); // Sort by priority descending

      // Cache results
      this.cache.set(cacheKey, venueQueries);
      setTimeout(() => this.cache.delete(cacheKey), this.cacheTTL);

      return venueQueries;
    } catch (error) {
      console.error('[VenueQueryService] Error fetching venue queries:', error);
      return [];
    }
  }

  getVenuesByPriority(venues: VenueQuery[]): {
    high: VenueQuery[];
    medium: VenueQuery[];
    low: VenueQuery[];
  } {
    return {
      high: venues.filter(v => v.priority >= 8),
      medium: venues.filter(v => v.priority >= 6 && v.priority < 8),
      low: venues.filter(v => v.priority < 6)
    };
  }

  buildVenueSpecificPrompt(venue: VenueQuery, city: string, date: string): string {
    return `VENUE-SPECIFIC EVENT SEARCH: ${venue.query}

TARGET VENUE: ${venue.venueName}
LOCATION: ${city}
DATE: ${date}
CATEGORIES: ${venue.categories.join(', ')}

SEARCH INSTRUCTIONS:
- Focus specifically on events at "${venue.venueName}" in ${city}
- Check the venue's official website: ${venue.website}
- Look for events page: ${venue.eventsUrl}
- Include events happening on ${date}
- Search for recurring events at this venue
- Look for last-minute announcements
- Include both ticketed and free events

REQUIRED FIELDS: title, category, date, time, venue, price, website, address, description, bookingLink

RULES:
- Only include events actually at "${venue.venueName}"
- Verify event is happening on ${date}
- Return JSON array format only
- No explanatory text outside JSON structure
- If no events found, return empty array []`;
  }

  /**
   * Group venues by their primary category
   */
  groupVenuesByCategory(venues: VenueQuery[]): Map<string, VenueQuery[]> {
    const grouped = new Map<string, VenueQuery[]>();
    
    for (const venue of venues) {
      const primaryCategory = venue.categories[0] || 'General';
      const existing = grouped.get(primaryCategory) || [];
      existing.push(venue);
      grouped.set(primaryCategory, existing);
    }
    
    return grouped;
  }

  /**
   * Build a group prompt for multiple venues in the same category
   */
  buildGroupPrompt(group: VenueGroup, city: string, date: string): string {
    const venueNames = group.venues.map(v => v.venueName).join(', ');
    const websites = group.venues
      .filter(v => v.website)
      .map(v => `${v.venueName}: ${v.website}`)
      .join('\n  - ');
    
    return `CATEGORY-SPECIFIC VENUE GROUP SEARCH: ${group.category} Events

VENUES IN GROUP: ${venueNames}
LOCATION: ${city}
DATE: ${date}
CATEGORY: ${group.category}

SEARCH INSTRUCTIONS:
- Find events happening at ANY of these ${group.venueCount} venues:
  ${group.venues.map(v => `• ${v.venueName}`).join('\n  ')}
- Check official websites:
  - ${websites}
- Include events happening on ${date}
- Search for recurring events at these venues
- Look for last-minute announcements
- Include both ticketed and free events

REQUIRED FIELDS: title, category, date, time, venue, price, website, address, description, bookingLink

RULES:
- Only include events at the specified venues
- Verify event is happening on ${date}
- Return JSON array format only
- No explanatory text outside JSON structure
- If no events found, return empty array []`;
  }

  /**
   * Create an optimized venue query strategy
   * - High priority (≥9): Individual queries
   * - Medium priority (7-8): Grouped by category
   * - Low priority (≤6): Skipped
   */
  createVenueStrategy(venues: VenueQuery[]): VenueStrategy {
    // Split by priority
    const highPriority = venues.filter(v => v.priority >= 9);
    const mediumPriority = venues.filter(v => v.priority >= 7 && v.priority < 9);
    const lowPriority = venues.filter(v => v.priority < 7);

    // Group medium priority venues by category
    const groupedByCategory = this.groupVenuesByCategory(mediumPriority);
    const groupedQueries: VenueGroup[] = [];

    for (const [category, categoryVenues] of groupedByCategory.entries()) {
      const totalPriority = categoryVenues.reduce((sum, v) => sum + v.priority, 0);
      const group: VenueGroup = {
        category,
        venues: categoryVenues,
        groupPrompt: '', // Will be built when needed
        totalPriority,
        venueCount: categoryVenues.length
      };
      groupedQueries.push(group);
    }

    // Sort grouped queries by total priority descending
    groupedQueries.sort((a, b) => b.totalPriority - a.totalPriority);

    const estimatedApiCalls = highPriority.length + groupedQueries.length;

    return {
      individualQueries: highPriority,
      groupedQueries,
      skippedVenues: lowPriority,
      totalQueries: highPriority.length + mediumPriority.length,
      estimatedApiCalls
    };
  }
}

export const venueQueryService = new VenueQueryService();
