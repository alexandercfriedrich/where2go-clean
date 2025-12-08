/**
 * Slug generation utilities for Vercel ENAMETOOLONG fix
 * Prevents file path errors by truncating slugs to safe length
 */

export function generateSafeSlug(title: string, id?: string | number, maxLength: number = 50): string {
  if (!title) return `event-${id || Date.now()}`;

  // Normalize and clean title
  let slug = title
    .toLowerCase()
    .trim()
    // Replace umlauts
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    // Remove special characters, keep only alphanumeric and hyphens
    .replace(/[^a-z0-9\s-]/g, '')
    // Replace spaces with hyphens
    .replace(/\s+/g, '-')
    // Remove consecutive hyphens
    .replace(/-+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-+|-+$/g, '');

  // Truncate to max length
  if (slug.length > maxLength) {
    slug = slug.substring(0, maxLength).replace(/-+$/, ''); // Remove trailing hyphens after truncate
  }

  // Ensure we have content
  if (!slug) {
    slug = `event-${id || Date.now()}`;
  }

  return slug;
}

export function createEventSlug(title: string, id: string | number, includeId: boolean = true): string {
  const baseSlug = generateSafeSlug(title, undefined, 45); // Leave room for date
  
  if (includeId) {
    // Add short date suffix for uniqueness
    const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
    return `${baseSlug}-${date}`;
  }
  
  return baseSlug;
}

/**
 * Verify slug is safe for file systems
 * Max filename: 255 chars (filesystem limit)
 * Max path segment: ~150 chars (safe)
 */
export function isSlugSafe(slug: string): boolean {
  const maxLength = 150;
  
  if (slug.length > maxLength) {
    console.warn(`Slug too long: ${slug.length} chars (max ${maxLength})`);
    return false;
  }
  
  // Check for invalid characters
  if (/[^a-z0-9-]/i.test(slug)) {
    console.warn(`Slug contains invalid characters: ${slug}`);
    return false;
  }
  
  return true;
}
