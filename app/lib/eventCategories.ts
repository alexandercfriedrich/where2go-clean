// Zentral gepflegte Event-Kategorien inkl. Subkategorien
// Single Source of Truth für:
// - Prompt-Generierung
// - UI Filter / Dropdowns
// - Validierung

export const EVENT_CATEGORY_SUBCATEGORIES: Record<string, string[]> = {
  "DJ Sets/Electronic": [
    "DJ Sets/Electronic", "Techno/House/EDM", "Drum & Bass", "Trance/Progressive", "Ambient/Downtempo", "Experimental Electronic", "Disco/Nu-Disco", "Minimal/Deep House", "Hardstyle/Hardcore", "Breakbeat"
  ],
  "Clubs/Discos": [
    "Clubs/Discos", "Nightclubs", "Dance Clubs", "Underground Venues", "Rooftop Parties", "Beach Clubs", "After-Hour", "Club Nights", "Party Events", "Rave", "Social Dancing", "VIP Events"
  ],
  "Live-Konzerte": [
    "Live-Konzerte", "Klassische Musik/Classical", "Rock/Pop/Alternative", "Jazz/Blues", "Folk/Singer-Songwriter", "Hip-Hop/Rap", "Metal/Hardcore", "Indie/Alternative", "World Music", "Country/Americana", "R&B/Soul"
  ],
  "Open Air": [
    "Open Air", "Music Festivals", "Outdoor Concerts", "Beach Events", "Park Gatherings", "Rooftop Events", "Garden Parties", "Street Festivals", "Market Events", "Outdoor Cinema", "Picnic Events", "Nature Events", "Camping"
  ],
  "Museen": [
    "Museen", "Kunstgalerien/Art Galleries", "Ausstellungen/Exhibitions", "Kulturelle Institutionen", "Historische Stätten", "Architektur Tours", "Science Museums", "Interactive Exhibitions", "Private Collections"
  ],
  "LGBTQ+": [
    "LGBTQ+", "Pride Event", "Queer Partie", "Drag Show", "LGBTQ+ Club", "Community Event", "Support Group", "Diversity Celebrations", "Inclusive Events", "Rainbow Events", "Trans Events", "Lesbian Events", "Gay Events"
  ],
  "Comedy/Kabarett": [
    "Comedy/Kabarett", "Stand-up Comedy", "Improvisational Theater", "Satirical Shows", "Variety Shows", "Comedy Clubs", "Humor Events", "Roast Shows", "Open Mic Comedy", "Political Satire", "Musical Comedy"
  ],
  "Theater/Performance": [
    "Theater/Performance", "Drama/Schauspiel", "Musicals", "Opera/Operette", "Ballet/Dance", "Contemporary Dance", "Performance Art", "Experimental Theater", "Children Theater", "Street Performance", "Mime"
  ],
  "Film": [
    "Film", "Cinema/Movie Screenings", "Film Festivals", "Documentary Screenings", "Independent Films", "Foreign Films", "Classic Cinema", "Outdoor Cinema", "Silent Films", "Animation/Animated Films", "Short Films"
  ],
  "Food/Culinary": [
    "Food/Culinary", "Wine Tasting", "Beer Events/Beer Festivals", "Cooking Classes", "Food Markets", "Restaurant Events", "Culinary Festivals", "Food Tours", "Pop-up Restaurants", "Cocktail Events", "Coffee Culture"
  ],
  "Sport": [
    "Sport", "Football/Soccer", "Basketball", "Tennis", "Fitness Events", "Running/Marathon", "Cycling Events", "Swimming", "Martial Arts", "Yoga/Pilates", "Extreme Sports", "Winter Sports", "Team Building Sports", "Amateur Sports"
  ],
  "Familien/Kids": [
    "Familien/Kids", "Children Events", "Family Festivals", "Kids Workshops", "Educational Activities", "Interactive Shows", "Children Theater", "Puppet Shows", "Magic Shows", "Storytelling for Kids", "Arts & Crafts"
  ],
  "Kunst/Design": [
    "Kunst/Design", "Art Exhibitions", "Design Markets", "Craft Fairs", "Artist Studios", "Creative Workshops", "Fashion Shows", "Photography", "Sculpture", "Painting", "Digital Art", "Street Art", "Installation Art"
  ],
  "Wellness/Spirituell": [
    "Wellness/Spirituell", "Meditation Events", "Yoga Classes", "Spa Events", "Mindfulness Workshops", "Spiritual Retreats", "Healing Sessions", "Wellness Festivals", "Breathwork", "Sound Healing", "Crystal Healing"
  ],
  "Networking/Business": [
    "Networking/Business", "Business Meetups", "Professional Development", "Industry Conferences", "Startup Events", "Entrepreneurship", "Career Fairs", "Leadership Events", "Trade Shows", "B2B Events", "Pitch Events"
  ],
  "Natur/Outdoor": [
    "Natur/Outdoor", "Hiking/Walking Tours", "Nature Tours", "Wildlife Watching", "Botanical Gardens", "Park Events", "Outdoor Adventures", "Camping Events", "Environmental Education", "Eco-Tours", "Outdoor Yoga"
  ],
  "Kultur/Traditionen": [
   "Kultur/Traditionen", "Local Traditions", "Cultural Festivals", "Historical Reenactments", "Folk Festivals", "Religious Celebrations", "Seasonal Celebrations", "Cultural Heritage", "Traditional Crafts", "Folk Music/Dance", "Local Cuisine"
  ],
  "Märkte/Shopping": [
    "Märkte/Shopping", "Flohmarkt/Flea Markets", "Vintage Markets", "Handmade Markets", "Antique Fairs", "Shopping Events", "Pop-up Shops", "Designer Markets", "Book Markets", "Record Fairs", "Seasonal Markets"
  ],
  "Bildung/Lernen": [
    "Bildung/Lernen", "Workshops", "Kurse/Classes", "Seminare/Seminars", "Lectures/Vorträge", "Language Exchange", "Book Clubs", "Study Groups", "Academic Conferences", "Skill Sharing", "DIY Workshops", "Conferences"
  ],
  "Soziales/Community": [
    "Soziales/Community", "Community Events", "Volunteer Activities", "Charity Events", "Social Causes", "Neighborhood Meetings", "Cultural Exchange", "Senior Events", "Expat Events", "Local Initiatives"
  ],
};

