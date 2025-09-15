// Single source of truth for event categories
// Phase 1: Central definition for the 20 canonical main categories

/**
 * EVENT_CATEGORY_SUBCATEGORIES: The complete mapping of 20 canonical main categories
 * to their subcategories. This is the single source of truth.
 */
export const EVENT_CATEGORY_SUBCATEGORIES: Record<string, string[]> = {
  "DJ Sets/Electronic": [
    "DJ Sets/Electronic", "Techno/House/EDM", "Drum & Bass", "Trance/Progressive", 
    "Ambient/Downtempo", "Experimental Electronic", "Disco/Nu-Disco", "Minimal/Deep House", 
    "Hardstyle/Hardcore", "Breakbeat/Breaks", "Dubstep/Bass Music", "Industrial/EBM", 
    "Synthwave/Retro", "Acid/Acid House", "Psytrance/Goa", "Future Bass", "Garage/UK Garage"
  ],
  "Clubs/Discos": [
    "Clubs/Discos", "Nightclubs", "Dance Clubs", "Underground Venues", "Rooftop Parties", 
    "Beach Clubs", "After-Hours", "Club Nights", "Party Events", "Rave Culture", 
    "Social Dancing", "Singles Events", "VIP Events", "Themed Parties", "Cocktail Lounges"
  ],
  "Live-Konzerte": [
    "Live-Konzerte", "Klassische Musik/Classical", "Rock/Pop/Alternative", "Jazz/Blues", 
    "Folk/Singer-Songwriter", "Hip-Hop/Rap", "Metal/Hardcore", "Indie/Alternative", 
    "World Music", "Country/Americana", "R&B/Soul", "Experimental/Avant-garde", 
    "Chamber Music", "Orchestra/Symphony", "Band Performances", "Solo Artists", 
    "Album Release Shows", "Tribute Bands", "Open Mic Nights", "Acoustic Sessions", 
    "Choral Music", "New Age/Ambient"
  ],
  "Open Air": [
    "Open Air", "Music Festivals", "Outdoor Concerts", "Beach Events", "Park Gatherings", 
    "Rooftop Events", "Garden Parties", "Street Festivals", "Market Events", 
    "Outdoor Cinema", "Picnic Events", "Nature Events", "Camping/Glamping Events", 
    "Adventure Tours", "Food Truck Festivals", "Craft Fairs (Outdoor)", "Sports Festivals"
  ],
  "Museen": [
    "Museen", "Kunstgalerien/Art Galleries", "Ausstellungen/Exhibitions", 
    "Kulturelle Institutionen", "Historische Stätten", "Architektur Tours", 
    "Science Museums", "Interactive Exhibitions", "Private Collections", "Art Fairs", 
    "Museum Nights", "Educational Tours", "Virtual Reality Experiences", 
    "Photography Exhibitions", "Natural History", "Technology Museums", "Local History"
  ],
  "LGBTQ+": [
    "LGBTQ+", "Pride Events", "Queer Parties", "Drag Shows", "LGBTQ+ Clubs", 
    "Community Events", "Support Groups", "Diversity Celebrations", "Inclusive Events", 
    "Rainbow Events", "Trans Events", "Lesbian Events", "Gay Events", "Bisexual Events", 
    "Non-binary Events", "Coming Out Support", "LGBTQ+ Film Screenings"
  ],
  "Comedy/Kabarett": [
    "Comedy/Kabarett", "Stand-up Comedy", "Improvisational Theater", "Satirical Shows", 
    "Variety Shows", "Comedy Clubs", "Humor Events", "Roast Shows", "Open Mic Comedy", 
    "Political Satire", "Musical Comedy", "Sketch Shows", "Comedy Festivals", 
    "Story Slam", "Comedy Workshops"
  ],
  "Theater/Performance": [
    "Theater/Performance", "Drama/Schauspiel", "Musicals", "Opera/Operette", 
    "Ballet/Dance", "Contemporary Dance", "Performance Art", "Experimental Theater", 
    "Children Theater", "Street Performance", "Mime/Physical Theater", "Puppet Theater", 
    "Immersive Theater", "Site-specific Performance", "Cabaret Shows", "Burlesque", 
    "Circus Arts", "Storytelling", "Poetry Slams", "Spoken Word"
  ],
  "Film": [
    "Film", "Cinema/Movie Screenings", "Film Festivals", "Documentary Screenings", 
    "Independent Films", "Foreign Films", "Classic Cinema", "Outdoor Cinema", 
    "Silent Films", "Animation/Animated Films", "Short Films", "Film Premieres", 
    "Director Q&As", "Film Discussions", "Video Art", "Experimental Film", 
    "Horror Film Nights", "Cult Cinema"
  ],
  "Food/Culinary": [
    "Food/Culinary", "Wine Tasting", "Beer Events/Beer Festivals", "Cooking Classes", 
    "Food Markets", "Restaurant Events", "Culinary Festivals", "Food Tours", 
    "Pop-up Restaurants", "Cocktail Events", "Coffee Culture", "Whiskey/Spirits Tastings", 
    "Vegan/Vegetarian Events", "International Cuisine", "Local Specialties", 
    "Food & Music Pairings", "Farmers Markets", "Gourmet Events", "Street Food", 
    "Chef Demonstrations"
  ],
  "Sport": [
    "Sport", "Football/Soccer", "Basketball", "Tennis", "Fitness Events", 
    "Running/Marathon", "Cycling Events", "Swimming", "Martial Arts", "Yoga/Pilates", 
    "Extreme Sports", "Winter Sports", "Team Building Sports", "Amateur Leagues", 
    "Sports Viewing Parties", "Health & Wellness", "Outdoor Sports", "Indoor Sports", 
    "E-Sports", "Adventure Racing"
  ],
  "Familien/Kids": [
    "Familien/Kids", "Children Events", "Family Festivals", "Kids Workshops", 
    "Educational Activities", "Interactive Shows", "Children Theater", "Puppet Shows", 
    "Magic Shows", "Storytelling for Kids", "Arts & Crafts", "Science for Kids", 
    "Music for Families", "Outdoor Adventures", "Birthday Parties", "Holiday Events", 
    "Baby/Toddler Events", "Teen Programs"
  ],
  "Kunst/Design": [
    "Kunst/Design", "Art Exhibitions", "Design Markets", "Craft Fairs", "Artist Studios", 
    "Creative Workshops", "Fashion Shows", "Photography", "Sculpture", "Painting", 
    "Digital Art", "Street Art", "Installation Art", "Textile Arts", "Ceramics/Pottery", 
    "Jewelry Making", "Architecture Events", "Interior Design", "Graphic Design", 
    "Art Auctions"
  ],
  "Wellness/Spirituell": [
    "Wellness/Spirituell", "Meditation Events", "Yoga Classes", "Spa Events", 
    "Mindfulness Workshops", "Spiritual Retreats", "Healing Sessions", "Wellness Festivals", 
    "Breathwork", "Sound Healing", "Crystal Healing", "Reiki Sessions", "Holistic Health", 
    "Mental Health Support", "Self-Care Events", "Nature Therapy", "Life Coaching", 
    "Nutrition Workshops"
  ],
  "Networking/Business": [
    "Networking/Business", "Business Meetups", "Professional Development", 
    "Industry Conferences", "Startup Events", "Entrepreneurship", "Career Fairs", 
    "Leadership Events", "Trade Shows", "B2B Events", "Corporate Events", 
    "Innovation Hubs", "Tech Meetups", "Skills Workshops", "Mentorship Programs", 
    "Investment Events", "Coworking Events", "Industry Mixers"
  ],
  "Natur/Outdoor": [
    "Natur/Outdoor", "Hiking/Walking Tours", "Nature Tours", "Wildlife Watching", 
    "Botanical Gardens", "Park Events", "Outdoor Adventures", "Camping Events", 
    "Environmental Education", "Eco-Tours", "Outdoor Yoga", "Nature Photography", 
    "Geocaching", "Bird Watching", "Gardening Workshops", "Sustainability Events", 
    "Green Living", "Conservation Events", "Outdoor Fitness", "Stargazing"
  ],
  "Kultur/Traditionen": [
    "Kultur/Traditionen", "Lokale Traditionen", "Kulturelle Feste", 
    "Historische Reenactments", "Volksfeste", "Religiöse Feiern", 
    "Seasonal Celebrations", "Cultural Heritage", "Traditional Crafts", 
    "Folk Music/Dance", "Local Legends Tours"
  ],
  "Märkte/Shopping": [
    "Märkte/Shopping", "Flohmarkt/Flea Markets", "Vintage Markets", "Handmade Markets", 
    "Antique Fairs", "Shopping Events", "Pop-up Shops", "Designer Markets", 
    "Book Markets", "Record Fairs", "Seasonal Markets"
  ],
  "Bildung/Lernen": [
    "Bildung/Lernen", "Workshops", "Kurse/Classes", "Seminare/Seminars", 
    "Lectures/Vorträge", "Language Exchange", "Book Clubs", "Study Groups", 
    "Academic Conferences", "Skill Sharing", "DIY Workshops"
  ],
  "Soziales/Community": [
    "Soziales/Community", "Community Events", "Volunteer Activities", "Charity Events", 
    "Social Causes", "Neighborhood Meetings", "Cultural Exchange", "Senior Events", 
    "Singles Meetups", "Expat Events", "Local Initiatives"
  ]
};

