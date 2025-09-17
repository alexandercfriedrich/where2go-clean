// Phase 1 + 1.1: Single source of truth for 20 main event categories + normalization & validation utilities

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
    "Live-Konzerte","Klassische Musik/Classical","Rock/Pop/Alternative","Jazz/Blues","Folk/Singer-Songwriter",
    "Hip-Hop/Rap","Metal/Hardcore","Indie/Alternative","World Music","Country/Americana","R&B/Soul",
    "Experimental/Avant-garde","Chamber Music","Orchestra/Symphony","Band Performances","Solo Artists",
    "Album Release Shows","Tribute Bands","Open Mic Nights","Acoustic Sessions","Choral Music","New Age/Ambient"
  ],
  "Open Air": [
    "Open Air","Music Festivals","Outdoor Concerts","Beach Events","Park Gatherings","Rooftop Events","Garden Parties",
    "Street Festivals","Market Events","Outdoor Cinema","Picnic Events","Nature Events","Camping/Glamping Events",
    "Adventure Tours","Food Truck Festivals","Craft Fairs (Outdoor)","Sports Festivals"
  ],
  "Museen": [
    "Museen","Kunstgalerien/Art Galleries","Ausstellungen/Exhibitions","Kulturelle Institutionen","Historische Stätten",
    "Architektur Tours","Science Museums","Interactive Exhibitions","Private Collections","Art Fairs","Museum Nights",
    "Educational Tours","Virtual Reality Experiences","Photography Exhibitions","Natural History","Technology Museums",
    "Local History"
  ],
  "LGBTQ+": [
    "LGBTQ+","Pride Events","Queer Parties","Drag Shows","LGBTQ+ Clubs","Community Events","Support Groups",
    "Diversity Celebrations","Inclusive Events","Rainbow Events","Trans Events","Lesbian Events","Gay Events",
    "Bisexual Events","Non-binary Events","Coming Out Support","LGBTQ+ Film Screenings"
  ],
  "Comedy/Kabarett": [
    "Comedy/Kabarett","Stand-up Comedy","Improvisational Theater","Satirical Shows","Variety Shows","Comedy Clubs",
    "Humor Events","Roast Shows","Open Mic Comedy","Political Satire","Musical Comedy","Sketch Shows",
    "Comedy Festivals","Story Slam","Comedy Workshops"
  ],
  "Theater/Performance": [
    "Theater/Performance","Drama/Schauspiel","Musicals","Opera/Operette","Ballet/Dance","Contemporary Dance",
    "Performance Art","Experimental Theater","Children Theater","Street Performance","Mime/Physical Theater",
    "Puppet Theater","Immersive Theater","Site-specific Performance","Cabaret Shows","Burlesque","Circus Arts",
    "Storytelling","Poetry Slams","Spoken Word"
  ],
  "Film": [
    "Film","Cinema/Movie Screenings","Film Festivals","Documentary Screenings","Independent Films","Foreign Films",
    "Classic Cinema","Outdoor Cinema","Silent Films","Animation/Animated Films","Short Films","Film Premieres",
    "Director Q&As","Film Discussions","Video Art","Experimental Film","Horror Film Nights","Cult Cinema"
  ],
  "Food/Culinary": [
    "Food/Culinary","Wine Tasting","Beer Events/Beer Festivals","Cooking Classes","Food Markets",
    "Restaurant Events","Culinary Festivals","Food Tours","Pop-up Restaurants","Cocktail Events","Coffee Culture",
    "Whiskey/Spirits Tastings","Vegan/Vegetarian Events","International Cuisine","Local Specialties",
    "Food & Music Pairings","Farmers Markets","Gourmet Events","Street Food","Chef Demonstrations"
  ],
  "Sport": [
    "Sport","Football/Soccer","Basketball","Tennis","Fitness Events","Running/Marathon","Cycling Events","Swimming",
    "Martial Arts","Yoga/Pilates","Extreme Sports","Winter Sports","Team Building Sports","Amateur Leagues",
    "Sports Viewing Parties","Health & Wellness","Outdoor Sports","Indoor Sports","E-Sports","Adventure Racing"
  ],
  "Familien/Kids": [
    "Familien/Kids","Children Events","Family Festivals","Kids Workshops","Educational Activities","Interactive Shows",
    "Children Theater","Puppet Shows","Magic Shows","Storytelling for Kids","Arts & Crafts","Science for Kids",
    "Music for Families","Outdoor Adventures","Birthday Parties","Holiday Events","Baby/Toddler Events","Teen Programs"
  ],
  "Kunst/Design": [
    "Kunst/Design","Art Exhibitions","Design Markets","Craft Fairs","Artist Studios","Creative Workshops","Fashion Shows",
    "Photography","Sculpture","Painting","Digital Art","Street Art","Installation Art","Textile Arts","Ceramics/Pottery",
    "Jewelry Making","Architecture Events","Interior Design","Graphic Design","Art Auctions"
  ],
  "Wellness/Spirituell": [
    "Wellness/Spirituell","Meditation Events","Yoga Classes","Spa Events","Mindfulness Workshops","Spiritual Retreats",
    "Healing Sessions","Wellness Festivals","Breathwork","Sound Healing","Crystal Healing","Reiki Sessions",
    "Holistic Health","Mental Health Support","Self-Care Events","Nature Therapy","Life Coaching","Nutrition Workshops"
  ],
  "Networking/Business": [
    "Networking/Business","Business Meetups","Professional Development","Industry Conferences","Startup Events",
    "Entrepreneurship","Career Fairs","Leadership Events","Trade Shows","B2B Events","Corporate Events","Innovation Hubs",
    "Tech Meetups","Skills Workshops","Mentorship Programs","Investment Events","Coworking Events","Industry Mixers"
  ],
  "Natur/Outdoor": [
    "Natur/Outdoor","Hiking/Walking Tours","Nature Tours","Wildlife Watching","Botanical Gardens","Park Events",
    "Outdoor Adventures","Camping Events","Environmental Education","Eco-Tours","Outdoor Yoga","Nature Photography",
    "Geocaching","Bird Watching","Gardening Workshops","Sustainability Events","Green Living","Conservation Events",
    "Outdoor Fitness","Stargazing"
  ],
  "Kultur/Traditionen": [
    "Kultur/Traditionen","Lokale Traditionen","Kulturelle Feste","Historische Reenactments","Volksfeste",
    "Religiöse Feiern","Seasonal Celebrations","Cultural Heritage","Traditional Crafts","Folk Music/Dance",
    "Local Legends Tours"
  ],
  "Märkte/Shopping": [
    "Märkte/Shopping","Flohmarkt/Flea Markets","Vintage Markets","Handmade Markets","Antique Fairs","Shopping Events",
    "Pop-up Shops","Designer Markets","Book Markets","Record Fairs","Seasonal Markets"
  ],
  "Bildung/Lernen": [
    "Bildung/Lernen","Workshops","Kurse/Classes","Seminare/Seminars","Lectures/Vorträge","Language Exchange","Book Clubs",
    "Study Groups","Academic Conferences","Skill Sharing","DIY Workshops"
  ],
  "Soziales/Community": [
    "Soziales/Community","Community Events","Volunteer Activities","Charity Events","Social Causes",
    "Neighborhood Meetings","Cultural Exchange","Senior Events","Singles Meetups","Expat Events","Local Initiatives"
  ]
};

export const EVENT_CATEGORIES = Object.keys(EVENT_CATEGORY_SUBCATEGORIES);

export function buildCategoryListForPrompt(): string {
  return EVENT_CATEGORIES.map((c,i)=>`${i+1}. ${c}`).join('\n');
}
export function allowedCategoriesForSchema(): string {
  return EVENT_CATEGORIES.join(', ');
}

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
        if (isValidCategory(norm)) {
          e.category = norm;
        }
      }
      return e;
    })
    .filter(e => isValidCategory(e.category));
}
