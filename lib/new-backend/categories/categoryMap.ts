/**
 * Category mapping configuration for the new backend system.
 * This module defines the canonical category names and their aliases.
 * 
 * @fileoverview Category mapping definitions for normalization and AI prompt generation.
 */

/**
 * Main categories used for AI API calls and cache organization.
 * These are the canonical category names that the system recognizes.
 */
export const MAIN_CATEGORIES = [
  'DJ Sets/Electronic',
  'Clubs/Discos',
  'Live-Konzerte',
  'Open Air',
  'Museen',
  'LGBTQ+',
  'Comedy/Kabarett',
  'Theater/Performance',
  'Film',
  'Food/Culinary',
  'Sport',
  'Familien/Kids',
  'Kunst/Design',
  'Wellness/Spirituell',
  'Networking/Business',
  'Natur/Outdoor',
  'Kultur/Traditionen',
  'Märkte/Shopping'
] as const;

/**
 * Type for main category names.
 */
export type MainCategory = typeof MAIN_CATEGORIES[number];

/**
 * Category alias mapping for normalization.
 * Maps various input formats to canonical category names.
 */
export const CATEGORY_ALIASES: Record<string, MainCategory> = {
  // DJ Sets/Electronic variations
  'dj sets/electronic': 'DJ Sets/Electronic',
  'dj set/electronic': 'DJ Sets/Electronic',
  'dj/electronic': 'DJ Sets/Electronic',
  'electronic': 'DJ Sets/Electronic',
  'dj sets': 'DJ Sets/Electronic',
  'dj set': 'DJ Sets/Electronic',
  'dj': 'DJ Sets/Electronic',
  'electronic music': 'DJ Sets/Electronic',
  'techno': 'DJ Sets/Electronic',
  'house': 'DJ Sets/Electronic',
  'trance': 'DJ Sets/Electronic',
  
  // Clubs/Discos variations
  'clubs/discos': 'Clubs/Discos',
  'clubs/disco': 'Clubs/Discos',
  'club/disco': 'Clubs/Discos',
  'club/discos': 'Clubs/Discos',
  'clubs': 'Clubs/Discos',
  'discos': 'Clubs/Discos',
  'club': 'Clubs/Discos',
  'disco': 'Clubs/Discos',
  'nightclub': 'Clubs/Discos',
  'nightclubs': 'Clubs/Discos',
  'party': 'Clubs/Discos',
  'parties': 'Clubs/Discos',
  
  // Live-Konzerte variations
  'live-konzerte': 'Live-Konzerte',
  'live konzerte': 'Live-Konzerte',
  'konzerte': 'Live-Konzerte',
  'konzert': 'Live-Konzerte',
  'live music': 'Live-Konzerte',
  'concerts': 'Live-Konzerte',
  'concert': 'Live-Konzerte',
  'musik': 'Live-Konzerte',
  'music': 'Live-Konzerte',
  'band': 'Live-Konzerte',
  'bands': 'Live-Konzerte',
  
  // Open Air variations
  'open air': 'Open Air',
  'open-air': 'Open Air',
  'openair': 'Open Air',
  'outdoor': 'Open Air',
  'festival': 'Open Air',
  'festivals': 'Open Air',
  'outdoor events': 'Open Air',
  'outdoor music': 'Open Air',
  
  // Museen variations
  'museen': 'Museen',
  'museum': 'Museen',
  'museums': 'Museen',
  'ausstellung': 'Museen',
  'ausstellungen': 'Museen',
  'exhibition': 'Museen',
  'exhibitions': 'Museen',
  'galerie': 'Museen',
  'galerien': 'Museen',
  'gallery': 'Museen',
  'galleries': 'Museen',
  
  // LGBTQ+ variations
  'lgbtq+': 'LGBTQ+',
  'lgbtq': 'LGBTQ+',
  'lgbt': 'LGBTQ+',
  'gay': 'LGBTQ+',
  'lesbian': 'LGBTQ+',
  'queer': 'LGBTQ+',
  'pride': 'LGBTQ+',
  
  // Comedy/Kabarett variations
  'comedy/kabarett': 'Comedy/Kabarett',
  'comedy': 'Comedy/Kabarett',
  'kabarett': 'Comedy/Kabarett',
  'cabaret': 'Comedy/Kabarett',
  'stand-up': 'Comedy/Kabarett',
  'standup': 'Comedy/Kabarett',
  'humor': 'Comedy/Kabarett',
  
  // Theater/Performance variations
  'theater/performance': 'Theater/Performance',
  'theater': 'Theater/Performance',
  'theatre': 'Theater/Performance',
  'performance': 'Theater/Performance',
  'drama': 'Theater/Performance',
  'musical': 'Theater/Performance',
  'musicals': 'Theater/Performance',
  'opera': 'Theater/Performance',
  'ballet': 'Theater/Performance',
  'dance': 'Theater/Performance',
  'tanz': 'Theater/Performance',
  
  // Film variations
  'film': 'Film',
  'films': 'Film',
  'kino': 'Film',
  'cinema': 'Film',
  'movie': 'Film',
  'movies': 'Film',
  'screening': 'Film',
  'screenings': 'Film',
  
  // Food/Culinary variations
  'food/culinary': 'Food/Culinary',
  'food': 'Food/Culinary',
  'culinary': 'Food/Culinary',
  'restaurant': 'Food/Culinary',
  'restaurants': 'Food/Culinary',
  'dining': 'Food/Culinary',
  'gastronomy': 'Food/Culinary',
  'gastronomie': 'Food/Culinary',
  'wine': 'Food/Culinary',
  'beer': 'Food/Culinary',
  'cooking': 'Food/Culinary',
  'essen': 'Food/Culinary',
  
  // Sport variations
  'sport': 'Sport',
  'sports': 'Sport',
  'fitness': 'Sport',
  'exercise': 'Sport',
  'workout': 'Sport',
  'gym': 'Sport',
  'running': 'Sport',
  'cycling': 'Sport',
  'football': 'Sport',
  'basketball': 'Sport',
  
  // Familien/Kids variations
  'familien/kids': 'Familien/Kids',
  'familie': 'Familien/Kids',
  'familien': 'Familien/Kids',
  'family': 'Familien/Kids',
  'kids': 'Familien/Kids',
  'children': 'Familien/Kids',
  'kinder': 'Familien/Kids',
  'child': 'Familien/Kids',
  
  // Kunst/Design variations
  'kunst/design': 'Kunst/Design',
  'kunst': 'Kunst/Design',
  'design': 'Kunst/Design',
  'art': 'Kunst/Design',
  'arts': 'Kunst/Design',
  'creative': 'Kunst/Design',
  'artistic': 'Kunst/Design',
  
  // Wellness/Spirituell variations
  'wellness/spirituell': 'Wellness/Spirituell',
  'wellness': 'Wellness/Spirituell',
  'spiritual': 'Wellness/Spirituell',
  'spirituell': 'Wellness/Spirituell',
  'meditation': 'Wellness/Spirituell',
  'yoga': 'Wellness/Spirituell',
  'mindfulness': 'Wellness/Spirituell',
  'healing': 'Wellness/Spirituell',
  
  // Networking/Business variations
  'networking/business': 'Networking/Business',
  'networking': 'Networking/Business',
  'business': 'Networking/Business',
  'professional': 'Networking/Business',
  'conference': 'Networking/Business',
  'conferences': 'Networking/Business',
  'workshop': 'Networking/Business',
  'workshops': 'Networking/Business',
  'seminar': 'Networking/Business',
  'seminars': 'Networking/Business',
  
  // Natur/Outdoor variations
  'natur/outdoor': 'Natur/Outdoor',
  'natur': 'Natur/Outdoor',
  'nature': 'Natur/Outdoor',
  'hiking': 'Natur/Outdoor',
  'wandern': 'Natur/Outdoor',
  'park': 'Natur/Outdoor',
  'parks': 'Natur/Outdoor',
  'garden': 'Natur/Outdoor',
  'gardens': 'Natur/Outdoor',
  
  // Kultur/Traditionen variations
  'kultur/traditionen': 'Kultur/Traditionen',
  'kultur': 'Kultur/Traditionen',
  'culture': 'Kultur/Traditionen',
  'traditional': 'Kultur/Traditionen',
  'traditionen': 'Kultur/Traditionen',
  'traditions': 'Kultur/Traditionen',
  'heritage': 'Kultur/Traditionen',
  'history': 'Kultur/Traditionen',
  'geschichte': 'Kultur/Traditionen',
  
  // Märkte/Shopping variations
  'märkte/shopping': 'Märkte/Shopping',
  'märkte': 'Märkte/Shopping',
  'markt': 'Märkte/Shopping',
  'market': 'Märkte/Shopping',
  'markets': 'Märkte/Shopping',
  'shopping': 'Märkte/Shopping',
  'retail': 'Märkte/Shopping',
  'store': 'Märkte/Shopping',
  'stores': 'Märkte/Shopping'
};

/**
 * Fuzzy matching threshold for Levenshtein distance.
 * Categories with distance <= this threshold will be considered matches.
 */
export const FUZZY_MATCH_THRESHOLD = 1;

/**
 * Check if a string is a recognized main category.
 */
export function isMainCategory(category: string): category is MainCategory {
  return MAIN_CATEGORIES.includes(category as MainCategory);
}

/**
 * Get all category aliases for a given main category.
 */
export function getAliasesForCategory(mainCategory: MainCategory): string[] {
  return Object.entries(CATEGORY_ALIASES)
    .filter(([_, mapped]) => mapped === mainCategory)
    .map(([alias, _]) => alias);
}