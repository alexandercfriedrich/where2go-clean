/**
 * Personalization Engine for Discovery Homepage
 * Calculates event scores based on user profile and context
 */

import { calculateDistance, Coordinates } from '../geo/distance';

export interface UserProfile {
  id?: string;
  location?: Coordinates;
  categoryAffinity?: Record<string, number>; // category -> weight (0-1)
  pricePreference?: 'free' | 'budget' | 'premium' | 'any';
  historicalEvents?: string[]; // event IDs
  favoriteVenues?: string[]; // venue IDs
}

export interface EventCandidate {
  id: string;
  title: string;
  category: string;
  start_date_time: string;
  latitude?: number;
  longitude?: number;
  is_free?: boolean;
  price_min?: number;
  price_max?: number;
  popularity_score?: number;
  view_count?: number;
  is_featured?: boolean;
  venue_id?: string;
  custom_venue_name?: string;
}

export interface ScoredEvent extends EventCandidate {
  score: number;
  scoreBreakdown?: {
    location: number;
    time: number;
    category: number;
    popularity: number;
    price: number;
    trending: number;
  };
}

/**
 * Get personalized event feed
 * @param events Candidate events
 * @param userProfile User profile (optional for anonymous users)
 * @param userLocation User's current location (optional)
 * @returns Sorted array of scored events
 */
export function getPersonalizedFeed(
  events: EventCandidate[],
  userProfile?: UserProfile,
  userLocation?: Coordinates
): ScoredEvent[] {
  const scoredEvents = events.map((event) => {
    const score = calculateEventScore(event, userProfile, userLocation);
    return {
      ...event,
      score,
    };
  });

  // Sort by score descending
  return scoredEvents.sort((a, b) => b.score - a.score);
}

/**
 * Calculate comprehensive score for an event
 * @param event Event to score
 * @param userProfile User profile (optional)
 * @param userLocation User location (optional)
 * @returns Score between 0-100
 */
export function calculateEventScore(
  event: EventCandidate,
  userProfile?: UserProfile,
  userLocation?: Coordinates
): number {
  const weights = {
    location: 0.25,
    time: 0.15,
    category: 0.20,
    popularity: 0.20,
    price: 0.10,
    trending: 0.10,
  };

  const scores = {
    location: calculateLocationScore(event, userLocation || userProfile?.location),
    time: calculateTimeScore(event),
    category: calculateCategoryScore(event, userProfile),
    popularity: calculatePopularityScore(event),
    price: calculatePriceScore(event, userProfile),
    trending: calculateTrendingScore(event),
  };

  // Calculate weighted sum
  const totalScore =
    scores.location * weights.location +
    scores.time * weights.time +
    scores.category * weights.category +
    scores.popularity * weights.popularity +
    scores.price * weights.price +
    scores.trending * weights.trending;

  return Math.round(totalScore);
}

/**
 * Location proximity score (0-100)
 * Closer events score higher
 */
function calculateLocationScore(event: EventCandidate, userLocation?: Coordinates): number {
  if (!userLocation || !event.latitude || !event.longitude) {
    return 50; // Neutral score if location data missing
  }

  const eventLocation: Coordinates = {
    latitude: event.latitude,
    longitude: event.longitude,
  };

  const distance = calculateDistance(userLocation, eventLocation);

  // Score decreases with distance
  // 0km = 100, 1km = 90, 5km = 70, 10km = 50, 20km+ = 20
  if (distance <= 1) return 100;
  if (distance <= 5) return 90 - (distance - 1) * 5;
  if (distance <= 10) return 70 - (distance - 5) * 4;
  if (distance <= 20) return 50 - (distance - 10) * 3;
  return 20;
}

/**
 * Time relevance score (0-100)
 * Events happening soon score higher
 */
function calculateTimeScore(event: EventCandidate): number {
  const now = new Date();
  const eventDate = new Date(event.start_date_time);
  const diffMs = eventDate.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  // Events in the past get 0
  if (diffDays < 0) return 0;

  // Today = 100, This week = 80, This month = 60, Further = 40
  if (diffDays < 1) return 100;
  if (diffDays < 7) return 80;
  if (diffDays < 30) return 60;
  return 40;
}

/**
 * Category affinity score (0-100)
 * Based on user's category preferences
 */
function calculateCategoryScore(event: EventCandidate, userProfile?: UserProfile): number {
  if (!userProfile?.categoryAffinity) {
    return 50; // Neutral for anonymous users
  }

  const category = event.category.toLowerCase();
  const affinity = userProfile.categoryAffinity[category];

  if (affinity !== undefined) {
    return Math.round(affinity * 100);
  }

  return 50; // Default for unknown categories
}

/**
 * Popularity score (0-100)
 * Based on view count and popularity metrics
 */
function calculatePopularityScore(event: EventCandidate): number {
  let score = 50; // Base score

  // Boost for featured events
  if (event.is_featured) {
    score += 20;
  }

  // Boost based on popularity_score if available
  if (event.popularity_score) {
    score += Math.min(event.popularity_score / 10, 20);
  }

  // Boost based on view count (diminishing returns)
  if (event.view_count) {
    score += Math.min(Math.log10(event.view_count + 1) * 10, 20);
  }

  return Math.min(Math.round(score), 100);
}

/**
 * Price preference score (0-100)
 * Matches event price with user preference
 */
function calculatePriceScore(event: EventCandidate, userProfile?: UserProfile): number {
  if (!userProfile?.pricePreference || userProfile.pricePreference === 'any') {
    return 50; // Neutral
  }

  const isFree = event.is_free || event.price_min === 0;
  const avgPrice = event.price_min && event.price_max 
    ? (event.price_min + event.price_max) / 2 
    : event.price_min || 0;

  switch (userProfile.pricePreference) {
    case 'free':
      return isFree ? 100 : 20;
    case 'budget':
      if (isFree) return 80;
      if (avgPrice <= 20) return 100;
      if (avgPrice <= 50) return 60;
      return 30;
    case 'premium':
      if (avgPrice >= 50) return 100;
      if (avgPrice >= 20) return 70;
      return 40;
    default:
      return 50;
  }
}

/**
 * Trending score (0-100)
 * Events with recent view spikes score higher
 */
function calculateTrendingScore(event: EventCandidate): number {
  // Simplified: Use view_count as proxy
  // In production, you'd compare recent views vs historical average
  if (!event.view_count) return 50;

  // High view count suggests trending
  if (event.view_count > 1000) return 90;
  if (event.view_count > 500) return 75;
  if (event.view_count > 100) return 60;
  return 50;
}

/**
 * Helper to get difference in days between two dates
 */
export function differenceInDays(date1: Date, date2: Date): number {
  const diffMs = Math.abs(date1.getTime() - date2.getTime());
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}
