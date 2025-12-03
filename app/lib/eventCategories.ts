// Single Source of Truth for event categories, subcategories and normalization
// NEUE 12-KATEGORIEN-STRUKTUR (ohne Business & Networking)

export const EVENT_CATEGORY_SUBCATEGORIES: Record<string, string[]> = {
  // 1. Clubs & Nachtleben 🎵 - Fokus: Elektronische Musik, DJs, Partys, Clubs, Bars
  "Clubs & Nachtleben": [
    "DJ Event", "Club Music", "Dance Music", "Electronic Music",
    "Techno/House/EDM", "Drum & Bass", "Trance/Psytrance", "Ambient/Downtempo",
    "Night Out", "Dancing Event", "Party Event", "Club Party",
    "Underground Venues", "Rooftop Parties", "Beach Clubs", "After-Hours",
    "Nightclub", "Disco", "Rave", "Bar Events", "Lounge Events",
    "Clubs & Nachtleben"
  ],

  // 2. Live-Konzerte 🎸 - Fokus: Rock, Pop, Jazz, World Music, Hip-Hop (NICHT klassisch)
  "Live-Konzerte": [
    "Live Music", "Concert", "Live Show", "Musical Performance",
    "Rock/Pop/Indie", "Hip-Hop/Rap", "Heavy Music", "Metal",
    "Singer-Songwriter", "World Music", "Folk/Acoustic",
    "Jazz/Soul/Funk", "Blues", "Reggae/Dub", "Latin Music",
    "R&B/Soul", "Alternative/Indie", "Punk/Hardcore",
    "Live Band", "Concert Hall", "Music Venue",
    "Live-Konzerte"
  ],

  // 3. Klassik & Oper 🎻 - Fokus: Oper, klassische Konzerte, Kammermusik, Orchester
  "Klassik & Oper": [
    "Opera", "Oper", "Classical Concert", "Orchestral Performance",
    "Classical/Orchestral", "Chamber Music", "Kammermusik",
    "Symphony Orchestra", "Philharmonic", "String Quartet",
    "Piano Recital", "Violin Concert", "Organ Concert",
    "Baroque Music", "Contemporary Classical", "Opera Festival",
    "Classical Music", "Concert Hall Performance",
    "Klassik & Oper"
  ],

  // 4. Theater & Comedy 🎭 - Fokus: Musicals, Theater, Comedy, Performance Art (OHNE Drag)
  "Theater & Comedy": [
    "Theater", "Theatre", "Stage Show", "Drama Productions",
    "Musicals", "Musical Theater", "Broadway Show",
    "Dance/Ballet/Contemporary", "Modern Dance", "Ballet Performance",
    "Performance Art/Experimental", "Physical Theater",
    "Puppetry", "One-Man Shows", "Storytelling", "Street Theater",
    "Comedy Show", "Stand-up Comedy", "Stand-up Event",
    "Improv Comedy", "Improv/Comedy Theater", "Political Satire",
    "Kabarett", "Sketch Comedy",
    "Theater & Comedy"
  ],

  // 5. Museen & Ausstellungen 🏛️ - Fokus: Museen, Galerien, Ausstellungen, Kunst
  "Museen & Ausstellungen": [
    "Museum Event", "Exhibition", "Cultural Visit", "Museen & Ausstellungen",
    "Special Exhibitions", "Permanent Collections", "Museum Tours",
    "Late Night Museum", "Interactive Exhibits",
    "Archaeology", "Science Exhibitions", "Historical Shows",
    "Photography Exhibitions", "Design Exhibitions", "Media Art",
    "Modern Art Collections", "Sculpture Exhibitions",
    "Museum Workshops", "Curator Talks",
    "Art Event", "Gallery Visit", "Gallery Openings",
    "Street Art", "Contemporary Art", "Fine Arts"
  ],

  // 6. Film & Kino 🎬 - Fokus: Filme, Kino, Screenings, Film-Festivals
  "Film & Kino": [
    "Film Event", "Movie Screening", "Cinema Experience", "Film Festival",
    "Premieres", "Film Premiere", "Movie Premiere",
    "Outdoor Screenings", "Open Air Cinema", "Drive-In Cinema",
    "Director Q&As", "Film Discussion", "Film Talk",
    "Short Films", "Documentary Screenings", "Documentary Film",
    "Independent Cinema", "Arthouse/Indie", "Art Film",
    "Classic Films", "Film Classics", "Silent Films",
    "Animation Festivals", "Animated Films", "Cult Classics",
    "Film & Kino"
  ],

  // 7. Open Air & Festivals 🎪 - Fokus: Outdoor-Events, Festivals, öffentliche Veranstaltungen
  "Open Air & Festivals": [
    "Outdoor Event", "Festival", "Public Event", "Outdoor Activity",
    "Open Air & Festivals", "Music Festival", "Summer Festival",
    "Outdoor Performances", "Street Festival", "City Festival",
    "Beer Gardens Events", "Biergarten", "Garden Party",
    "Lantern Festivals", "Light Festival", "Harbor/Lake Events",
    "Fire Shows", "Sunset Sessions", "Night Markets",
    "Art in the Park", "Festival Events", "City Events",
    "Nature Activity", "Outdoor Adventure", "Park Events",
    "Beach Activities", "Picnic Events", "Outdoor Concert"
  ],

  // 8. Kulinarik & Märkte 🍽️🛍️ - Fokus: Food, Getränke, Märkte, Shopping, Verkostungen
  "Kulinarik & Märkte": [
    // Food & Culinary
    "Food Event", "Tasting", "Dining Experience", "Culinary Event",
    "Beverage Tastings", "Wine Tasting", "Beer Tasting",
    "Beer Events/Beer Festivals", "Craft Beer Festival",
    "Cooking Classes", "Chef Workshop", "Culinary Workshop",
    "Food Markets", "Street Food Market", "Food Festival",
    "Restaurant Experiences", "Dinner Event", "Gourmet Dinner",
    "Culinary Festivals", "Food Tours", "Cocktail Events",
    "Coffee Culture", "Coffee Tasting", "Tea Ceremony",
    "Vegan/Vegetarian Events", "Plant-Based Food",
    "International Cuisine", "Local Specialties",
    "Food & Music Pairings", "Gourmet Events", "Street Food",
    "Chef Demonstrations", "Food Truck Event",
    // Markets & Shopping
    "Market Event", "Shopping Experience", "Retail Event", "Bazaar",
    "Flohmarkt/Flea Markets", "Flea Market", "Vintage Market",
    "Vintage Markets", "Handmade Markets", "Craft Market",
    "Antique Fairs", "Antique Market", "Collectors Market",
    "Shopping Events", "Pop-up Shops", "Pop-Up Store",
    "Designer Markets", "Design Fair", "Art Market",
    "Book Markets", "Book Fair", "Literary Market",
    "Record Fairs", "Vinyl Market", "Music Market",
    "Seasonal Markets", "Christmas Market", "Easter Market",
    "Craft Bazaars", "Handmade Fair", "Artisan Market",
    "Farmers Market", "Organic Market", "Local Producers",
    "Kulinarik & Märkte"
  ],

  // 9. Sport & Fitness ⚽ - Fokus: Sport, Fitness, Bewegung, Wellness
  "Sport & Fitness": [
    "Sports Event", "Athletic Activity", "Fitness Class", "Recreational Sport",
    "Sport & Fitness", "Sporting Event", "Sports Competition",
    "Football/Soccer", "Basketball", "Volleyball", "Tennis",
    "Running Events", "Marathon/Races", "Half Marathon", "Fun Run",
    "Cycling", "Bike Race", "Cycling Tour", "Mountain Biking",
    "Yoga", "Yoga Class", "Outdoor Yoga", "Meditation Yoga",
    "Team Sports", "Water Sports", "Swimming", "Sailing",
    "Martial Arts", "Boxing", "Karate", "Taekwondo",
    "Climbing/Bouldering", "Rock Climbing", "Indoor Climbing",
    "E-Sports", "Gaming Tournament", "Video Game Competition",
    "Dance Sports", "Zumba", "Dance Fitness",
    "Extreme Sports", "Skateboarding", "Parkour",
    "CrossFit", "Strength Training", "HIIT",
    "Wellness Event", "Fitness", "Health & Wellness",
    "Meditation", "Mindfulness", "Spa Event"
  ],

  // 10. Bildung & Workshops 📚 - Fokus: Bildung, Workshops, Vorträge, Seminare, Lernen
  "Bildung & Workshops": [
    // Educational/Cultural
    "Cultural Event", "Traditional Celebration", "Heritage Event",
    "Traditional Festivals", "Historical Reenactments", "Folk Events",
    "Heritage Tours", "Local Traditions", "Cultural Workshops",
    // Education/Learning
    "Educational Event", "Learning Experience", "Science Activity",
    "Academic Lecture", "Educational Experience",
    "University Lectures", "Public Talks", "Guest Lecture",
    "Workshops/Seminars", "Workshop", "Seminar", "Training",
    "Tech Talks", "Technology Workshop", "Coding Workshop",
    "Book Discussions", "Reading Event", "Literary Event",
    "Language Classes", "Language Exchange", "Language Learning",
    "STEM Events", "Science Workshop", "STEM Education",
    "Skill Development", "Professional Development",
    "Creative Workshop", "Art Workshop", "Craft Workshop",
    "DIY Workshop", "Maker Space", "Hackathon",
    // Business events now go here (previously Business & Networking)
    "Business Event", "Professional Networking", "Career Development",
    "Industry Meetup", "Conferences/Summits", "Networking Mixers",
    "Startup Events", "Career Fairs", "Webinars/Talks",
    "Business Breakfasts", "Expo/Trade Shows", "Corporate Events",
    "Leadership Forums", "Entrepreneurship", "Coworking Events",
    "Bildung & Workshops"
  ],

  // 11. Familie & Kinder 👨‍👩‍👧‍👦 - Fokus: Familien-Events, Kinder-Programme
  "Familie & Kinder": [
    "Family Event", "Kids Activity", "Children's Program", "Family Fun",
    "Familie & Kinder", "Family-Friendly Event", "All Ages",
    "Children Events", "Kids Event", "Children's Entertainment",
    "Family Festivals", "Family Day", "Family Concert",
    "Kids Workshops", "Children's Workshop", "Kids Craft",
    "Educational Activities", "Learning for Kids", "Science Kids",
    "Interactive Shows", "Children's Show", "Kids Performance",
    "Science for Kids", "Hands-on Science", "STEM Kids",
    "Storytime", "Children's Story", "Reading Time",
    "Puppet Shows", "Puppet Theater", "Marionette Show",
    "Family Theater", "Children's Theater", "Kids Play",
    "Parent-Child Activities", "Family Bonding", "Family Time",
    "Outdoor Play", "Playground Event", "Nature Kids",
    "Creative Learning", "Arts & Crafts Kids", "Creative Kids",
    "Cultural Kids Programs", "Music for Kids", "Dance Kids",
    "Nature Discovery", "Wildlife Kids", "Environmental Education"
  ],

  // 12. LGBTQ+ 🏳️‍🌈 - Fokus: Pride, Queer Community, Gay/Lesbian Events, Drag (jetzt hier!)
  "LGBTQ+": [
    "Pride Events", "Pride Festival", "Pride Parade", "Pride Month",
    "Queer Parties", "Queer Event", "Queer Community",
    "Gay Events", "Gay Party", "Gay Club Night",
    "Lesbian Events", "Lesbian Party", "Lesbian Meetup",
    "LGBTQ+ Community", "LGBTQIA+ Events", "Rainbow Community",
    "Transgender Events", "Trans Support", "Trans Community",
    "Bisexual Events", "Bi Meetup", "Bi Community",
    "Non-binary Events", "Non-Binary Support", "Genderqueer",
    "Inclusive Spaces", "Safe Space", "Diversity Events",
    "Rainbow Events", "Pride Celebration",
    // Drag (NEU hier!)
    "Drag Shows", "Drag Performance", "Drag Queen Show",
    "Drag Brunches", "Drag Brunch", "Sunday Drag Brunch",
    "Drag King Show", "Drag Competition", "Drag Race Event",
    // Entertainment/Culture
    "Queer Theater", "LGBTQ+ Theater", "Queer Performance",
    "Gay Clubs", "Queer Nightlife", "Rainbow Club",
    "Lesbian Bars", "Queer Bar", "LGBTQ+ Venue",
    "Pride Concerts", "Queer Music", "Rainbow Concert",
    "LGBTQ+ Art", "Queer Art", "Rainbow Art Exhibition",
    "Queer Comedy", "LGBTQ+ Comedy", "Gay Comedy Night",
    "Rainbow Markets", "Pride Market", "Queer Fair",
    "Gay Sports", "LGBTQ+ Sports", "Queer Athletics",
    "LGBTQ+ Film", "Queer Cinema", "Gay Film Festival",
    "Queer Literature", "LGBTQ+ Books", "Rainbow Reading",
    "Pride Parties", "Rainbow Party", "Queer Dance Party",
    "Gay Karaoke", "Queer Karaoke", "Rainbow Karaoke",
    "Queer Dance", "LGBTQ+ Dance Party",
    // Community/Support
    "Coming Out Support", "LGBTQ+ Support Group",
    "LGBTQ+ Meetups", "Queer Social", "Rainbow Meetup",
    "Queer Networking", "LGBTQ+ Networking", "Pride Networking",
    "Pride Organizations", "LGBTQ+ Advocacy", "Rainbow NGO",
    "LGBTQ+ Volunteering", "Queer Charity", "Pride Volunteer",
    "Trans Support Groups", "Transgender Support", "Trans Meetup",
    "LGBTQ+"
  ]
};

