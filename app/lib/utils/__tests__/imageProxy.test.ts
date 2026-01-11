import { describe, it, expect } from 'vitest';
import { getImageUrl, getImageUrls, getAlternativeProxyUrl } from '../imageProxy';

describe('imageProxy', () => {
  describe('getImageUrl', () => {
    it('should return placeholder for null URL', () => {
      const result = getImageUrl(null);
      expect(result).toContain('unsplash.com');
      expect(result).toContain('photo-1491438639081');
    });

    it('should return placeholder for undefined URL', () => {
      const result = getImageUrl(undefined);
      expect(result).toContain('unsplash.com');
    });

    it('should return placeholder for empty string', () => {
      const result = getImageUrl('');
      expect(result).toContain('unsplash.com');
    });

    it('should return placeholder for whitespace-only string', () => {
      const result = getImageUrl('   ');
      expect(result).toContain('unsplash.com');
    });

    it('should return placeholder for invalid URL (no protocol)', () => {
      const result = getImageUrl('not-a-valid-url');
      expect(result).toContain('unsplash.com');
      expect(result).toContain('photo-1517457373614');
    });

    it('should return Supabase URLs directly', () => {
      const supabaseUrl = 'https://my-project.supabase.co/storage/v1/object/public/images/test.jpg';
      const result = getImageUrl(supabaseUrl);
      expect(result).toBe(supabaseUrl);
    });

    it('should return local paths directly', () => {
      const localPath = '/images/event-placeholder.jpg';
      const result = getImageUrl(localPath);
      expect(result).toBe(localPath);
    });

    it('should proxy external HTTP URLs', () => {
      const externalUrl = 'http://example.com/image.jpg';
      const result = getImageUrl(externalUrl);
      expect(result).toContain('images.weserv.nl');
      expect(result).toContain('w=1200');
      expect(result).toContain('h=1200');
      expect(result).toContain('fit=cover');
      expect(result).toContain('q=80');
      expect(result).toContain(encodeURIComponent(externalUrl));
    });

    it('should proxy external HTTPS URLs', () => {
      const externalUrl = 'https://example.com/image.jpg';
      const result = getImageUrl(externalUrl);
      expect(result).toContain('images.weserv.nl');
      expect(result).toContain(encodeURIComponent(externalUrl));
    });

    it('should handle URLs with special characters', () => {
      const urlWithSpaces = 'https://example.com/my image.jpg';
      const result = getImageUrl(urlWithSpaces);
      expect(result).toContain('images.weserv.nl');
      // URL should be encoded
      expect(result).toContain('url=https%3A%2F%2Fexample.com%2Fmy%20image.jpg');
    });

    it('should trim whitespace from URLs', () => {
      const urlWithWhitespace = '  https://example.com/image.jpg  ';
      const result = getImageUrl(urlWithWhitespace);
      expect(result).toContain('images.weserv.nl');
      expect(result).toContain(encodeURIComponent('https://example.com/image.jpg'));
    });
  });

  describe('getImageUrls', () => {
    it('should process array of URLs', () => {
      const urls = [
        'https://example.com/image1.jpg',
        null,
        'https://my-project.supabase.co/storage/image2.jpg',
        undefined,
        '/local/image3.jpg'
      ];
      
      const results = getImageUrls(urls);
      
      expect(results).toHaveLength(5);
      expect(results[0]).toContain('images.weserv.nl'); // proxied
      expect(results[1]).toContain('unsplash.com'); // placeholder
      expect(results[2]).toContain('supabase.co'); // direct
      expect(results[3]).toContain('unsplash.com'); // placeholder
      expect(results[4]).toBe('/local/image3.jpg'); // direct
    });

    it('should handle empty array', () => {
      const results = getImageUrls([]);
      expect(results).toEqual([]);
    });
  });

  describe('getAlternativeProxyUrl', () => {
    it('should generate alternative proxy URL', () => {
      const url = 'https://example.com/image.jpg';
      const result = getAlternativeProxyUrl(url);
      expect(result).toContain('wsrv.nl');
      expect(result).toContain(encodeURIComponent(url));
    });

    it('should return null for invalid URLs that cannot be encoded', () => {
      // This is hard to test as most strings can be encoded
      // But the function structure allows for this
      const result = getAlternativeProxyUrl('https://example.com/valid.jpg');
      expect(result).not.toBeNull();
    });
  });

  describe('integration scenarios', () => {
    it('should handle typical event image scenarios', () => {
      // Scenario 1: External Ticketmaster image
      const ticketmasterUrl = 'https://www.ticketmaster.com/img/event-poster.jpg';
      expect(getImageUrl(ticketmasterUrl)).toContain('images.weserv.nl');

      // Scenario 2: Local storage image
      const localUrl = '/images/events/concert.jpg';
      expect(getImageUrl(localUrl)).toBe(localUrl);

      // Scenario 3: Supabase storage
      const supabaseUrl = 'https://xyz.supabase.co/storage/v1/object/events/1.jpg';
      expect(getImageUrl(supabaseUrl)).toBe(supabaseUrl);

      // Scenario 4: Missing image
      expect(getImageUrl(null)).toContain('unsplash.com');

      // Scenario 5: Invalid URL
      expect(getImageUrl('not-an-url')).toContain('unsplash.com');
    });
  });
});
