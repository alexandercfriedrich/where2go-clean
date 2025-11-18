/**
 * Personalization module exports
 */

export {
  getPersonalizedFeed,
  calculateEventScore,
  differenceInDays,
  type UserProfile,
  type EventCandidate,
  type ScoredEvent,
} from './recommendations';

export { calculateDistance, getCurrentLocation, getCityCoordinates, formatDistance } from '../geo/distance';

/**
 * Get or create anonymous user profile
 * Stores in localStorage for consistency across sessions
 */
export function getUserProfile(): any {
  if (typeof window === 'undefined') return null;

  const stored = localStorage.getItem('user_profile');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Update user profile in localStorage
 */
export function updateUserProfile(profile: any): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('user_profile', JSON.stringify(profile));
}

/**
 * Fetch candidate events from Supabase
 * This is a stub - actual implementation would query Supabase
 */
export async function fetchCandidateEvents(params: {
  city: string;
  limit?: number;
  startDate?: string;
  endDate?: string;
}): Promise<any[]> {
  // In actual implementation, this would query Supabase
  // For now, return empty array
  console.log('fetchCandidateEvents called with params:', params);
  return [];
}
