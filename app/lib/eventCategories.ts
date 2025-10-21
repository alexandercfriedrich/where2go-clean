// Single Source of Truth for event categories, subcategories and normalization
// Optimiert für maximale Event-Erfassung und bessere Kategorisierung

export const EVENT_CATEGORY_SUBCATEGORIES: Record<string, string[]> = {
  "Musik & Nachtleben": [
    "Live Music","Concert","Musical Performance","Live Show","Musik & Nachtleben",
    "Rock/Pop/Indie","Hip-Hop/Rap","Classical/Orchestral","Heavy Music",
    "Singer-Songwriter","World Music","Folk/Acoustic","Jazz/Soul/Funk",
    "Reggae/Dub","Latin Music","Electronic Music","DJ Event","Dance Music","Club Music",
    "Techno/House/EDM","Drum & Bass","Trance/Psytrance","Ambient/Downtempo",
    "Musik & Nachtleben","Night Out","Dancing Event","Party Event","Musik & Nachtleben",
    "Underground Venues","Rooftop Parties","Beach Clubs","After-Hours"
  ],
  "Theater/Performance": [
    "Live Performance","Stage Show","Entertainment","Performing Arts",
    "Musicals","Opera/Oper","Dance/Ballet/Contemporary","Performance Art/Experimental",
    "Puppetry","One-Man Shows","Storytelling","Street Theater",
    "Drama Productions","Classical Theater","Improv/Comedy Theater",
    "Comedy Show","Stand-up Event","Theater/Performance","Stand-up Comedy",
    "Improv Comedy","Political Satire","Drag Shows"
  ],
  "Museen & Ausstellungen": [
    "Museum Event","Exhibition","Cultural Visit","Educational Experience","Museen & Ausstellungen",
    "Special Exhibitions","Permanent Collections","Museum Tours","Late Night Museum",
    "Interactive Exhibits","Archaeology","Science Exhibitions","Historical Shows",
    "Photography Exhibitions","Design Exhibitions","Media Art","Modern Art Collections",
    "Sculpture Exhibitions","Museum Workshops","Curator Talks",
    "Art Event","Gallery Visit","Gallery Openings","Street Art","Museen & Ausstellungen"
  ],
  "Film & Kino": [
    "Film Event","Movie Screening","Cinema Experience","Film Festival","Film & Kino",
    "Premieres","Outdoor Screenings","Director Q&As","Short Films",
    "Documentary Screenings","Independent Cinema","Classic Films","Animation Festivals",
    "Film Discussions","Cult Classics","Silent Films","Arthouse/Indie"
  ],
  "Open Air & Festivals": [
    "Outdoor Event","Festival","Public Event","Outdoor Activity","Open Air & Festivals",
    "Outdoor Performances","Street/Summer Festivals","Beer Gardens Events",
    "Lantern Festivals","Harbor/Lake Events","Fire Shows","Sunset Sessions",
    "Night Markets","Art in the Park","Festival Events","City Events",
    "Nature Activity","Outdoor Adventure","Park Events","Beach Activities"
  ],
  "Food & Culinary": [
    "Food Event","Tasting","Dining Experience","Culinary Event","Food & Culinary",
    "Beverage Tastings","Beer Events/Beer Festivals","Cooking Classes","Food Markets",
    "Restaurant Experiences","Culinary Festivals","Food Tours","Cocktail Events",
    "Coffee Culture","Vegan/Vegetarian Events","International Cuisine","Local Specialties",
    "Food & Music Pairings","Gourmet Events","Street Food","Chef Demonstrations"
  ],
  "Märkte & Shopping": [
    "Market Event","Shopping Experience","Retail Event","Bazaar","Märkte & Shopping",
    "Flohmarkt/Flea Markets","Vintage Markets","Handmade Markets","Antique Fairs",
    "Shopping Events","Pop-up Shops","Designer Markets","Book Markets",
    "Record Fairs","Seasonal Markets","Craft Bazaars","Night Markets"
  ],
  "Sport & Fitness": [
    "Sports Event","Athletic Activity","Fitness Class","Recreational Sport","Sport & Fitness",
    "Football/Soccer","Basketball","Running Events","Cycling","Yoga",
    "Team Sports","Water Sports","Martial Arts","Climbing/Bouldering",
    "E-Sports","Dance Sports","Extreme Sports","Marathon/Races","CrossFit",
    "Outdoor Yoga","Wellness Event","Fitness"
  ],
  "Kultur & Bildung": [
    "Cultural Event","Traditional Celebration","Heritage Event","Kultur & Bildung",
    "Traditional Festivals","Historical Reenactments","Folk Events",
    "Heritage Tours","Local Traditions","Cultural Workshops",
    "Educational Event","Learning Experience","Science Activity","Academic Lecture",
    "University Lectures","Public Talks","Workshops/Seminars","Tech Talks",
    "Book Discussions","Language Classes","STEM Events","Kultur & Bildung"
  ],
  "Familie & Kinder": [
    "Family Event","Kids Activity","Children's Program","Family Fun","Familie & Kinder",
    "Children Events","Family Festivals","Kids Workshops","Educational Activities",
    "Interactive Shows","Science for Kids","Storytime","Puppet Shows",
    "Family Theater","Parent-Child Activities","STEM Kids","Outdoor Play",
    "Creative Learning","Cultural Kids Programs","Nature Discovery"
  ],
  "Business & Networking": [
    "Business Event","Professional Networking","Career Development","Industry Meetup",
    "Business & Networking","Conferences/Summits","Networking Mixers","Startup Events",
    "Career Fairs","Webinars/Talks","Business Breakfasts","Expo/Trade Shows",
    "Corporate Events","Leadership Forums","Entrepreneurship","Coworking Events"
  ],
  "Community & Wellness": [
    "Community Event","Social Gathering","Volunteer Activity","Civic Event",
    "Community & Wellness","Community & Wellness","Pride Events","Queer Parties","Inclusive Spaces",
    "Wellness Event","Spiritual Practice","Mindfulness Activity","Community & Wellness",
    "Meditation Sessions","Sound Healing","Yoga Classes/Workshops","Wellness Retreats",
    "Mental Health Circles","Charity Events","Support Groups"
  ]
};

