// Event aggregation and deduplication service

import { EventData, PerplexityResult } from './types';

export class EventAggregator {
  /**
   * Parses events from multiple Perplexity results and deduplicates them
   */
  aggregateResults(results: PerplexityResult[]): EventData[] {
    const allEvents: EventData[] = [];

    // Parse events from each result
    for (const result of results) {
      const events = this.parseEventsFromResponse(result.response);
      allEvents.push(...events);
    }

    // Deduplicate events
    return this.deduplicateEvents(allEvents);
  }

  /**
   * Parses events from a single response text
   * TODO: Make parser more tolerant of partial data and add fallback rules for missing times
   * TODO: Consider implementing fuzzy matching for event deduplication using Levenshtein distance
   */
  parseEventsFromResponse(responseText: string): EventData[] {
    const events: EventData[] = [];

    try {
      // First try to parse markdown tables with pipe-separated content
      const markdownEvents = this.parseMarkdownTable(responseText);
      if (markdownEvents.length > 0) {
        events.push(...markdownEvents);
      }

      // If no markdown table found, try JSON parsing
      if (events.length === 0) {
        const jsonEvents = this.parseJsonEvents(responseText);
        events.push(...jsonEvents);
      }

      // Falls keine Events gefunden wurden, erstelle Fallback-Daten
      if (events.length === 0) {
        const keywordEvents = this.extractKeywordBasedEvents(responseText);
        events.push(...keywordEvents);
      }

    } catch (error) {
      console.error('Event parsing error:', error);
    }

    return events;
  }

  /**
   * Parses markdown table format
   */
  private parseMarkdownTable(responseText: string): EventData[] {
    const events: EventData[] = [];
    const lines = responseText.split('\n');

    // Find table rows (lines containing pipe characters)
    const tableLines = lines.filter(line =>
      line.trim().includes('|') &&
      line.trim().split('|').length >= 3
    );

    if (tableLines.length < 2) {
      return events; // Not enough lines for a table
    }

    // Skip header line and separator line if present
    let startIndex = 0;
    if (tableLines.length > 1 && tableLines[1].includes('-')) {
      startIndex = 2; // header + separator
    } else {
      startIndex = 1;
    }

    // Parse data rows
    for (let i = startIndex; i < tableLines.length; i++) {
      const line = tableLines[i].trim();
      if (!line || line.startsWith('|---') || line.includes('---')) continue;
      
      const columns = line.split('|')
        .map(col => col.trim())
        .filter((col, idx, arr) => !(idx === 0 && col === '') && !(idx === arr.length - 1 && col === ''));

      // More tolerant parsing - accept tables with at least 3 columns (title, date, venue minimum)
      if (columns.length >= 3) {
        const event: EventData = {
          title: columns[0] || '',
          category: columns[1] || '',
          date: columns[2] || '',
          time: columns[3] || '',
          venue: columns[4] || '',
          price: columns[5] || '',
          website: columns[6] || '',
          // Enhanced optional fields
          endTime: columns[7] || undefined,
          address: columns[8] || undefined,
          ticketPrice: columns[9] || columns[5] || undefined, // fallback to price
          eventType: columns[10] || undefined,
          description: columns[11] || undefined,
          bookingLink: columns[12] || columns[6] || undefined, // fallback to website
          ageRestrictions: columns[13] || undefined,
        };
        
        // Only require title to be present
        if (event.title.length > 0) {
          events.push(event);
        }
      }
    }

    return events;
  }

