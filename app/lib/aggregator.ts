// Event aggregation and deduplication service
// Phase 2A: Integrierte Normalisierung & Validierung (tolerant)
// This file implements tolerant JSON-first parsing with robust fallbacks and conservative deduplication.
//
// Tolerances & Fallbacks:
// 1) JSON-first with repair attempts:
//    - Try JSON.parse on full text.
//    - If it fails, extract between first '[' and last ']' and retry.
//    - If still failing, extract between first '{' and last '}' for a single object.
//    - Additionally, find any {...} snippets anywhere in the text (not just line-start).
// 2) Markdown table parsing as a fallback (pipe-delimited).
// 3) Free-text extraction: build minimal events from lines with date/time/URL/venue hints.
// 4) Soft validation:
//    - Accept events without title if at least one of venue/date/description/website is present.
//    - Add parsingWarning: "title missing" in that case.
//    - Missing/invalid category becomes "Unclassified" in tolerant validator.
// 5) Debug logging:
//    - When NODE_ENV=development or DEBUG_PARSING=1, log parsing errors and a sample of the response.

import { EventData, PerplexityResult } from './types';
import { normalizeEvents } from './event-normalizer';
import { normalizeCategory, EVENT_CATEGORIES } from './eventCategories';
import { validateAndNormalizeEventsTolerant } from './eventValidation';

const TIME_24H_REGEX = /^\d{1,2}:\d{2}/;
const DATE_ISO_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const DATE_DDMMYYYY_REGEX = /^\d{1,2}\.\d{1,2}\.\d{4}$/;

export class EventAggregator {
  aggregateResults(results: PerplexityResult[]): EventData[] {
    const parsedRaw: EventData[] = [];
    for (const result of results) {
      const queryCategory = this.extractCategoryFromQuery(result.query);
      const events = this.parseEventsFromResponse(result.response, queryCategory);
      parsedRaw.push(...events);
    }
    const structurallyNormalized = normalizeEvents(parsedRaw);
    const canonical = validateAndNormalizeEventsTolerant(structurallyNormalized);
    return this.deduplicateEvents(canonical);
  }

  private extractCategoryFromQuery(query: string): string | undefined {
    if (!query) return undefined;
    const lower = query.toLowerCase();
    for (const cat of EVENT_CATEGORIES) {
      if (lower.includes(cat.toLowerCase())) return cat;
    }
    // Heuristic normalization on tokens
    const tokens = lower.split(/[,\-\(\)\:]/).map(t => t.trim()).filter(Boolean);
    for (const t of tokens) {
      const norm = normalizeCategory(t);
      if (EVENT_CATEGORIES.includes(norm)) return norm;
    }
    return undefined;
  }

