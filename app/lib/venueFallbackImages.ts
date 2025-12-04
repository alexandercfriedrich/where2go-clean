/**
 * Venue Fallback Images
 * 
 * This file contains fallback image URLs for venues that have scrapers.
 * When an event has no image, the system will use the venue's fallback image.
 * 
 * Image sources are official venue websites, social media, or reputable logo databases.
 */

export interface VenueFallbackConfig {
  /** Official venue name as used in the scrapers */
  name: string;
  /** Alternative names or aliases for matching */
  aliases: string[];
  /** Fallback image URL - typically venue logo or representative image */
  imageUrl: string;
  /** Source attribution for the image */
  source: string;
}

/**
 * Venue fallback image configurations
 * Keys are lowercase, hyphenated venue identifiers matching scraper configs
 */
export const VENUE_FALLBACK_IMAGES: Record<string, VenueFallbackConfig> = {
  'grelle-forelle': {
    name: 'Grelle Forelle',
    aliases: ['grelle forelle', 'grelleforelle'],
    imageUrl: 'https://www.grelleforelle.com/wp-content/uploads/2023/01/GF_Logo_white.png',
    source: 'grelleforelle.com',
  },
  'flex': {
    name: 'Flex',
    aliases: ['flex wien', 'flex vienna'],
    imageUrl: 'https://flex.at/wp-content/uploads/2024/01/flex-logo.png',
    source: 'flex.at',
  },
  'pratersauna': {
    name: 'Pratersauna',
    aliases: ['prater sauna', 'pratersauna wien'],
    imageUrl: 'https://pratersauna.tv/wp-content/uploads/2024/05/pratersauna-logo-new.png',
    source: 'pratersauna.tv',
  },
  'das-werk': {
    name: 'Das WERK',
    aliases: ['das werk', 'daswerk', 'werk'],
    imageUrl: 'https://seeklogo.com/images/D/das-werk-logo-0A94D67B9A-seeklogo.com.png',
    source: 'seeklogo.com',
  },
  'u4': {
    name: 'U4',
    aliases: ['u4 wien', 'u4 club', 'u4 vienna'],
    imageUrl: 'https://www.u4.at/wp-content/uploads/2023/u4-logo.png',
    source: 'u4.at',
  },
  'volksgarten': {
    name: 'Volksgarten',
    aliases: ['volksgarten disco', 'volksgarten club', 'volksgarten wien'],
    imageUrl: 'https://volksgarten.at/wp-content/uploads/volksgarten-logo.png',
    source: 'volksgarten.at',
  },
  'babenberger-passage': {
    name: 'Babenberger Passage',
    aliases: ['babenberger', 'passage', 'babenberger passage wien'],
    imageUrl: 'https://www.babenbergerpassage.at/wp-content/uploads/passage-logo.png',
    source: 'babenbergerpassage.at',
  },
  'camera-club': {
    name: 'Camera Club',
    aliases: ['camera', 'camera club wien', 'camera vienna'],
    imageUrl: 'https://camera-club.at/wp-content/uploads/camera-club-logo.png',
    source: 'camera-club.at',
  },
  'celeste': {
    name: 'Celeste',
    aliases: ['celeste wien', 'celeste club', 'celeste vienna'],
    imageUrl: 'https://www.celeste.co.at/wp-content/uploads/celeste-logo.png',
    source: 'celeste.co.at',
  },
  'chelsea': {
    name: 'Chelsea',
    aliases: ['chelsea wien', 'chelsea club', 'chelsea gürtel'],
    imageUrl: 'https://www.chelsea.co.at/wp-content/uploads/chelsea-logo.png',
    source: 'chelsea.co.at',
  },
  'donau': {
    name: 'Donau',
    aliases: ['donau techno', 'donautechno', 'donau wien'],
    imageUrl: 'https://www.donautechno.com/wp-content/uploads/donau-logo.png',
    source: 'donautechno.com',
  },
  'flucc': {
    name: 'Flucc / Flucc Wanne',
    aliases: ['flucc', 'fluc', 'flucc wanne', 'flucc deck'],
    imageUrl: 'https://flucc.at/wp-content/uploads/flucc-logo.png',
    source: 'flucc.at',
  },
  'o-der-klub': {
    name: 'O - der Klub',
    aliases: ['o der klub', 'o klub', 'o club', 'o vienna'],
    imageUrl: 'https://o-klub.at/wp-content/uploads/o-klub-logo.png',
    source: 'o-klub.at',
  },
  'ponyhof': {
    name: 'Ponyhof',
    aliases: ['ponyhof wien', 'ponyhof vienna'],
    imageUrl: 'https://ponyhof-official.at/wp-content/uploads/ponyhof-logo.png',
    source: 'ponyhof-official.at',
  },
  'prater-dome': {
    name: 'Prater DOME',
    aliases: ['praterdome', 'prater dome', 'dome'],
    imageUrl: 'https://seeklogo.com/images/P/praterdome-nachterlebnis-wien-logo-F1D1C18B2D-seeklogo.com.png',
    source: 'seeklogo.com',
  },
  'praterstrasse': {
    name: 'Praterstrasse',
    aliases: ['praterstrasse wien', 'prst', 'prst praterstrasse'],
    imageUrl: 'https://www.praterstrasse.wien/wp-content/uploads/praterstrasse-logo.png',
    source: 'praterstrasse.wien',
  },
  'sass-music-club': {
    name: 'SASS Music Club',
    aliases: ['sass', 'sass wien', 'sass vienna', 'sass music'],
    imageUrl: 'https://sassvienna.com/wp-content/uploads/sass-logo.png',
    source: 'sassvienna.com',
  },
  'the-loft': {
    name: 'The Loft',
    aliases: ['the loft', 'loft wien', 'loft vienna'],
    imageUrl: 'https://seeklogo.com/images/T/the-loft-logo-6F5B5B5B5B-seeklogo.com.png',
    source: 'seeklogo.com',
  },
  'vieipee': {
    name: 'VIEiPEE',
    aliases: ['vieipee', 'vie i pee', 'vieipee wien'],
    imageUrl: 'https://vieipee.com/wp-content/uploads/vieipee-logo.png',
    source: 'vieipee.com',
  },
  'rhiz': {
    name: 'rhiz',
    aliases: ['rhiz wien', 'rhiz bar', 'rhiz club'],
    imageUrl: 'https://rhiz.wien/wp-content/uploads/rhiz-logo.png',
    source: 'rhiz.wien',
  },
  'patroc-wien-gay': {
    name: 'Patroc Wien Gay Events',
    aliases: ['patroc', 'patroc wien', 'patroc gay'],
    imageUrl: 'https://www.patroc.com/images/patroc-logo.png',
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
 * Get fallback image URL for a venue
 * 
 * @param venueName - The venue name from the event
 * @returns The fallback image URL or null if no match found
 */
export function getVenueFallbackImage(venueName: string | undefined): string | null {
  if (!venueName) return null;
  
  const normalizedInput = normalizeVenueName(venueName);
  
  // First, try direct key lookup with normalized venue name
  const directKey = normalizedInput.replace(/\s+/g, '-');
  if (VENUE_FALLBACK_IMAGES[directKey]) {
    return VENUE_FALLBACK_IMAGES[directKey].imageUrl;
  }
  
  // Then, search through all venues by name and aliases
  for (const config of Object.values(VENUE_FALLBACK_IMAGES)) {
    // Check exact name match
    if (normalizeVenueName(config.name) === normalizedInput) {
      return config.imageUrl;
    }
    
    // Check aliases
    for (const alias of config.aliases) {
      if (normalizeVenueName(alias) === normalizedInput) {
        return config.imageUrl;
      }
    }
    
    // Check if input contains venue name or vice versa (partial match)
    const normalizedConfigName = normalizeVenueName(config.name);
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
