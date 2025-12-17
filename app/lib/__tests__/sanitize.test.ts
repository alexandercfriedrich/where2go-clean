/**
 * Tests for HTML sanitization utilities
 * Using isomorphic-dompurify which works in both Node.js (tests) and browser environments
 */

import { describe, it, expect } from 'vitest';
import { sanitizeHtml, sanitizeImageUrl } from '../utils/sanitize';

describe('sanitizeHtml', () => {
  it('should preserve safe HTML tags', () => {
    const input = '<p>Hello <strong>world</strong></p>';
    const result = sanitizeHtml(input);
    expect(result).toContain('<p>');
    expect(result).toContain('<strong>');
    expect(result).toContain('Hello');
    expect(result).toContain('world');
  });

  it('should remove script tags', () => {
    const input = '<p>Hello</p><script>alert("XSS")</script>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain('<script>');
    expect(result).not.toContain('alert');
    expect(result).toContain('<p>');
    expect(result).toContain('Hello');
  });

  it('should remove javascript: URLs', () => {
    const input = '<a href="javascript:alert(1)">Click</a>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain('javascript:');
  });

  it('should allow https URLs', () => {
    const input = '<a href="https://example.com">Link</a>';
    const result = sanitizeHtml(input);
    expect(result).toContain('https://example.com');
  });

  it('should allow http URLs', () => {
    const input = '<a href="http://example.com">Link</a>';
    const result = sanitizeHtml(input);
    expect(result).toContain('http://example.com');
  });

  it('should allow mailto URLs', () => {
    const input = '<a href="mailto:test@example.com">Email</a>';
    const result = sanitizeHtml(input);
    expect(result).toContain('mailto:test@example.com');
  });

  it('should allow images with safe URLs', () => {
    const input = '<img src="https://example.com/image.jpg" alt="Test">';
    const result = sanitizeHtml(input);
    expect(result).toContain('<img');
    expect(result).toContain('https://example.com/image.jpg');
    expect(result).toContain('alt="Test"');
  });

  it('should preserve headings', () => {
    const input = '<h1>Title</h1><h2>Subtitle</h2>';
    const result = sanitizeHtml(input);
    expect(result).toContain('<h1>');
    expect(result).toContain('<h2>');
    expect(result).toContain('Title');
    expect(result).toContain('Subtitle');
  });

  it('should preserve lists', () => {
    const input = '<ul><li>Item 1</li><li>Item 2</li></ul>';
    const result = sanitizeHtml(input);
    expect(result).toContain('<ul>');
    expect(result).toContain('<li>');
    expect(result).toContain('Item 1');
    expect(result).toContain('Item 2');
  });

  it('should preserve blockquotes', () => {
    const input = '<blockquote>Quote text</blockquote>';
    const result = sanitizeHtml(input);
    expect(result).toContain('<blockquote>');
    expect(result).toContain('Quote text');
  });

  it('should handle empty input', () => {
    const result = sanitizeHtml('');
    expect(result).toBe('');
  });

  it('should handle plain text without HTML', () => {
    const input = 'Just plain text';
    const result = sanitizeHtml(input);
    expect(result).toBe('Just plain text');
  });

  // XSS event handler tests
  it('should remove onclick event handlers', () => {
    const input = '<div onclick="alert(1)">Click me</div>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain('onclick');
    expect(result).not.toContain('alert');
    expect(result).toContain('Click me');
  });

  it('should remove onerror event handlers from images', () => {
    const input = '<img src="x" onerror="alert(1)">';
    const result = sanitizeHtml(input);
    expect(result).not.toContain('onerror');
    expect(result).not.toContain('alert');
  });

  it('should remove onload event handlers', () => {
    const input = '<body onload="alert(1)">Content</body>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain('onload');
    expect(result).not.toContain('alert');
  });

  it('should remove onmouseover event handlers', () => {
    const input = '<span onmouseover="alert(1)">Hover me</span>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain('onmouseover');
    expect(result).not.toContain('alert');
    expect(result).toContain('Hover me');
  });

  it('should remove multiple event handlers from single element', () => {
    const input = '<button onclick="alert(1)" onmouseover="alert(2)" onload="alert(3)">Click</button>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain('onclick');
    expect(result).not.toContain('onmouseover');
    expect(result).not.toContain('onload');
    expect(result).not.toContain('alert');
  });
});

describe('sanitizeImageUrl', () => {
  it('should allow https URLs', () => {
    const url = 'https://example.com/image.jpg';
    const result = sanitizeImageUrl(url);
    expect(result).toBe(url);
  });

  it('should allow http URLs', () => {
    const url = 'http://example.com/image.jpg';
    const result = sanitizeImageUrl(url);
    expect(result).toBe(url);
  });

  it('should reject javascript: URLs', () => {
    const url = 'javascript:alert(1)';
    const result = sanitizeImageUrl(url);
    expect(result).toBe('');
  });

  it('should reject data: URLs', () => {
    const url = 'data:image/svg+xml,<svg></svg>';
    const result = sanitizeImageUrl(url);
    expect(result).toBe('');
  });

  it('should reject empty strings', () => {
    const result = sanitizeImageUrl('');
    expect(result).toBe('');
  });

  it('should reject relative URLs', () => {
    const url = '/images/test.jpg';
    const result = sanitizeImageUrl(url);
    expect(result).toBe('');
  });

  it('should reject URLs without protocol', () => {
    const url = 'example.com/image.jpg';
    const result = sanitizeImageUrl(url);
    expect(result).toBe('');
  });
});
