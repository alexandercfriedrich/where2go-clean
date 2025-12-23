/**
 * Shared Category Mappings
 * Central source of truth for all category-related constants
 * Used across: metadataGenerator.ts, generate-seo-routes.ts, sitemap.ts
 */

// 12 SEO-Friendly Category Slugs (ordered)
export const CATEGORY_SLUGS = [
  'clubs-nachtleben',
  'live-konzerte',
  'klassik-oper',
  'theater-comedy',
  'museen-ausstellungen',
  'film-kino',
  'open-air-festivals',
  'kulinarik-maerkte',
  'sport-fitness',
  'bildung-workshops',
  'familie-kinder',
  'lgbtq',
] as const;

// Category slug to display name mapping
export const CATEGORY_NAMES: Record<string, string> = {
  'clubs-nachtleben': 'Clubs & Nachtleben',
  'live-konzerte': 'Live-Konzerte',
  'klassik-oper': 'Klassik & Oper',
  'theater-comedy': 'Theater & Comedy',
  'museen-ausstellungen': 'Museen & Ausstellungen',
  'film-kino': 'Film & Kino',
  'open-air-festivals': 'Open Air & Festivals',
  'kulinarik-maerkte': 'Kulinarik & Märkte',
  'sport-fitness': 'Sport & Fitness',
  'bildung-workshops': 'Bildung & Workshops',
  'familie-kinder': 'Familie & Kinder',
  'lgbtq': 'LGBTQ+',
};

// Date filter labels for German UI
export const DATE_LABELS: Record<string, string> = {
  'heute': 'heute',
  'morgen': 'morgen',
  'wochenende': 'dieses Wochenende',
};

// Date filter labels for page titles (more natural German)
export const DATE_FILTER_TITLE_LABELS: Record<string, string> = {
  'heute': 'heute',
  'morgen': 'morgen',
  'wochenende': 'dieses Wochenende',
};

// City name mappings
export const CITY_NAMES: Record<string, string> = {
  'wien': 'Wien',
  'ibiza': 'Ibiza',
};

// City coordinates for geo-specific metadata
export const CITY_COORDS: Record<string, { lat: string; lon: string }> = {
  'wien': { lat: '48.2082', lon: '16.3738' },
  'ibiza': { lat: '38.9054', lon: '1.4603' },
};

/**
 * Validate if category slug exists
 */
export function isValidCategory(category: string): boolean {
  return category in CATEGORY_NAMES;
}

/**
 * Validate if date filter is valid
 */
export function isValidDateFilter(date: string): boolean {
  return date in DATE_LABELS;
}

/**
 * Get category display name from slug
 */
export function getCategoryName(slug: string): string | undefined {
  return CATEGORY_NAMES[slug];
}

/**
 * Get date label for UI display
 */
export function getDateLabel(date: string): string | undefined {
  return DATE_LABELS[date];
}

/**
 * Get date label for page titles (natural German)
 */
export function getDateTitleLabel(date: string): string | undefined {
  return DATE_FILTER_TITLE_LABELS[date];
}
