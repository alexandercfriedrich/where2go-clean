/**
 * HTML Sanitization utility using DOMPurify
 * Defense-in-depth measure for sanitizing user-generated HTML content
 */

import DOMPurify from 'dompurify';

/**
 * Sanitizes HTML content to prevent XSS attacks
 * @param dirty - Raw HTML string
 * @returns Sanitized HTML string safe for rendering
 */
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    // Allow common HTML tags for blog content
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'a', 'img', 'blockquote', 'code', 'pre',
      'table', 'thead', 'tbody', 'tr', 'th', 'td', 'div', 'span'
    ],
    // Allow necessary attributes
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'id', 'target', 'rel'],
    // Allow only https: and http: protocols for links and images
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):)/i,
  });
}

/**
 * Validates and sanitizes image URL to prevent XSS via malicious URLs
 * @param url - Image URL to validate
 * @returns Validated URL or empty string if invalid
 */
export function sanitizeImageUrl(url: string): string {
  if (!url) return '';
  
  // Check if URL starts with http:// or https://
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // Reject data:, javascript:, and other potentially malicious schemes
  return '';
}
