/**
 * Geolocation utilities for distance calculations
 * Uses Haversine formula for accurate distance calculation
 */

export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param coord1 First coordinate
 * @param coord2 Second coordinate
 * @returns Distance in kilometers
 */
export function calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(coord2.latitude - coord1.latitude);
  const dLon = toRadians(coord2.longitude - coord1.longitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(coord1.latitude)) *
      Math.cos(toRadians(coord2.latitude)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Get user's current location via browser geolocation API
 * @returns Promise with coordinates or null if denied/unavailable
 */
export async function getCurrentLocation(): Promise<Coordinates | null> {
  if (!navigator.geolocation) {
    console.warn('Geolocation is not supported by this browser');
    return null;
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        console.warn('Error getting location:', error.message);
        resolve(null);
      },
      {
        timeout: 10000,
        maximumAge: 300000, // 5 minutes
        enableHighAccuracy: false,
      }
    );
  });
}

/**
 * Get default coordinates for a city
 * Fallback when user location is unavailable
 */
export function getCityCoordinates(city: string): Coordinates {
  const cityCoords: Record<string, Coordinates> = {
    wien: { latitude: 48.2082, longitude: 16.3738 },
    vienna: { latitude: 48.2082, longitude: 16.3738 },
    berlin: { latitude: 52.52, longitude: 13.405 },
    munich: { latitude: 48.1351, longitude: 11.582 },
    münchen: { latitude: 48.1351, longitude: 11.582 },
    salzburg: { latitude: 47.8095, longitude: 13.055 },
    linz: { latitude: 48.3069, longitude: 14.2858 },
    graz: { latitude: 47.0707, longitude: 15.4395 },
    innsbruck: { latitude: 47.2692, longitude: 11.4041 },
  };

  const normalized = city.toLowerCase();
  return cityCoords[normalized] || cityCoords.wien; // Default to Wien
}

/**
 * Format distance for display
 * @param km Distance in kilometers
 * @returns Formatted string
 */
export function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)}m`;
  }
  if (km < 10) {
    return `${km.toFixed(1)}km`;
  }
  return `${Math.round(km)}km`;
}
