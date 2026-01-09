/**
 * Image Storage Utility
 * 
 * Downloads images from external URLs and uploads them to Supabase Storage
 * for reliable, permanent storage with CDN delivery.
 * 
 * Pattern follows das-werk.py scraper implementation.
 */

import { supabaseAdmin } from '@/lib/supabase/client';

export interface ImageUploadResult {
  success: boolean;
  publicUrl?: string;
  originalUrl: string;
  error?: string;
}

export interface ImageUploadOptions {
  /** Enable debug logging */
  debug?: boolean;
  /** Timeout for image download in milliseconds (default: 10000) */
  timeout?: number;
  /** Maximum file size in bytes (default: 10MB) */
  maxFileSize?: number;
}

const STORAGE_BUCKET = 'event-images';
const DEFAULT_TIMEOUT = 10000; // 10 seconds
const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Download an image from external URL and upload to Supabase Storage
 * 
 * @param imageUrl - External image URL to download
 * @param city - City name for organizing images
 * @param eventId - Unique event identifier (e.g., event title slug)
 * @param options - Upload options
 * @returns Upload result with public URL or error
 */
export async function uploadImageToStorage(
  imageUrl: string,
  city: string,
  eventId: string,
  options: ImageUploadOptions = {}
): Promise<ImageUploadResult> {
  const { debug = false, timeout = DEFAULT_TIMEOUT, maxFileSize = DEFAULT_MAX_FILE_SIZE } = options;

  // Validate input
  if (!imageUrl || !imageUrl.startsWith('http')) {
    return {
      success: false,
      originalUrl: imageUrl,
      error: 'Invalid image URL'
    };
  }

  // Check if SUPABASE_SERVICE_ROLE_KEY is configured
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    console.warn('[ImageStorage] SUPABASE_SERVICE_ROLE_KEY not configured - image upload skipped');
    return {
      success: false,
      originalUrl: imageUrl,
      error: 'SUPABASE_SERVICE_ROLE_KEY not configured'
    };
  }

  try {
    if (debug) {
      console.log(`[ImageStorage] Downloading image from: ${imageUrl}`);
    }

    // Download image with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(imageUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'image/*',
      }
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        success: false,
        originalUrl: imageUrl,
        error: `HTTP ${response.status}: ${response.statusText}`
      };
    }

    // Get content type and validate
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    if (!contentType.startsWith('image/')) {
      return {
        success: false,
        originalUrl: imageUrl,
        error: `Invalid content type: ${contentType}`
      };
    }

    // Download image data
    const arrayBuffer = await response.arrayBuffer();
    const imageData = Buffer.from(arrayBuffer);

    // Check file size
    if (imageData.length > maxFileSize) {
      return {
        success: false,
        originalUrl: imageUrl,
        error: `Image too large: ${imageData.length} bytes (max: ${maxFileSize})`
      };
    }

    // Generate filename with city organization
    const fileExtension = getFileExtension(contentType, imageUrl);
    const sanitizedCity = sanitizePathComponent(city);
    const sanitizedEventId = sanitizePathComponent(eventId);
    const filename = `${sanitizedCity}/${sanitizedEventId}.${fileExtension}`;

    if (debug) {
      console.log(`[ImageStorage] Uploading to: ${STORAGE_BUCKET}/${filename} (${imageData.length} bytes)`);
    }

    // Upload to Supabase Storage
    const { data, error } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .upload(filename, imageData, {
        contentType,
        upsert: true, // Overwrite if exists
        cacheControl: '31536000', // Cache for 1 year (images are immutable)
      });

    if (error) {
      console.error(`[ImageStorage] Upload failed:`, error);
      return {
        success: false,
        originalUrl: imageUrl,
        error: error.message
      };
    }

    // Get public URL
    const { data: publicUrlData } = supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(filename);

    if (!publicUrlData || !publicUrlData.publicUrl) {
      return {
        success: false,
        originalUrl: imageUrl,
        error: 'Failed to get public URL'
      };
    }

    if (debug) {
      console.log(`[ImageStorage] Successfully uploaded: ${publicUrlData.publicUrl}`);
    }

    return {
      success: true,
      publicUrl: publicUrlData.publicUrl,
      originalUrl: imageUrl
    };

  } catch (error: any) {
    // Handle timeout and other errors
    if (error.name === 'AbortError') {
      return {
        success: false,
        originalUrl: imageUrl,
        error: 'Download timeout'
      };
    }

    console.error(`[ImageStorage] Error:`, error);
    return {
      success: false,
      originalUrl: imageUrl,
      error: error.message || 'Unknown error'
    };
  }
}

/**
 * Batch upload multiple images with concurrency control
 * 
 * @param images - Array of image upload tasks
 * @param options - Upload options
 * @param concurrency - Maximum concurrent uploads (default: 3)
 * @returns Array of upload results
 */
export async function uploadImagesInBatch(
  images: Array<{ url: string; city: string; eventId: string }>,
  options: ImageUploadOptions = {},
  concurrency: number = 3
): Promise<ImageUploadResult[]> {
  const results: ImageUploadResult[] = [];
  const queue = [...images];

  // Process in batches with concurrency control
  while (queue.length > 0) {
    const batch = queue.splice(0, concurrency);
    const batchResults = await Promise.all(
      batch.map(img => uploadImageToStorage(img.url, img.city, img.eventId, options))
    );
    results.push(...batchResults);
  }

  return results;
}

/**
 * Get file extension from content type or URL
 */
function getFileExtension(contentType: string, url: string): string {
  // Try content type first
  const typeMap: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif'
  };

  const ext = typeMap[contentType.toLowerCase()];
  if (ext) return ext;

  // Fallback to URL extension
  const urlMatch = url.match(/\.([a-z0-9]+)(?:\?|$)/i);
  if (urlMatch) {
    const urlExt = urlMatch[1].toLowerCase();
    if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(urlExt)) {
      return urlExt === 'jpeg' ? 'jpg' : urlExt;
    }
  }

  // Default to jpg
  return 'jpg';
}

/**
 * Sanitize path component for storage (remove special characters, lowercase)
 */
function sanitizePathComponent(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9-]/g, '-') // Replace special chars with hyphen
    .replace(/-+/g, '-') // Collapse multiple hyphens
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
    .substring(0, 100); // Limit length
}