export const EVENT_CATEGORIES = Object.keys(EVENT_CATEGORY_SUBCATEGORIES);

// Massiv erweiterte Token-Normalisierung für bessere Event-Erfassung
export const NORMALIZATION_TOKEN_MAP: Record<string,string> = {
  // Electronic/DJ
  "techno":"Musik & Nachtleben","edm":"Musik & Nachtleben","house":"Musik & Nachtleben","trance":"Musik & Nachtleben",
  "minimal":"Musik & Nachtleben","hardstyle":"Musik & Nachtleben","hardcore":"Musik & Nachtleben","breakbeat":"Musik & Nachtleben",
  "dubstep":"Musik & Nachtleben","electronic":"Musik & Nachtleben","future":"Musik & Nachtleben","goa":"Musik & Nachtleben",
  "elektro":"Musik & Nachtleben","elektronisch":"Musik & Nachtleben","dj":"Musik & Nachtleben","deejay":"Musik & Nachtleben",
  
  // Clubs/Party
  "club":"Musik & Nachtleben","clubs":"Musik & Nachtleben","party":"Musik & Nachtleben","parties":"Musik & Nachtleben",
  "disco":"Musik & Nachtleben","nightclub":"Musik & Nachtleben","nightlife":"Musik & Nachtleben","rave":"Musik & Nachtleben",
  "after-hour":"Musik & Nachtleben","afterhours":"Musik & Nachtleben","dancing":"Musik & Nachtleben","dance":"Musik & Nachtleben","tanzen":"Musik & Nachtleben",
  "bar":"Musik & Nachtleben","bars":"Musik & Nachtleben","lounge":"Musik & Nachtleben","pub":"Musik & Nachtleben","pubs":"Musik & Nachtleben",
  "feier":"Musik & Nachtleben","feiern":"Musik & Nachtleben","nacht":"Musik & Nachtleben","night":"Musik & Nachtleben",
  
  // Open Air/Festival
  "festival":"Open Air & Festivals","festivals":"Open Air & Festivals","openair":"Open Air & Festivals","open-air":"Open Air & Festivals",
  "outdoor":"Open Air & Festivals","draußen":"Open Air & Festivals","venue":"Open Air & Festivals","venues":"Open Air & Festivals",
  "location":"Open Air & Festivals","locations":"Open Air & Festivals","event":"Open Air & Festivals","events":"Open Air & Festivals",
  "veranstaltung":"Open Air & Festivals","veranstaltungen":"Open Air & Festivals","public":"Open Air & Festivals",
  
  // LGBTQ+
  "queer":"Community & Wellness","pride":"Community & Wellness","gay":"Community & Wellness","lesbian":"Community & Wellness","lgbt":"Community & Wellness","lgbtq":"Community & Wellness",
  "drag":"Community & Wellness","trans":"Community & Wellness","transgender":"Community & Wellness","bisexual":"Community & Wellness","inclusive":"Community & Wellness",
  
  // Food/Culinary
  "food":"Food & Culinary","essen":"Food & Culinary","culinary":"Food & Culinary","kulinarisch":"Food & Culinary",
  "wein":"Food & Culinary","wine":"Food & Culinary","beer":"Food & Culinary","bier":"Food & Culinary",
  "cocktail":"Food & Culinary","cocktails":"Food & Culinary","drinking":"Food & Culinary","trinken":"Food & Culinary",
  "restaurant":"Food & Culinary","restaurants":"Food & Culinary","cafe":"Food & Culinary","cafes":"Food & Culinary",
  "brunch":"Food & Culinary","dinner":"Food & Culinary","lunch":"Food & Culinary","breakfast":"Food & Culinary",
  "tasting":"Food & Culinary","degustación":"Food & Culinary","verkostung":"Food & Culinary",
  
  // Education/Learning
  "workshop":"Bildung/Lernen","workshops":"Bildung/Lernen","seminar":"Bildung/Lernen","seminars":"Bildung/Lernen",
  "course":"Bildung/Lernen","courses":"Bildung/Lernen","kurs":"Bildung/Lernen","kurse":"Bildung/Lernen",
  "learning":"Bildung/Lernen","bildung":"Bildung/Lernen","education":"Bildung/Lernen","lehren":"Bildung/Lernen",
  "talk":"Bildung/Lernen","talks":"Bildung/Lernen","vortrag":"Bildung/Lernen","vorträge":"Bildung/Lernen",
  "lecture":"Bildung/Lernen","lectures":"Bildung/Lernen","class":"Bildung/Lernen","classes":"Bildung/Lernen",
  "hackathon":"Bildung/Lernen","skill":"Bildung/Lernen","skills":"Bildung/Lernen",
  
  // Business/Networking
  "startup":"Business & Networking","business":"Business & Networking","networking":"Business & Networking",
  "meetup":"Business & Networking","meeting":"Business & Networking","treffen":"Business & Networking",
  "conference":"Business & Networking","konferenz":"Business & Networking","pitch":"Business & Networking",
  "professional":"Business & Networking","profi":"Business & Networking","career":"Business & Networking",
  
  // Nature/Outdoor
  "hiking":"Open Air & Festivals","wandern":"Open Air & Festivals","nature":"Open Air & Festivals","natur":"Open Air & Festivals",
  "climbing":"Open Air & Festivals","klettern":"Open Air & Festivals","trail":"Open Air & Festivals","mountain":"Open Air & Festivals",
  "forest":"Open Air & Festivals","wald":"Open Air & Festivals","river":"Open Air & Festivals","fluss":"Open Air & Festivals",
  
  // Culture/Traditions
  "kultur":"Kultur & Bildung","culture":"Kultur & Bildung","tradition":"Kultur & Bildung",
  "heritage":"Kultur & Bildung","folk":"Kultur & Bildung","traditional":"Kultur & Bildung",
  "kulturell":"Kultur & Bildung","cultural":"Kultur & Bildung",
  
  // Markets/Shopping
  "markt":"Märkte & Shopping","market":"Märkte & Shopping","shopping":"Märkte & Shopping",
  "flohmarkt":"Märkte & Shopping","vintage":"Märkte & Shopping","antique":"Märkte & Shopping",
  "bazar":"Märkte & Shopping","bazaar":"Märkte & Shopping",
  
  // Social/Community
  "sozial":"Community & Wellness","social":"Community & Wellness","community":"Community & Wellness",
  "volunteer":"Community & Wellness","charity":"Community & Wellness","gemeinde":"Community & Wellness",
  
  // Music/Concerts
  "musik":"Musik & Nachtleben","music":"Musik & Nachtleben","konzert":"Musik & Nachtleben","concert":"Musik & Nachtleben",
  "concerts":"Musik & Nachtleben","konzerte":"Musik & Nachtleben","live":"Musik & Nachtleben",
  "jazz":"Musik & Nachtleben","rock":"Musik & Nachtleben","pop":"Musik & Nachtleben","klassik":"Musik & Nachtleben","classical":"Musik & Nachtleben",
  
  // Theater/Performance
  "theater":"Theater/Performance","theatre":"Theater/Performance","performance":"Theater/Performance",
  "opera":"Theater/Performance","musical":"Theater/Performance","show":"Theater/Performance","shows":"Theater/Performance",
  "bühne":"Theater/Performance","stage":"Theater/Performance",
  
  // Comedy
  "comedy":"Theater/Performance","kabarett":"Theater/Performance","standup":"Theater/Performance","stand-up":"Theater/Performance",
  "humor":"Theater/Performance","funny":"Theater/Performance","witzig":"Theater/Performance",
  
  // Art/Design
  "kunst":"Museen & Ausstellungen","art":"Museen & Ausstellungen","design":"Museen & Ausstellungen",
  "gallery":"Museen & Ausstellungen","galerie":"Museen & Ausstellungen","studio":"Museen & Ausstellungen","studios":"Museen & Ausstellungen",
  "creative":"Museen & Ausstellungen","kreativ":"Museen & Ausstellungen","artistic":"Museen & Ausstellungen",
  
  // Museums
  "museum":"Museen & Ausstellungen","museen":"Museen & Ausstellungen","exhibition":"Museen & Ausstellungen","ausstellung":"Museen & Ausstellungen",
  "ausstellungen":"Museen & Ausstellungen","exhibitions":"Museen & Ausstellungen","collection":"Museen & Ausstellungen","sammlung":"Museen & Ausstellungen",
  
  // Sports
  "sport":"Sport & Fitness","sports":"Sport & Fitness","fitness":"Sport & Fitness","training":"Sport & Fitness",
  "competition":"Sport & Fitness","wettkampf":"Sport & Fitness","match":"Sport & Fitness","game":"Sport & Fitness",
  
  // Family/Kids
  "family":"Familie & Kinder","familie":"Familie & Kinder","kids":"Familie & Kinder","kinder":"Familie & Kinder",
  "children":"Familie & Kinder","child":"Familie & Kinder","kind":"Familie & Kinder",
  "teen":"Familie & Kinder","teens":"Familie & Kinder","teenager":"Familie & Kinder","jugendliche":"Familie & Kinder",
  
  // Film
  "film":"Film & Kino","films":"Film & Kino","movie":"Film & Kino","movies":"Film & Kino","cinema":"Film & Kino","kino":"Film & Kino",
  "screening":"Film & Kino","screenings":"Film & Kino","premiere":"Film & Kino","premieres":"Film & Kino",
  
  // Wellness/Spiritual
  "wellness":"Community & Wellness","meditation":"Community & Wellness","yoga":"Community & Wellness",
  "spa":"Community & Wellness","mindfulness":"Community & Wellness","spirituell":"Community & Wellness",
  "spiritual":"Community & Wellness","zen":"Community & Wellness","healing":"Community & Wellness",
  
  // Time-based defaults
  "evening":"Open Air & Festivals","afternoon":"Open Air & Festivals","morning":"Community & Wellness",
  "weekend":"Open Air & Festivals","weekday":"Bildung/Lernen","daily":"Community & Wellness","weekly":"Bildung/Lernen",
  
  // Level/Audience
  "beginner":"Bildung/Lernen","anfänger":"Bildung/Lernen","basic":"Bildung/Lernen",
  "advanced":"Bildung/Lernen","expert":"Bildung/Lernen",
  "adult":"Business & Networking","adults":"Business & Networking","erwachsene":"Business & Networking",
  "senior":"Community & Wellness","seniors":"Community & Wellness","senioren":"Community & Wellness",
  
  // Format-based
  "online":"Bildung/Lernen","virtual":"Bildung/Lernen","livestream":"Film & Kino",
  "interactive":"Bildung/Lernen","interaktiv":"Bildung/Lernen","hands-on":"Bildung/Lernen",
  "free":"Community & Wellness","kostenlos":"Community & Wellness","gratis":"Community & Wellness",
  
  // Fallback for unknown terms
  "unknown":"Community & Wellness","other":"Community & Wellness","misc":"Community & Wellness","sonstiges":"Community & Wellness"
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
  
  // 7. Fallback to "Community & Wellness"
  return "Community & Wellness";
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
        e.category = "Community & Wellness"; // Default for events without category
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
      if (combinedText.includes('music') || combinedText.includes('party')) {
        return "Musik & Nachtleben";
      }
    }
    if (hour >= 6 && hour <= 10) {
      // Morning events likely wellness or business
      if (combinedText.includes('meditation') || combinedText.includes('yoga')) {
        return "Community & Wellness";
      }
      if (combinedText.includes('meeting') || combinedText.includes('breakfast')) {
        return "Business & Networking";
      }
    }
  }
  
  // Venue-based hints
  if (venue.toLowerCase().includes('club') || venue.toLowerCase().includes('bar')) {
    return "Musik & Nachtleben";
  }
  if (venue.toLowerCase().includes('museum')) {
    return "Museen & Ausstellungen";
  }
  if (venue.toLowerCase().includes('theater') || venue.toLowerCase().includes('theatre')) {
    return "Theater/Performance";
  }
  
  // Fallback to normal normalization
  return normalizeCategory(combinedText);
}
