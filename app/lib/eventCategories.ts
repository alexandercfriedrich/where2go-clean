// Single Source of Truth for event categories, subcategories and normalization
// Phase 2B – categories.ts entfernt; alle Exporte nur noch hier.

export const EVENT_CATEGORY_SUBCATEGORIES: Record<string, string[]> = {
  "DJ Sets/Electronic": [
    "DJ Sets/Electronic","Techno/House/EDM","Drum & Bass","Trance/Progressive","Ambient/Downtempo",
    "Experimental Electronic","Disco/Nu-Disco","Minimal/Deep House","Hardstyle/Hardcore","Breakbeat/Breaks",
    "Dubstep/Bass Music","Industrial/EBM","Synthwave/Retro","Acid/Acid House","Psytrance/Goa","Future Bass",
    "Garage/UK Garage"
  ],
  "Clubs/Discos": [
    "Clubs/Discos","Nightclubs","Dance Clubs","Underground Venues","Rooftop Parties","Beach Clubs","After-Hours",
    "Club Nights","Party Events","Rave Culture","Social Dancing","Singles Events","VIP Events","Themed Parties",
    "Cocktail Lounges"
  ],
  "Live-Konzerte": [
    "Live-Konzerte","Rock/Pop/Alternative","Indie Music","Jazz/Blues","Hip-Hop/Rap","Classical/Orchestral",
    "Metal/Hard Rock","Singer-Songwriter","World Music","Folk/Acoustic","Punk/Hardcore","Soul/Funk",
    "Reggae/Dub","Latin Music","Choir/Vocal Ensembles","Tribute Bands","Electronic Live Acts","Experimental Music"
  ],
  "Theater/Performance": [
    "Theater/Performance","Plays/Theater","Musicals","Improv/Improvisation","Opera/Oper","Dance Performances",
    "Ballet","Contemporary Dance","Performance Art","Puppetry","Physical Theater","Experimental Stage",
    "One-Man Shows","Storytelling","Stand-Up Theater","Street Theater","Drama Productions","Classical Theater"
  ],
  "Open Air": [
    "Open Air","Outdoor Concerts","Street Festivals","Summer Festivals","Outdoor Cinema","Beer Gardens Events",
    "Park Events","Rooftop Sessions","River/Waterfront Events","City Fair","Lantern Festivals","Harbor Events",
    "Lake Events","Garden Parties","Fire Shows","Open-Air Theater","Sunset Sessions","Night Markets","Art in the Park"
  ],
  "Museen": [
    "Museen","Special Exhibitions","Permanent Collections","Museum Tours","Late Night Museum","Interactive Exhibits",
    "Archaeology","Science Exhibitions","Historical Shows","Photography Exhibitions","Design Exhibitions",
    "Media Art","Modern Art Collections","Sculpture Exhibitions","Museum Workshops","Curator Talks","Audio Guide Events"
  ],
  "Comedy/Kabarett": [
    "Comedy/Kabarett","Stand-up Comedy","Improv Comedy","Political Satire","Comedy Open Mic","Sketch Comedy",
    "Dark Comedy","Character Comedy","Musical Comedy","Comedy Slams","Roast Events","Observational Comedy",
    "Themed Comedy Nights","Comedy Battles","Late Night Style Comedy"
  ],
  "Film": [
    "Film","Film Screenings","Film Festivals","Indie Film Nights","Documentary Screenings","Short Film Events",
    "Cult Classics","Outdoor Cinema (Film)","Film Premieres","Director Talks","Retrospectives","Theme Film Nights",
    "Animation Nights","International Cinema","Silent Films with Live Music"
  ],
  "Kunst/Design": [
    "Kunst/Design","Art Exhibitions","Gallery Openings","Interactive Installations","Sculpture Exhibits",
    "Design Showcases","Digital Art","Street Art Tours","Urban Art Exhibitions","Photography Openings","Light Art",
    "Multimedia Installations","AR/VR Art","Performance-based Art","Conceptual Art","Art & Tech Hybrids",
    "Sound Installations","Art Fairs","Pop-up Galleries"
  ],
  "Kultur/Traditionen": [
    "Kultur/Traditionen","Cultural Festivals","Folk Events","Heritage Celebrations","Historical Reenactments",
    "Traditional Music","Traditional Dance","Seasonal Customs","Processions/Parades","Regional Cuisine Events",
    "Language Cultural Nights","Story Preservation Events","Craft Traditions","Ethnic Celebrations"
  ],
  "LGBTQ+": [
    "LGBTQ+","Queer Parties","Drag Shows","LGBTQ+ Film","Queer Networking","Pride Events","Queer Art",
    "Trans Visibility Events","Inclusive Sports","Queer Book Clubs","LGBTQ+ History Talks","Queer Safe Spaces",
    "Drag Brunch","Ballroom/Vogue Events","Queer Workshops","Ally Events"
  ],
  "Bildung/Lernen": [
    "Bildung/Lernen","Workshops","Kurse/Classes","Seminare/Seminars","Lectures/Vorträge","Language Exchange",
    "Book Clubs","Study Groups","Academic Conferences","Skill Sharing","DIY Workshops","Conferences","Hackathons",
    "STEM Education","Career Development","Continuing Education"
  ],
  "Networking/Business": [
    "Networking/Business","Startup Events","Pitch Nights","Investor Meetups","Tech Meetups","Industry Panels",
    "Business Breakfasts","Co-Founder Matchmaking","Women in Business","Freelancer Meetups","Career Fairs",
    "Recruiting Events","Executive Roundtables","Product Launch Events","Innovation Labs","Corporate Hackathons"
  ],
  "Sport": [
    "Sport","Football/Soccer","Basketball","Tennis","Fitness Events","Running/Marathon","Cycling Events","Swimming",
    "Martial Arts","Yoga/Pilates","Extreme Sports","Winter Sports","Team Building Sports","Amateur Leagues",
    "Sports Viewing Parties","Health & Wellness","Outdoor Sports","Indoor Sports","E-Sports","Adventure Racing"
  ],
  "Natur/Outdoor": [
    "Natur/Outdoor","Hiking/Wandern","Nature Walks","Forest Bathing","River Activities","Climbing/Bouldering",
    "Outdoor Survival","Bird Watching","Stargazing","Eco Tours","Nature Photography","Camping Events",
    "Beach Cleanups","Trail Running","Canoeing/Kayak","Mountain Events","Wildlife Observation"
  ],
  "Wellness/Spirituell": [
    "Wellness/Spirituell","Meditation Sessions","Yoga Events","Breathwork","Spiritual Gatherings","Sound Healing",
    "Wellness Retreats","Holistic Health","Mindfulness Workshops","Energy Work","Detox Programs","Ayurveda Sessions",
    "Tea Ceremonies","Chakra Workshops","Nature Healing","Mental Health Circles"
  ],
  "Soziales/Community": [
    "Soziales/Community","Community Events","Volunteer Activities","Charity Events","Social Causes",
    "Neighborhood Meetings","Cultural Exchange","Senior Events","Expat Events","Local Initiatives",
    "Mutual Aid","Fundraising Dinners","Community Workshops","Donation Drives","Civic Engagement"
  ],
  "Märkte/Shopping": [
    "Märkte/Shopping","Flohmarkt/Flea Markets","Vintage Markets","Handmade Markets","Antique Fairs","Shopping Events",
    "Pop-up Shops","Designer Markets","Book Markets","Record Fairs","Seasonal Markets","Craft Bazaars",
    "Night Markets (Shopping)","Fashion Sample Sales","Textile Fairs"
  ],
  "Food/Culinary": [
    "Food/Culinary","Wine Tasting","Beer Events/Beer Festivals","Cooking Classes","Food Markets",
    "Restaurant Events","Culinary Festivals","Food Tours","Pop-up Restaurants","Cocktail Events","Coffee Culture",
    "Whiskey/Spirits Tastings","Vegan/Vegetarian Events","International Cuisine","Local Specialties",
    "Food & Music Pairings","Farmers Markets","Gourmet Events","Street Food","Chef Demonstrations"
  ],
  "Familien/Kids": [
    "Familien/Kids","Children Events","Family Festivals","Kids Workshops","Educational Activities","Interactive Shows",
    "Science for Kids","Storytime","Puppet Shows","Family Theater","Parent-Child Activities","STEM Kids",
    "Outdoor Play","Creative Learning","Cultural Kids Programs","Nature Discovery","Youth Sports"
  ]
};

