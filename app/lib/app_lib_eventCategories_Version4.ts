/**
 * Zentral gepflegte Event-Kategorien + Subkategorien + Normalisierung
 * Single Source of Truth für:
 *  - Prompt-Generierung
 *  - Validierung / Normalisierung
 *  - UI (Dropdowns / Filter)
 *
 * Kanonische Hauptkategorien (20):
 *  1. DJ Sets/Electronic
 *  2. Clubs/Discos
 *  3. Live-Konzerte
 *  4. Open Air
 *  5. Museen
 *  6. LGBTQ+
 *  7. Comedy/Kabarett
 *  8. Theater/Performance
 *  9. Film
 * 10. Food/Culinary
 * 11. Sport
 * 12. Familien/Kids
 * 13. Kunst/Design
 * 14. Wellness/Spirituell
 * 15. Networking/Business
 * 16. Natur/Outdoor
 * 17. Kultur/Traditionen
 * 18. Märkte/Shopping
 * 19. Bildung/Lernen
 * 20. Soziales/Community
 */

export const EVENT_CATEGORY_SUBCATEGORIES: Record<string, string[]> = {
  'DJ Sets/Electronic': [
    'Techno', 'House', 'Drum & Bass', 'Trance', 'EDM', 'Dubstep', 'Minimal',
    'Goa/Psytrance', 'Acid', 'Progressive House', 'Hardstyle', 'Chillout',
    'Ambient', 'Synthwave', 'Future Bass', 'B2B-Set', 'Label Night', 'Deep House',
    'Tech House', 'Mashup', 'Electronica Live'
  ],
  'Clubs/Discos': [
    'Studentenparty', 'Ü30', 'After Work', 'Latin Nights', 'Gay Party', 'All Inclusive',
    'Motto-Party', 'Opening/Closing', 'Silent Disco', 'Black Music', 'Ladies Night',
    'Karaoke', 'Dresscode Events', 'RnB Night', '90er Party', '2000er Party', 'Chartparty',
    'Club Geburtstag', 'Hip-Hop', 'Dancehall'
  ],
  'Live-Konzerte': [
    'Rock', 'Pop', 'Jazz', 'Blues', 'Indie', 'Metal', 'Singer-Songwriter', 'Hip-Hop',
    'Klassik', 'Folk', 'Tribute', 'Akustik', 'Punk', 'Soul', 'Gospel', 'Orchester',
    'Liedermacher', 'Nachwuchsbands', 'Open Mic', 'CD-Release'
  ],
  'Open Air': [
    'Festival', 'Stadtfest', 'Outdoor Konzert', 'Straßenfest', 'Open Air Kino', 'Beach Event',
    'Rooftop', 'Sportevent', 'Public Viewing', 'Open Air Yoga', 'Kultur im Park',
    'Silent Open Air', 'Lagerfeuer', 'Flohmarkt Open Air'
  ],
  'Museen': [
    'Sonderausstellung', 'Führung', 'Nacht im Museum', 'Familienausstellung', 'Mitmach',
    'Wissenschaft', 'Alte Meister', 'Moderne', 'Vernissage', 'Kreativworkshop'
  ],
  'LGBTQ+': [
    'Pride Parade', 'Queer Party', 'Drag Show', 'Community Treffen', 'Queer Stammtisch',
    'Queer Film', 'Awareness Night', 'Flirtparty', 'Queer Comedy'
  ],
  'Comedy/Kabarett': [
    'Stand-Up', 'Impro', 'Politkabarett', 'Satire', 'Poetry Slam', 'Lesung',
    'Mixed Show', 'Open Mic', 'Roast', 'Musik-Kabarett'
  ],
  'Theater/Performance': [
    'Klassik', 'Avantgarde', 'Straßentheater', 'Kindertheater', 'Musical', 'Tanztheater',
    'Improvisation', 'Oper', 'Monolog', 'Puppenspiel', 'Performancekunst'
  ],
  'Film': [
    'Arthouse', 'Blockbuster', 'Premiere', 'Retrospektive', 'Kurzfilm', 'Doku',
    'Kinderkino', 'Festival', 'Special Screening', 'Sneak Preview', 'Filmgespräch'
  ],
  'Food/Culinary': [
    'Streetfood', 'Weinverkostung', 'Kochkurs', 'Craft Beer', 'Brunch', 'Food Festival',
    'Vegan', 'Genussabend', 'Cocktailabend', 'Grill', 'Bierverkostung', 'Tasting'
  ],
  'Sport': [
    'Fußball', 'Basketball', 'Laufen', 'Yoga', 'Fitness', 'Kampfsport', 'Klettern',
    'Radrennen', 'Schwimmen', 'Volleyball', 'Tennis', 'Pilates', 'Crossfit'
  ],
  'Familien/Kids': [
    'Kinderfest', 'Basteln', 'Lesung', 'Kinderkino', 'Ausflug', 'Ferienprogramm',
    'Schnitzeljagd', 'Kinderdisco', 'Zaubershow', 'Märchen', 'Kindertanz'
  ],
  'Kunst/Design': [
    'Ausstellung', 'Vernissage', 'Installation', 'Kunstmarkt', 'Fotografie', 'Streetart',
    'Performance', 'Designmarkt', 'Skulptur', 'Aktzeichnen', 'Kuratorenführung'
  ],
  'Wellness/Spirituell': [
    'Meditation', 'Yoga', 'Klangreise', 'Retreat', 'Achtsamkeit', 'Ayurveda',
    'Reiki', 'Breathwork', 'Frauenkreis', 'Kräuterseminar', 'Detox'
  ],
  'Networking/Business': [
    'Startup Pitch', 'Meetup', 'Recruiting', 'Branchentreff', 'Konferenz', 'Seminar',
    'Afterwork', 'Hackathon', 'Speed Networking', 'Female Founders'
  ],
  'Natur/Outdoor': [
    'Wandern', 'Kräuterwanderung', 'Vogelbeobachtung', 'Wildnis', 'Survival', 'Fahrrad',
    'Sternwanderung', 'Naturfotografie', 'Kanufahren', 'CleanUp'
  ],
  'Kultur/Traditionen': [
    'Volksfest', 'Brauchtum', 'Trachten', 'Weihnachtsmarkt', 'Umzug', 'Kulturtage',
    'Erntedank', 'Maibaum', 'Lichterfest'
  ],
  'Märkte/Shopping': [
    'Flohmarkt', 'Designmarkt', 'Wochenmarkt', 'Vintage', 'Fashion', 'Kunsthandwerk',
    'Pop-Up', 'Second Hand', 'Antik', 'Pflanzenmarkt', 'Weihnachtsbazar'
  ],
  'Bildung/Lernen': [
    'Vortrag', 'Workshop', 'Sprachkurs', 'Seminar', 'Fortbildung', 'Lesekreis',
    'Experimente', 'Podium', 'Coding', 'Philosophie', 'Exkursion'
  ],
  'Soziales/Community': [
    'Freiwilligenarbeit', 'Charity', 'Gemeindefest', 'Nachbarschaft', 'Spendenlauf',
    'Selbsthilfe', 'Repair Café', 'Seniorentreff', 'Integration', 'Umweltgruppe'
  ]
};

