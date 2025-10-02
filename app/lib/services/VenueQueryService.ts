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
}

export const venueQueryService = new VenueQueryService();
