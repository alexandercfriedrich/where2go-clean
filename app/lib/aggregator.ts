// Event aggregation and deduplication service
// Phase 2A: Integrierte Normalisierung & Validierung

import { EventData, PerplexityResult } from './types';
import { normalizeEvents } from './event-normalizer';
import { validateAndNormalizeEvents, normalizeCategory } from './eventCategories';

const TIME_24H_REGEX = /^\d{1,2}:\d{2}/;
const DATE_ISO_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const DATE_DDMMYYYY_REGEX = /^\d{1,2}\.\d{1,2}\.\d{4}$/;

export class EventAggregator {
  aggregateResults(results: PerplexityResult[], requestedDate?: string | string[]): EventData[] {
    const parsedRaw: EventData[] = [];
    for (const result of results) {
      const queryCategory = this.extractCategoryFromQuery(result.query);
      const events = this.parseEventsFromResponse(result.response, queryCategory, 
        Array.isArray(requestedDate) ? requestedDate[0] : requestedDate);
      parsedRaw.push(...events);
    }
    const structurallyNormalized = normalizeEvents(parsedRaw);
    const canonical = validateAndNormalizeEvents(structurallyNormalized);
    const deduped = this.deduplicateEvents(canonical);

    // Filter by requested date(s) if provided
    let filtered = deduped;
    if (requestedDate) {
      const validDates = Array.isArray(requestedDate) ? requestedDate : [requestedDate];
      filtered = deduped.filter(event => {
        const eventDate = event.date?.slice(0, 10); // Extract YYYY-MM-DD
        return !eventDate || validDates.includes(eventDate);
      });
      
      if (process.env.LOG_AGG_DEBUG === '1' && filtered.length !== deduped.length) {
        console.log('[AGG:DATE-FILTER]', {
          requestedDates: validDates,
          beforeFilter: deduped.length,
          afterFilter: filtered.length,
          filteredOut: deduped.length - filtered.length
        });
      }
    }

    if (process.env.LOG_AGG_DEBUG === '1') {
      console.log('[AGG:SUMMARY]', {
        inputResults: results.length,
        parsedRaw: parsedRaw.length,
        normalized: canonical.length,
        deduped: deduped.length,
        dateFiltered: filtered.length,
        sample: filtered[0] || null
      });
    }

    return filtered;
  }

