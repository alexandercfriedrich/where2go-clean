/**
 * Single Source of Truth (SSOT) for Wien.info <-> where2go mapping.
 * - WIEN_INFO_F1_BY_LABEL: official wien.info label -> F1 id
 * - WHERE2GO_TO_WIENINFO: where2go main category -> list of official labels
 * - WIENINFO_TO_WHERE2GO_PREFERRED: official label -> preferred where2go category
 * - Helper functions: getWienInfoF1IdsForCategories, mapWienInfoCategoryLabelToWhereToGo,
 *   canonicalizeWienInfoLabel, buildWienInfoUrl
 */

// Official wien.info labels -> F1 IDs (from wien-event-guide.md)
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

// where2go main categories -> official wien.info labels
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
  'Familien/Kids': ['Familien, Kids']
};

// Preferred reverse mapping: official label -> where2go category
export const WIENINFO_TO_WHERE2GO_PREFERRED: Record<string, string> = {
  'Rock, Pop, Jazz und mehr': 'Live-Konzerte',
  'Klassisch': 'Live-Konzerte',
  'Musical, Tanz und Performance': 'Theater/Performance',
  'Theater und Kabarett': 'Theater/Performance',
  'Oper und Operette': 'Theater/Performance',
  'Führungen, Spaziergänge & Touren': 'Open Air',
  'Sport, Bewegung und Freizeit': 'Sport',
  'Ausstellungen': 'Museen',
  'Film und Sommerkino': 'Film',
  'Typisch Wien': 'Kultur/Traditionen',
  'Wien für Jugendliche, LGBTQIA+': 'LGBTQ+',
  'Märkte und Messen': 'Märkte/Shopping',
  'Kulinarik': 'Food/Culinary',
  'Familien, Kids': 'Familien/Kids',
  // Feinjustierung:
  'Festivals, Feste, und Shows': 'Open Air'
};

// Aliases: common variants -> official labels (canonicalization before reverse mapping)
const WIENINFO_LABEL_ALIASES: Record<string, string> = {
  'Konzerte klassisch': 'Klassisch',
  'Konzerte, Klassisch': 'Klassisch',
  'klassisch': 'Klassisch',

  'Rock, Pop, Jazz': 'Rock, Pop, Jazz und mehr',

  'Führungen und Touren': 'Führungen, Spaziergänge & Touren',
  'Führungen & Touren': 'Führungen, Spaziergänge & Touren',
  'Führungen, Spaziergänge und Touren': 'Führungen, Spaziergänge & Touren',

  'Film und Sommerkinos': 'Film und Sommerkino',
  'Film und Sommer Kino': 'Film und Sommerkino',

  'LGBTQ+': 'Wien für Jugendliche, LGBTQIA+',
  'LGBTIQ+': 'Wien für Jugendliche, LGBTQIA+',
  'Wien für Jugendliche, LGBTQ+': 'Wien für Jugendliche, LGBTQIA+',

  'Sport': 'Sport, Bewegung und Freizeit',

  // Festivals variants (normalize punctuation)
  'Festivals, Feste und Shows': 'Festivals, Feste, und Shows'
};

// Convenience list of official labels
export const WIENINFO_LABELS: string[] = Object.keys(WIEN_INFO_F1_BY_LABEL);

/**
 * Canonicalize a Wien.info label by trimming, normalizing whitespace, and applying aliases
 */
export function canonicalizeWienInfoLabel(label: string): string {
  if (!label) return '';
  const normalized = label.trim().replace(/\s+/g, ' ');
  const lower = normalized.toLowerCase();
  for (const [alias, canonical] of Object.entries(WIENINFO_LABEL_ALIASES)) {
    if (lower === alias.toLowerCase()) return canonical;
  }
  return normalized;
}

/**
 * Forward: where2go -> F1 IDs (deduplicated)
 */
export function getWienInfoF1IdsForCategories(mainCategories: string[]): number[] {
  const labels = new Set<string>();
  for (const cat of mainCategories || []) {
    const mapped = WHERE2GO_TO_WIENINFO[cat];
    if (Array.isArray(mapped)) mapped.forEach(l => labels.add(l));
  }
  const f1 = new Set<number>();
  for (const label of labels) {
    const id = WIEN_INFO_F1_BY_LABEL[label];
    if (typeof id === 'number') f1.add(id);
  }
  return Array.from(f1);
}

/**
 * Reverse: official label -> where2go (null if unknown)
 */
export function mapWienInfoCategoryLabelToWhereToGo(label: string): string | null {
  const canonical = canonicalizeWienInfoLabel(label);
  return WIENINFO_TO_WHERE2GO_PREFERRED[canonical] || null;
}

/**
 * Build the discovery URL (German site) with date range and optional F1 tag IDs.
 */
export function buildWienInfoUrl(fromISO: string, toISO: string, f1Ids?: number[]): string {
  const base = 'https://www.wien.info/de/aktuell/veranstaltungen#/';
  const params = new URLSearchParams();
  params.set('dr', `${fromISO},${toISO}`);
  if (Array.isArray(f1Ids) && f1Ids.length > 0) {
    params.set('f1', f1Ids.join(','));
  }
  return `${base}?${params.toString()}`;
}
