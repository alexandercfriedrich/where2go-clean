import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

interface ImageDownloadResult {
  success: boolean;
  storagePath?: string;
  publicUrl?: string;
  error?: string;
  originalUrl?: string;
}

/**
 * OPTIMIZED ImageDownloadService v2
 * 
 * KEY IMPROVEMENTS:
 * 1. Skips HEAD requests (they're being blocked)
 * 2. Uses streaming GET with size limits
 * 3. Better timeout handling (45s)
 * 4. More detailed error logging
 * 5. Success rate tracking
 */
export class ImageDownloadService {
  private supabase;
  private storageBucket = 'event-images';
  
  private readonly MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
  private readonly ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  private readonly TIMEOUT = 45000; // 45 seconds (was 30s)
  private readonly ACCEPTED_STATUS_CODES = [200, 206];

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * CORE: Download, validate, optimize, and store image
   * OPTIMIZED: Skips HEAD request, goes straight to GET
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
          error: `Invalid URL format`
        };
      }

      // 2. Download image directly (skip HEAD request)
      const downloadResult = await this.fetchImageWithRetry(imageUrl);
      if (!downloadResult.success || !downloadResult.buffer) {
        return {
          success: false,
          originalUrl: imageUrl,
          error: downloadResult.error
        };
      }

      // 3. Validate and optimize image
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

      // 4. Upload to Supabase Storage
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

      // 5. Create public URL
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
   * OPTIMIZED: Skip HEAD request, use streaming GET directly
   * More reliable than HEAD + GET (many servers block HEAD requests)
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

      // Check HTTP status
      if (!this.ACCEPTED_STATUS_CODES.includes(response.status)) {
        if (attempt < 3 && response.status >= 500) {
          // Retry on server errors (5xx)
          await new Promise(r => setTimeout(r, 1000 * attempt));
          return this.fetchImageWithRetry(imageUrl, attempt + 1);
        }
        return {
          success: false,
          error: `HTTP ${response.status} (${response.statusText}) - URL may be invalid or expired`
        };
      }

      // Check content type EARLY
      const contentType = response.headers.get('content-type');
      if (contentType && !this.ALLOWED_MIME_TYPES.some(t => contentType.includes(t))) {
        return {
          success: false,
          error: `Invalid content type: ${contentType}. Expected: image/*`
        };
      }

      // Stream to buffer with size limit
      const chunks: Uint8Array[] = [];
      let totalSize = 0;

      if (!response.body) {
        return { success: false, error: 'No response body' };
      }

      const reader = response.body.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          totalSize += value.length;
          if (totalSize > this.MAX_IMAGE_SIZE) {
            reader.cancel();
            return {
              success: false,
              error: `Image too large: ${(totalSize / 1024 / 1024).toFixed(2)}MB (max: 5MB)`
            };
          }

          chunks.push(value);
        }
      } finally {
        reader.releaseLock();
      }

      // Combine chunks into buffer
      const buffer = Buffer.concat(chunks.map(chunk => Buffer.from(chunk)));

      if (buffer.length === 0) {
        return { success: false, error: 'Downloaded image is empty' };
      }

      return { success: true, buffer };

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);

      // Specific error handling
      if (errorMsg.includes('AbortError')) {
        if (attempt < 3) {
          console.warn(`[ImageDownload] Timeout attempt ${attempt}/3, retrying ${imageUrl.substring(0, 50)}...`);
          await new Promise(r => setTimeout(r, 1000 * attempt));
          return this.fetchImageWithRetry(imageUrl, attempt + 1);
        }
        return {
          success: false,
          error: `Timeout after ${this.TIMEOUT}ms (${attempt} attempts)`
        };
      }

      if (errorMsg.includes('fetch failed')) {
        if (attempt < 2) {
          console.warn(`[ImageDownload] Network error attempt ${attempt}/2, retrying...`);
          await new Promise(r => setTimeout(r, 1000));
          return this.fetchImageWithRetry(imageUrl, attempt + 1);
        }
        return {
          success: false,
          error: `Network error - server may be unreachable or blocking requests`
        };
      }

      return {
        success: false,
        error: `Download failed (attempt ${attempt}/3): ${errorMsg}`
      };
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
      'Sec-Fetch-Site': 'none',
      'Pragma': 'no-cache',
      'Cache-Control': 'no-cache'
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
   * OPTIMIZED: Better progress logging and success rate tracking
   */
  async downloadAndStoreImageBatch(
    images: Array<{ url: string; eventId: string; city: string; title?: string }>,
    concurrency = 3
  ): Promise<ImageDownloadResult[]> {
    const results: ImageDownloadResult[] = [];
    const queue = [...images];
    let completed = 0;
    let successful = 0;
    const total = images.length;

    const worker = async (workerId: number) => {
      while (queue.length > 0) {
        const item = queue.shift();
        if (!item) break;

        try {
          const result = await this.downloadAndStoreImage(
            item.url,
            item.eventId,
            item.city,
            item.title
          );
          results.push(result);
          completed++;
          if (result.success) successful++;

          // Log progress
          const status = result.success ? '✅' : '❌';
          const percent = Math.round((completed / total) * 100);
          console.log(`[ImageDownload] ${status} ${item.title} (${completed}/${total} ${percent}%)`);
          if (!result.success && result.error) {
            console.warn(`  └─ ${result.error}`);
          }
        } catch (error) {
          console.error(`[ImageDownload] Worker ${workerId} crashed:`, error);
          completed++;
          results.push({
            success: false,
            originalUrl: item.url,
            error: `Worker crashed: ${error instanceof Error ? error.message : String(error)}`
          });
        }
      }
    };

    const workers = Array(Math.min(concurrency, queue.length))
      .fill(null)
      .map((_, i) => worker(i));

    await Promise.all(workers);

    // Summary
    const successRate = total > 0 ? ((successful / total) * 100).toFixed(1) : '0';
    console.log(`[ImageDownload] Complete: ${successful}/${total} successful (${successRate}%)`);

    return results;
  }
}
