// Event category normalization and validation utilities

import { getMainCategories, getMainCategoryForSubcategory } from '../categories';

/**
 * Token map for common single-word/variant inputs to canonical categories
 */
export const NORMALIZATION_TOKEN_MAP: Record<string, string> = {
  // DJ Sets/Electronic variants
  'techno': 'DJ Sets/Electronic',
  'edm': 'DJ Sets/Electronic',
  'house': 'DJ Sets/Electronic',
  'electronic': 'DJ Sets/Electronic',
  'trance': 'DJ Sets/Electronic',
  'minimal': 'DJ Sets/Electronic',
  'deep': 'DJ Sets/Electronic',
  'hardstyle': 'DJ Sets/Electronic',
  'hardcore': 'DJ Sets/Electronic',
  'breakbeat': 'DJ Sets/Electronic',
  
  // Open Air/Festival variants
  'festival': 'Open Air',
  'festivals': 'Open Air',
  'openair': 'Open Air',
  'open-air': 'Open Air',
  
  // LGBTQ+ variants
  'queer': 'LGBTQ+',
  'pride': 'LGBTQ+',
  'gay': 'LGBTQ+',
  'lesbian': 'LGBTQ+',
  'trans': 'LGBTQ+',
  'transgender': 'LGBTQ+',
  'lgbt': 'LGBTQ+',
  'lgbtq': 'LGBTQ+',
  
  // Clubs/Discos variants
  'after-hour': 'Clubs/Discos',
  'afterhours': 'Clubs/Discos',
  'afterhour': 'Clubs/Discos',
  'rave': 'Clubs/Discos',
  'raves': 'Clubs/Discos',
  'club': 'Clubs/Discos',
  'clubs': 'Clubs/Discos',
  'disco': 'Clubs/Discos',
  'discos': 'Clubs/Discos',
  'nightclub': 'Clubs/Discos',
  'nightclubs': 'Clubs/Discos',
  'party': 'Clubs/Discos',
  'parties': 'Clubs/Discos',
  
  // Food/Culinary variants
  'wein': 'Food/Culinary',
  'wine': 'Food/Culinary',
  'beer': 'Food/Culinary',
  'bier': 'Food/Culinary',
  'cocktail': 'Food/Culinary',
  'cocktails': 'Food/Culinary',
  'food': 'Food/Culinary',
  'essen': 'Food/Culinary',
  'culinary': 'Food/Culinary',
  'kulinarisch': 'Food/Culinary',
  
  // Bildung/Lernen variants
  'workshop': 'Bildung/Lernen',
  'workshops': 'Bildung/Lernen',
  'seminar': 'Bildung/Lernen',
  'seminare': 'Bildung/Lernen',
  'seminars': 'Bildung/Lernen',
  'hackathon': 'Bildung/Lernen',
  'kurs': 'Bildung/Lernen',
  'kurse': 'Bildung/Lernen',
  'course': 'Bildung/Lernen',
  'courses': 'Bildung/Lernen',
  'learning': 'Bildung/Lernen',
  'lernen': 'Bildung/Lernen',
  'bildung': 'Bildung/Lernen',
  'education': 'Bildung/Lernen',
  
  // Networking/Business variants
  'startup': 'Networking/Business',
  'startups': 'Networking/Business',
  'business': 'Networking/Business',
  'networking': 'Networking/Business',
  'meetup': 'Networking/Business',
  'meetups': 'Networking/Business',
  
  // Natur/Outdoor variants
  'hiking': 'Natur/Outdoor',
  'wandern': 'Natur/Outdoor',
  'nature': 'Natur/Outdoor',
  'natur': 'Natur/Outdoor',
  'outdoor': 'Natur/Outdoor',
  'walking': 'Natur/Outdoor',
  'spazieren': 'Natur/Outdoor',
  
  // Kultur/Traditionen variants
  'kultur': 'Kultur/Traditionen',
  'culture': 'Kultur/Traditionen',
  'tradition': 'Kultur/Traditionen',
  'traditional': 'Kultur/Traditionen',
  'traditionen': 'Kultur/Traditionen',
  'heritage': 'Kultur/Traditionen',
  
  // Märkte/Shopping variants
  'markt': 'Märkte/Shopping',
  'market': 'Märkte/Shopping',
  'märkte': 'Märkte/Shopping',
  'markets': 'Märkte/Shopping',
  'shopping': 'Märkte/Shopping',
  'einkaufen': 'Märkte/Shopping',
  'flohmarkt': 'Märkte/Shopping',
  'fleamarket': 'Märkte/Shopping',
  'vintage': 'Märkte/Shopping',
  
  // Soziales/Community variants
  'sozial': 'Soziales/Community',
  'social': 'Soziales/Community',
  'community': 'Soziales/Community',
  'volunteer': 'Soziales/Community',
  'volunteers': 'Soziales/Community',
  'volunteering': 'Soziales/Community',
  'charity': 'Soziales/Community',
  'wohltätigkeit': 'Soziales/Community',
  'gemeinnützig': 'Soziales/Community',
  
  // Live-Konzerte variants
  'konzert': 'Live-Konzerte',
  'konzerte': 'Live-Konzerte',
  'concert': 'Live-Konzerte',
  'concerts': 'Live-Konzerte',
  'live': 'Live-Konzerte',
  'music': 'Live-Konzerte',
  'musik': 'Live-Konzerte',
  'rock': 'Live-Konzerte',
  'pop': 'Live-Konzerte',
  'jazz': 'Live-Konzerte',
  'classical': 'Live-Konzerte',
  'klassik': 'Live-Konzerte',
  
  // Theater/Performance variants
  'theater': 'Theater/Performance',
  'theatre': 'Theater/Performance',
  'performance': 'Theater/Performance',
  'schauspiel': 'Theater/Performance',
  'drama': 'Theater/Performance',
  'musical': 'Theater/Performance',
  'musicals': 'Theater/Performance',
  'opera': 'Theater/Performance',
  'oper': 'Theater/Performance',
  
  // Comedy/Kabarett variants
  'comedy': 'Comedy/Kabarett',
  'kabarett': 'Comedy/Kabarett',
  'standup': 'Comedy/Kabarett',
  'stand-up': 'Comedy/Kabarett',
  
  // Kunst/Design variants
  'kunst': 'Kunst/Design',
  'art': 'Kunst/Design',
  'design': 'Kunst/Design',
  'gallery': 'Kunst/Design',
  'galerie': 'Kunst/Design',
  'galerien': 'Kunst/Design',
  'galleries': 'Kunst/Design',
  
  // Museen variants
  'museum': 'Museen',
  'museen': 'Museen',
  'museums': 'Museen',
  'exhibition': 'Museen',
  'ausstellung': 'Museen',
  'ausstellungen': 'Museen',
  'exhibitions': 'Museen',
  
  // Sport variants
  'sport': 'Sport',
  'sports': 'Sport',
  'fitness': 'Sport',
  'gym': 'Sport',
  'training': 'Sport',
  'football': 'Sport',
  'fußball': 'Sport',
  'basketball': 'Sport',
  'tennis': 'Sport',
  'yoga': 'Sport',
  'pilates': 'Sport',
  
  // Familien/Kids variants
  'familie': 'Familien/Kids',
  'family': 'Familien/Kids',
  'kids': 'Familien/Kids',
  'kinder': 'Familien/Kids',
  'children': 'Familien/Kids',
  
  // Film variants
  'film': 'Film',
  'films': 'Film',
  'movie': 'Film',
  'movies': 'Film',
  'cinema': 'Film',
  'kino': 'Film',
  
  // Wellness/Spirituell variants
  'wellness': 'Wellness/Spirituell',
  'spiritual': 'Wellness/Spirituell',
  'spirituell': 'Wellness/Spirituell',
  'meditation': 'Wellness/Spirituell',
  'spa': 'Wellness/Spirituell',
  'mindfulness': 'Wellness/Spirituell',
  'achtsamkeit': 'Wellness/Spirituell'
};