  private extractCategoryFromQuery(query: string): string | undefined {
    const hints: { [k: string]: string } = {
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
      'performance ': 'Theater/Performance',
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
    const lower = query.toLowerCase();
    for (const [kw, cat] of Object.entries(hints)) {
      if (lower.includes(kw)) return normalizeCategory(cat);
    }
    return undefined;
  }

  parseEventsFromResponse(responseText: string, requestCategory?: string, requestDate?: string): EventData[] {
    const events: EventData[] = [];
    try {
      const trimmed = responseText.trim();
      if (!trimmed ||
          trimmed.toLowerCase().includes('keine passenden events') ||
          trimmed.toLowerCase().includes('keine events gefunden') ||
          trimmed.toLowerCase().includes('no events found')) {
        return [];
      }
      try {
        const json = JSON.parse(trimmed);
        if (Array.isArray(json)) {
          const arr = this.parseJsonArray(json, requestCategory, requestDate);
          if (arr.length > 0) return arr;
        }
      } catch {/* ignore */}
      const lineJson = this.parseJsonEvents(trimmed, requestCategory, requestDate);
      if (lineJson.length > 0) events.push(...lineJson);
      if (events.length === 0) {
        const md = this.parseMarkdownTable(trimmed, requestCategory, requestDate);
        if (md.length > 0) events.push(...md);
      }
      if (events.length === 0) {
        events.push(...this.extractKeywordBasedEvents(trimmed, requestCategory, requestDate));
      }
    } catch (err) {
      console.error('Event parsing error:', err);
    }
    return events;
  }

  private parseMarkdownTable(text: string, requestCategory?: string, requestDate?: string): EventData[] {
    const events: EventData[] = [];
    const lines = text.split('\n');
    const tableLines = lines.filter(l => l.trim().includes('|') && l.trim().split('|').length >= 3);
    if (tableLines.length < 2) return events;
    let startIndex = 1;
    const second = tableLines[1]?.trim();
    if (second && (/^\|[\s\-\|]+\|$/.test(second) || second.split('|').every(c => c.trim() === '' || /^[\-\s]*$/.test(c.trim())))) {
      startIndex = 2;
    }
    for (let i = startIndex; i < tableLines.length; i++) {
      const line = tableLines[i].trim();
      if (!line || line.startsWith('|---') || line.includes('---')) continue;
      const cols = line.split('|').map(c => c.trim())
        .filter((col, idx, arr) => !(idx === 0 && col === '') && !(idx === arr.length - 1 && col === ''));
      if (cols.length >= 3) {
        let event: EventData;
        if (cols.length === 3) {
          const c2 = cols[1];
          const isTime = TIME_24H_REGEX.test(c2);
          const isDate = DATE_ISO_REGEX.test(c2) || DATE_DDMMYYYY_REGEX.test(c2);
          if (isTime) {
            event = { title: cols[0] || '', category: requestCategory || '', date: requestDate || '', time: cols[1] || '', venue: cols[2] || '', price: '', website: '' };
          } else if (isDate) {
            event = { title: cols[0] || '', category: requestCategory || '', date: cols[1] || requestDate || '', time: '', venue: cols[2] || '', price: '', website: '' };
          } else {
            event = { title: cols[0] || '', category: cols[1] || requestCategory || '', date: cols[2] || requestDate || '', time: '', venue: '', price: '', website: '' };
          }
        } else {
          event = {
            title: cols[0] || '',
            category: cols[1] || requestCategory || '',
            date: cols[2] || requestDate || '',
            time: cols[3] || '',
            venue: cols[4] || '',
            price: cols[5] || '',
            website: cols[6] || '',
            endTime: cols[7] || undefined,
            address: cols[8] || undefined,
            ticketPrice: cols[9] || cols[5] || undefined,
            eventType: cols[10] || undefined,
            description: cols[11] || undefined,
            bookingLink: cols[12] || cols[6] || undefined,
            ageRestrictions: cols[13] || undefined,
          };
        }
        if (event.title) events.push(event);
      }
    }
    return events;
  }

  private parseJsonArray(arr: any[], requestCategory?: string, requestDate?: string): EventData[] {
    const out: EventData[] = [];
    for (const raw of arr) {
      if (raw && typeof raw === 'object') {
        const ev = this.createEventFromObject(raw, requestCategory, requestDate);
        if (ev.title) out.push(ev);
      }
    }
    return out;
  }

  private parseJsonEvents(text: string, requestCategory?: string, requestDate?: string): EventData[] {
    const out: EventData[] = [];
    for (const line of text.split('\n')) {
      const t = line.trim();
      if (t.startsWith('{') && t.endsWith('}')) {
        try {
          const raw = JSON.parse(t);
          const ev = this.createEventFromObject(raw, requestCategory, requestDate);
          if (ev.title) out.push(ev);
        } catch {/* ignore */}
      }
    }
    return out;
  }

  private createEventFromObject(raw: any, requestCategory?: string, requestDate?: string): EventData {
    return {
      title: this.extractField(raw, ['title', 'name', 'event', 'eventName']) || '',
      category: this.extractField(raw, ['category', 'type', 'genre']) || requestCategory || '',
      date: this.extractField(raw, ['date', 'eventDate', 'day']) || requestDate || '',
      time: this.extractField(raw, ['time', 'startTime', 'start', 'begin', 'doors']) || '',
      venue: this.extractField(raw, ['venue', 'location', 'place']) || '',
      price: this.extractField(raw, ['price', 'cost', 'ticketPrice', 'entry']) || '',
      website: this.extractField(raw, ['website', 'url', 'link']) || '',
      endTime: this.extractField(raw, ['endTime', 'end', 'finish']),
      address: this.extractField(raw, ['address', 'venueAddress']),
      ticketPrice: this.extractField(raw, ['ticketPrice', 'cost', 'entry']),
      eventType: this.extractField(raw, ['eventType']),
      description: this.extractField(raw, ['description', 'details', 'info']),
      bookingLink: this.extractField(raw, ['bookingLink', 'ticketLink', 'tickets', 'booking']),
      ageRestrictions: this.extractField(raw, ['ageRestrictions', 'age', 'ageLimit', 'restrictions']),
    };
  }

  private extractField(obj: any, names: string[]): string | undefined {
    for (const n of names) {
      if (obj && typeof obj === 'object' && obj[n] && typeof obj[n] === 'string') return obj[n].trim();
    }
    return undefined;
  }

  private extractKeywordBasedEvents(text: string, requestCategory?: string, requestDate?: string): EventData[] {
    const events: EventData[] = [];
    const sentences = text
      .split(/[.\n\r•\-\*]/)
      .map(s => s.trim())
      .filter(s => s.length > 10 && s.length < 200);

    for (const s of sentences) {
      const lower = s.toLowerCase();
      if (lower.includes('keine events') || lower.includes('no events') || lower.includes('sorry')) continue;
      const evt = this.parseEventFromText(s, requestCategory, requestDate);
      if (evt.title) events.push(evt);
    }
    return events;
  }

  private parseEventFromText(line: string, requestCategory?: string, requestDate?: string): EventData {
    const timePattern = /(\d{1,2}:\d{2}|\d{1,2}\s*Uhr)/i;
    const datePattern = /(\d{1,2}\.?\d{1,2}\.?\d{2,4})/;
    const pricePattern = /(€\s?\d+|kostenlos|frei|free)/i;

    const time = line.match(timePattern)?.[1] || '';
    const date = line.match(datePattern)?.[1] || requestDate || '';
    const price = line.match(pricePattern)?.[1] || '';

    return {
      title: line.trim(),
      category: requestCategory || '',
      date,
      time,
      venue: '',
      price,
      website: '',
      description: line.length > 80 ? line.slice(0, 120) + '...' : undefined
    };
  }

  deduplicateEvents(events: EventData[]): EventData[] {
    const unique: EventData[] = [];
    const keys = new Set<string>();
    for (const ev of events) {
      const key = `${this.normalizeTitle(ev.title)}_${this.normalizeVenue(ev.venue)}_${this.normalizeDate(ev.date)}`;
      const fuzzy = unique.some(x => this.isFuzzyDuplicate(ev, x));
      if (!keys.has(key) && !fuzzy) {
        keys.add(key);
        unique.push(ev);
      }
    }
    return unique;
  }

  private normalizeTitle(t: string) { return t.toLowerCase().trim().replace(/[^\w\s]/g, '').replace(/\s+/g, ' '); }
  private normalizeVenue(v: string) { return v.toLowerCase().trim().replace(/[^\w\s]/g, '').replace(/\s+/g, ' '); }
  private normalizeDate(d: string) { return d.toLowerCase().trim().replace(/[^\d\-\/\.]/g, ''); }

  private isFuzzyDuplicate(a: EventData, b: EventData): boolean {
    const titleSim = this.sim(this.normalizeTitle(a.title), this.normalizeTitle(b.title));
    const venueSim = this.sim(this.normalizeVenue(a.venue), this.normalizeVenue(b.venue));
    return (titleSim > 0.8 && venueSim > 0.6) || (titleSim > 0.9 && venueSim > 0.9);
  }

  private sim(a: string, b: string): number {
    if (a === b) return 1;
    if (!a || !b) return 0;
    const longer = a.length > b.length ? a : b;
    const shorter = a.length > b.length ? b : a;
    let matches = 0;
    for (const ch of shorter) if (longer.includes(ch)) matches++;
    return matches / longer.length;
  }

  // categorizeEvents() war veraltet und nutzte nicht die 20 kanonischen Kategorien – entfernt.
}

export const eventAggregator = new EventAggregator();
