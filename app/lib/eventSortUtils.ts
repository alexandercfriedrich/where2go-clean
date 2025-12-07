/**
 * Event Sorting Utilities
 * Utilities for sorting events with images prioritized first
 */

import { EventData } from './types';

/**
 * Check if an event has a valid image
 * @param event - The event to check
 * @returns true if event has a valid image URL
 */
export function hasEventImage(event: EventData | any): boolean {
  // Check if event has imageUrl
  if (event.imageUrl && event.imageUrl.trim() !== '') {
    return true;
  }
  
  // Check if event has image_urls array with at least one valid URL (for database records)
  if (event.image_urls && Array.isArray(event.image_urls) && event.image_urls.length > 0) {
    return event.image_urls.some((url: string) => url && url.trim() !== '');
  }
  
  return false;
}

/**
 * Sort events with images first, then by date
 * Events with images are prioritized and shown first
 * @param events - Array of events to sort
 * @returns Sorted array with events with images first
 */
export function sortEventsWithImagesFirst(events: (EventData | any)[]): (EventData | any)[] {
  return [...events].sort((a, b) => {
    const aHasImage = hasEventImage(a);
    const bHasImage = hasEventImage(b);
    
    // If both have images or both don't have images, maintain original order (stable sort)
    if (aHasImage === bHasImage) {
      return 0;
    }
    
    // Events with images come first
    return aHasImage ? -1 : 1;
  });
}

/**
 * Sort events with images first, then by start date
 * @param events - Array of events to sort
 * @returns Sorted array with events with images first, then by date
 */
export function sortEventsWithImagesFirstThenByDate(events: (EventData | any)[]): (EventData | any)[] {
  return [...events].sort((a, b) => {
    const aHasImage = hasEventImage(a);
    const bHasImage = hasEventImage(b);
    
    // If one has image and other doesn't, prioritize the one with image
    if (aHasImage !== bHasImage) {
      return aHasImage ? -1 : 1;
    }
    
    // Both have images or both don't - sort by date
    const aDate = new Date(a.date || a.start_date_time || 0).getTime();
    const bDate = new Date(b.date || b.start_date_time || 0).getTime();
    
    return aDate - bDate;
  });
}
