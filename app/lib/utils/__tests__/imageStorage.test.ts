/**
 * Tests for Image Storage Utility
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase client before importing the module
vi.mock('@/lib/supabase/client', () => ({
  supabaseAdmin: {
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(),
        getPublicUrl: vi.fn()
      }))
    }
  }
}));

// Mock fetch
global.fetch = vi.fn();

describe('Image Storage Utility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('uploadImageToStorage', () => {
    it('should validate invalid URLs', async () => {
      const { uploadImageToStorage } = await import('../imageStorage');
      
      const result = await uploadImageToStorage(
        'not-a-url',
        'wien',
        'test-event'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid image URL');
    });

    it('should handle download errors gracefully', async () => {
      const { uploadImageToStorage } = await import('../imageStorage');
      
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const result = await uploadImageToStorage(
        'https://example.com/image.jpg',
        'wien',
        'test-event'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle HTTP errors', async () => {
      const { uploadImageToStorage } = await import('../imageStorage');
      
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });

      const result = await uploadImageToStorage(
        'https://example.com/image.jpg',
        'wien',
        'test-event'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('404');
    });

    it('should reject non-image content types', async () => {
      const { uploadImageToStorage } = await import('../imageStorage');
      
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        headers: {
          get: vi.fn((header: string) => {
            if (header === 'content-type') return 'text/html';
            return null;
          })
        },
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(1000))
      });

      const result = await uploadImageToStorage(
        'https://example.com/image.jpg',
        'wien',
        'test-event'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid content type');
    });

    it('should reject files that are too large', async () => {
      const { uploadImageToStorage } = await import('../imageStorage');
      
      // Create a large buffer (11MB)
      const largeBuffer = new ArrayBuffer(11 * 1024 * 1024);
      
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        headers: {
          get: vi.fn((header: string) => {
            if (header === 'content-type') return 'image/jpeg';
            return null;
          })
        },
        arrayBuffer: vi.fn().mockResolvedValue(largeBuffer)
      });

      const result = await uploadImageToStorage(
        'https://example.com/image.jpg',
        'wien',
        'test-event',
        { maxFileSize: 10 * 1024 * 1024 } // 10MB limit
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('too large');
    });
  });
});