  parseEventsFromResponse(responseText: string, requestCategory?: string, requestDate?: string): EventData[] {
    const events: EventData[] = [];
    try {
      const trimmed = (responseText || '').trim();
      if (!trimmed ||
          trimmed.toLowerCase().includes('keine passenden events') ||
          trimmed.toLowerCase().includes('keine events gefunden') ||
          trimmed.toLowerCase().includes('no events found')) {
        return [];
      }

      // JSON-first tolerant parsing
      const parsed = this.tryParseAnyJson(trimmed);
      if (parsed) {
        if (Array.isArray(parsed)) {
          const arr = this.parseJsonArray(parsed, requestCategory, requestDate);
          if (arr.length > 0) return arr;
        } else if (typeof parsed === 'object') {
          const arr = this.parseJsonArray([parsed], requestCategory, requestDate);
          if (arr.length > 0) return arr;
        }
      }

      // Loose JSON object extraction anywhere in text
      const lineJson = this.parseJsonEvents(trimmed, requestCategory, requestDate);
      if (lineJson.length > 0) events.push(...lineJson);

      // Markdown table fallback
      if (events.length === 0) {
        const md = this.parseMarkdownTable(trimmed, requestCategory, requestDate);
        if (md.length > 0) events.push(...md);
      }

      // Free-text fallback
      if (events.length === 0) {
        events.push(...this.extractKeywordBasedEvents(trimmed, requestCategory, requestDate));
      }
    } catch (err) {
      this.logParseError('Event parsing error (outer)', err, responseText);
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
        if (this.isMinimallyValid(event)) {
          if (!event.title) event.parsingWarning = appendWarning(event.parsingWarning, 'title missing');
          events.push(event);
        }
      }
    }
    return events;
  }

  private parseJsonArray(arr: any[], requestCategory?: string, requestDate?: string): EventData[] {
    const out: EventData[] = [];
    for (const raw of arr) {
      if (raw && typeof raw === 'object') {
        const ev = this.createEventFromObject(raw, requestCategory, requestDate);
        if (this.isMinimallyValid(ev)) {
          if (!ev.title) ev.parsingWarning = appendWarning(ev.parsingWarning, 'title missing');
          out.push(ev);
        }
      }
    }
    return out;
  }

  private parseJsonEvents(text: string, requestCategory?: string, requestDate?: string): EventData[] {
    const out: EventData[] = [];
    // Extract any JSON object snippets anywhere in the text
    const objectRegex = /{[\s\S]*?}/g;
    const matches = text.match(objectRegex);
    if (!matches) return out;

    for (const m of matches) {
      try {
        const raw = JSON.parse(m);
        const ev = this.createEventFromObject(raw, requestCategory, requestDate);
        if (this.isMinimallyValid(ev)) {
          if (!ev.title) ev.parsingWarning = appendWarning(ev.parsingWarning, 'title missing');
          out.push(ev);
        }
      } catch (err) {
        this.logParseError('Failed to parse object snippet', err, m);
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
      if (obj && typeof obj === 'object' && obj[n] != null) {
        const v = obj[n];
        if (typeof v === 'string') return v.trim();
        if (typeof v === 'number') return String(v);
      }
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
      if (this.isMinimallyValid(evt)) {
        if (!evt.title) evt.parsingWarning = appendWarning(evt.parsingWarning, 'title missing');
        events.push(evt);
      }
    }
    return events;
  }

  private parseEventFromText(line: string, requestCategory?: string, requestDate?: string): EventData {
    const timePattern = /(\d{1,2}:\d{2}|\d{1,2}\s*Uhr)/i;
    const datePattern = /(\d{1,2}\.?\d{1,2}\.?\d{2,4}|\d{4}-\d{2}-\d{2})/;
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
      description: line.length > 80 ? line.slice(0, 200) + '...' : undefined
    };
  }

  deduplicateEvents(events: EventData[]): EventData[] {
    const unique: EventData[] = [];
    const keys = new Set<string>();
    for (const ev of events) {
      const key = `${this.normalizeTitle(ev.title)}_${this.normalizeVenue(ev.venue)}_${this.normalizeDate(ev.date)}`;

      if (keys.has(key)) continue;

      // Conservative fuzzy duplicate handling:
      // - Only consider fuzzy dup if dates match (or both missing)
      // - Stricter title/venue similarity thresholds
      // - If descriptions differ a lot, keep both
      const fuzzy = unique.some(x => this.isFuzzyDuplicate(ev, x));
      if (!fuzzy) {
        keys.add(key);
        unique.push(ev);
      }
    }
    return unique;
  }

  private normalizeTitle(t: string) { return (t || '').toLowerCase().trim().replace(/[^\w\s]/g, '').replace(/\s+/g, ' '); }
  private normalizeVenue(v: string) { return (v || '').toLowerCase().trim().replace(/[^\w\s]/g, '').replace(/\s+/g, ' '); }
  private normalizeDate(d: string) { return (d || '').toLowerCase().trim().replace(/[^\d\-\/\.]/g, ''); }

  private isFuzzyDuplicate(a: EventData, b: EventData): boolean {
    const dateA = this.normalizeDate(a.date);
    const dateB = this.normalizeDate(b.date);
    if (dateA && dateB && dateA !== dateB) return false;

    const titleSim = this.sim(this.normalizeTitle(a.title), this.normalizeTitle(b.title));
    const venueSim = this.sim(this.normalizeVenue(a.venue), this.normalizeVenue(b.venue));

    const descA = (a.description || '').toLowerCase().trim();
    const descB = (b.description || '').toLowerCase().trim();
    const descSim = descA && descB ? this.sim(descA, descB) : 1;

    const looksSame = (titleSim > 0.92 && venueSim > 0.80) || (titleSim > 0.96 && venueSim > 0.90);
    const similarDescriptions = descSim > 0.6;

    return looksSame && similarDescriptions;
  }

  private sim(a: string, b: string): number {
    if (a === b) return 1;
    if (!a || !b) return 0;
    const longer = a.length > b.length ? a : b;
    const shorter = a.length > b.length ? b : a;
    let matches = 0;
    for (const ch of new Set(shorter)) {
      const countA = (a.match(new RegExp(ch, 'g')) || []).length;
      const countB = (b.match(new RegExp(ch, 'g')) || []).length;
      matches += Math.min(countA, countB);
    }
    return matches / longer.length;
  }

  private isMinimallyValid(ev: EventData): boolean {
    return !!(ev.title || ev.venue || ev.date || ev.description || ev.website);
  }

  private tryParseAnyJson(text: string): any | undefined {
    const devLog = (ctx: string, err: any) => this.logParseError(ctx, err, text);

    // Direct parse
    try {
      return JSON.parse(text);
    } catch (err) {
      devLog('Top-level JSON.parse failed', err);
    }

    // Between first '[' and last ']'
    try {
      const i1 = text.indexOf('[');
      const i2 = text.lastIndexOf(']');
      if (i1 !== -1 && i2 !== -1 && i2 > i1) {
        const sliced = text.slice(i1, i2 + 1);
        return JSON.parse(sliced);
      }
    } catch (err) {
      devLog('Bracket-slice JSON.parse failed', err);
    }

    // Single object between first '{' and last '}'
    try {
      const j1 = text.indexOf('{');
      const j2 = text.lastIndexOf('}');
      if (j1 !== -1 && j2 !== -1 && j2 > j1) {
        const sliced = text.slice(j1, j2 + 1);
        const obj = JSON.parse(sliced);
        if (obj && typeof obj === 'object' && !Array.isArray(obj)) return obj;
      }
    } catch (err) {
      devLog('Curly-slice JSON.parse failed', err);
    }

    return undefined;
  }

  private logParseError(context: string, err: any, sample?: string) {
    const shouldLog = process.env.DEBUG_PARSING === '1' || process.env.NODE_ENV === 'development';
    if (!shouldLog) return;
    // For privacy, do not log raw sample data. Log only metadata.
    console.debug(`[parse-debug] ${context}:`, err?.message || err);
    if (sample) {
      console.debug('[parse-debug] response/sample: [omitted for privacy] (length:', sample.length, 'characters)');
    }
  }
}

function appendWarning(existing: string | string[] | undefined, warn: string): string | string[] {
  if (!existing) return warn;
  if (Array.isArray(existing)) return [...existing, warn];
  return [existing, warn];
}

export const eventAggregator = new EventAggregator();
