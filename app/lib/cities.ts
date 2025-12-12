/**
 * Valid cities for the Where2Go platform
 * Single source of truth for city validation and display
 */

export interface CityOption {
  value: string;
  label: string;
}

/**
 * Valid city values (lowercase, for database/API use)
 */
export const VALID_CITY_VALUES = ['wien', 'berlin', 'linz', 'ibiza'] as const;

/**
 * Valid cities with display labels (for UI dropdowns)
 */
export const VALID_CITIES: CityOption[] = [
  { value: 'wien', label: 'Wien' },
  { value: 'berlin', label: 'Berlin' },
  { value: 'linz', label: 'Linz' },
  { value: 'ibiza', label: 'Ibiza' },
];

/**
 * Check if a city value is valid
 */
export function isValidCity(city: string): boolean {
  const lowerCity = city.toLowerCase();
  return VALID_CITY_VALUES.includes(lowerCity as typeof VALID_CITY_VALUES[number]);
}