export const EVENT_CATEGORIES = Object.keys(EVENT_CATEGORY_SUBCATEGORIES);

// Massiv erweiterte Token-Normalisierung für die neue 12-Kategorien-Struktur
export const NORMALIZATION_TOKEN_MAP: Record<string,string> = {
  // 1. Clubs & Nachtleben - Electronic/DJ/Party
  "techno":"Clubs & Nachtleben","edm":"Clubs & Nachtleben","house":"Clubs & Nachtleben","trance":"Clubs & Nachtleben",
  "minimal":"Clubs & Nachtleben","hardstyle":"Clubs & Nachtleben","hardcore":"Clubs & Nachtleben","breakbeat":"Clubs & Nachtleben",
  "dubstep":"Clubs & Nachtleben","electronic":"Clubs & Nachtleben","future":"Clubs & Nachtleben","goa":"Clubs & Nachtleben",
  "elektro":"Clubs & Nachtleben","elektronisch":"Clubs & Nachtleben","dj":"Clubs & Nachtleben","deejay":"Clubs & Nachtleben",
  "club":"Clubs & Nachtleben","clubs":"Clubs & Nachtleben","party":"Clubs & Nachtleben","parties":"Clubs & Nachtleben",
  "disco":"Clubs & Nachtleben","nightclub":"Clubs & Nachtleben","nightlife":"Clubs & Nachtleben","rave":"Clubs & Nachtleben",
  "after-hour":"Clubs & Nachtleben","afterhours":"Clubs & Nachtleben","dancing":"Clubs & Nachtleben","tanzen":"Clubs & Nachtleben",
  "bar":"Clubs & Nachtleben","bars":"Clubs & Nachtleben","lounge":"Clubs & Nachtleben","pub":"Clubs & Nachtleben","pubs":"Clubs & Nachtleben",
  "feier":"Clubs & Nachtleben","feiern":"Clubs & Nachtleben","nacht":"Clubs & Nachtleben","night":"Clubs & Nachtleben",
  
  // 2. Live-Konzerte - Rock, Pop, Jazz, World Music, Hip-Hop
  "konzert":"Live-Konzerte","concert":"Live-Konzerte","concerts":"Live-Konzerte","konzerte":"Live-Konzerte",
  "live":"Live-Konzerte","livemusic":"Live-Konzerte","liveband":"Live-Konzerte",
  "jazz":"Live-Konzerte","rock":"Live-Konzerte","pop":"Live-Konzerte","indie":"Live-Konzerte",
  "hip-hop":"Live-Konzerte","hiphop":"Live-Konzerte","rap":"Live-Konzerte","metal":"Live-Konzerte",
  "blues":"Live-Konzerte","reggae":"Live-Konzerte","funk":"Live-Konzerte","soul":"Live-Konzerte",
  "singer-songwriter":"Live-Konzerte","acoustic":"Live-Konzerte","folk":"Live-Konzerte",
  "worldmusic":"Live-Konzerte","latin":"Live-Konzerte","r&b":"Live-Konzerte",
  "musik":"Live-Konzerte","music":"Live-Konzerte",
  
  // 3. Klassik & Oper - Classical, Orchestra, Opera
  "klassik":"Klassik & Oper","classical":"Klassik & Oper","klassisch":"Klassik & Oper",
  "oper":"Klassik & Oper","opera":"Klassik & Oper","operette":"Klassik & Oper",
  "orchester":"Klassik & Oper","orchestra":"Klassik & Oper","philharmonie":"Klassik & Oper","philharmonic":"Klassik & Oper",
  "symphonie":"Klassik & Oper","symphony":"Klassik & Oper","kammermusik":"Klassik & Oper","chamber":"Klassik & Oper",
  "klavier":"Klassik & Oper","piano":"Klassik & Oper","violine":"Klassik & Oper","violin":"Klassik & Oper",
  "barock":"Klassik & Oper","baroque":"Klassik & Oper","orgel":"Klassik & Oper","organ":"Klassik & Oper",
  
  // 4. Theater & Comedy
  "theater":"Theater & Comedy","theatre":"Theater & Comedy","bühne":"Theater & Comedy","stage":"Theater & Comedy",
  "musical":"Theater & Comedy","musicals":"Theater & Comedy","broadway":"Theater & Comedy",
  "ballett":"Theater & Comedy","ballet":"Theater & Comedy","dance":"Theater & Comedy","tanz":"Theater & Comedy",
  "comedy":"Theater & Comedy","kabarett":"Theater & Comedy","standup":"Theater & Comedy","stand-up":"Theater & Comedy",
  "improv":"Theater & Comedy","humor":"Theater & Comedy","funny":"Theater & Comedy","witzig":"Theater & Comedy",
  "performance":"Theater & Comedy","show":"Theater & Comedy","shows":"Theater & Comedy",
  "schauspiel":"Theater & Comedy","drama":"Theater & Comedy",
  
  // 5. Museen & Ausstellungen - Art, Museums, Galleries
  "museum":"Museen & Ausstellungen","museen":"Museen & Ausstellungen",
  "exhibition":"Museen & Ausstellungen","ausstellung":"Museen & Ausstellungen","ausstellungen":"Museen & Ausstellungen",
  "gallery":"Museen & Ausstellungen","galerie":"Museen & Ausstellungen","galerien":"Museen & Ausstellungen",
  "kunst":"Museen & Ausstellungen","art":"Museen & Ausstellungen","design":"Museen & Ausstellungen",
  "creative":"Museen & Ausstellungen","kreativ":"Museen & Ausstellungen","artistic":"Museen & Ausstellungen",
  "sammlung":"Museen & Ausstellungen","collection":"Museen & Ausstellungen",
  
  // 6. Film & Kino
  "film":"Film & Kino","films":"Film & Kino","movie":"Film & Kino","movies":"Film & Kino",
  "cinema":"Film & Kino","kino":"Film & Kino",
  "screening":"Film & Kino","screenings":"Film & Kino","premiere":"Film & Kino","premieres":"Film & Kino",
  "dokumentation":"Film & Kino","documentary":"Film & Kino",
  
  // 7. Open Air & Festivals
  "festival":"Open Air & Festivals","festivals":"Open Air & Festivals",
  "openair":"Open Air & Festivals","open-air":"Open Air & Festivals",
  "outdoor":"Open Air & Festivals","draußen":"Open Air & Festivals",
  "biergarten":"Open Air & Festivals","beergarden":"Open Air & Festivals",
  "sommerfest":"Open Air & Festivals","stadtfest":"Open Air & Festivals",
  "hiking":"Open Air & Festivals","wandern":"Open Air & Festivals","nature":"Open Air & Festivals","natur":"Open Air & Festivals",
  "park":"Open Air & Festivals","garden":"Open Air & Festivals","garten":"Open Air & Festivals",
  
  // 8. Kulinarik & Märkte - Food, Markets, Shopping
  "food":"Kulinarik & Märkte","essen":"Kulinarik & Märkte","culinary":"Kulinarik & Märkte","kulinarisch":"Kulinarik & Märkte",
  "wein":"Kulinarik & Märkte","wine":"Kulinarik & Märkte","beer":"Kulinarik & Märkte","bier":"Kulinarik & Märkte",
  "cocktail":"Kulinarik & Märkte","cocktails":"Kulinarik & Märkte",
  "restaurant":"Kulinarik & Märkte","restaurants":"Kulinarik & Märkte","cafe":"Kulinarik & Märkte","cafes":"Kulinarik & Märkte",
  "brunch":"Kulinarik & Märkte","dinner":"Kulinarik & Märkte","lunch":"Kulinarik & Märkte","breakfast":"Kulinarik & Märkte",
  "tasting":"Kulinarik & Märkte","verkostung":"Kulinarik & Märkte",
  "kochen":"Kulinarik & Märkte","cooking":"Kulinarik & Märkte","gourmet":"Kulinarik & Märkte",
  "markt":"Kulinarik & Märkte","market":"Kulinarik & Märkte","märkte":"Kulinarik & Märkte","markets":"Kulinarik & Märkte",
  "shopping":"Kulinarik & Märkte","flohmarkt":"Kulinarik & Märkte","fleamarket":"Kulinarik & Märkte",
  "vintage":"Kulinarik & Märkte","antique":"Kulinarik & Märkte","antik":"Kulinarik & Märkte",
  "bazar":"Kulinarik & Märkte","bazaar":"Kulinarik & Märkte",
  "weihnachtsmarkt":"Kulinarik & Märkte","christmasmarket":"Kulinarik & Märkte",
  
  // 9. Sport & Fitness
  "sport":"Sport & Fitness","sports":"Sport & Fitness","fitness":"Sport & Fitness","training":"Sport & Fitness",
  "competition":"Sport & Fitness","wettkampf":"Sport & Fitness","match":"Sport & Fitness","game":"Sport & Fitness",
  "yoga":"Sport & Fitness","pilates":"Sport & Fitness","crossfit":"Sport & Fitness",
  "marathon":"Sport & Fitness","running":"Sport & Fitness","laufen":"Sport & Fitness",
  "schwimmen":"Sport & Fitness","swimming":"Sport & Fitness","radfahren":"Sport & Fitness","cycling":"Sport & Fitness",
  "esports":"Sport & Fitness","gaming":"Sport & Fitness",
  "wellness":"Sport & Fitness","meditation":"Sport & Fitness","spa":"Sport & Fitness","mindfulness":"Sport & Fitness",
  
  // 10. Bildung & Workshops (including former Business & Networking)
  "workshop":"Bildung & Workshops","workshops":"Bildung & Workshops",
  "seminar":"Bildung & Workshops","seminars":"Bildung & Workshops","seminare":"Bildung & Workshops",
  "course":"Bildung & Workshops","courses":"Bildung & Workshops","kurs":"Bildung & Workshops","kurse":"Bildung & Workshops",
  "learning":"Bildung & Workshops","bildung":"Bildung & Workshops","education":"Bildung & Workshops","lernen":"Bildung & Workshops",
  "talk":"Bildung & Workshops","talks":"Bildung & Workshops","vortrag":"Bildung & Workshops","vorträge":"Bildung & Workshops",
  "lecture":"Bildung & Workshops","lectures":"Bildung & Workshops",
  "hackathon":"Bildung & Workshops","skill":"Bildung & Workshops","skills":"Bildung & Workshops",
  "kultur":"Bildung & Workshops","culture":"Bildung & Workshops","tradition":"Bildung & Workshops",
  "heritage":"Bildung & Workshops","traditional":"Bildung & Workshops","kulturell":"Bildung & Workshops","cultural":"Bildung & Workshops",
  // Business/Networking now goes to Bildung & Workshops
  "startup":"Bildung & Workshops","business":"Bildung & Workshops","networking":"Bildung & Workshops",
  "meetup":"Bildung & Workshops","meeting":"Bildung & Workshops","treffen":"Bildung & Workshops",
  "conference":"Bildung & Workshops","konferenz":"Bildung & Workshops","pitch":"Bildung & Workshops",
  "professional":"Bildung & Workshops","profi":"Bildung & Workshops","career":"Bildung & Workshops",
  
  // 11. Familie & Kinder
  "family":"Familie & Kinder","familie":"Familie & Kinder","kids":"Familie & Kinder","kinder":"Familie & Kinder",
  "children":"Familie & Kinder","child":"Familie & Kinder","kind":"Familie & Kinder",
  "teen":"Familie & Kinder","teens":"Familie & Kinder","teenager":"Familie & Kinder","jugendliche":"Familie & Kinder",
  "familientag":"Familie & Kinder","familyday":"Familie & Kinder",
  "kindertheater":"Familie & Kinder","puppet":"Familie & Kinder","puppets":"Familie & Kinder",
  
  // 12. LGBTQ+ (now includes Drag)
  "queer":"LGBTQ+","pride":"LGBTQ+","gay":"LGBTQ+","lesbian":"LGBTQ+","lgbt":"LGBTQ+","lgbtq":"LGBTQ+","lgbtqia":"LGBTQ+",
  "drag":"LGBTQ+","dragqueen":"LGBTQ+","dragking":"LGBTQ+","dragshow":"LGBTQ+","dragbrunch":"LGBTQ+",
  "trans":"LGBTQ+","transgender":"LGBTQ+","bisexual":"LGBTQ+","inclusive":"LGBTQ+","rainbow":"LGBTQ+",
  
  // General fallbacks (default to Open Air & Festivals for generic event terms)
  "event":"Open Air & Festivals","events":"Open Air & Festivals",
  "veranstaltung":"Open Air & Festivals","veranstaltungen":"Open Air & Festivals",
  "location":"Open Air & Festivals","locations":"Open Air & Festivals",
  "venue":"Open Air & Festivals","venues":"Open Air & Festivals",
  
  // Time/format defaults
  "evening":"Clubs & Nachtleben","afternoon":"Open Air & Festivals","morning":"Sport & Fitness",
  "weekend":"Open Air & Festivals","weekday":"Bildung & Workshops",
  "online":"Bildung & Workshops","virtual":"Bildung & Workshops","livestream":"Film & Kino",
  "interactive":"Bildung & Workshops","interaktiv":"Bildung & Workshops","hands-on":"Bildung & Workshops",
  
  // Level/Audience
  "beginner":"Bildung & Workshops","anfänger":"Bildung & Workshops","basic":"Bildung & Workshops",
  "advanced":"Bildung & Workshops","expert":"Bildung & Workshops",
  "adult":"Bildung & Workshops","adults":"Bildung & Workshops","erwachsene":"Bildung & Workshops",
  "senior":"Bildung & Workshops","seniors":"Bildung & Workshops","senioren":"Bildung & Workshops",
  
  // Free events
  "free":"Open Air & Festivals","kostenlos":"Open Air & Festivals","gratis":"Open Air & Festivals",
  
  // Fallback for unknown terms - default to Open Air & Festivals (most general)
  "unknown":"Open Air & Festivals","other":"Open Air & Festivals","misc":"Open Air & Festivals","sonstiges":"Open Air & Festivals"
};

