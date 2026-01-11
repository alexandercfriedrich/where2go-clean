/**
 * Image Proxy Service
 * 
 * Purpose: Make external event images available via CDN
 * Problems solved: Hotlink protection, CORS issues, invalid URLs
 * Cost: FREE (weserv.nl is public and free)
 * 
 * CDN used: weserv.nl (Open Source Image CDN)
 * - No registration required
 * - No API keys required
 * - Free for unlimited requests
 * - Hosted in NL, fast response times
 */

/**
 * Get optimized image URL with proxy fallback for external images
 * 
 * @param originalUrl - The original image URL (can be null/undefined)
 * @returns Proxied or fallback image URL
 */
export function getImageUrl(originalUrl: string | null | undefined): string {
  // Case 1: No URL provided
  if (!originalUrl || typeof originalUrl !== 'string' || originalUrl.trim() === '') {
    return getPlaceholderUrl('event-default');
  }

  const trimmedUrl = originalUrl.trim();

  // Case 2: Local assets - use directly (check before invalid URL check)
  if (trimmedUrl.startsWith('/')) {
    return trimmedUrl;
  }

  // Case 3: Invalid URLs (not http/https)
  if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
    return getPlaceholderUrl('event-invalid');
  }

  // Case 4: Supabase URLs - already optimized, use directly
  if (trimmedUrl.includes('supabase')) {
    return trimmedUrl;
  }

  // Case 5: External URLs - proxy through weserv.nl
  try {
    const encoded = encodeURIComponent(trimmedUrl);
    
    // weserv.nl Proxy with optimizations:
    // - w=1200: Max width 1200px
    // - h=1200: Max height 1200px
    // - fit=cover: Maintain aspect ratio, crop if needed
    // - q=80: JPG quality 80% (good balance between size/quality)
    // - default=404: Return 404 if image doesn't exist
    
    return `https://images.weserv.nl/?url=${encoded}&w=1200&h=1200&fit=cover&q=80&default=404`;
  } catch (error) {
    // Don't log the full URL to avoid exposing sensitive tokens/credentials
    console.warn(`[ImageProxy] Failed to encode URL (length: ${trimmedUrl.length})`, error);
    return getPlaceholderUrl('event-error');
  }
}

/**
 * Alternative proxy service (fallback if weserv.nl is down)
 * Can be integrated into a fallback chain for production
 * 
 * @param originalUrl - The original image URL
 * @returns Alternative proxied URL or null if encoding fails
 */
export function getAlternativeProxyUrl(originalUrl: string): string | null {
  // Option 1: wsrv.nl (Open Source Alternative to weserv.nl)
  try {
    const encoded = encodeURIComponent(originalUrl);
    return `https://wsrv.nl/?url=${encoded}&w=1200&h=1200&fit=cover&q=80`;
  } catch {
    return null;
  }
}

/**
 * Placeholder URLs for error cases
 * Uses high-quality Unsplash images as fallbacks
 * 
 * @param type - Type of placeholder to use
 * @returns Placeholder image URL
 */
function getPlaceholderUrl(
  type: 'event-default' | 'event-invalid' | 'event-error' = 'event-default'
): string {
  // Use public placeholder images from Unsplash
  const placeholders: Record<string, string> = {
    'event-default': 'https://images.unsplash.com/photo-1491438639081-d282f0efc881?w=1200&h=1200&fit=crop&q=80',
    'event-invalid': 'https://images.unsplash.com/photo-1517457373614-b7152f800fd1?w=1200&h=1200&fit=crop&q=80',
    'event-error': 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200&h=1200&fit=crop&q=80',
  };
  
  return placeholders[type] || placeholders['event-default'];
}

/**
 * Batch process multiple image URLs
 * Useful for processing multiple events at once
 * 
 * @param originalUrls - Array of original image URLs
 * @returns Array of proxied image URLs
 */
export function getImageUrls(originalUrls: (string | null | undefined)[]): string[] {
  return originalUrls.map(url => getImageUrl(url));
}

/**
 * Test if image URL is accessible
 * Optional - for QA/Testing purposes
 * Note: This is a best-effort check. For images, opaque responses (no-cors) are acceptable.
 * 
 * @param url - URL to test
 * @param timeoutMs - Timeout in milliseconds (default: 5000)
 * @returns Promise resolving to true if image appears to be accessible
 */
export async function testImageUrl(url: string, timeoutMs: number = 5000): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    const response = await fetch(url, { 
      method: 'HEAD',
      signal: controller.signal,
      mode: 'no-cors' // Images work with opaque responses
    });
    
    clearTimeout(timeoutId);
    // With no-cors mode, we accept opaque responses as success
    // This is the expected behavior for cross-origin images
    return response.type === 'opaque' || response.ok;
  } catch (error) {
    return false;
  }
}
