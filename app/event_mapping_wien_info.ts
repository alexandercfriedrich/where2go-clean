// Single Source of Truth (SSOT) for Wien.info <-> where2go mapping and helpers.
// - Forward mapping (where2go -> official Wien.info labels -> F1 IDs)
// - Reverse mapping (official label -> preferred where2go main category)
// - Label canonicalization (aliases -> official labels)
// - Discovery URL and F1 resolver

// Official wien.info labels -> F1 IDs (complete set per guide)
export const WIEN_INFO_F1_BY_LABEL: Record<string, number> = {
  'Rock, Pop, Jazz und mehr': 896980,
  'Klassisch': 896984,
  'Musical, Tanz und Performance': 896988,
  'Theater und Kabarett': 896978,
  'Führungen, Spaziergänge & Touren': 896974,
  'Sport, Bewegung und Freizeit': 896994,
  'Ausstellungen': 896982,
  'Film und Sommerkino': 896992,
  'Typisch Wien': 897000,
  'Wien für Jugendliche, LGBTQIA+': 896996,
  'Märkte und Messen': 896990,
  'Kulinarik': 896998,
  'Familien, Kids': 896986
};

// where2go main categories -> list of official wien.info labels
export const WHERE2GO_TO_WIENINFO: Record<string, string[]> = {
  'DJ Sets/Electronic': ['Rock, Pop, Jazz und mehr'],
  'Clubs/Discos': ['Rock, Pop, Jazz und mehr'],
  'Live-Konzerte': ['Rock, Pop, Jazz und mehr', 'Klassisch'],
  'Theater/Performance': ['Musical, Tanz und Performance', 'Theater und Kabarett'],
  'Open Air': ['Führungen, Spaziergänge & Touren', 'Sport, Bewegung und Freizeit'],
  'Museen': ['Ausstellungen'],
  'Comedy/Kabarett': ['Theater und Kabarett'],
  'Film': ['Film und Sommerkino'],
  'Kunst/Design': ['Ausstellungen'],
  'Kultur/Traditionen': ['Typisch Wien', 'Führungen, Spaziergänge & Touren'],
  'LGBTQ+': ['Wien für Jugendliche, LGBTQIA+'],
  'Bildung/Lernen': ['Führungen, Spaziergänge & Touren'],
  'Networking/Business': ['Führungen, Spaziergänge & Touren'],
  'Sport': ['Sport, Bewegung und Freizeit'],
  'Natur/Outdoor': ['Führungen, Spaziergänge & Touren', 'Sport, Bewegung und Freizeit'],
  'Wellness/Spirituell': ['Sport, Bewegung und Freizeit'],
  'Soziales/Community': ['Familien, Kids', 'Typisch Wien'],
  'Märkte/Shopping': ['Märkte und Messen'],
  'Food/Culinary': ['Kulinarik'],
  'Familien/Kids': ['Familien, Kids'],
  'Sonstiges/Other': [] // No specific mapping - uses all categories
};

// Wien.info label aliases to normalize common variants to official labels
// This ensures consistent mapping when raw API labels vary slightly
export const WIENINFO_LABEL_ALIASES: Record<string, string> = {
  // Classical concerts variants
  'konzerte klassisch': 'Klassisch',
  'konzerte, klassisch': 'Klassisch',
  'klassisch': 'Klassisch',
  
  // Rock, Pop, Jazz variants
  'rock, pop, jazz': 'Rock, Pop, Jazz und mehr',
  'rock , pop , jazz': 'Rock, Pop, Jazz und mehr',
  
  // Theater variants
  'oper und operette': 'Theater und Kabarett',
  'theater und kabarett': 'Theater und Kabarett',
  'musical, tanz und performance': 'Musical, Tanz und Performance',
  
  // Tours and walks variants
  'führungen und touren': 'Führungen, Spaziergänge & Touren',
  'führungen & touren': 'Führungen, Spaziergänge & Touren',
  'führungen, spaziergänge und touren': 'Führungen, Spaziergänge & Touren',
  'führungen': 'Führungen, Spaziergänge & Touren',
  
  // Exhibitions variants
  'ausstellung': 'Ausstellungen',
  'exhibition': 'Ausstellungen',
  
  // Film variants
  'film': 'Film und Sommerkino',
  'sommerkino': 'Film und Sommerkino',
  'film und sommerkinos': 'Film und Sommerkino',
  'film und sommer kino': 'Film und Sommerkino',
  
  // Culture variants
  'typisch wien': 'Typisch Wien',
  
  // Family variants
  'familien, kids': 'Familien, Kids',
  'kinder und familie': 'Familien, Kids',
  
  // LGBTQ variants
  'wien für jugendliche, lgbtq+': 'Wien für Jugendliche, LGBTQIA+',
  'lgbtq+': 'Wien für Jugendliche, LGBTQIA+',
  'lgbtiq+': 'Wien für Jugendliche, LGBTQIA+',
  'lgbtqia+': 'Wien für Jugendliche, LGBTQIA+',
  
  // Markets variants
  'märkte und messen': 'Märkte und Messen',
  
  // Food variants
  'kulinarik': 'Kulinarik',
  
  // Sport variants
  'sport': 'Sport, Bewegung und Freizeit',
  
  // Festivals variants - maps to Open Air
  'festivals, feste und shows': 'Festivals, Feste, und Shows',
};