export function normalizeCategory(input: string): string {
  if (!input || typeof input !== 'string') return input;
  const trimmed = input.trim();
  if (!trimmed) return trimmed;
  
  // 1. Exact category match
  if (EVENT_CATEGORY_SUBCATEGORIES[trimmed]) return trimmed;
  
  // 2. Direct token mapping
  const lower = trimmed.toLowerCase();
  if (NORMALIZATION_TOKEN_MAP[lower]) return NORMALIZATION_TOKEN_MAP[lower];
  
  // 3. Subcategory exact match
  for (const [main, subs] of Object.entries(EVENT_CATEGORY_SUBCATEGORIES)) {
    if (subs.some(s => s.toLowerCase() === lower)) return main;
  }
  
  // 4. Partial string matching (contains keywords)
  for (const [token, category] of Object.entries(NORMALIZATION_TOKEN_MAP)) {
    if (lower.includes(token)) return category;
  }
  
  // 5. Multi-token analysis
  const words = lower.split(/\s+/);
  const categoryScores: Record<string, number> = {};
  
  for (const word of words) {
    if (NORMALIZATION_TOKEN_MAP[word]) {
      const cat = NORMALIZATION_TOKEN_MAP[word];
      categoryScores[cat] = (categoryScores[cat] || 0) + 1;
    }
  }
  
  if (Object.keys(categoryScores).length > 0) {
    const bestCategory = Object.entries(categoryScores)
      .sort(([,a], [,b]) => b - a)[0][0];
    return bestCategory;
  }
  
  // 6. Case-insensitive category match
  const lc = EVENT_CATEGORIES.find(c => c.toLowerCase() === lower);
  if (lc) return lc;
  
  // 7. Fallback to "LGBTQ+"
  return "LGBTQ+";
}

