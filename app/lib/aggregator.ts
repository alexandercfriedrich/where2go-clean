// Event aggregation and deduplication service
// Phase 2A: Integrierte Normalisierung + SSOT Kategorien

import { EventData, PerplexityResult } from './types';
import { normalizeEvents } from './event-normalizer';
import { validateAndNormalizeEvents, normalizeCategory } from './eventCategories';

export class EventAggregator {
  /**
   * Nimmt rohe Perplexity-Antworten, parsed Events, normalisiert & validiert sie
   * und liefert deduplizierte, kanonische Events.
   */
  aggregateResults(results: PerplexityResult[]): EventData[] {
    const parsedRaw: EventData[] = [];

    for (const result of results) {
      const queryCategory = this.extractCategoryFromQuery(result.query);
      const events = this.parseEventsFromResponse(result.response, queryCategory);
      parsedRaw.push(...events);
    }

    // 1. Strukturelle Feld-Normalisierung (Synonyme → erwartete Keys)
    const structurallyNormalized = normalizeEvents(parsedRaw);

    // 2. Kategorie-Normalisierung & Filter (nur gültige Hauptkategorien bleiben)
    const canonical = validateAndNormalizeEvents(structurallyNormalized);

    // 3. Deduplizierung
    return this.deduplicateEvents(canonical);
  }

  /**
   * Extrahiert grobe Kategorie-Hinweise aus dem Prompt (Heuristik).
   * Ergebnis wird durch normalizeCategory zusätzlich abgesichert.
   */
  private extractCategoryFromQuery(query: string): string | undefined {
    const hints: { [key: string]: string } = {
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
      if (lower.includes(kw)) {
        return normalizeCategory(cat);
      }
    }
    return undefined;
  }

  /**
   * JSON-first Parsing Pipeline mit Fallbacks (Markdown, Keywords)
   */
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

      // Versuche komplettes JSON-Array
      try {
        const json = JSON.parse(trimmed);
        if (Array.isArray(json)) {
          const arr = this.parseJsonArray(json, requestCategory, requestDate);
          if (arr.length > 0) return arr;
        }
      } catch {
        // Fallback
      }

      const lineJson = this.parseJsonEvents(trimmed, requestCategory, requestDate);
      if (lineJson.length > 0) events.push(...lineJson);

      if (events.length === 0) {
        const md = this.parseMarkdownTable(trimmed, requestCategory, requestDate);
        if (md.length > 0) events.push(...md);
      }

      if (events.length === 0) {
        const kw = this.extractKeywordBasedEvents(trimmed, requestCategory, requestDate);
        events.push(...kw);
      }

    } catch (err) {
      console.error('Event parsing error:', err);
    }
    return events;
  }

  private parseMarkdownTable(responseText: string, requestCategory?: string, requestDate?: string): EventData[] {
    const events: EventData[] = [];
    const lines = responseText.split('\n');
    const tableLines = lines.filter(l => l.trim().includes('|') && l.trim().split('|').length >= 3);
    if (tableLines.length < 2) return events;

    let startIndex = 1;
    const second = tableLines[1]?.trim();
    if (second && (/^\|[\s\-\|]+\|$/.test(second) || second.split('|').every(col => col.trim() === '' || /^[\-\s]*$/.test(col.trim())))) {
      startIndex = 2;
    }

    for (let i = startIndex; i < tableLines.length; i++) {
      const line = tableLines[i].trim();
      if (!line || line.startsWith('|---') || line.includes('---')) continue;
      const cols = line.split('|').map(c => c.trim()).filter((col, idx, arr) =>
        !(idx === 0 && col === '') && !(idx === arr.length - 1 && col === '')
      );

      if (cols.length >= 3) {
        let event: EventData;
        if (cols.length === 3) {
          const c2 = cols[1];
            const isTime = /^\d{1,2}:\d{2}/.test(c2);
            const isDate = /^\d{4}-\d{2}-\d{2}$/.test(c2) || /^\d{1,2}\.\d{1,2}\.\d{4}$/.test(c2);
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

  private parseJsonArray(jsonArray: any[], requestCategory?: string, requestDate?: string): EventData[] {
    const out: EventData[] = [];
    for (const raw of jsonArray) {
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
        } catch {
          // ignore
        }
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
      const t = this.normalizeTitle(ev.title);
      const v = this.normalizeVenue(ev.venue);
      const d = this.normalizeDate(ev.date);
      const key = `${t}_${v}_${d}`;

      const fuzzyDuplicate = unique.some(x => this.isFuzzyDuplicate(ev, x));
      if (!keys.has(key) && !fuzzyDuplicate) {
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

  private sim(s1: string, s2: string): number {
    if (s1 === s2) return 1;
    if (!s1 || !s2) return 0;
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;
    let matches = 0;
    for (const ch of shorter) if (longer.includes(ch)) matches++;
    return matches / longer.length;
  }

  // categorizeEvents() war veraltet und nutzte nicht die 20 Kanon-Kategorien -> entfernt.
}

// Singleton
export const eventAggregator = new EventAggregator();