// Reverse mapping: Wien.info raw category label -> where2go main category
// This is the SSOT for category mapping from Wien.info to our categories
// Ambiguities are resolved to the broadest sensible default (consistent with UI filters)
const WIENINFO_LABEL_TO_MAIN_CATEGORY: Record<string, string> = {
  // Classical and concerts
  'Klassisch': 'Theater/Performance',  // Classical performances are more theater-like
  'Rock, Pop, Jazz und mehr': 'Live-Konzerte',
  'Konzerte': 'Live-Konzerte',
  
  // Theater and performance
  'Theater und Kabarett': 'Theater/Performance',
  'Musical, Tanz und Performance': 'Theater/Performance',
  'Oper und Operette': 'Theater/Performance',
  
  // Museums and exhibitions
  'Ausstellungen': 'Museen',
  
  // Markets and festivals
  'Märkte und Messen': 'Märkte/Shopping',  // Markets are shopping, not Open Air
  'Festivals, Feste, und Shows': 'Open Air',
  
  // Entertainment
  'Film und Sommerkino': 'Film',
  
  // Culture and traditions
  'Typisch Wien': 'Kultur/Traditionen',
  'Führungen, Spaziergänge & Touren': 'Kultur/Traditionen',
  
  // Family and kids
  'Kinder und Familie': 'Familien/Kids',
  'Familien, Kids': 'Familien/Kids',
  
  // LGBTQ
  'Wien für Jugendliche, LGBTQIA+': 'LGBTQ+',
  
  // Sport
  'Sport, Bewegung und Freizeit': 'Sport',
  
  // Food
  'Kulinarik': 'Food/Culinary',
};

// Export alias for backward compatibility with tests
export const WIENINFO_TO_WHERE2GO_PREFERRED = WIENINFO_LABEL_TO_MAIN_CATEGORY;

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

// Map a Wien.info category label to a where2go main category
// Returns null if no mapping exists
export function mapWienInfoCategoryLabelToWhereToGo(label: string): string | null {
  const canonical = canonicalizeWienInfoLabel(label);
  
  // Try exact match first
  const exactMatch = WIENINFO_LABEL_TO_MAIN_CATEGORY[canonical];
  if (exactMatch) return exactMatch;
  
  // Try case-insensitive match on the official labels
  const lowerCanonical = canonical.toLowerCase();
  for (const [key, value] of Object.entries(WIENINFO_LABEL_TO_MAIN_CATEGORY)) {
    if (key.toLowerCase() === lowerCanonical) {
      return value;
    }
  }
  
  return null;
}

// Forward resolver: where2go -> F1 IDs (deduplicated)
export function getWienInfoF1IdsForCategories(mainCategories: string[]): number[] {
  const labels = new Set<string>();
  for (const cat of mainCategories || []) {
    const mapped = WHERE2GO_TO_WIENINFO[cat];
    if (Array.isArray(mapped)) mapped.forEach((l) => labels.add(l));
  }
  const f1 = new Set<number>();
  for (const label of labels) {
    const id = WIEN_INFO_F1_BY_LABEL[label];
    if (typeof id === 'number') f1.add(id);
  }
  return Array.from(f1);
}

// Discovery URL (German version)
export function buildWienInfoUrl(fromISO: string, toISO: string, f1Ids?: number[]): string {
  const base = 'https://www.wien.info/de/aktuell/veranstaltungen#/';
  const params = new URLSearchParams();
  params.set('dr', `${fromISO},${toISO}`);
  if (f1Ids && f1Ids.length > 0) params.set('f1', f1Ids.join(','));
  return `${base}?${params.toString()}`;
}
