/**
 * City Coordinates Lookup
 * Provides geographic coordinates for supported cities
 */

interface CityCoordinates {
  latitude: number;
  longitude: number;
}

const CITY_COORDINATES: Record<string, CityCoordinates> = {
  'Wien': { latitude: 48.2082, longitude: 16.3738 },
  'Vienna': { latitude: 48.2082, longitude: 16.3738 },
  'Berlin': { latitude: 52.5200, longitude: 13.4050 },
  'München': { latitude: 48.1351, longitude: 11.5820 },
  'Munich': { latitude: 48.1351, longitude: 11.5820 },
  'Hamburg': { latitude: 53.5511, longitude: 9.9937 },
  'Köln': { latitude: 50.9375, longitude: 6.9603 },
  'Cologne': { latitude: 50.9375, longitude: 6.9603 },
  'Frankfurt': { latitude: 50.1109, longitude: 8.6821 },
  'Stuttgart': { latitude: 48.7758, longitude: 9.1829 },
  'Düsseldorf': { latitude: 51.2277, longitude: 6.7735 },
  'Dortmund': { latitude: 51.5136, longitude: 7.4653 },
  'Essen': { latitude: 51.4556, longitude: 7.0116 },
  'Leipzig': { latitude: 51.3397, longitude: 12.3731 },
  'Bremen': { latitude: 53.0793, longitude: 8.8017 },
  'Dresden': { latitude: 51.0504, longitude: 13.7373 },
  'Hannover': { latitude: 52.3759, longitude: 9.7320 },
  'Nürnberg': { latitude: 49.4521, longitude: 11.0767 },
  'Nuremberg': { latitude: 49.4521, longitude: 11.0767 },
  'Salzburg': { latitude: 47.8095, longitude: 13.0550 },
  'Innsbruck': { latitude: 47.2692, longitude: 11.4041 },
  'Graz': { latitude: 47.0707, longitude: 15.4395 },
  'Linz': { latitude: 48.3069, longitude: 14.2858 },
  'Zürich': { latitude: 47.3769, longitude: 8.5417 },
  'Zurich': { latitude: 47.3769, longitude: 8.5417 },
  'Genf': { latitude: 46.2044, longitude: 6.1432 },
  'Geneva': { latitude: 46.2044, longitude: 6.1432 },
  'Basel': { latitude: 47.5596, longitude: 7.5886 },
  'Bern': { latitude: 46.9480, longitude: 7.4474 },
  'Lausanne': { latitude: 46.5197, longitude: 6.6323 },
  'Ibiza': { latitude: 38.9067, longitude: 1.4206 },
  'London': { latitude: 51.5074, longitude: -0.1278 },
  'Paris': { latitude: 48.8566, longitude: 2.3522 },
  'Amsterdam': { latitude: 52.3676, longitude: 4.9041 },
  'Barcelona': { latitude: 41.3851, longitude: 2.1734 },
  'Madrid': { latitude: 40.4168, longitude: -3.7038 },
  'Rome': { latitude: 41.9028, longitude: 12.4964 },
  'Milan': { latitude: 45.4642, longitude: 9.1900 },
  'Prague': { latitude: 50.0755, longitude: 14.4378 },
  'Budapest': { latitude: 47.4979, longitude: 19.0402 },
  'Warsaw': { latitude: 52.2297, longitude: 21.0122 },
};

/**
 * Get coordinates for a city
 * @param city - City name (case-insensitive)
 * @returns CityCoordinates or default to Vienna coordinates
 */
export function getCityCoordinates(city: string): CityCoordinates {
  // Try exact match first
  const coordinates = CITY_COORDINATES[city];
  if (coordinates) {
    return coordinates;
  }
  
  // Try case-insensitive match
  const cityLower = city.toLowerCase();
  const matchingKey = Object.keys(CITY_COORDINATES).find(
    key => key.toLowerCase() === cityLower
  );
  
  if (matchingKey) {
    return CITY_COORDINATES[matchingKey];
  }
  
  // Default to Vienna if city not found
  return CITY_COORDINATES['Wien'];
}

/**
 * Check if a city has coordinates defined
 * @param city - City name
 * @returns boolean indicating if city coordinates are available
 */
export function hasCityCoordinates(city: string): boolean {
  return Object.keys(CITY_COORDINATES).some(
    key => key.toLowerCase() === city.toLowerCase()
  );
}