// Enhanced validation with fallback
export function isValidCategory(category: string): boolean {
  return !!category && !!EVENT_CATEGORY_SUBCATEGORIES[category];
}

export function validateAndNormalizeEvents(events: any[]): any[] {
  if (!Array.isArray(events)) return [];
  return events
    .filter(e => e && typeof e === 'object')
    .map(e => {
      if (e.category) {
        const norm = normalizeCategory(e.category);
        e.category = norm; // Always assign normalized category (including fallback)
      } else {
        e.category = "Open Air & Festivals"; // Default for events without category (most general)
      }
      return e;
    });
  // Removed filter - now all events are kept with appropriate categories
}

// Build list for prompts
export function buildCategoryListForPrompt(): string {
  return EVENT_CATEGORIES.map((c,i)=>`${i+1}. ${c}`).join('\n');
}

export function allowedCategoriesForSchema(): string {
  return EVENT_CATEGORIES.join(', ');
}

// New helper: map arbitrary (sub)category list → unique main categories
export function mapToMainCategories(list: string[]): string[] {
  const set = new Set<string>();
  for (const c of list || []) {
    const norm = normalizeCategory(c);
    if (EVENT_CATEGORY_SUBCATEGORIES[norm]) set.add(norm);
  }
  return Array.from(set);
}

