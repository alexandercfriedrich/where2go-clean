// Mapping von where2go-Hauptkategorien -> wien.info F1-Filter-IDs
// Syntax (Client-URL):
// https://www.wien.info/en/now-on/events#/?dr=YYYY-MM-DD,YYYY-MM-DD&f1=ID1,ID2
//
// Hinweis: Das ist eine Client-URL (Hash-Route). Für unsere Pipeline nutzen wir sie
// als "Discovery-/Hint-Link" für KI und zur schnellen Navigation, nicht als API-Fetch.
//
// SSOT (Single Source of Truth) für alle Wien.info Kategorie-Mappings

// Official wien.info category labels -> F1 tag IDs
export const WIEN_INFO_F1_BY_LABEL: Record<string, number> = {
  'Rock, Pop, Jazz und mehr': 896980,
  'Klassisch': 896984,
  'Konzerte klassisch': 896984, // Variant of Klassisch
  'Musical, Tanz und Performance': 896988,
  'Theater und Kabarett': 896978,
  'Oper und Operette': 896978, // Variant of Theater und Kabarett
  'Führungen, Spaziergänge & Touren': 896974,
  'Führungen und Touren': 896974, // Variant
  'Sport, Bewegung und Freizeit': 896994,
  'Sport': 896994, // Variant
  'Ausstellungen': 896982,
  'Film und Sommerkino': 896992,
  'Film und Sommerkinos': 896992, // Variant (plural)
  'Typisch Wien': 897000,
  'Wien für Jugendliche, LGBTQIA+': 896996,
  'LGBTIQ+': 896996, // Variant spelling
  'Märkte und Messen': 896990,
  'Kulinarik': 896998,
  'Familien, Kids': 896986,
  'Festivals, Feste, und Shows': 896974, // Map to tours for now
};

// where2go main category -> list of wien.info official labels
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
  'Sonstiges/Other': [], // No specific mapping - will use all categories
};

// wien.info official label -> preferred where2go category (for reverse mapping)
export const WIENINFO_TO_WHERE2GO_PREFERRED: Record<string, string> = {
  'Rock, Pop, Jazz und mehr': 'Live-Konzerte',
  'Klassisch': 'Live-Konzerte',
  'Konzerte klassisch': 'Live-Konzerte',
  'Musical, Tanz und Performance': 'Theater/Performance',
  'Theater und Kabarett': 'Theater/Performance',
  'Oper und Operette': 'Theater/Performance',
  'Führungen, Spaziergänge & Touren': 'Kultur/Traditionen',
  'Führungen und Touren': 'Kultur/Traditionen',
  'Sport, Bewegung und Freizeit': 'Sport',
  'Sport': 'Sport',
  'Ausstellungen': 'Museen',
  'Film und Sommerkino': 'Film',
  'Film und Sommerkinos': 'Film',
  'Typisch Wien': 'Kultur/Traditionen',
  'Wien für Jugendliche, LGBTQIA+': 'LGBTQ+',
  'LGBTIQ+': 'LGBTQ+',
  'Märkte und Messen': 'Märkte/Shopping',
  'Kulinarik': 'Food/Culinary',
  'Familien, Kids': 'Familien/Kids',
  'Festivals, Feste, und Shows': 'Open Air',
};

/**
 * Maps a wien.info category label to a where2go main category
 * Returns null if no mapping is found
 */
export function mapWienInfoCategoryLabelToWhereToGo(label: string): string | null {
  if (!label) return null;
  
  // Try exact match first
  const exactMatch = WIENINFO_TO_WHERE2GO_PREFERRED[label];
  if (exactMatch) return exactMatch;
  
  // Try case-insensitive match
  const lowerLabel = label.toLowerCase().trim();
  for (const [key, value] of Object.entries(WIENINFO_TO_WHERE2GO_PREFERRED)) {
    if (key.toLowerCase() === lowerLabel) {
      return value;
    }
  }
  
  return null;
}

// Liefert die eindeutigen F1-IDs für eine Menge Hauptkategorien
export function getWienInfoF1IdsForCategories(categories: string[]): number[] {
  const ids = new Set<number>();
  for (const c of categories) {
    const labels = WHERE2GO_TO_WIENINFO[c];
    if (labels) {
      for (const label of labels) {
        const id = WIEN_INFO_F1_BY_LABEL[label];
        if (id) ids.add(id);
      }
    }
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
