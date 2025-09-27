// Single Source of Truth for event categories, subcategories and normalization
// Optimiert für maximale Event-Erfassung und bessere Kategorisierung

export const EVENT_CATEGORY_SUBCATEGORIES: Record<string, string[]> = {
  "DJ Sets/Electronic": [
    "Electronic Music","DJ Event","Dance Music","Club Music",
    "Techno/House/EDM","Drum & Bass","Trance/Psytrance","Ambient/Downtempo",
    "Disco/Nu-Disco","Hardstyle/Hardcore","Breakbeat/Breaks","Dubstep/Bass Music",
    "Industrial/EBM","Synthwave/Retro","Future Bass","Garage/UK Garage"
  ],
  "Clubs/Discos": [
    "Night Out","Dancing Event","Social Event","Party Event",
    "Underground Venues","Rooftop Parties","Beach Clubs","After-Hours",
    "Party Events","Rave Culture","Social Dancing","Special Events",
    "Cocktail Lounges","Late Night Venues"
  ],
  "Live-Konzerte": [
    "Live Music","Concert","Musical Performance","Live Show",
    "Rock/Pop/Indie","Hip-Hop/Rap","Classical/Orchestral","Heavy Music",
    "Singer-Songwriter","World Music","Folk/Acoustic","Jazz/Soul/Funk",
    "Reggae/Dub","Latin Music","Choir/Vocal Ensembles","Tribute Bands",
    "Experimental Music"
  ],
  "Theater/Performance": [
    "Live Performance","Stage Show","Entertainment","Performing Arts",
    "Musicals","Opera/Oper","Dance/Ballet/Contemporary","Performance Art/Experimental",
    "Puppetry","One-Man Shows","Storytelling","Street Theater",
    "Drama Productions","Classical Theater","Improv/Comedy Theater"
  ],
  "Open Air": [
    "Outdoor Event","Festival","Public Event","Outdoor Activity",
    "Outdoor Performances","Street/Summer Festivals","Beer Gardens Events","Location-Based Events",
    "Lantern Festivals","Harbor/Lake Events","Fire Shows","Sunset Sessions",
    "Night Markets","Art in the Park","Festival Events","City Events"
  ],
  "Museen": [
    "Museum Event","Exhibition","Cultural Visit","Educational Experience",
    "Special Exhibitions","Permanent Collections","Museum Tours","Late Night Museum",
    "Interactive Exhibits","Archaeology","Science Exhibitions","Historical Shows",
    "Photography Exhibitions","Design Exhibitions","Media Art","Modern Art Collections",
    "Sculpture Exhibitions","Museum Workshops","Curator Talks","Audio Guide Events"
  ],
  "Comedy/Kabarett": [
    "Comedy Show","Stand-up Event","Entertainment Show","Humor Event",
    "Stand-up Comedy","Improv Comedy","Political Satire","Comedy Open Mic",
    "Sketch Comedy","Dark Comedy","Character Comedy","Musical Comedy",
    "Comedy Slams","Roast Events","Observational Comedy","Themed Comedy Nights",
    "Comedy Battles","Late Night Style Comedy"
  ],
  "Film": [
    "Movie Event","Cinema","Screening","Film Event",
    "Film Screenings","Film Festivals","Indie Film Nights","Documentary Screenings",
    "Short Film Events","Cult Classics","Outdoor Cinema","Film Premieres",
    "Director Talks","Retrospectives","Theme Film Nights","Animation Nights",
    "International Cinema","Silent Films with Live Music"
  ],
  "Kunst/Design": [
    "Art Event","Gallery Event","Creative Experience","Art Show",
    "Art Exhibitions & Openings","Interactive Art","Sculpture Exhibits","Design Showcases",
    "Digital Art","Street & Urban Art","Photography Openings","Light Art",
    "AR/VR Art","Performance-based Art","Conceptual Art","Art & Tech Hybrids",
    "Sound Installations","Art Fairs","Pop-up Galleries"
  ],
  "Kultur/Traditionen": [
    "Cultural Event","Traditional Event","Heritage Experience","Folk Event",
    "Cultural Festivals","Folk Events","Heritage Celebrations","Historical Reenactments",
    "Traditional Music","Traditional Dance","Seasonal Customs","Processions/Parades",
    "Regional Cuisine Events","Language Cultural Nights","Story Preservation Events","Craft Traditions",
    "Ethnic Celebrations"
  ],
  "LGBTQ+": [
    "Queer Event","Pride Event","LGBTQ+ Gathering","Inclusive Event",
    "Queer Parties","Drag Shows","LGBTQ+ Film","Queer Networking",
    "Pride Events","Queer Art","Trans Visibility Events","Inclusive Sports",
    "Queer Book Clubs","LGBTQ+ History Talks","Queer Safe Spaces","Drag Brunch",
    "Ballroom/Vogue Events","Queer Workshops","Ally Events"
  ],
  "Bildung/Lernen": [
    "Learning Event","Educational Experience","Workshop","Course",
    "Workshops","Kurse/Classes","Seminare/Seminars","Lectures/Vorträge",
    "Language Exchange","Book Clubs","Study Groups","Academic Conferences",
    "Skill Sharing","DIY Workshops","Conferences","Hackathons",
    "STEM Education","Career Development","Continuing Education"
  ],
  "Networking/Business": [
    "Business Event","Networking Event","Professional Meetup","Career Event",
    "Startup Events","Pitch Nights","Investor Meetups","Tech Meetups",
    "Industry Panels","Business Breakfasts","Co-Founder Matchmaking","Women in Business",
    "Freelancer Meetups","Career Fairs","Recruiting Events","Executive Roundtables",
    "Product Launch Events","Innovation Labs","Corporate Hackathons"
  ],
  "Sport": [
    "Sports Event","Physical Activity","Competition","Fitness Event",
    "Football/Soccer","Basketball","Tennis","Fitness & Wellness",
    "Running/Marathon","Cycling Events","Swimming","Martial Arts",
    "Extreme Sports","Winter Sports","Team Building Sports","Amateur Leagues",
    "Sports Viewing Parties","Recreational Sports","E-Sports","Adventure Racing"
  ],
  "Natur/Outdoor": [
    "Nature Event","Outdoor Activity","Environmental Experience","Adventure Event",
    "Hiking/Wandern","Nature Walks","Forest Bathing","River Activities",
    "Climbing/Bouldering","Outdoor Survival","Bird Watching","Stargazing",
    "Eco Tours","Nature Photography","Camping Events","Beach Cleanups",
    "Trail Running","Canoeing/Kayak","Mountain Events","Wildlife Observation"
  ],
  "Wellness/Spirituell": [
    "Wellness Event","Mindfulness","Self-Care","Spiritual Event",
    "Meditation Sessions","Yoga Events","Breathwork","Spiritual Gatherings",
    "Sound Healing","Wellness Retreats","Holistic Health","Mindfulness Workshops",
    "Energy Work","Detox Programs","Ayurveda Sessions","Tea Ceremonies",
    "Chakra Workshops","Nature Healing","Mental Health Circles"
  ],
  "Soziales/Community": [
    "Community Event","Social Gathering","Volunteer Activity","Civic Event",
    "Community Events","Volunteer Activities","Charity Events","Social Causes",
    "Neighborhood Meetings","Cultural Exchange","Senior Events","Expat Events",
    "Local Initiatives","Mutual Aid","Fundraising Dinners","Community Workshops",
    "Donation Drives","Civic Engagement"
  ],
  "Märkte/Shopping": [
    "Market Event","Shopping Experience","Retail Event","Bazaar",
    "Flohmarkt/Flea Markets","Vintage Markets","Handmade Markets","Antique Fairs",
    "Shopping Events","Pop-up Shops","Designer Markets","Book Markets",
    "Record Fairs","Seasonal Markets","Craft Bazaars","Night Markets",
    "Fashion Sample Sales","Textile Fairs"
  ],
  "Food/Culinary": [
    "Food Event","Tasting","Dining Experience","Culinary Event",
    "Beverage Tastings","Beer Events/Beer Festivals","Cooking Classes","Food Markets",
    "Restaurant Experiences","Culinary Festivals","Food Tours","Cocktail Events",
    "Coffee Culture","Vegan/Vegetarian Events","International Cuisine","Local Specialties",
    "Food & Music Pairings","Gourmet Events","Street Food","Chef Demonstrations"
  ],
  "Familien/Kids": [
    "Family Event","Kids Activity","Children's Program","Family Fun",
    "Children Events","Family Festivals","Kids Workshops","Educational Activities",
    "Interactive Shows","Science for Kids","Storytime","Puppet Shows",
    "Family Theater","Parent-Child Activities","STEM Kids","Outdoor Play",
    "Creative Learning","Cultural Kids Programs","Nature Discovery","Youth Sports"
  ],
  "Sonstiges/Other": [
    "General Event","Mixed Event","Special Event","Uncategorized Event",
    "Diverse Activities","Miscellaneous","Various Events","Special Occasions"
  ]
};

