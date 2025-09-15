// Zentral gepflegte Event-Kategorien inkl. Subkategorien
// Diese Datei dient als Single Source of Truth für:
// - Prompt-Generierung (LLM Abfragen)
// - UI Dropdowns / Filter
// - Validierung eingehender Event-Daten

export const EVENT_CATEGORY_SUBCATEGORIES: Record<string, string[]> = {
  'DJ Sets/Electronic': [
    'Techno', 'House', 'Drum & Bass', 'Trance', 'EDM', 'Electro Swing', 'Dubstep', 'Minimal',
    'Goa/Psytrance', 'Retro', 'Local DJ', 'Acid', 'Progressive House', 'Hardstyle', 'Chillout',
    'Ambient', 'Synthwave', 'Future Bass', 'B2B-Set', 'Label Night', 'Club Resident', 'Deep House',
    'Tech House', 'Mashup', 'Electronica Live'
  ],
  'Clubs/Discos': [
    'Studentenparty', 'Ü30', 'After Work', 'Latin Nights', 'Gay Party', 'All Inclusive', 'Motto-Party',
    'Opening/Closing', 'Silent Disco', 'Black Music', 'Ladies Night', 'Karaoke', 'Dresscode Events',
    'RnB Night', 'White/Black Party', 'VIP Night', '90er Party', '2000er Party', 'Chartparty',
    'Club Geburtstag', 'Student Night', 'Hip-Hop', 'Dancehall', 'Mashup'
  ],
  'Live-Konzerte': [
    'Rock', 'Pop', 'Jazz', 'Blues', 'Indie', 'Metal', 'Singer-Songwriter', 'Hip-Hop', 'Klassik',
    'Folklore', 'Tribute Bands', 'Akustik', 'Punk', 'Soul', 'Gospel', 'Chorgesang', 'Orchester',
    'Kammermusik', 'Liedermacher', 'Nachwuchsbands', 'Open Mic', 'CD-Release', 'Folk', 'Funk',
    'Coverbands', 'Jazz Jam'
  ],
  'Open Air': [
    'Festivals', 'Stadtfeste', 'Picknick-Konzerte', 'Straßenfeste', 'Kino Open Air', 'Beach Events',
    'Gartenpartys', 'Street Food Open Air', 'Sommernacht', 'Tanz im Freien', 'Rooftop Events',
    'Sportevents', 'Public Viewing', 'Open Air Yoga', 'Kindersommerfest', 'Kultur im Park',
    'Silent Open Air', 'Lagerfeuerabend', 'Feuershow', 'Flohmarkt Open Air', 'Zeichnen im Freien',
    'Poetry Slam Open Air'
  ],
  'Museen': [
    'Kunstmuseum', 'Technikmuseum', 'Kindermuseum', 'Naturkundemuseum', 'Historisches Museum',
    'Spezialausstellung', 'Kunstvermittlung', 'Museumsführung', 'Nacht im Museum', 'Familienausstellung',
    'Mitmachmuseum', 'Wissenschaftsmuseum', 'Schatzkammer', 'Dino-Ausstellung', 'Römermuseum',
    'Sonderführung', 'Kreativworkshop', 'Alte Meister', 'Moderne/Gegenwart', 'Vernissage Museum',
    'Museumsquiz'
  ],
  'LGBTQ+': [
    'Pride Parade', 'Queer Party', 'Drag Show', 'Lesbenabend', 'Gay-Bar', 'Trans* Café',
    'Filmabend LGBTQ', 'Workshops', 'Community-Treffen', 'Netzwerkevents', 'Queer Stammtisch',
    'Queer Yoga', 'Infoabend HIV', 'Empowerment-Workshop', 'Regenbogenfamilien', 'Lesbenchor',
    'Queer Comedy', 'Awareness Night', 'Flirtparty', 'Queer Filmfest', 'Vortrag Queer',
    'Queer Literature Night'
  ],
  'Comedy/Kabarett': [
    'Stand-Up', 'Impro-Comedy', 'Politkabarett', 'Satire', 'Poetry Slam', 'Lesung', 'Mixed Show',
    'Comedy Open Mic', 'Sketchshow', 'Stand-Up Battle', 'Comedy Roast', 'Kabarettklassiker',
    'Nachwuchs-Comedians', 'Comedy-Musical', 'Comedy-Brunch', 'Pantomime', 'Improturnier',
    'Late Night Show', 'Satire-Show', 'Musik-Kabarett', 'Dinnershow', 'Parodie'
  ],
  'Theater/Performance': [
    'Bühne Klassik', 'Avantgarde', 'Straßentheater', 'Kindertheater', 'Musical', 'Tanztheater',
    'Improvisation', 'Autorenstücke', 'Jugendtheater', 'Oper', 'Monolog', 'Puppenspiel',
    'Performancekunst', 'Laientheater', 'Musiktheater', 'Märchentheater', 'Maskentheater',
    'Freilichttheater', 'Krimidinner', 'Theater-Workshop', 'Inklusives Theater', 'Gastspiel',
    'Lesetheater'
  ],
  'Film': [
    'Arthouse', 'Blockbuster', 'Filmpremiere', 'Retrospektive', 'Kurzfilm', 'Doku', 'Kinderkino',
    'Open Air Kino', 'Originalversion', 'Filmfestival', 'Special Screening', 'Sneak Preview',
    'Genrefilm', 'Serienmarathon', 'Animationsfilm', 'Filmgespräch', 'Regisseurbesuch', 'Trashfilmabend',
    'Kultfilm', 'Studentischer Film', 'Silent Movie', 'Filmquiz', 'Filmworkshop'
  ],
  'Food/Culinary': [
    'Streetfood', 'Weinverkostung', 'Kochkurs', 'Craft Beer', 'Brunch', 'Food Festival',
    'vegetarisch/vegan', 'Genussabend', 'Bauernmarkt', 'Cocktailabend', 'Grillparty', 'Backkurs',
    'Weinseminar', 'Slow Food', 'Sushi Workshop', 'Bierverkostung', 'Schokolade Tasting', 'Foodpairing',
    'Foodtruck', 'Dinner-Event', 'Fine Dining', 'Picknick', 'Spezialitätenmarkt'
  ],
  'Sport': [
    'Fußball', 'Eishockey', 'Basketball', 'Laufen', 'Yoga', 'Fitness', 'Kampfsport', 'Klettern',
    'Extremsport', 'Radrennen', 'Tanzen', 'Gruppenfitness', 'Schwimmen', 'Volleyball', 'Tennis',
    'Tischtennis', 'Badminton', 'Calisthenics', 'Skate', 'Parcours', 'Rugby', 'Triathlon', 'Marathon',
    'Pilates', 'Crossfit', 'Bowling', 'Dart', 'Golf', 'Wintersport'
  ],
  'Familien/Kids': [
    'Puppentheater', 'Zirkus', 'Kinderfest', 'Bastelworkshop', 'Familienbrunch', 'Erlebnisführung',
    'Lesung für Kinder', 'Kinderkino', 'Ausflüge', 'Ponyreiten', 'Ferienprogramm', 'Schnitzeljagd',
    'Kinderdisco', 'Familienyoga', 'Zaubershow', 'Märchenerzählen', 'Kindertanzen', 'Puppenbasteln',
    'Eltern-Kind-Treff', 'Science Kids', 'Naturerlebnis', 'Schul-Projektwoche', 'Bubble Football'
  ],
  'Kunst/Design': [
    'Ausstellung', 'Vernissage', 'Installation', 'Kunstmarkt', 'Upcycling', 'Workshops', 'Fotografie',
    'Grafik', 'Streetart', 'Performance', 'Designmarkt', 'Architekturführung', 'Malschule',
    'Kunstauktion', 'Urban Art', 'Skulptur', 'Aktzeichnen', 'Kunstgespräch', 'Kuratorenführung',
    'Produktdesign', 'Schmuckkunst', 'Design-Preis', 'Künstlergespräch', 'Schreibkunst'
  ],
  'Wellness/Spirituell': [
    'Meditation', 'Yoga', 'Klangreise', 'Massage', 'Retreat', 'Heilfasten', 'Achtsamkeitstraining',
    'Esoterikmesse', 'Aromaöl-Workshop', 'Ayurveda', 'Reiki', 'Tai-Chi', 'Qigong', 'Breathwork',
    'Edelsteinberatung', 'Schamanischer Abend', 'Frauenkreis', 'Kräuterseminar', 'Meditationsreise',
    'Detox Day', 'Selfcare Retreat', 'Singen', 'Gong-Nacht', 'Stretching', 'Schwitzhütte'
  ],
  'Networking/Business': [
    'Startup Pitch', 'Meetup', 'Recruiting', 'Gründerberatung', 'Branchentreff', 'Barcamp',
    'Konferenz', 'Coworking', 'Seminar', 'Podiumsdiskussion', 'Afterwork', 'Startup-Stammtisch',
    'Startup Brunch', 'Matching Event', 'Hackathon', 'Speed Networking', 'Gründerfrühstück',
    'Entrepreneurship Talk', 'Investorenmeeting', 'Female Founders', 'Innovation Day', 'Office Opening'
  ],
  'Natur/Outdoor': [
    'Wandern', 'Kräuterwanderung', 'Vogelbeobachtung', 'Kräuterkurs', 'Wildnistag', 'Outdoor Survival',
    'Campen', 'Fahrrad', 'Geocaching', 'Sternwanderung', 'Naturfotografie', 'Kanufahren', 'Pilzwanderung',
    'Bäume pflanzen', 'Urban Gardening', 'Bergsteigen', 'Obsternte', 'Bienen-Workshop', 'Moor-Exkursion',
    'CleanUp', 'Bootsverleih'
  ],
  'Kultur/Traditionen': [
    'Volksfest', 'Brauchtum', 'Trachtenball', 'Tanzabend', 'Weihnachtsmarkt', 'Osterfest', 'Umzug',
    'Adventsingen', 'Kulturtage', 'Handwerkskunst', 'Erntedankfest', 'Maibaumaufstellen',
    'Dreikönigsingen', 'Krampuslauf', 'Brauchtumsabend', 'Festumzug', 'Lichterfest', 'Dorferneuerung',
    'Sagenabend'
  ],
  'Märkte/Shopping': [
    'Flohmarkt', 'Designmarkt', 'Wochenmarkt', 'Vintage', 'Fashion', 'Kunsthandwerk', 'Pop-Up',
    'Bücherflohmarkt', 'Wintermarkt', 'Second Hand', 'Antikmarkt', 'Pflanzenmarkt', 'Stoffmarkt',
    'Schmuckmarkt', 'Ostermarkt', 'Künstlermarkt', 'Foodmarkt', 'Handmade', 'Bauernmarkt', 'Weihnachtsbazar'
  ],
  'Bildung/Lernen': [
    'Vortrag', 'Workshop', 'Sprachkurs', 'Seminar', 'Computerkurs', 'Fortbildung', 'Lesenacht',
    'Experimente', 'Wissensquiz', 'Podium', 'Elternabend', 'Wissenschaftsnacht', 'Coding Workshop',
    'Schülerkurs', 'Elternkurs', 'Lesekreis', 'Literaturkreis', 'Philosophieabend', 'MINT Event',
    'Schreibwerkstatt', 'Diskussionsabend', 'Exkursion'
  ],
  'Soziales/Community': [
    'Freiwilligenarbeit', 'Charity Event', 'Gemeindefest', 'Nachbarschaftscafé', 'Spendenlauf',
    'Diskussion', 'Selbsthilfegruppe', 'Repair Café', 'Seniorentreff', 'Streetwork', 'Freundeskreis',
    'Infoabend Integration', 'Nachbarschaftshilfe', 'Foodsharing', 'Umsonstladen', 'Umweltgruppe',
    'Familienberatung', 'Gemeinschaftsgarten', 'Tag der offenen Tür', 'Blutspende', 'Runde Tische'
  ]
};

export const EVENT_CATEGORIES = Object.keys(EVENT_CATEGORY_SUBCATEGORIES);

// Erzeugt nummerierte Liste für Prompt
export function buildCategoryListForPrompt(): string {
  return EVENT_CATEGORIES
    .map((cat, idx) => `${idx + 1}. ${cat}`)
    .join('\n');
}

// Kommagetrennte Liste für Schema
export function allowedCategoriesForSchema(): string {
  return EVENT_CATEGORIES.join(', ');
}

// Array-Version für Validierung
export function getAllowedCategories(): string[] {
  return [...EVENT_CATEGORIES];
}

// Optional: einfache Validierung einer Event-Kategorie
export function isValidCategory(category: string): boolean {
  return EVENT_CATEGORIES.includes(category);
}

// Optional: Subkategorie validieren (Case-sensitiv aktuell)
export function isValidSubcategory(category: string, sub: string): boolean {
  const subs = EVENT_CATEGORY_SUBCATEGORIES[category];
  return Array.isArray(subs) && subs.includes(sub);
}