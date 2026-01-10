import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

interface ImageDownloadResult {
  success: boolean;
  storagePath?: string;
  publicUrl?: string;
  error?: string;
  originalUrl?: string;
}

export class ImageDownloadService {
  private supabase;
  private storageBucket = 'event-images';
  
  private readonly MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
  private readonly ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  private readonly TIMEOUT = 30000; // 30 seconds
  private readonly ACCEPTED_STATUS_CODES = [200, 206];

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * CORE FUNCTION: Download, validate, optimize, and store image
   * Returns public Supabase URL or null if failed
   */
  async downloadAndStoreImage(
    imageUrl: string,
    eventId: string,
    city: string,
    eventTitle?: string
  ): Promise<ImageDownloadResult> {
    try {
      // 1. Validate input URL
      if (!this.isValidUrl(imageUrl)) {
        return {
          success: false,
          originalUrl: imageUrl,
          error: `Invalid URL format: ${imageUrl}`
        };
      }

      // 2. HEAD request: Check if URL is accessible
      const headResult = await this.validateImageUrl(imageUrl);
      if (!headResult.valid) {
        return {
          success: false,
          originalUrl: imageUrl,
          error: headResult.error
        };
      }

      // 3. Download image with retry
      const downloadResult = await this.fetchImageWithRetry(imageUrl);
      if (!downloadResult.success || !downloadResult.buffer) {
        return {
          success: false,
          originalUrl: imageUrl,
          error: downloadResult.error
        };
      }

      // 4. Validate and optimize image
      let imageBuffer = downloadResult.buffer;
      const optimizationResult = await this.validateAndOptimizeImage(imageBuffer, eventTitle);
      if (!optimizationResult.success) {
        return {
          success: false,
          originalUrl: imageUrl,
          error: optimizationResult.error
        };
      }
      imageBuffer = optimizationResult.buffer!;

      // 5. Upload to Supabase Storage
      const storageResult = await this.uploadToStorage(
        imageBuffer,
        eventId,
        city,
        optimizationResult.mimeType || 'image/jpeg'
      );
      if (!storageResult.success) {
        return {
          success: false,
          originalUrl: imageUrl,
          error: storageResult.error
        };
      }

      // 6. Create public URL
      const publicUrl = this.getPublicUrl(storageResult.storagePath!);

      return {
        success: true,
        storagePath: storageResult.storagePath,
        publicUrl,
        originalUrl: imageUrl
      };

    } catch (error) {
      console.error(`[ImageDownload] Unexpected error for ${imageUrl}:`, error);
      return {
        success: false,
        originalUrl: imageUrl,
        error: `Unexpected error: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * HEAD request to validate URL without downloading
   */
  private async validateImageUrl(imageUrl: string): Promise<{
    valid: boolean;
    error?: string;
    contentType?: string;
    contentLength?: number;
  }> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT);

      const response = await fetch(imageUrl, {
        method: 'HEAD',
        headers: this.getHeaders(),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!this.ACCEPTED_STATUS_CODES.includes(response.status)) {
        return {
          valid: false,
          error: `HTTP ${response.status}: URL not accessible`
        };
      }

      const contentType = response.headers.get('content-type');
      const contentLength = response.headers.get('content-length');

      if (contentType && !this.ALLOWED_MIME_TYPES.some(t => contentType.includes(t))) {
        return {
          valid: false,
          error: `Invalid content type: ${contentType}`
        };
      }

      if (contentLength) {
        const size = parseInt(contentLength);
        if (size > this.MAX_IMAGE_SIZE) {
          return {
            valid: false,
            error: `Image too large: ${(size / 1024 / 1024).toFixed(2)}MB (max: 5MB)`
          };
        }
      }

      return { valid: true, contentType: contentType || undefined };

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      if (errorMsg.includes('AbortError')) {
        return { valid: false, error: `Timeout after ${this.TIMEOUT}ms` };
      }
      return { valid: false, error: `HEAD request failed: ${errorMsg}` };
    }
  }

  /**
   * Download with retry logic (3 attempts)
   */
  private async fetchImageWithRetry(imageUrl: string, attempt = 1): Promise<{
    success: boolean;
    buffer?: Buffer;
    error?: string;
  }> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT);

      const response = await fetch(imageUrl, {
        method: 'GET',
        headers: this.getHeaders(),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!this.ACCEPTED_STATUS_CODES.includes(response.status)) {
        if (attempt < 3) {
          await new Promise(r => setTimeout(r, 1000 * attempt));
          return this.fetchImageWithRetry(imageUrl, attempt + 1);
        }
        return { success: false, error: `HTTP ${response.status} after ${attempt} attempts` };
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      if (buffer.length === 0) {
        return { success: false, error: 'Downloaded image is empty' };
      }

      return { success: true, buffer };

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      if (errorMsg.includes('AbortError') && attempt < 3) {
        await new Promise(r => setTimeout(r, 1000 * attempt));
        return this.fetchImageWithRetry(imageUrl, attempt + 1);
      }
      return { success: false, error: `Download failed (attempt ${attempt}/3): ${errorMsg}` };
    }
  }

  /**
   * Validate and optimize image with Sharp
   */
  private async validateAndOptimizeImage(buffer: Buffer, eventTitle?: string): Promise<{
    success: boolean;
    buffer?: Buffer;
    mimeType?: string;
    error?: string;
  }> {
    try {
      const metadata = await sharp(buffer).metadata();
      
      if (!metadata.width || !metadata.height) {
        return { success: false, error: 'Unable to detect image dimensions' };
      }

      if (metadata.width < 100 || metadata.height < 100) {
        return {
          success: false,
          error: `Image too small: ${metadata.width}x${metadata.height}px (min: 100x100px)`
        };
      }

      const optimized = await sharp(buffer)
        .resize(1200, 1200, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality: 80, progressive: true })
        .toBuffer();

      return {
        success: true,
        buffer: optimized,
        mimeType: 'image/jpeg'
      };

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `Image processing failed: ${errorMsg}`
      };
    }
  }

  /**
   * Upload to Supabase Storage
   */
  private async uploadToStorage(
    buffer: Buffer,
    eventId: string,
    city: string,
    mimeType: string
  ): Promise<{
    success: boolean;
    storagePath?: string;
    error?: string;
  }> {
    try {
      const fileName = `${eventId}-${Date.now()}.jpg`;
      const storagePath = `${city}/${eventId}/${fileName}`;

      const { error: uploadError } = await this.supabase.storage
        .from(this.storageBucket)
        .upload(storagePath, buffer, {
          contentType: mimeType,
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        if (uploadError.message.includes('already exists')) {
          await this.supabase.storage
            .from(this.storageBucket)
            .remove([storagePath]);
          
          const { error: retryError } = await this.supabase.storage
            .from(this.storageBucket)
            .upload(storagePath, buffer, {
              contentType: mimeType,
              cacheControl: '3600',
              upsert: true
            });
          
          if (retryError) {
            return { success: false, error: `Upload failed: ${retryError.message}` };
          }
        } else {
          return { success: false, error: `Upload failed: ${uploadError.message}` };
        }
      }

      return { success: true, storagePath };

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `Storage upload failed: ${errorMsg}`
      };
    }
  }

  /**
   * Generate public URL from storage path
   */
  private getPublicUrl(storagePath: string): string {
    const { data } = this.supabase.storage
      .from(this.storageBucket)
      .getPublicUrl(storagePath);
    return data.publicUrl;
  }

  /**
   * HTTP headers to bypass hotlink blocking
   */
  private getHeaders(): Record<string, string> {
    return {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Accept-Language': 'en-US,en;q=0.9',
      'Referer': 'https://www.google.com/',
      'Sec-Fetch-Dest': 'image',
      'Sec-Fetch-Mode': 'no-cors',
      'Sec-Fetch-Site': 'none'
    };
  }

  /**
   * Basic URL validation
   */
  private isValidUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  }

  /**
   * Batch download for multiple images (concurrent)
   */
  async downloadAndStoreImageBatch(
    images: Array<{ url: string; eventId: string; city: string; title?: string }>,
    concurrency = 3
  ): Promise<ImageDownloadResult[]> {
    const results: ImageDownloadResult[] = [];
    const queue = [...images];

    const worker = async () => {
      while (queue.length > 0) {
        const item = queue.shift();
        if (!item) break;

        const result = await this.downloadAndStoreImage(
          item.url,
          item.eventId,
          item.city,
          item.title
        );
        results.push(result);
      }
    };

    const workers = Array(Math.min(concurrency, queue.length))
      .fill(null)
      .map(() => worker());

    await Promise.all(workers);
    return results;
  }
}