/**
 * Normalizes a category string using the enhanced logic order
 */
export function normalizeCategory(category: string): string {
  if (!category || typeof category !== 'string') {
    return category;
  }

  const trimmed = category.trim();
  if (!trimmed) {
    return category;
  }

  const mainCategories = getMainCategories();
  
  // a) Direct main category exact match
  if (mainCategories.includes(trimmed)) {
    return trimmed;
  }
  
  // b) Token map (lowercased)
  const lowercased = trimmed.toLowerCase();
  if (NORMALIZATION_TOKEN_MAP[lowercased]) {
    return NORMALIZATION_TOKEN_MAP[lowercased];
  }
  
  // c) Exact subcategory scan (current behavior from categories.ts)
  const mainCategoryFromSub = getMainCategoryForSubcategory(trimmed);
  if (mainCategoryFromSub) {
    return mainCategoryFromSub;
  }
  
  // d) Fallback: attempt lowercase equality with main categories
  const lowercaseMatch = mainCategories.find(cat => cat.toLowerCase() === lowercased);
  if (lowercaseMatch) {
    return lowercaseMatch;
  }
  
  // e) Else return original input (will be filtered later if invalid)
  return trimmed;
}

/**
 * Checks if a category is valid (exists in main categories)
 */
export function isValidCategory(category: string): boolean {
  if (!category || typeof category !== 'string') {
    return false;
  }
  
  const mainCategories = getMainCategories();
  return mainCategories.includes(category.trim());
}

/**
 * Validates and normalizes an array of events
 * Keeps validateAndNormalizeEvents unchanged except it benefits from improved normalizeCategory()
 */
export function validateAndNormalizeEvents(events: any[]): any[] {
  if (!Array.isArray(events)) {
    return [];
  }
  
  return events.filter(event => {
    if (!event || typeof event !== 'object') {
      return false;
    }
    
    // Normalize the category
    if (event.category) {
      event.category = normalizeCategory(event.category);
    }
    
    // Only keep events with valid categories
    return event.category && isValidCategory(event.category);
  });
}