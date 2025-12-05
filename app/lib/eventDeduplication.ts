/**
 * Event Deduplication Utilities
 * 
 * Provides fuzzy string matching and deduplication logic for events before database insertion.
 * This replaces the database trigger-based deduplication to prevent insertion timeouts.
 */

import { EventData } from './types';

/**
 * Calculate Levenshtein distance between two strings
 * Returns the minimum number of single-character edits needed to transform str1 into str2
 */
export function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];
  
  // Initialize first column (transforming from empty string)
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  // Initialize first row (transforming to empty string)
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  // Fill in the rest of the matrix
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        // Characters match, no operation needed
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        // Take minimum of: substitution, insertion, deletion
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

/**
 * Calculate string similarity using Levenshtein distance
 * Returns value between 0 (completely different) and 1 (identical)
 */
export function calculateStringSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

/**
 * Check if two events are duplicates based on fuzzy matching rules:
 * - Must be same city (case-insensitive)
 * - Must be within 1 hour time window
 * - Must have >85% title similarity (Levenshtein-based)
 */
export function areEventsDuplicates(event1: EventData, event2: EventData): boolean {
  // Rule 1: Must be same city (case-insensitive)
  const city1 = (event1.city || '').toLowerCase().trim();
  const city2 = (event2.city || '').toLowerCase().trim();
  
  if (city1 !== city2) {
    return false;
  }
  
  // Rule 2: Must be within 1 hour time window
  // Combine date and time to create comparable timestamps
  const getTimestamp = (event: EventData): number | null => {
    if (!event.date || !event.time) return null;
    // Assuming date is in YYYY-MM-DD format and time is in HH:mm format
    const dateTimeStr = `${event.date}T${event.time}:00.000Z`;
    const date = new Date(dateTimeStr);
    return isNaN(date.getTime()) ? null : date.getTime();
  };
  
  const timestamp1 = getTimestamp(event1);
  const timestamp2 = getTimestamp(event2);
  
  if (timestamp1 === null || timestamp2 === null) {
    // If we can't determine time, fall back to date comparison only
    // Events must be on the same date
    if (event1.date !== event2.date) {
      return false;
    }
  } else {
    const timeDiff = Math.abs(timestamp1 - timestamp2);
    const oneHourMs = 3600000; // 3600000ms = 1 hour
    
    if (timeDiff > oneHourMs) {
      return false;
    }
  }
  
  // Rule 3: Must have >85% title similarity
  const title1 = (event1.title || '').toLowerCase().trim();
  const title2 = (event2.title || '').toLowerCase().trim();
  
  const similarity = calculateStringSimilarity(title1, title2);
  
  return similarity > 0.85;
}

/**
 * Deduplicates events using fuzzy string matching
 * @param newEvents - Events to check for duplicates
 * @param existingEvents - Events already in database (from same day/city)
 * @returns Array of unique events (removes duplicates)
 */
export function deduplicateEvents(
  newEvents: EventData[], 
  existingEvents: EventData[]
): EventData[] {
  return newEvents.filter(newEvent => {
    // Check if this event is a duplicate of any existing event
    const isDuplicate = existingEvents.some(existing => {
      return areEventsDuplicates(existing, newEvent);
    });
    
    return !isDuplicate;
  });
}

/**
 * Result of enrichment comparison
 */
export interface EnrichmentResult {
  /** The enriched event data with merged fields */
  enrichedEvent: EventData;
  /** Whether any fields were actually changed */
  hasChanges: boolean;
  /** List of fields that were updated */
  changedFields: string[];
}

/**
 * Enriches an existing event with data from a new duplicate event.
 * Follows these rules:
 * - Prefer longer descriptions
 * - Add missing image URLs
 * - Fill in missing fields from new event
 * 
 * @param existingEvent - The event already in the database
 * @param newEvent - The new duplicate event with potentially better data
 * @returns EnrichmentResult with the merged event and change tracking
 */
export function enrichEventWithDuplicate(
  existingEvent: EventData,
  newEvent: EventData
): EnrichmentResult {
  const changedFields: string[] = [];
  const enrichedEvent = { ...existingEvent };

  // Prefer longer description
  const existingDesc = existingEvent.description || '';
  const newDesc = newEvent.description || '';
  if (newDesc.length > existingDesc.length) {
    enrichedEvent.description = newDesc;
    changedFields.push('description');
  }

  // Add missing image URL
  if (!existingEvent.imageUrl && newEvent.imageUrl) {
    enrichedEvent.imageUrl = newEvent.imageUrl;
    changedFields.push('imageUrl');
  }

  // Fill in missing fields from new event (only if existing is empty/undefined)
  const fieldsToEnrich: (keyof EventData)[] = [
    'address',
    'venue',
    'price',
    'website',
    'bookingLink',
    'eventType',
    'ageRestrictions',
    'ticketPrice',
    'endTime',
    'latitude',
    'longitude',
  ];

  for (const field of fieldsToEnrich) {
    const existingValue = existingEvent[field];
    const newValue = newEvent[field];
    
    // Only fill if existing is empty/undefined and new has a value
    if ((existingValue === undefined || existingValue === null || existingValue === '') && 
        newValue !== undefined && newValue !== null && newValue !== '') {
      (enrichedEvent as Record<string, unknown>)[field] = newValue;
      changedFields.push(field);
    }
  }

  return {
    enrichedEvent,
    hasChanges: changedFields.length > 0,
    changedFields
  };
}

/**
 * Result of deduplication with enrichment
 */
export interface DeduplicationWithEnrichmentResult {
  /** Events that are unique and should be inserted */
  uniqueEvents: EventData[];
  /** Existing events that should be updated with enriched data */
  eventsToEnrich: Array<{
    existingEvent: EventData;
    enrichedEvent: EventData;
    changedFields: string[];
  }>;
  /** Count of duplicates that had no enrichment opportunities */
  skippedDuplicates: number;
}

/**
 * Deduplicates events and identifies enrichment opportunities.
 * Unlike simple deduplication, this returns information about which
 * existing events should be updated with new data.
 * 
 * @param newEvents - Events to check for duplicates
 * @param existingEvents - Events already in database (from same day/city)
 * @returns Object with unique events and enrichment opportunities
 */
export function deduplicateEventsWithEnrichment(
  newEvents: EventData[], 
  existingEvents: EventData[]
): DeduplicationWithEnrichmentResult {
  const uniqueEvents: EventData[] = [];
  const eventsToEnrich: Array<{
    existingEvent: EventData;
    enrichedEvent: EventData;
    changedFields: string[];
  }> = [];
  let skippedDuplicates = 0;

  for (const newEvent of newEvents) {
    // Find duplicate in existing events
    const duplicateEvent = existingEvents.find(existing => 
      areEventsDuplicates(existing, newEvent)
    );

    if (!duplicateEvent) {
      // No duplicate found, this is a unique event
      uniqueEvents.push(newEvent);
    } else {
      // Found a duplicate - check if we can enrich it
      const enrichmentResult = enrichEventWithDuplicate(duplicateEvent, newEvent);
      
      if (enrichmentResult.hasChanges) {
        // Only add to enrichment list if there are actual changes
        eventsToEnrich.push({
          existingEvent: duplicateEvent,
          enrichedEvent: enrichmentResult.enrichedEvent,
          changedFields: enrichmentResult.changedFields
        });
      } else {
        // Duplicate with no enrichment opportunity
        skippedDuplicates++;
      }
    }
  }

  return {
    uniqueEvents,
    eventsToEnrich,
    skippedDuplicates
  };
}