// Get subcategories of a main category
export function getSubcategories(main: string): string[] {
  return EVENT_CATEGORY_SUBCATEGORIES[main] || [];
}

// Build expanded prompt block for a main category with subcategories
export function buildExpandedCategoryContext(main: string): string {
  const subs = getSubcategories(main).filter(s => s !== main);
  return `Main Category: ${main}
Subcategories (semantic variations & niche forms):
${subs.map(s => `- ${s}`).join('\n')}

Instructions:
1. Consider ALL subcategory nuances above.
2. Include events that clearly belong to the category but may use alternative naming.
3. Aim for diversity (venues, formats, audiences).
4. Use fuzzy matching for similar terms.
5. Consider context clues (time, location, description).`;
}

// New: Smart category suggestion based on multiple signals
export function suggestCategoryFromContext(
  title: string = "", 
  description: string = "", 
  venue: string = "", 
  time: string = ""
): string {
  const combinedText = `${title} ${description} ${venue}`.toLowerCase();
  
  // Time-based hints
  if (time) {
    const hour = parseInt(time.split(':')[0]);
    if (hour >= 22 || hour <= 4) {
      // Late night events likely clubs/discos
      if (combinedText.includes('music') || combinedText.includes('party') || combinedText.includes('dj')) {
        return "Clubs & Nachtleben";
      }
    }
    if (hour >= 6 && hour <= 10) {
      // Morning events likely wellness/fitness or business
      if (combinedText.includes('meditation') || combinedText.includes('yoga')) {
        return "Sport & Fitness";
      }
      if (combinedText.includes('meeting') || combinedText.includes('breakfast') || combinedText.includes('networking')) {
        return "Bildung & Workshops";
      }
    }
  }
  
  // Venue-based hints
  const venueLower = venue.toLowerCase();
  if (venueLower.includes('club') || venueLower.includes('bar') || venueLower.includes('disco')) {
    return "Clubs & Nachtleben";
  }
  if (venueLower.includes('museum') || venueLower.includes('galerie') || venueLower.includes('gallery')) {
    return "Museen & Ausstellungen";
  }
  if (venueLower.includes('theater') || venueLower.includes('theatre') || venueLower.includes('bühne')) {
    return "Theater & Comedy";
  }
  if (venueLower.includes('oper') || venueLower.includes('staatsoper') || venueLower.includes('konzerthaus') || venueLower.includes('philharmonie')) {
    return "Klassik & Oper";
  }
  if (venueLower.includes('kino') || venueLower.includes('cinema')) {
    return "Film & Kino";
  }
  if (venueLower.includes('stadion') || venueLower.includes('arena') || venueLower.includes('gym') || venueLower.includes('fitness')) {
    return "Sport & Fitness";
  }
  
  // Fallback to normal normalization
  return normalizeCategory(combinedText);
}

