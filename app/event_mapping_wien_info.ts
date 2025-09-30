// Mapping von where2go-Hauptkategorien -> wien.info F1-Filter-IDs
// Syntax (Client-URL):
// https://www.wien.info/en/now-on/events#/?dr=YYYY-MM-DD,YYYY-MM-DD&f1=ID1,ID2
//
// Hinweis: Das ist eine Client-URL (Hash-Route). Für unsere Pipeline nutzen wir sie
// als "Discovery-/Hint-Link" für KI und zur schnellen Navigation, nicht als API-Fetch.

export const WIEN_INFO_F1_BY_MAIN_CATEGORY: Record<string, number> = {
  'DJ Sets/Electronic': 896980,      // Rock, Pop, Jazz und mehr
  'Clubs/Discos': 896980,            // Rock, Pop, Jazz und mehr
  'Live-Konzerte': 896980,           // Rock, Pop, Jazz und mehr (could also be 896984 for Klassisch)
  'Theater/Performance': 896988,     // Musical, Tanz und Performance (could also be 896978 for Theater und Kabarett)
  'Open Air': 896974,                // Führungen, Spaziergänge & Touren (could also be 896994 for Sport, Bewegung und Freizeit)
  'Museen': 896982,                  // Ausstellungen
  'Comedy/Kabarett': 896978,         // Theater und Kabarett
  'Film': 896992,                    // Film und Sommerkino
  'Kunst/Design': 896982,            // Ausstellungen
  'Kultur/Traditionen': 897000,      // Typisch Wien (could also be 896974 for Führungen)
  'LGBTQ+': 896996,                  // Wien für Jugendliche, LGBTQIA+
  'Bildung/Lernen': 896974,          // Führungen, Spaziergänge & Touren
  'Networking/Business': 896974,     // Führungen, Spaziergänge & Touren
  'Sport': 896994,                   // Sport, Bewegung und Freizeit
  'Natur/Outdoor': 896974,           // Führungen, Spaziergänge & Touren (could also be 896994)
  'Wellness/Spirituell': 896994,     // Sport, Bewegung und Freizeit
  'Soziales/Community': 896996,      // Familien, Kids / Wien für Jugendliche (using Kids mapping)
};

// Kategorien ohne Mapping auf wien.info F1 (werden nicht an f1 übergeben)
export const WIEN_INFO_UNMAPPED_CATEGORIES: string[] = [
  // All categories now have mappings
];

// Liefert die eindeutigen F1-IDs für eine Menge Hauptkategorien
export function getWienInfoF1IdsForCategories(categories: string[]): number[] {
  const ids = new Set<number>();
  for (const c of categories) {
    const id = WIEN_INFO_F1_BY_MAIN_CATEGORY[c];
    if (id) ids.add(id);
  }
  return Array.from(ids);
}

// Baut die wien.info-URL mit Datum und optionalen F1-IDs
export function buildWienInfoUrl(fromISO: string, toISO: string, f1Ids?: number[]): string {
  // Use the German version of wien.info as specified by user
  const base = 'https://www.wien.info/de/aktuell/veranstaltungen#/';
  const params = new URLSearchParams();
  params.set('dr', `${fromISO},${toISO}`);
  if (f1Ids && f1Ids.length > 0) {
    params.set('f1', f1Ids.join(','));
  }
  return `${base}?${params.toString()}`;
}

// Wien.info label aliases to normalize common variants to official labels
// This ensures consistent mapping when raw API labels vary slightly
export const WIENINFO_LABEL_ALIASES: Record<string, string> = {
  // Classical concerts variants
  'konzerte klassisch': 'Klassisch',
  'konzerte, klassisch': 'Klassisch',
  'klassisch': 'Klassisch',
  
  // Rock, Pop, Jazz variants
  'rock, pop, jazz': 'Rock, Pop, Jazz und mehr',
  
  // Tours and walks variants
  'führungen und touren': 'Führungen, Spaziergänge & Touren',
  'führungen & touren': 'Führungen, Spaziergänge & Touren',
  'führungen, spaziergänge und touren': 'Führungen, Spaziergänge & Touren',
  'führungen': 'Führungen, Spaziergänge & Touren',
  
  // Film variants
  'film und sommerkinos': 'Film und Sommerkino',
  'film und sommer kino': 'Film und Sommerkino',
  'film und sommerkino': 'Film und Sommerkino',
  
  // LGBTQ variants
  'lgbtq+': 'Wien für Jugendliche, LGBTQIA+',
  'lgbtiq+': 'Wien für Jugendliche, LGBTQIA+',
  'lgbtqia+': 'Wien für Jugendliche, LGBTQIA+',
  'wien für jugendliche, lgbtq+': 'Wien für Jugendliche, LGBTQIA+',
  'wien für jugendliche, lgbtqia+': 'Wien für Jugendliche, LGBTQIA+',
  
  // Sport variants
  'sport': 'Sport, Bewegung und Freizeit',
  
  // Festivals variants (normalize punctuation)
  'festivals, feste und shows': 'Festivals, Feste, und Shows',
};

// Canonicalize a Wien.info label by trimming, normalizing whitespace, and applying aliases
export function canonicalizeWienInfoLabel(label: string): string {
  if (!label) return '';
  
  // Trim and collapse whitespace
  const normalized = label.trim().replace(/\s+/g, ' ');
  
  // Check aliases (case-insensitive)
  const lower = normalized.toLowerCase();
  for (const [alias, canonical] of Object.entries(WIENINFO_LABEL_ALIASES)) {
    if (lower === alias.toLowerCase()) {
      return canonical;
    }
  }
  
  return normalized;
}

// Reverse mapping: Wien.info raw category label -> where2go main category
// This is the SSOT for category mapping from Wien.info to our categories
const WIENINFO_LABEL_TO_MAIN_CATEGORY: Record<string, string> = {
  // Classical and concerts
  'Klassisch': 'Live-Konzerte',
  'Rock, Pop, Jazz und mehr': 'Live-Konzerte',
  'Konzerte': 'Live-Konzerte',
  
  // Theater and performance
  'Theater und Kabarett': 'Theater/Performance',
  'Musical, Tanz und Performance': 'Theater/Performance',
  'Oper und Operette': 'Theater/Performance',
  
  // Museums and exhibitions
  'Ausstellungen': 'Museen',
  
  // Markets and festivals
  'Märkte und Messen': 'Open Air',
  'Festivals, Feste, und Shows': 'Open Air',
  
  // Entertainment
  'Film und Sommerkino': 'Film',
  
  // Culture and traditions
  'Typisch Wien': 'Kultur/Traditionen',
  'Führungen, Spaziergänge & Touren': 'Kultur/Traditionen',
  
  // Family and kids
  'Kinder und Familie': 'Familien/Kids',
  
  // LGBTQ
  'Wien für Jugendliche, LGBTQIA+': 'LGBTQ+',
  
  // Sport
  'Sport, Bewegung und Freizeit': 'Sport',
};

// Map a Wien.info category label to a where2go main category
// Returns null if no mapping exists
export function mapWienInfoCategoryLabelToWhereToGo(label: string): string | null {
  const canonical = canonicalizeWienInfoLabel(label);
  return WIENINFO_LABEL_TO_MAIN_CATEGORY[canonical] || null;
}