/**
 * Builds a formatted category list string for use in AI prompts
 * @param categories - Optional list of specific categories to include (defaults to all)
 * @returns Formatted string with numbered categories for prompts
 */
export function buildCategoryListForPrompt(categories?: string[]): string {
  const categoriesToUse = categories || Object.keys(EVENT_CATEGORY_SUBCATEGORIES);
  
  // Create German descriptions for categories (mapping for prompt clarity) 
  // Preserve original prompt style for backward compatibility with tests
  const categoryDescriptions: Record<string, string> = {
    "DJ Sets/Electronic": "DJ Sets & Electronic Music Events",
    "Clubs/Discos": "Clubs & DJ-Sets & Partys & Electronic Music Events", 
    "Live-Konzerte": "Konzerte & Musik (Klassik, Rock, Pop, Jazz, Elektronik)",
    "Open Air": "Open-Air Events & Festivals & Outdoor Events",
    "Museen": "Museen & Ausstellungen & Galerien (auch Sonderausstellungen)",
    "LGBTQ+": "LGBT+ Events & Queer Events & Pride Events",
    "Comedy/Kabarett": "Theater & Kabarett & Comedy & Musicals",
    "Theater/Performance": "Theater & Performance & Musicals",
    "Film": "Film & Cinema & Movie Events",
    "Food/Culinary": "Food & Culinary Events & Wine Tasting",
    "Sport": "Sport & Fitness Events",
    "Familien/Kids": "Kinder- & Familienveranstaltungen",
    "Kunst/Design": "Kunst & Design Events",
    "Wellness/Spirituell": "Wellness & Spiritual Events",
    "Networking/Business": "Universitäts- & Studentenevents",
    "Natur/Outdoor": "Natur & Outdoor Activities",
    "Kultur/Traditionen": "Szene-Events & Underground Events & Alternative Events",
    "Märkte/Shopping": "Märkte & Shopping Events",
    "Bildung/Lernen": "Bars & Rooftop Events & Afterwork Events",
    "Soziales/Community": "Community & Social Events"
  };

  return categoriesToUse
    .map((category, index) => {
      const description = categoryDescriptions[category] || category;
      return `${index + 1}. ${description}`;
    })
    .join('\n');
}

/**
 * Gets all allowed categories for schema validation
 * @returns Array of all main category names
 */
export function allowedCategoriesForSchema(): string[] {
  return Object.keys(EVENT_CATEGORY_SUBCATEGORIES);
}

/**
 * Gets all allowed categories (alias for backward compatibility)
 * @returns Array of all main category names
 */
export function getAllowedCategories(): string[] {
  return allowedCategoriesForSchema();
}

/**
 * Validates if a category is in the allowed list
 * @param category - Category to validate
 * @returns True if category is valid
 */
export function isValidCategory(category: string): boolean {
  return Object.keys(EVENT_CATEGORY_SUBCATEGORIES).includes(category);
}

/**
 * Validates if a subcategory exists in any main category
 * @param subcategory - Subcategory to validate
 * @returns True if subcategory is valid
 */
export function isValidSubcategory(subcategory: string): boolean {
  return Object.values(EVENT_CATEGORY_SUBCATEGORIES)
    .some(subcategories => subcategories.includes(subcategory));
}