/**
 * HTML Sanitization utility using isomorphic-dompurify
 * Defense-in-depth measure for sanitizing user-generated HTML content
 * Uses isomorphic-dompurify for both server-side (SSR) and client-side rendering compatibility
 *
 * Note: pinned to v2.16.0 due to serverless ESM/CommonJS compatibility (parse5 requirement)
 */

// Use default import - works at runtime despite TypeScript module resolution issues
