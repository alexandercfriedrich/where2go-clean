/**
 * Event Image Fallback Utility
 * 
 * Generates consistent fallback colors and handles title display
 * when no event image or venue fallback image is available.
 */

// Available fallback colors: dark blue, dark brown, dark gray, black
const FALLBACK_COLORS = [
  '#1e3a8a', // dark blue
  '#451a03', // dark brown
  '#374151', // dark gray
  '#000000', // black
];

/**
 * Generate a consistent color index based on event title
 * Uses a simple hash function to ensure the same title always gets the same color
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Get a consistent fallback color for an event based on its title
 */
export function getFallbackColor(title: string): string {
  const hash = hashString(title || 'event');
  return FALLBACK_COLORS[hash % FALLBACK_COLORS.length];
}

/**
 * Check if an event has a valid image (either direct image or venue fallback)
 */
export function hasValidImage(eventImage: string | null | undefined): boolean {
  return !!eventImage && eventImage.trim() !== '';
}
