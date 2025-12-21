import { Metadata } from 'next';

/**
 * SEO Metadata Generator for City Pages with Date & Category Filters
 * Generates unique, optimized metadata for each route combination
 * 
 * Routes supported:
 * - /wien
 * - /wien/heute
 * - /wien/clubs-nachtleben
 * - /wien/clubs-nachtleben/heute
 * - /ibiza/live-konzerte/morgen
 * etc.
 */

// 12 Main Categories with SEO-friendly slugs
const CATEGORY_NAMES: Record<string, string> = {
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

const DATE_LABELS: Record<string, string> = {
  'heute': 'heute',
  'morgen': 'morgen',
  'wochenende': 'dieses Wochenende',
};

const CITY_NAMES: Record<string, string> = {
  'wien': 'Wien',
  'ibiza': 'Ibiza',
};

const CITY_COORDS: Record<string, { lat: string; lon: string }> = {
  'wien': { lat: '48.2082', lon: '16.3738' },
  'ibiza': { lat: '38.9054', lon: '1.4603' },
};

export interface MetadataParams {
  city: string;
  date?: string;
  category?: string;
}

/**
 * Generate optimized SEO metadata for city + optional date + optional category
 * 
 * @example
 * generateCityMetadata({ city: 'wien', date: 'heute', category: 'clubs-nachtleben' })
 * Returns metadata for: /wien/clubs-nachtleben/heute
 */
export function generateCityMetadata(params: MetadataParams): Metadata {
  const { city, date, category } = params;

  const cityName = CITY_NAMES[city] || capitalize(city);
  const dateLabel = date ? DATE_LABELS[date] : null;
  const categoryLabel = category ? CATEGORY_NAMES[category] : null;
  const canonical = buildCanonicalURL(city, date, category);

  // Build dynamic Title
  let title: string;
  let description: string;
  let keywords: string[] = [
    `events ${cityName.toLowerCase()}`,
    `${cityName} veranstaltungen`,
    `konzerte ${cityName.toLowerCase()}`,
  ];

  // Title & Description Logic
  if (categoryLabel && dateLabel) {
    // Full: Category + Date
    title = `${categoryLabel} in ${cityName} ${dateLabel} | Where2Go`;
    description = `${categoryLabel} in ${cityName} ${dateLabel}. Live und aktuell auf Where2Go entdecken!`;
    keywords.push(`${categoryLabel.toLowerCase()} ${cityName.toLowerCase()} ${dateLabel}`);
    keywords.push(`${categoryLabel.toLowerCase()} ${dateLabel}`);
  } else if (categoryLabel && !dateLabel) {
    // Category only
    title = `${categoryLabel} in ${cityName} | Where2Go`;
    description = `Entdecke die besten ${categoryLabel.toLowerCase()} in ${cityName}. Live-Events, Veranstaltungen und mehr auf Where2Go.`;
    keywords.push(`${categoryLabel.toLowerCase()} ${cityName.toLowerCase()}`);
  } else if (!categoryLabel && dateLabel) {
    // Date only
    title = `Events in ${cityName} ${dateLabel} | Where2Go`;
    description = `Alle Events in ${cityName} ${dateLabel}. Konzerte, Theater, Ausstellungen und mehr. Entdecke, was los ist!`;
    keywords.push(`events ${cityName.toLowerCase()} ${dateLabel}`);
  } else {
    // City only
    title = `Events in ${cityName} | Where2Go - Konzerte & Veranstaltungen`;
    description = `Entdecke aktuelle Events in ${cityName}. Konzerte, Theater, Ausstellungen, Partys und mehr auf Where2Go.`;
  }

  return {
    title,
    description,
    keywords,
    canonical,
    alternates: {
      languages: {
        'de-AT': canonical,
      },
    },
    openGraph: {
      title,
      description,
      url: canonical,
      type: 'website',
      locale: 'de_AT',
      siteName: 'Where2Go',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
      },
    },
  };
}

/**
 * Build canonical URL for the route
 */
function buildCanonicalURL(city: string, date?: string, category?: string): string {
  let url = `https://www.where2go.at/${city.toLowerCase()}`;
  if (category) {
    url += `/${category}`;
  }
  if (date) {
    url += `/${date}`;
  }
  return url;
}

/**
 * Capitalize first letter
 */
function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Validate if category exists
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
 * Get all valid categories
 */
export function getAllCategories(): string[] {
  return Object.keys(CATEGORY_NAMES);
}

/**
 * Get all valid date filters
 */
export function getAllDateFilters(): string[] {
  return Object.keys(DATE_LABELS);
}

/**
 * Get category display name
 */
export function getCategoryName(slug: string): string {
  return CATEGORY_NAMES[slug] || slug;
}

/**
 * Get date label
 */
export function getDateLabel(slug: string): string {
  return DATE_LABELS[slug] || slug;
}