/**
 * EVENT_CATEGORIES: List of the 20 canonical main categories
 * This is what should be used for all category lists, prompts, and schemas
 */
export const EVENT_CATEGORIES: string[] = Object.keys(EVENT_CATEGORY_SUBCATEGORIES);

/**
 * buildCategoryListForPrompt: Creates a numbered list of all 20 categories for prompts
 */
export function buildCategoryListForPrompt(): string {
  return EVENT_CATEGORIES
    .map((category, index) => `${index + 1}. ${category}`)
    .join('\n');
}

/**
 * allowedCategoriesForSchema: Creates the category constraint string for JSON schema
 */
export function allowedCategoriesForSchema(): string {
  return EVENT_CATEGORIES.join(', ');
}

/**
 * normalizeCategory: Maps any category/subcategory to its canonical main category
 * Prepared for Phase 2 but can be used now for validation
 */
export function normalizeCategory(category: string): string | null {
  const normalizedInput = category.trim();
  
  // Check if it's already a main category
  if (EVENT_CATEGORY_SUBCATEGORIES[normalizedInput]) {
    return normalizedInput;
  }
  
  // Search through all main categories to find which one contains this subcategory
  for (const [mainCategory, subcategories] of Object.entries(EVENT_CATEGORY_SUBCATEGORIES)) {
    if (subcategories.some(sub => sub.toLowerCase() === normalizedInput.toLowerCase())) {
      return mainCategory;
    }
  }
  
  return null; // Category not found
}

/**
 * validateAndNormalizeEvents: Ensures all events have valid canonical categories
 * Prepared for Phase 2 use - currently just validates that categories are canonical
 */
export function validateAndNormalizeEvents(events: any[]): any[] {
  return events.filter(event => {
    if (!event.category) return false;
    const normalizedCategory = normalizeCategory(event.category);
    if (normalizedCategory) {
      event.category = normalizedCategory;
      return true;
    }
    return false;
  });
}