// Legacy category mapping for backward compatibility
export const LEGACY_CATEGORY_MAP: Record<string, string> = {
  "Musik & Nachtleben": "Clubs & Nachtleben",
  "Theater/Performance": "Theater & Comedy",
  "Food & Culinary": "Kulinarik & Märkte",
  "Märkte & Shopping": "Kulinarik & Märkte",
  "Kultur & Bildung": "Bildung & Workshops",
  "Business & Networking": "Bildung & Workshops",
  // Direct mappings (no change needed)
  "Museen & Ausstellungen": "Museen & Ausstellungen",
  "Film & Kino": "Film & Kino",
  "Open Air & Festivals": "Open Air & Festivals",
  "Sport & Fitness": "Sport & Fitness",
  "Familie & Kinder": "Familie & Kinder",
  "LGBTQ+": "LGBTQ+",
  // New categories map to themselves
  "Clubs & Nachtleben": "Clubs & Nachtleben",
  "Live-Konzerte": "Live-Konzerte",
  "Klassik & Oper": "Klassik & Oper",
  "Theater & Comedy": "Theater & Comedy",
  "Kulinarik & Märkte": "Kulinarik & Märkte",
  "Bildung & Workshops": "Bildung & Workshops"
};

// Helper to migrate old categories to new structure
export function migrateToNewCategory(oldCategory: string): string {
  if (LEGACY_CATEGORY_MAP[oldCategory]) {
    return LEGACY_CATEGORY_MAP[oldCategory];
  }
  // If not in legacy map, try to normalize
  return normalizeCategory(oldCategory);
}