  /**
   * Parses JSON format events with enhanced field support
   */
  private parseJsonEvents(responseText: string): EventData[] {
    const events: EventData[] = [];
    const lines = responseText.split('\n');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith('{') && trimmedLine.endsWith('}')) {
        try {
          const rawEvent = JSON.parse(trimmedLine);
          
          // Map various field names to our unified structure
          const event: EventData = {
            title: this.extractField(rawEvent, ['title', 'name', 'event', 'eventName']) || '',
            category: this.extractField(rawEvent, ['category', 'type', 'genre']) || '',
            date: this.extractField(rawEvent, ['date', 'eventDate', 'day']) || '',
            time: this.extractField(rawEvent, ['time', 'startTime', 'start', 'begin', 'doors']) || '',
            venue: this.extractField(rawEvent, ['venue', 'location', 'place']) || '',
            price: this.extractField(rawEvent, ['price', 'cost', 'ticketPrice', 'entry']) || '',
            website: this.extractField(rawEvent, ['website', 'url', 'link']) || '',
            // Enhanced optional fields
            endTime: this.extractField(rawEvent, ['endTime', 'end', 'finish']),
            address: this.extractField(rawEvent, ['address', 'location', 'venueAddress']),
            ticketPrice: this.extractField(rawEvent, ['ticketPrice', 'price', 'cost', 'entry']),
            eventType: this.extractField(rawEvent, ['eventType', 'type', 'category']),
            description: this.extractField(rawEvent, ['description', 'details', 'info']),
            bookingLink: this.extractField(rawEvent, ['bookingLink', 'ticketLink', 'tickets', 'booking']),
            ageRestrictions: this.extractField(rawEvent, ['ageRestrictions', 'age', 'ageLimit', 'restrictions']),
          };
          
          // Only require title to be present
          if (event.title && event.title.length > 0) {
            events.push(event);
          }
        } catch (error) {
          console.error('JSON parsing error:', error);
        }
      }
    }

    return events;
  }

  /**
   * Helper function to extract field value from multiple possible key names
   */
  private extractField(obj: any, fieldNames: string[]): string | undefined {
    for (const fieldName of fieldNames) {
      if (obj[fieldName] && typeof obj[fieldName] === 'string') {
        return obj[fieldName].trim();
      }
    }
    return undefined;
  }

  /**
   * Extracts events using keyword-based extraction as fallback with enhanced tolerance
   */
  private extractKeywordBasedEvents(responseText: string): EventData[] {
    const events: EventData[] = [];
    
    // Split by multiple delimiters to be more tolerant
    const sentences = responseText
      .split(/[.\n\r•\-\*]/)
      .map(s => s.trim())
      .filter(s => s.length > 10 && s.length < 200); // Reasonable length

    // Look for lines that seem like event descriptions
    for (const sentence of sentences) {
      // Skip obvious non-event content
      if (sentence.toLowerCase().includes('keine events') || 
          sentence.toLowerCase().includes('no events') ||
          sentence.toLowerCase().includes('sorry') ||
          sentence.toLowerCase().startsWith('hier')) {
        continue;
      }

      // Try to extract structured information from the sentence
      const eventData = this.parseEventFromText(sentence);
      if (eventData.title) {
        events.push(eventData);
      }
    }

    return events;
  }

  /**
   * Attempts to parse structured event data from a text line
   */
  private parseEventFromText(text: string): EventData {
    // Basic pattern recognition for common event formats
    const timePattern = /(\d{1,2}:\d{2}|\d{1,2}\s*Uhr)/i;
    const datePattern = /(\d{1,2}\.?\d{1,2}\.?\d{2,4})/;
    const pricePattern = /(€\s?\d+|kostenlos|frei|free)/i;
    
    const timeMatch = text.match(timePattern);
    const dateMatch = text.match(datePattern);
    const priceMatch = text.match(pricePattern);

    return {
      title: text.trim(),
      category: 'Event',
      date: dateMatch ? dateMatch[1] : '',
      time: timeMatch ? timeMatch[1] : '',
      venue: '', // Cannot reliably extract from sentence
      price: priceMatch ? priceMatch[1] : '',
      website: '',
      // Try to extract additional info if patterns are found
      description: text.length > 50 ? text.substring(0, 100) + '...' : undefined,
    };
  }

  /**
   * Deduplicates events using fuzzy matching
   */
  deduplicateEvents(events: EventData[]): EventData[] {
    const uniqueEvents: EventData[] = [];
    const seenEvents = new Set<string>();

    for (const event of events) {
      const normalizedTitle = this.normalizeTitle(event.title);
      const normalizedVenue = this.normalizeVenue(event.venue);
      const normalizedDate = this.normalizeDate(event.date);
      
      // Create a composite key for deduplication
      const key = `${normalizedTitle}_${normalizedVenue}_${normalizedDate}`;
      
      // Also check for fuzzy duplicates
      const isDuplicate = uniqueEvents.some(existing => 
        this.isFuzzyDuplicate(event, existing)
      );

      if (!seenEvents.has(key) && !isDuplicate) {
        seenEvents.add(key);
        uniqueEvents.push(event);
      }
    }

    return uniqueEvents;
  }

  /**
   * Normalizes title for comparison
   */
  private normalizeTitle(title: string): string {
    return title.toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, '') // Remove special characters
      .replace(/\s+/g, ' '); // Normalize whitespace
  }

  /**
   * Normalizes venue for comparison
   */
  private normalizeVenue(venue: string): string {
    return venue.toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ');
  }

  /**
   * Normalizes date for comparison
   */
  private normalizeDate(date: string): string {
    // Try to normalize different date formats
    return date.toLowerCase().trim().replace(/[^\d\-\/\.]/g, '');
  }

  /**
   * Checks if two events are fuzzy duplicates
   */
  private isFuzzyDuplicate(event1: EventData, event2: EventData): boolean {
    const title1 = this.normalizeTitle(event1.title);
    const title2 = this.normalizeTitle(event2.title);
    const venue1 = this.normalizeVenue(event1.venue);
    const venue2 = this.normalizeVenue(event2.venue);

    // Calculate similarity based on title and venue
    const titleSimilarity = this.calculateStringSimilarity(title1, title2);
    const venueSimilarity = this.calculateStringSimilarity(venue1, venue2);

    // Consider as duplicate if title similarity is high (>80%) and venue similarity is moderate (>60%)
    // or if both title and venue similarity are very high (>90%)
    return (titleSimilarity > 0.8 && venueSimilarity > 0.6) || 
           (titleSimilarity > 0.9 && venueSimilarity > 0.9);
  }

  /**
   * Calculates string similarity using simple character overlap
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1.0;
    if (str1.length === 0 || str2.length === 0) return 0.0;

    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    // Simple character overlap calculation
    let matches = 0;
    for (let i = 0; i < shorter.length; i++) {
      if (longer.includes(shorter[i])) {
        matches++;
      }
    }

    return matches / longer.length;
  }

  /**
   * Categorizes events into predefined categories
   */
  categorizeEvents(events: EventData[]): EventData[] {
    const categoryKeywords = {
      'Musik & Konzerte': ['konzert', 'musik', 'band', 'festival', 'jazz', 'rock', 'pop', 'klassik', 'oper'],
      'Theater & Shows': ['theater', 'musical', 'comedy', 'kabarett', 'show', 'bühne'],
      'Kunst & Kultur': ['museum', 'ausstellung', 'galerie', 'kunst', 'kultur'],
      'Nightlife': ['club', 'party', 'dj', 'bar', 'rooftop', 'afterwork'],
      'Familie & Kinder': ['kinder', 'familie', 'family'],
      'Sport & Outdoor': ['sport', 'outdoor', 'festival', 'open-air'],
      'LGBT+ & Community': ['lgbt', 'queer', 'pride', 'community'],
      'Student & Uni': ['student', 'uni', 'universität', 'campus']
    };

    return events.map(event => {
      // If category is already set and meaningful, keep it
      if (event.category && event.category !== 'Event' && event.category.trim().length > 0) {
        return event;
      }

      // Try to categorize based on title and venue
      const text = `${event.title} ${event.venue}`.toLowerCase();
      
      for (const [category, keywords] of Object.entries(categoryKeywords)) {
        if (keywords.some(keyword => text.includes(keyword))) {
          return { ...event, category };
        }
      }

      // Return with default category if no match found
      return { ...event, category: event.category || 'Sonstige Events' };
    });
  }
}

// Export singleton instance
export const eventAggregator = new EventAggregator();