export const EVENT_CATEGORIES = Object.keys(EVENT_CATEGORY_SUBCATEGORIES);

// Build list for prompts
export function buildCategoryListForPrompt(): string {
  return EVENT_CATEGORIES.map((c,i)=>`${i+1}. ${c}`).join('\n');
}
export function allowedCategoriesForSchema(): string {
  return EVENT_CATEGORIES.join(', ');
}

// Token normalization map (expanded)
export const NORMALIZATION_TOKEN_MAP: Record<string,string> = {
  "techno":"DJ Sets/Electronic","edm":"DJ Sets/Electronic","house":"DJ Sets/Electronic","trance":"DJ Sets/Electronic",
  "minimal":"DJ Sets/Electronic","hardstyle":"DJ Sets/Electronic","hardcore":"DJ Sets/Electronic","breakbeat":"DJ Sets/Electronic",
  "dubstep":"DJ Sets/Electronic","electronic":"DJ Sets/Electronic","future":"DJ Sets/Electronic","goa":"DJ Sets/Electronic",
  "festival":"Open Air","festivals":"Open Air","openair":"Open Air","open-air":"Open Air",
  "queer":"LGBTQ+","pride":"LGBTQ+","gay":"LGBTQ+","lesbian":"LGBTQ+","lgbt":"LGBTQ+","lgbtq":"LGBTQ+",
  "after-hour":"Clubs/Discos","afterhours":"Clubs/Discos","rave":"Clubs/Discos","club":"Clubs/Discos","party":"Clubs/Discos","disco":"Clubs/Discos","nightclub":"Clubs/Discos","nightlife":"Clubs/Discos",
  "wein":"Food/Culinary","wine":"Food/Culinary","beer":"Food/Culinary","bier":"Food/Culinary","cocktail":"Food/Culinary",
  "food":"Food/Culinary","essen":"Food/Culinary","culinary":"Food/Culinary","kulinarisch":"Food/Culinary",
  "workshop":"Bildung/Lernen","workshops":"Bildung/Lernen","seminar":"Bildung/Lernen","seminars":"Bildung/Lernen",
  "hackathon":"Bildung/Lernen","kurs":"Bildung/Lernen","kurse":"Bildung/Lernen","course":"Bildung/Lernen",
  "learning":"Bildung/Lernen","bildung":"Bildung/Lernen","education":"Bildung/Lernen",
  "startup":"Networking/Business","business":"Networking/Business","networking":"Networking/Business","meetup":"Networking/Business",
  "hiking":"Natur/Outdoor","wandern":"Natur/Outdoor","nature":"Natur/Outdoor","natur":"Natur/Outdoor","outdoor":"Natur/Outdoor",
  "kultur":"Kultur/Traditionen","culture":"Kultur/Traditionen","tradition":"Kultur/Traditionen","heritage":"Kultur/Traditionen",
  "markt":"Märkte/Shopping","market":"Märkte/Shopping","shopping":"Märkte/Shopping","flohmarkt":"Märkte/Shopping","vintage":"Märkte/Shopping",
  "sozial":"Soziales/Community","social":"Soziales/Community","community":"Soziales/Community","volunteer":"Soziales/Community","charity":"Soziales/Community",
  "jazz":"Live-Konzerte","rock":"Live-Konzerte","pop":"Live-Konzerte","musik":"Live-Konzerte","music":"Live-Konzerte","klassik":"Live-Konzerte","classical":"Live-Konzerte",
  "theater":"Theater/Performance","theatre":"Theater/Performance","performance":"Theater/Performance","opera":"Theater/Performance","musical":"Theater/Performance",
  "comedy":"Comedy/Kabarett","kabarett":"Comedy/Kabarett","standup":"Comedy/Kabarett","stand-up":"Comedy/Kabarett",
  "kunst":"Kunst/Design","art":"Kunst/Design","design":"Kunst/Design","gallery":"Kunst/Design","galerie":"Kunst/Design",
  "museum":"Museen","museen":"Museen","exhibition":"Museen","ausstellung":"Museen",
  "sport":"Sport","sports":"Sport","yoga":"Sport","pilates":"Sport","fitness":"Sport",
  "family":"Familien/Kids","familie":"Familien/Kids","kids":"Familien/Kids","kinder":"Familien/Kids","children":"Familien/Kids",
  "film":"Film","films":"Film","movie":"Film","movies":"Film","cinema":"Film","kino":"Film",
  "wellness":"Wellness/Spirituell","meditation":"Wellness/Spirituell","spa":"Wellness/Spirituell","mindfulness":"Wellness/Spirituell","spirituell":"Wellness/Spirituell"
};

export function normalizeCategory(input: string): string {
  if (!input || typeof input !== 'string') return input;
  const trimmed = input.trim();
  if (!trimmed) return trimmed;
  if (EVENT_CATEGORY_SUBCATEGORIES[trimmed]) return trimmed;
  const lower = trimmed.toLowerCase();
  if (NORMALIZATION_TOKEN_MAP[lower]) return NORMALIZATION_TOKEN_MAP[lower];
  for (const [main, subs] of Object.entries(EVENT_CATEGORY_SUBCATEGORIES)) {
    if (subs.some(s => s.toLowerCase() === lower)) return main;
  }
  const lc = EVENT_CATEGORIES.find(c => c.toLowerCase() === lower);
  if (lc) return lc;
  return trimmed;
}

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
        if (isValidCategory(norm)) e.category = norm;
      }
      return e;
    })
    .filter(e => isValidCategory(e.category));
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
2. Include events that clearly belong but may use alternative naming.
3. Aim for diversity (venues, formats, audiences).
4. If sparse, combine official sources + plausible curated underground venues (label uncertain ones).`;
}
