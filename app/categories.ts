// Kategorien als Map: Überkategorie => Unterkategorien
export const CATEGORY_MAP: Record<string, string[]> = {
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

// Helper functions for category mapping

/**
 * Gets all main categories (the 20 categories that have AI calls)
 */
export function getMainCategories(): string[] {
  return Object.keys(CATEGORY_MAP);
}

/**
 * Maps a subcategory to its main category
 * Returns the main category if the subcategory belongs to one of the 20 main categories
 * Returns the subcategory itself if it's already a main category
 */
export function getMainCategoryForSubcategory(subcategory: string): string | null {
  // Normalize input for comparison
  const normalizedSubcategory = subcategory.trim();
  
  // Check if it's already a main category
  if (CATEGORY_MAP[normalizedSubcategory]) {
    return normalizedSubcategory;
  }
  
  // Search through all main categories to find which one contains this subcategory
  for (const [mainCategory, subcategories] of Object.entries(CATEGORY_MAP)) {
    if (subcategories.some(sub => sub.toLowerCase() === normalizedSubcategory.toLowerCase())) {
      return mainCategory;
    }
  }
  
  return null; // Subcategory not found in any main category
}

/**
 * Takes a list of categories (may include subcategories) and returns the main categories
 * that should be used for AI calls. Eliminates duplicates.
 */
export function getMainCategoriesForAICalls(categories: string[]): string[] {
  const mainCategories = new Set<string>();
  
  for (const category of categories) {
    const mainCategory = getMainCategoryForSubcategory(category);
    if (mainCategory) {
      mainCategories.add(mainCategory);
    }
  }
  
  return Array.from(mainCategories);
}

/**
 * Gets all subcategories for a given main category
 */
export function getSubcategoriesForMainCategory(mainCategory: string): string[] {
  return CATEGORY_MAP[mainCategory] || [];
}
