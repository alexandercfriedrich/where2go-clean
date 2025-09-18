// Mapping von where2go-Hauptkategorien -> wien.info F1-Filter-IDs
// Syntax (Client-URL):
// https://www.wien.info/en/now-on/events#/?dr=YYYY-MM-DD,YYYY-MM-DD&f1=ID1,ID2
//
// Hinweis: Das ist eine Client-URL (Hash-Route). Für unsere Pipeline nutzen wir sie
// als "Discovery-/Hint-Link" für KI und zur schnellen Navigation, nicht als API-Fetch.

export const WIEN_INFO_F1_BY_MAIN_CATEGORY: Record<string, number> = {
  'DJ Sets/Electronic': 896974,      // Festivals, Parties, and Shows
  'Clubs/Discos': 896974,            // Festivals, Parties, and Shows
  'Live-Konzerte': 896982,           // Concerts, Music
  'Theater/Performance': 896998,     // Theater, Cabaret, Shows
  'Open Air': 896974,                // Festivals, Parties, and Shows
  'Museen': 896984,                  // Museums, Exhibitions
  'Comedy/Kabarett': 896998,         // Theater, Cabaret, Shows
  'Film': 896986,                    // Cinema, Film
  'Kunst/Design': 896984,            // Museums, Exhibitions
  'Kultur/Traditionen': 896974,      // Festivals, Parties, and Shows
  'Märkte/Shopping': 896988,         // Markets
  'Food/Culinary': 896996,           // Culinary
  'Familien/Kids': 896992,           // Families, Kids
  'Sport': 896990,                   // Sport, Recreation
};

// Kategorien ohne Mapping auf wien.info F1 (werden nicht an f1 übergeben)
export const WIEN_INFO_UNMAPPED_CATEGORIES: string[] = [
  'LGBTQ+',
  'Bildung/Lernen',
  'Networking/Business',
  'Natur/Outdoor',
  'Wellness/Spirituell',
  'Soziales/Community',
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
  const base = 'https://www.wien.info/en/now-on/events#/';
  const params = new URLSearchParams();
  params.set('dr', `${fromISO},${toISO}`);
  if (f1Ids && f1Ids.length > 0) {
    params.set('f1', f1Ids.join(','));
  }
  return `${base}?${params.toString()}`;
}
