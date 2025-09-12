/**
 * Event search prompt templates for AI providers.
 * This module provides structured prompts that force JSON output.
 * 
 * @fileoverview AI prompt templating for structured event search results.
 */

import { type MainCategory } from '../categories/categoryMap.js';

/**
 * JSON schema for event objects that AI must follow.
 */
const EVENT_JSON_SCHEMA = `{
  "title": "string (required)",
  "category": "string (required)",
  "date": "string (required, YYYY-MM-DD format)",
  "time": "string (required, HH:MM format)",
  "venue": "string (required)",
  "price": "string (required, can be 'Free', 'TBD', or specific price)",
  "website": "string (required, must be valid URL or empty string)",
  "endTime": "string (optional, HH:MM format)",
  "address": "string (optional)",
  "ticketPrice": "string (optional)",
  "eventType": "string (optional)",
  "description": "string (optional)",
  "bookingLink": "string (optional, must be valid URL)",
  "ageRestrictions": "string (optional)"
}`;

/**
 * Generate a category-specific event search prompt.
 * Forces structured JSON output with strict schema compliance.
 * 
 * @param city - Target city for event search
 * @param date - Event date in YYYY-MM-DD format
 * @param category - Main category to search for
 * @returns Structured prompt for AI provider
 */
export function createCategoryPrompt(
  city: string,
  date: string,
  category: MainCategory
): string {
  return `Search for ${category} events in ${city} on ${date}.

CRITICAL INSTRUCTIONS:
1. Return ONLY a valid JSON array of event objects
2. Do not include any explanatory text, markdown, or comments
3. If no events are found, return: []
4. Each event MUST follow this exact JSON schema:

${EVENT_JSON_SCHEMA}

SEARCH REQUIREMENTS:
- Find comprehensive events in the "${category}" category
- Include events from multiple venues and sources
- Verify all dates match ${date} exactly (YYYY-MM-DD format)
- Include both free and paid events
- Focus on events happening specifically on ${date}

QUALITY REQUIREMENTS:
- All URLs must be valid and working
- Times must be in HH:MM format (24-hour)
- Prices should be specific (e.g., "15€", "Free", "TBD")
- Venue names must be accurate and complete
- Categories should match the requested "${category}"

LANGUAGE: Search in both German and English for ${city} events.

Return only the JSON array:`;
}

/**
 * Generate a general event search prompt for multiple categories.
 * Used when searching across all main categories.
 * 
 * @param city - Target city for event search
 * @param date - Event date in YYYY-MM-DD format
 * @returns Structured prompt for comprehensive event search
 */
export function createGeneralPrompt(city: string, date: string): string {
  return `Search for all types of events in ${city} on ${date}.

CRITICAL INSTRUCTIONS:
1. Return ONLY a valid JSON array of event objects
2. Do not include any explanatory text, markdown, or comments
3. If no events are found, return: []
4. Each event MUST follow this exact JSON schema:

${EVENT_JSON_SCHEMA}

SEARCH CATEGORIES (find events in ALL of these):
- DJ Sets/Electronic Music
- Clubs/Discos/Nightlife
- Live Concerts/Music
- Open Air/Festivals
- Museums/Exhibitions
- LGBTQ+ Events
- Comedy/Cabaret
- Theater/Performance
- Film/Cinema
- Food/Culinary Events
- Sports Events
- Family/Kids Events
- Art/Design Events
- Wellness/Spiritual Events
- Networking/Business Events
- Nature/Outdoor Activities
- Culture/Traditional Events
- Markets/Shopping Events

SEARCH REQUIREMENTS:
- Find comprehensive events across ALL categories
- Include events from multiple venues and sources
- Verify all dates match ${date} exactly (YYYY-MM-DD format)
- Include both free and paid events
- Focus on events happening specifically on ${date}

QUALITY REQUIREMENTS:
- All URLs must be valid and working
- Times must be in HH:MM format (24-hour)
- Prices should be specific (e.g., "15€", "Free", "TBD")
- Venue names must be accurate and complete
- Assign appropriate categories from the list above

LANGUAGE: Search in both German and English for ${city} events.

Return only the JSON array:`;
}

/**
 * Create a retry prompt for failed category searches.
 * Used when initial search fails and we need to retry.
 * 
 * @param city - Target city for event search
 * @param date - Event date in YYYY-MM-DD format
 * @param category - Category that failed initial search
 * @param retryCount - Number of previous retry attempts
 * @returns Modified prompt for retry attempt
 */
export function createRetryPrompt(
  city: string,
  date: string,
  category: MainCategory,
  retryCount: number
): string {
  const basePrompt = createCategoryPrompt(city, date, category);
  
  const retryInstructions = `
RETRY ATTEMPT ${retryCount + 1}:
- Previous search may have failed or returned invalid data
- Try alternative search terms and sources
- Be more specific about the "${category}" category
- Double-check JSON syntax and schema compliance
- Include lesser-known venues and events

`;

  return retryInstructions + basePrompt;
}

/**
 * Validate that a prompt will produce structured JSON output.
 * Used for testing and validation.
 * 
 * @param prompt - The prompt to validate
 * @returns True if prompt enforces JSON output
 */
export function validatePromptStructure(prompt: string): boolean {
  const requiredElements = [
    'Return ONLY a valid JSON array',
    'Do not include any explanatory text',
    'If no events are found, return: []',
    EVENT_JSON_SCHEMA
  ];

  return requiredElements.every(element => prompt.includes(element));
}

/**
 * Get the JSON schema for event objects.
 * Used by AI clients to validate responses.
 * 
 * @returns The JSON schema string for events
 */
export function getEventJsonSchema(): string {
  return EVENT_JSON_SCHEMA;
}

/**
 * Create a prompt for testing AI response format.
 * Used in development to verify AI compliance.
 * 
 * @returns A simple test prompt
 */
export function createTestPrompt(): string {
  return `Return a test event for Berlin on 2024-01-01.

CRITICAL INSTRUCTIONS:
1. Return ONLY a valid JSON array with one test event
2. Do not include any explanatory text, markdown, or comments
3. The event MUST follow this exact JSON schema:

${EVENT_JSON_SCHEMA}

Return only the JSON array:`;
}