export const EVENT_CATEGORIES = Object.keys(EVENT_CATEGORY_SUBCATEGORIES);

/**
 * Liste nummeriert für Prompts
 */
export function buildCategoryListForPrompt(): string {
  return EVENT_CATEGORIES.map((c, i) => `${i + 1}. ${c}`).join('\n');
}

/**
 * Kommagetrennt für Schema / Prompt
 */
export function allowedCategoriesForSchema(): string {
  return EVENT_CATEGORIES.join(', ');
}

export function getAllowedCategories(): string[] {
  return [...EVENT_CATEGORIES];
}

export function isValidCategory(category: string): boolean {
  return EVENT_CATEGORIES.includes(category);
}

export function isValidSubcategory(category: string, sub: string): boolean {
  const subs = EVENT_CATEGORY_SUBCATEGORIES[category];
  return Array.isArray(subs) && subs.includes(sub);
}

/**
 * Slug/Synonym → kanonische Kategorie
 * (Alles lowercase Keys!)
 */
const NORMALIZATION_MAP: Record<string, string> = {
  // DJ Sets/Electronic
  'dj': 'DJ Sets/Electronic',
  'dj sets': 'DJ Sets/Electronic',
  'dj set': 'DJ Sets/Electronic',
  'electronic': 'DJ Sets/Electronic',
  'techno': 'DJ Sets/Electronic',
  'edm': 'DJ Sets/Electronic',
  'house': 'DJ Sets/Electronic',

  // Clubs/Discos
  'club': 'Clubs/Discos',
  'clubs': 'Clubs/Discos',
  'disco': 'Clubs/Discos',
  'discos': 'Clubs/Discos',
  'nightlife': 'Clubs/Discos',
  'party': 'Clubs/Discos',

  // Live-Konzerte
  'konzerte': 'Live-Konzerte',
  'konzert': 'Live-Konzerte',
  'concert': 'Live-Konzerte',
  'concerts': 'Live-Konzerte',
  'musik': 'Live-Konzerte',
  'music': 'Live-Konzerte',
  'live': 'Live-Konzerte',

  // Open Air
  'openair': 'Open Air',
  'open-air': 'Open Air',
  'festival': 'Open Air',
  'festivals': 'Open Air',
  'outdoor': 'Open Air',

  // Museen
  'museum': 'Museen',
  'museen': 'Museen',
  'ausstellung': 'Museen',
  'ausstellungen': 'Museen',
  'galerie': 'Museen',
  'galerien': 'Museen',

  // LGBTQ+
  'lgbt': 'LGBTQ+',
  'lgbtq': 'LGBTQ+',
  'queer': 'LGBTQ+',
  'pride': 'LGBTQ+',

  // Comedy/Kabarett
  'comedy': 'Comedy/Kabarett',
  'kabarett': 'Comedy/Kabarett',
  'standup': 'Comedy/Kabarett',

  // Theater/Performance
  'theater': 'Theater/Performance',
  'theatre': 'Theater/Performance',
  'performance': 'Theater/Performance',
  'musical': 'Theater/Performance',
  'oper': 'Theater/Performance',
  'opera': 'Theater/Performance',

  // Film
  'film': 'Film',
  'kino': 'Film',
  'movie': 'Film',
  'movies': 'Film',
  'cinema': 'Film',

  // Food/Culinary
  'food': 'Food/Culinary',
  'culinary': 'Food/Culinary',
  'essen': 'Food/Culinary',
  'gastro': 'Food/Culinary',
  'wein': 'Food/Culinary',
  'wine': 'Food/Culinary',
  'brunch': 'Food/Culinary',

  // Sport
  'sport': 'Sport',
  'sports': 'Sport',
  'fitness': 'Sport',
  'yoga': 'Sport',

  // Familien/Kids
  'familie': 'Familien/Kids',
  'family': 'Familien/Kids',
  'kinder': 'Familien/Kids',
  'kids': 'Familien/Kids',

  // Kunst/Design
  'kunst': 'Kunst/Design',
  'art': 'Kunst/Design',
  'design': 'Kunst/Design',

  // Wellness/Spirituell
  'wellness': 'Wellness/Spirituell',
  'spirituell': 'Wellness/Spirituell',
  'spiritual': 'Wellness/Spirituell',
  'meditation': 'Wellness/Spirituell',

  // Networking/Business
  'networking': 'Networking/Business',
  'business': 'Networking/Business',
  'startup': 'Networking/Business',
  'startups': 'Networking/Business',
  'founders': 'Networking/Business',

  // Natur/Outdoor
  'natur': 'Natur/Outdoor',
  'nature': 'Natur/Outdoor',
  'hiking': 'Natur/Outdoor',
  'wandern': 'Natur/Outdoor',

  // Kultur/Traditionen
  'kultur': 'Kultur/Traditionen',
  'culture': 'Kultur/Traditionen',
  'tradition': 'Kultur/Traditionen',
  'traditionen': 'Kultur/Traditionen',

  // Märkte/Shopping
  'markt': 'Märkte/Shopping',
  'maerkte': 'Märkte/Shopping',
  'märkte': 'Märkte/Shopping',
  'market': 'Märkte/Shopping',
  'shopping': 'Märkte/Shopping',
  'flohmarkt': 'Märkte/Shopping',

  // Bildung/Lernen
  'bildung': 'Bildung/Lernen',
  'learning': 'Bildung/Lernen',
  'workshop': 'Bildung/Lernen',
  'seminar': 'Bildung/Lernen',

  // Soziales/Community
  'sozial': 'Soziales/Community',
  'soziales': 'Soziales/Community',
  'community': 'Soziales/Community',
  'volunteering': 'Soziales/Community',
  'volunteer': 'Soziales/Community',
  'charity': 'Soziales/Community'
};

/**
 * Normalisiert eine (auch freie) Kategorie auf die kanonische Form,
 * falls möglich. Gibt sonst den Original-Input zurück.
 */
export function normalizeCategory(input: string): string {
  if (!input) return input;
  const raw = input.trim();
  const lc = raw.toLowerCase();
  // direkter Treffer
  if (EVENT_CATEGORIES.includes(raw)) return raw;
  if (NORMALIZATION_MAP[lc]) return NORMALIZATION_MAP[lc];
  // fallback: exakte Lowercase-Zuordnung auf Kanon (selten)
  const direct = EVENT_CATEGORIES.find(c => c.toLowerCase() === lc);
  return direct || raw;
}

/**
 * Validiert & normalisiert Event-Liste (z.B. nach LLM Output).
 * Entfernt Events mit unbekannter Kategorie.
 */
export function validateAndNormalizeEvents<T extends { category?: string }>(events: T[]): T[] {
  return events
    .map(e => {
      const normalized = normalizeCategory(e.category || '');
      return { ...e, category: normalized };
    })
    .filter(e => isValidCategory(e.category || ''));
}