export const EVENT_CATEGORIES = Object.keys(EVENT_CATEGORY_SUBCATEGORIES);

// Massiv erweiterte Token-Normalisierung für bessere Event-Erfassung
export const NORMALIZATION_TOKEN_MAP: Record<string,string> = {
  // Electronic/DJ
  "techno":"DJ Sets/Electronic","edm":"DJ Sets/Electronic","house":"DJ Sets/Electronic","trance":"DJ Sets/Electronic",
  "minimal":"DJ Sets/Electronic","hardstyle":"DJ Sets/Electronic","hardcore":"DJ Sets/Electronic","breakbeat":"DJ Sets/Electronic",
  "dubstep":"DJ Sets/Electronic","electronic":"DJ Sets/Electronic","future":"DJ Sets/Electronic","goa":"DJ Sets/Electronic",
  "elektro":"DJ Sets/Electronic","elektronisch":"DJ Sets/Electronic","dj":"DJ Sets/Electronic","deejay":"DJ Sets/Electronic",
  
  // Clubs/Party
  "club":"Clubs/Discos","clubs":"Clubs/Discos","party":"Clubs/Discos","parties":"Clubs/Discos",
  "disco":"Clubs/Discos","nightclub":"Clubs/Discos","nightlife":"Clubs/Discos","rave":"Clubs/Discos",
  "after-hour":"Clubs/Discos","afterhours":"Clubs/Discos","dancing":"Clubs/Discos","dance":"Clubs/Discos","tanzen":"Clubs/Discos",
  "bar":"Clubs/Discos","bars":"Clubs/Discos","lounge":"Clubs/Discos","pub":"Clubs/Discos","pubs":"Clubs/Discos",
  "feier":"Clubs/Discos","feiern":"Clubs/Discos","nacht":"Clubs/Discos","night":"Clubs/Discos",
  
  // Open Air/Festival
  "festival":"Open Air","festivals":"Open Air","openair":"Open Air","open-air":"Open Air",
  "outdoor":"Open Air","draußen":"Open Air","venue":"Open Air","venues":"Open Air",
  "location":"Open Air","locations":"Open Air","event":"Open Air","events":"Open Air",
  "veranstaltung":"Open Air","veranstaltungen":"Open Air","public":"Open Air",
  
  // LGBTQ+
  "queer":"LGBTQ+","pride":"LGBTQ+","gay":"LGBTQ+","lesbian":"LGBTQ+","lgbt":"LGBTQ+","lgbtq":"LGBTQ+",
  "drag":"LGBTQ+","trans":"LGBTQ+","transgender":"LGBTQ+","bisexual":"LGBTQ+","inclusive":"LGBTQ+",
  
  // Food/Culinary
  "food":"Food/Culinary","essen":"Food/Culinary","culinary":"Food/Culinary","kulinarisch":"Food/Culinary",
  "wein":"Food/Culinary","wine":"Food/Culinary","beer":"Food/Culinary","bier":"Food/Culinary",
  "cocktail":"Food/Culinary","cocktails":"Food/Culinary","drinking":"Food/Culinary","trinken":"Food/Culinary",
  "restaurant":"Food/Culinary","restaurants":"Food/Culinary","cafe":"Food/Culinary","cafes":"Food/Culinary",
  "brunch":"Food/Culinary","dinner":"Food/Culinary","lunch":"Food/Culinary","breakfast":"Food/Culinary",
  "tasting":"Food/Culinary","degustación":"Food/Culinary","verkostung":"Food/Culinary",
  
  // Education/Learning
  "workshop":"Bildung/Lernen","workshops":"Bildung/Lernen","seminar":"Bildung/Lernen","seminars":"Bildung/Lernen",
  "course":"Bildung/Lernen","courses":"Bildung/Lernen","kurs":"Bildung/Lernen","kurse":"Bildung/Lernen",
  "learning":"Bildung/Lernen","bildung":"Bildung/Lernen","education":"Bildung/Lernen","lehren":"Bildung/Lernen",
  "talk":"Bildung/Lernen","talks":"Bildung/Lernen","vortrag":"Bildung/Lernen","vorträge":"Bildung/Lernen",
  "lecture":"Bildung/Lernen","lectures":"Bildung/Lernen","class":"Bildung/Lernen","classes":"Bildung/Lernen",
  "hackathon":"Bildung/Lernen","training":"Bildung/Lernen","skill":"Bildung/Lernen","skills":"Bildung/Lernen",
  
  // Business/Networking
  "startup":"Networking/Business","business":"Networking/Business","networking":"Networking/Business",
  "meetup":"Networking/Business","meeting":"Networking/Business","treffen":"Networking/Business",
  "conference":"Networking/Business","konferenz":"Networking/Business","pitch":"Networking/Business",
  "professional":"Networking/Business","profi":"Networking/Business","career":"Networking/Business",
  
  // Nature/Outdoor
  "hiking":"Natur/Outdoor","wandern":"Natur/Outdoor","nature":"Natur/Outdoor","natur":"Natur/Outdoor",
  "climbing":"Natur/Outdoor","klettern":"Natur/Outdoor","trail":"Natur/Outdoor","mountain":"Natur/Outdoor",
  "forest":"Natur/Outdoor","wald":"Natur/Outdoor","river":"Natur/Outdoor","fluss":"Natur/Outdoor",
  
  // Culture/Traditions
  "kultur":"Kultur/Traditionen","culture":"Kultur/Traditionen","tradition":"Kultur/Traditionen",
  "heritage":"Kultur/Traditionen","folk":"Kultur/Traditionen","traditional":"Kultur/Traditionen",
  "kulturell":"Kultur/Traditionen","cultural":"Kultur/Traditionen",
  
  // Markets/Shopping
  "markt":"Märkte/Shopping","market":"Märkte/Shopping","shopping":"Märkte/Shopping",
  "flohmarkt":"Märkte/Shopping","vintage":"Märkte/Shopping","antique":"Märkte/Shopping",
  "bazar":"Märkte/Shopping","bazaar":"Märkte/Shopping",
  
  // Social/Community
  "sozial":"Soziales/Community","social":"Soziales/Community","community":"Soziales/Community",
  "volunteer":"Soziales/Community","charity":"Soziales/Community","gemeinde":"Soziales/Community",
  
  // Music/Concerts
  "musik":"Live-Konzerte","music":"Live-Konzerte","konzert":"Live-Konzerte","concert":"Live-Konzerte",
  "concerts":"Live-Konzerte","konzerte":"Live-Konzerte","live":"Live-Konzerte",
  "jazz":"Live-Konzerte","rock":"Live-Konzerte","pop":"Live-Konzerte","klassik":"Live-Konzerte","classical":"Live-Konzerte",
  
  // Theater/Performance
  "theater":"Theater/Performance","theatre":"Theater/Performance","performance":"Theater/Performance",
  "opera":"Theater/Performance","musical":"Theater/Performance","show":"Theater/Performance","shows":"Theater/Performance",
  "bühne":"Theater/Performance","stage":"Theater/Performance",
  
  // Comedy
  "comedy":"Comedy/Kabarett","kabarett":"Comedy/Kabarett","standup":"Comedy/Kabarett","stand-up":"Comedy/Kabarett",
  "humor":"Comedy/Kabarett","funny":"Comedy/Kabarett","witzig":"Comedy/Kabarett",
  
  // Art/Design
  "kunst":"Kunst/Design","art":"Kunst/Design","design":"Kunst/Design",
  "gallery":"Kunst/Design","galerie":"Kunst/Design","studio":"Kunst/Design","studios":"Kunst/Design",
  "creative":"Kunst/Design","kreativ":"Kunst/Design","artistic":"Kunst/Design",
  
  // Museums
  "museum":"Museen","museen":"Museen","exhibition":"Museen","ausstellung":"Museen",
  "ausstellungen":"Museen","exhibitions":"Museen","collection":"Museen","sammlung":"Museen",
  
  // Sports
  "sport":"Sport","sports":"Sport","fitness":"Sport","training":"Sport",
  "competition":"Sport","wettkampf":"Sport","match":"Sport","game":"Sport",
  
  // Family/Kids
  "family":"Familien/Kids","familie":"Familien/Kids","kids":"Familien/Kids","kinder":"Familien/Kids",
  "children":"Familien/Kids","child":"Familien/Kids","kind":"Familien/Kids",
  "teen":"Familien/Kids","teens":"Familien/Kids","teenager":"Familien/Kids","jugendliche":"Familien/Kids",
  
  // Film
  "film":"Film","films":"Film","movie":"Film","movies":"Film","cinema":"Film","kino":"Film",
  "screening":"Film","screenings":"Film","premiere":"Film","premieres":"Film",
  
  // Wellness/Spiritual
  "wellness":"Wellness/Spirituell","meditation":"Wellness/Spirituell","yoga":"Wellness/Spirituell",
  "spa":"Wellness/Spirituell","mindfulness":"Wellness/Spirituell","spirituell":"Wellness/Spirituell",
  "spiritual":"Wellness/Spirituell","zen":"Wellness/Spirituell","healing":"Wellness/Spirituell",
  
  // Time-based defaults
  "evening":"Open Air","afternoon":"Open Air","morning":"Wellness/Spirituell",
  "weekend":"Open Air","weekday":"Bildung/Lernen","daily":"Wellness/Spirituell","weekly":"Bildung/Lernen",
  
  // Level/Audience
  "beginner":"Bildung/Lernen","anfänger":"Bildung/Lernen","basic":"Bildung/Lernen",
  "advanced":"Bildung/Lernen","expert":"Bildung/Lernen",
  "adult":"Networking/Business","adults":"Networking/Business","erwachsene":"Networking/Business",
  "senior":"Soziales/Community","seniors":"Soziales/Community","senioren":"Soziales/Community",
  
  // Format-based
  "online":"Bildung/Lernen","virtual":"Bildung/Lernen","livestream":"Film",
  "interactive":"Bildung/Lernen","interaktiv":"Bildung/Lernen","hands-on":"Bildung/Lernen",
  "free":"Soziales/Community","kostenlos":"Soziales/Community","gratis":"Soziales/Community",
  
  // Fallback for unknown terms
  "unknown":"Sonstiges/Other","other":"Sonstiges/Other","misc":"Sonstiges/Other","sonstiges":"Sonstiges/Other"
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
  
  // 7. Fallback to "Sonstiges/Other"
  return "Sonstiges/Other";
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
        e.category = "Sonstiges/Other"; // Default for events without category
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
        return "Clubs/Discos";
      }
    }
    if (hour >= 6 && hour <= 10) {
      // Morning events likely wellness or business
      if (combinedText.includes('meditation') || combinedText.includes('yoga')) {
        return "Wellness/Spirituell";
      }
      if (combinedText.includes('meeting') || combinedText.includes('breakfast')) {
        return "Networking/Business";
      }
    }
  }
  
  // Venue-based hints
  if (venue.toLowerCase().includes('club') || venue.toLowerCase().includes('bar')) {
    return "Clubs/Discos";
  }
  if (venue.toLowerCase().includes('museum')) {
    return "Museen";
  }
  if (venue.toLowerCase().includes('theater') || venue.toLowerCase().includes('theatre')) {
    return "Theater/Performance";
  }
  
  // Fallback to normal normalization
  return normalizeCategory(combinedText);
}
