/**
 * Venue Fallback Images
 * 
 * This file contains fallback image paths for venues that have scrapers.
 * When an event has no image, the system will use the venue's fallback image.
 * 
 * IMPORTANT: Images are stored locally in /public/venues/ directory.
 * This ensures fast loading from our CDN without external dependencies.
 * 
 * To add a new venue image:
 * 1. Download the venue logo/image from their official website
 * 2. Save it to /public/venues/{venue-key}.png (or .jpg/.webp)
 * 3. Add the entry to VENUE_FALLBACK_IMAGES below
 */

export interface VenueFallbackConfig {
  /** Official venue name as used in the scrapers */
  name: string;
  /** Alternative names or aliases for matching */
  aliases: string[];
  /** Local path to the fallback image (stored in /public/venues/) */
  imageUrl: string;
  /** Original source website for attribution */
  source: string;
}

/**
 * Minimum length for partial matching to avoid false positives
 * Venue names shorter than this will only match exactly
 */
const MIN_PARTIAL_MATCH_LENGTH = 4;

/**
 * Venue fallback image configurations
 * Keys are lowercase, hyphenated venue identifiers matching scraper configs
 * 
 * Images are stored locally in /public/venues/ for:
 * - Fast loading from CDN
 * - No external dependencies
 * - Consistent availability
 */
export const VENUE_FALLBACK_IMAGES: Record<string, VenueFallbackConfig> = {
  'grelle-forelle': {
    name: 'Grelle Forelle',
    aliases: ['grelle forelle', 'grelleforelle'],
    imageUrl: '/venues/grelle-forelle.png',
    source: 'grelleforelle.com',
  },
  'flex': {
    name: 'Flex',
    aliases: ['flex wien', 'flex vienna'],
    imageUrl: '/venues/flex.png',
    source: 'flex.at',
  },
  'pratersauna': {
    name: 'Pratersauna',
    aliases: ['prater sauna', 'pratersauna wien'],
    imageUrl: '/venues/pratersauna.png',
    source: 'pratersauna.tv',
  },
  'das-werk': {
    name: 'Das WERK',
    aliases: ['das werk', 'daswerk'],
    imageUrl: '/venues/das-werk.png',
    source: 'daswerk.org',
  },
  'u4': {
    name: 'U4',
    aliases: ['u4 wien', 'u4 club', 'u4 vienna'],
    imageUrl: '/venues/u4.png',
    source: 'u4.at',
  },
  'volksgarten': {
    name: 'Volksgarten',
    aliases: ['volksgarten disco', 'volksgarten club', 'volksgarten wien'],
    imageUrl: '/venues/volksgarten.png',
    source: 'volksgarten.at',
  },
  'babenberger-passage': {
    name: 'Babenberger Passage',
    aliases: ['babenberger passage wien'],
    imageUrl: '/venues/babenberger-passage.png',
    source: 'babenbergerpassage.at',
  },
  'camera-club': {
    name: 'Camera Club',
    aliases: ['camera club wien', 'camera vienna'],
    imageUrl: '/venues/camera-club.png',
    source: 'camera-club.at',
  },
  'celeste': {
    name: 'Celeste',
    aliases: ['celeste wien', 'celeste club', 'celeste vienna'],
    imageUrl: '/venues/celeste.png',
    source: 'celeste.co.at',
  },
  'chelsea': {
    name: 'Chelsea',
    aliases: ['chelsea wien', 'chelsea club', 'chelsea gürtel'],
    imageUrl: '/venues/chelsea.png',
    source: 'chelsea.co.at',
  },
  'donau': {
    name: 'Donau',
    aliases: ['donau techno', 'donautechno', 'donau wien'],
    imageUrl: '/venues/donau.png',
    source: 'donautechno.com',
  },
  'flucc': {
    name: 'Flucc / Flucc Wanne',
    aliases: ['flucc', 'fluc', 'flucc wanne', 'flucc deck'],
    imageUrl: '/venues/flucc.png',
    source: 'flucc.at',
  },
  'o-der-klub': {
    name: 'O - der Klub',
    aliases: ['o der klub', 'o klub wien', 'o club vienna'],
    imageUrl: '/venues/o-der-klub.png',
    source: 'o-klub.at',
  },
  'ponyhof': {
    name: 'Ponyhof',
    aliases: ['ponyhof wien', 'ponyhof vienna'],
    imageUrl: '/venues/ponyhof.png',
    source: 'ponyhof-official.at',
  },
  'prater-dome': {
    name: 'Prater DOME',
    aliases: ['praterdome', 'prater dome'],
    imageUrl: '/venues/prater-dome.png',
    source: 'praterdome.at',
  },
  'praterstrasse': {
    name: 'Praterstrasse',
    aliases: ['praterstrasse wien', 'prst', 'prst praterstrasse'],
    imageUrl: '/venues/praterstrasse.png',
    source: 'praterstrasse.wien',
  },
  'sass-music-club': {
    name: 'SASS Music Club',
    aliases: ['sass music club', 'sass wien', 'sass vienna'],
    imageUrl: '/venues/sass-music-club.png',
    source: 'sassvienna.com',
  },
  'the-loft': {
    name: 'The Loft',
    aliases: ['the loft', 'loft wien', 'loft vienna'],
    imageUrl: '/venues/the-loft.png',
    source: 'theloft.at',
  },
  'vieipee': {
    name: 'VIEiPEE',
    aliases: ['vieipee', 'vie i pee', 'vieipee wien'],
    imageUrl: '/venues/vieipee.png',
    source: 'vieipee.com',
  },
  'rhiz': {
    name: 'rhiz',
    aliases: ['rhiz wien', 'rhiz bar', 'rhiz club'],
    imageUrl: '/venues/rhiz.png',
    source: 'rhiz.wien',
  },
  'patroc-wien-gay': {
    name: 'Patroc Wien Gay Events',
    aliases: ['patroc wien', 'patroc gay'],
    imageUrl: '/venues/patroc-wien-gay.png',
    source: 'patroc.com',
  },
};

