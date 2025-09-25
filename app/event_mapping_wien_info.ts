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
