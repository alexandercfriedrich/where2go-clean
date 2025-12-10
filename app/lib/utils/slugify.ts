/**
 * Shared utility for creating URL-friendly slugs
 * This can be used in both client and server components
 * Handles German umlauts and other diacritics properly
 */

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    // Normalize Unicode characters (decompose combined characters)
    .normalize('NFKD')
    // Remove diacritics/accents
    .replace(/[\u0300-\u036f]/g, '')
    // Additional German character replacements
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    // Remove any remaining non-word characters except spaces and hyphens
    .replace(/[^\w\s-]/g, '')
    // Replace spaces and underscores with hyphens
    .replace(/[\s_-]+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-+|-+$/g, '');
}
