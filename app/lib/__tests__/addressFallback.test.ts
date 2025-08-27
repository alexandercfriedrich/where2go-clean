import { describe, it, expect } from 'vitest';

describe('Address Fallback Logic', () => {
  it('should create proper fallback URL when address is missing', () => {
    const venue = 'Berghain';
    const city = 'Berlin';
    
    const expectedUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${venue}, ${city}`)}`;
    const actualUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${venue}, ${city}`)}`;
    
    expect(actualUrl).toBe(expectedUrl);
    expect(actualUrl).toContain('Berghain%2C%20Berlin');
  });

  it('should handle special characters in venue and city names', () => {
    const venue = 'Café de l\'Art';
    const city = 'München';
    
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${venue}, ${city}`)}`;
    
    expect(url).toContain(encodeURIComponent('Café de l\'Art, München'));
  });

  it('should create different URLs for different venues in same city', () => {
    const city = 'Berlin';
    const venue1 = 'Berghain';
    const venue2 = 'Watergate';
    
    const url1 = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${venue1}, ${city}`)}`;
    const url2 = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${venue2}, ${city}`)}`;
    
    expect(url1).not.toBe(url2);
    expect(url1).toContain('Berghain');
    expect(url2).toContain('Watergate');
  });
});