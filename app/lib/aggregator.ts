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
      // Try to extract category from query for better parsing context
      const queryCategory = this.extractCategoryFromQuery(result.query);
      const events = this.parseEventsFromResponse(result.response, queryCategory);
      allEvents.push(...events);
    }

    // Deduplicate events
    return this.deduplicateEvents(allEvents);
  }

  /**
   * Helper method to extract category context from query text
   */
  private extractCategoryFromQuery(query: string): string | undefined {
    const categoryMap: { [key: string]: string } = {
      'dj sets': 'DJ Sets/Electronic',
      'electronic': 'DJ Sets/Electronic',
      'clubs': 'Clubs/Discos',
      'discos': 'Clubs/Discos',
      'konzerte': 'Live-Konzerte',
      'musik': 'Live-Konzerte',
      'open air': 'Open Air',
      'festival': 'Open Air',
      'museen': 'Museen',
      'ausstellung': 'Museen',
      'lgbtq': 'LGBTQ+',
      'queer': 'LGBTQ+',
      'pride': 'LGBTQ+',
      'comedy': 'Comedy/Kabarett',
      'kabarett': 'Comedy/Kabarett',
      'theater': 'Theater/Performance',
      'performance': 'Theater/Performance',
      'film': 'Film',
      'kino': 'Film',
      'food': 'Food/Culinary',
      'culinary': 'Food/Culinary',
      'sport': 'Sport',
      'familie': 'Familien/Kids',
      'kinder': 'Familien/Kids',
      'kunst': 'Kunst/Design',
      'design': 'Kunst/Design',
      'wellness': 'Wellness/Spirituell',
      'spirituell': 'Wellness/Spirituell',
      'networking': 'Networking/Business',
      'business': 'Networking/Business',
      'natur': 'Natur/Outdoor',
      'outdoor': 'Natur/Outdoor'
    };

    const lowerQuery = query.toLowerCase();
    for (const [keyword, category] of Object.entries(categoryMap)) {
      if (lowerQuery.includes(keyword)) {
        return category;
      }
    }
    
    return undefined;
  }

  /**
   * Parses events from a single response text with JSON-first approach
   */
  parseEventsFromResponse(responseText: string, requestCategory?: string, requestDate?: string): EventData[] {
    const events: EventData[] = [];

    try {
      // Handle empty or "no events found" responses first
      const trimmedResponse = responseText.trim();
      
      console.log(`[EventAggregator] Parsing response for category: ${requestCategory}, length: ${trimmedResponse.length}`);
      
      if (!trimmedResponse || 
          trimmedResponse.toLowerCase().includes('keine passenden events gefunden') ||
          trimmedResponse.toLowerCase().includes('keine events gefunden') ||
          trimmedResponse.toLowerCase().includes('no events found') ||
          trimmedResponse === '[]') {
        console.log('[EventAggregator] Empty response or no events found');
        return [];
      }

      // Try to clean up the response - remove markdown code blocks if present
      let cleanResponse = trimmedResponse;
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanResponse.startsWith('```')) {
        cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      // First try to parse as complete JSON array
      try {
        const jsonData = JSON.parse(cleanResponse);
        if (Array.isArray(jsonData)) {
          const parsedEvents = this.parseJsonArray(jsonData, requestCategory, requestDate);
          console.log(`[EventAggregator] Successfully parsed JSON array: ${parsedEvents.length} events`);
          if (parsedEvents.length > 0) {
            return parsedEvents;
          }
        } else {
          console.log('[EventAggregator] JSON parsed but not an array, trying other methods');
        }
      } catch (jsonError) {
        console.log(`[EventAggregator] JSON parse failed: ${jsonError instanceof Error ? jsonError.message : 'Unknown error'}`);
        console.log(`[EventAggregator] Response start: "${cleanResponse.substring(0, 100)}..."`);
      }

      // Try to parse JSON objects line by line
      const jsonEvents = this.parseJsonEvents(cleanResponse, requestCategory, requestDate);
      if (jsonEvents.length > 0) {
        console.log(`[EventAggregator] Parsed ${jsonEvents.length} events from line-by-line JSON`);
        events.push(...jsonEvents);
      }

      // If no JSON found, try markdown table parsing as fallback
      if (events.length === 0) {
        const markdownEvents = this.parseMarkdownTable(cleanResponse, requestCategory, requestDate);
        if (markdownEvents.length > 0) {
          console.log(`[EventAggregator] Parsed ${markdownEvents.length} events from markdown table`);
          events.push(...markdownEvents);
        }
      }

      // Last resort: keyword-based extraction
      if (events.length === 0) {
        const keywordEvents = this.extractKeywordBasedEvents(cleanResponse, requestCategory, requestDate);
        console.log(`[EventAggregator] Parsed ${keywordEvents.length} events from keyword extraction`);
        events.push(...keywordEvents);
      }

    } catch (error) {
      console.error('[EventAggregator] Event parsing error:', error);
      console.error('[EventAggregator] Response that failed:', responseText.substring(0, 500));
    }

    console.log(`[EventAggregator] Final result: ${events.length} events parsed`);
    return events;
  }

  /**
   * Parses markdown table format with fallback support
   */
  private parseMarkdownTable(responseText: string, requestCategory?: string, requestDate?: string): EventData[] {
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

    // Determine start index - skip header and separator if present
    let startIndex = 1; // Start from second line by default (skip header)
    
    // Check if second line is a markdown table separator (mostly dashes and pipes)
    if (tableLines.length > 1) {
      const secondLine = tableLines[1].trim();
      const isDashSeparator = /^\|[\s\-\|]+\|$/.test(secondLine) || secondLine.split('|').every(col => col.trim() === '' || /^[\-\s]*$/.test(col.trim()));
      if (isDashSeparator) {
        startIndex = 2; // Skip header + separator
      }
    }

    // Parse data rows
    for (let i = startIndex; i < tableLines.length; i++) {
      const line = tableLines[i].trim();
      if (!line || line.startsWith('|---') || line.includes('---')) continue;
      
      const columns = line.split('|')
        .map(col => col.trim())
        .filter((col, idx, arr) => !(idx === 0 && col === '') && !(idx === arr.length - 1 && col === ''));

      // More tolerant parsing - accept tables with at least 3 columns
      if (columns.length >= 3) {
        // Smart column mapping based on number of columns and content
        let event: EventData;
        
        if (columns.length === 3) {
          // Assume Title|Time|Venue or Title|Date|Venue format
          const secondCol = columns[1];
          const isTime = /^\d{1,2}:\d{2}/.test(secondCol);
          const isDate = /^\d{4}-\d{2}-\d{2}/.test(secondCol) || /^\d{1,2}\.\d{1,2}\.\d{4}/.test(secondCol);
          
          if (isTime) {
            // Title|Time|Venue
            event = {
              title: columns[0] || '',
              category: requestCategory || '',
              date: requestDate || '',
              time: columns[1] || '',
              venue: columns[2] || '',
              price: '',
              website: ''
            };
          } else if (isDate) {
            // Title|Date|Venue
            event = {
              title: columns[0] || '',
              category: requestCategory || '',
              date: columns[1] || requestDate || '',
              time: '',
              venue: columns[2] || '',
              price: '',
              website: ''
            };
          } else {
            // Fallback: Title|Category|Date
            event = {
              title: columns[0] || '',
              category: columns[1] || requestCategory || '',
              date: columns[2] || requestDate || '',
              time: '',
              venue: '',
              price: '',
              website: ''
            };
          }
        } else {
          // Standard full column mapping for 4+ columns
          event = {
            title: columns[0] || '',
            category: columns[1] || requestCategory || '',
            date: columns[2] || requestDate || '',
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
        }
        
        // Only require title to be present
        if (event.title.length > 0) {
          events.push(event);
        }
      }
    }

    return events;
  }

  /**
   * Parses a complete JSON array of events
   */
  private parseJsonArray(jsonArray: any[], requestCategory?: string, requestDate?: string): EventData[] {
    const events: EventData[] = [];

    for (const rawEvent of jsonArray) {
      if (typeof rawEvent === 'object' && rawEvent !== null) {
        const event = this.createEventFromObject(rawEvent, requestCategory, requestDate);
        if (event.title && event.title.length > 0) {
          events.push(event);
        }
      }
    }

    return events;
  }

  /**
   * Parses JSON format events with enhanced field support
   */
  private parseJsonEvents(responseText: string, requestCategory?: string, requestDate?: string): EventData[] {
    const events: EventData[] = [];
    const lines = responseText.split('\n');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith('{') && trimmedLine.endsWith('}')) {
        try {
          const rawEvent = JSON.parse(trimmedLine);
          const event = this.createEventFromObject(rawEvent, requestCategory, requestDate);
          
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
   * Creates an EventData object from a raw object with field mapping and defaults
   */
  private createEventFromObject(rawEvent: any, requestCategory?: string, requestDate?: string): EventData {
    return {
      title: this.extractField(rawEvent, ['title', 'name', 'event', 'eventName']) || '',
      category: this.extractField(rawEvent, ['category', 'type', 'genre']) || requestCategory || '',
      date: this.extractField(rawEvent, ['date', 'eventDate', 'day']) || requestDate || '',
      time: this.extractField(rawEvent, ['time', 'startTime', 'start', 'begin', 'doors']) || '',
      venue: this.extractField(rawEvent, ['venue', 'location', 'place']) || '',
      price: this.extractField(rawEvent, ['price', 'cost', 'ticketPrice', 'entry']) || '',
      website: this.extractField(rawEvent, ['website', 'url', 'link']) || '',
      // Enhanced optional fields - prioritize specific field names to avoid conflicts
      endTime: this.extractField(rawEvent, ['endTime', 'end', 'finish']),
      address: this.extractField(rawEvent, ['address', 'venueAddress']), // Remove 'location' to avoid venue conflict
      ticketPrice: this.extractField(rawEvent, ['ticketPrice', 'cost', 'entry']), // Remove 'price' to avoid main price conflict
      eventType: this.extractField(rawEvent, ['eventType']), // Remove 'type', 'category' to avoid conflicts
      description: this.extractField(rawEvent, ['description', 'details', 'info']),
      bookingLink: this.extractField(rawEvent, ['bookingLink', 'ticketLink', 'tickets', 'booking']),
      ageRestrictions: this.extractField(rawEvent, ['ageRestrictions', 'age', 'ageLimit', 'restrictions']),
    };
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
  private extractKeywordBasedEvents(responseText: string, requestCategory?: string, requestDate?: string): EventData[] {
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
      const eventData = this.parseEventFromText(sentence, requestCategory, requestDate);
      if (eventData.title) {
        events.push(eventData);
      }
    }

    return events;
  }

  /**
   * Attempts to parse structured event data from a text line
   */
  private parseEventFromText(text: string, requestCategory?: string, requestDate?: string): EventData {
    // Basic pattern recognition for common event formats
    const timePattern = /(\d{1,2}:\d{2}|\d{1,2}\s*Uhr)/i;
    const datePattern = /(\d{1,2}\.?\d{1,2}\.?\d{2,4})/;
    const pricePattern = /(€\s?\d+|kostenlos|frei|free)/i;
    
    const timeMatch = text.match(timePattern);
    const dateMatch = text.match(datePattern);
    const priceMatch = text.match(pricePattern);

    return {
      title: text.trim(),
      category: requestCategory || 'Event',
      date: dateMatch ? dateMatch[1] : (requestDate || ''),
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