/**
 * Normalize venue name for matching
 * Converts to lowercase and removes special characters
 */
function normalizeVenueName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim();
}

/**
 * Pre-computed reverse index for O(1) lookups
 * Maps normalized names and aliases to venue keys
 */
const venueNameIndex: Map<string, string> = new Map();

// Build the reverse index on module load
for (const [key, config] of Object.entries(VENUE_FALLBACK_IMAGES)) {
  // Index by normalized name
  venueNameIndex.set(normalizeVenueName(config.name), key);
  
  // Index by normalized aliases
  for (const alias of config.aliases) {
    venueNameIndex.set(normalizeVenueName(alias), key);
  }
}

/**
 * Get fallback image URL for a venue
 * Uses pre-computed index for efficient O(1) lookups
 * 
 * @param venueName - The venue name from the event
 * @returns The fallback image URL or null if no match found
 */
export function getVenueFallbackImage(venueName: string | undefined): string | null {
  if (!venueName) return null;
  
  const normalizedInput = normalizeVenueName(venueName);
  if (!normalizedInput) return null;
  
  // First, try direct lookup in the pre-computed index (O(1))
  const directMatch = venueNameIndex.get(normalizedInput);
  if (directMatch && VENUE_FALLBACK_IMAGES[directMatch]) {
    return VENUE_FALLBACK_IMAGES[directMatch].imageUrl;
  }
  
  // Try direct key lookup with hyphenated name
  const directKey = normalizedInput.replace(/\s+/g, '-');
  if (VENUE_FALLBACK_IMAGES[directKey]) {
    return VENUE_FALLBACK_IMAGES[directKey].imageUrl;
  }
  
  // For short inputs, skip partial matching to avoid false positives
  if (normalizedInput.length < MIN_PARTIAL_MATCH_LENGTH) {
    return null;
  }
  
  // Fallback: search for partial matches only for longer venue names
  // This ensures short names like "O" don't match everything
  for (const config of Object.values(VENUE_FALLBACK_IMAGES)) {
    const normalizedConfigName = normalizeVenueName(config.name);
    
    // Skip partial matching for short venue names
    if (normalizedConfigName.length < MIN_PARTIAL_MATCH_LENGTH) {
      continue;
    }
    
    // Check if input contains venue name or vice versa
    if (normalizedInput.includes(normalizedConfigName) || 
        normalizedConfigName.includes(normalizedInput)) {
      return config.imageUrl;
    }
  }
  
  return null;
}

/**
 * Get all available venue IDs with fallback images
 */
export function getVenuesWithFallbackImages(): string[] {
  return Object.keys(VENUE_FALLBACK_IMAGES);
}
