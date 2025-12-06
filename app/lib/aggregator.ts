// Event aggregation and parsing – JSON-first, fragment-safe
// Fixes “Event-Fetzen” by:
// - Preferring full JSON (array/object) parsing
// - Extracting embedded JSON blocks
// - Reconstructing contiguous "key": "value" lines into objects
// - Strictly rejecting fragments without a valid title
// - Skipping property-like lines in free-text fallback

import { EventData, PerplexityResult } from './types';
import { normalizeEvents } from './event-normalizer';
import { validateAndNormalizeEvents, normalizeCategory } from './eventCategories';
import { normalizeForEventId, generateEventId } from './eventId';

const TIME_24H_REGEX = /^\d{1,2}:\d{2}/;
const DATE_ISO_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const DATE_DDMMYYYY_REGEX = /^\d{1,2}\.\d{1,2}\.\d{4}$/;

export class EventAggregator {
  aggregateResults(results: PerplexityResult[], requestedDate?: string | string[]): EventData[] {
    const parsedRaw: EventData[] = [];
    for (const r of results) {
      const queryCategory = this.extractCategoryFromQuery(r.query);
      const events = this.parseEventsFromResponse(
        r.response, // use correct field from PerplexityResult
        queryCategory,
        Array.isArray(requestedDate) ? requestedDate[0] : requestedDate
      );
      parsedRaw.push(...events);
    }

    // Normalize structure, validate/massage fields, dedupe and filter by requested date(s)
    const structurallyNormalized = normalizeEvents(parsedRaw);
    const canonical = validateAndNormalizeEvents(structurallyNormalized);
    const deduped = this.deduplicateEvents(canonical);

    let filtered = deduped;
    if (requestedDate) {
      const validDates = Array.isArray(requestedDate) ? requestedDate : [requestedDate];
      filtered = deduped.filter(ev => {
        const d = ev.date?.slice(0, 10);
        return !d || validDates.includes(d);
      });
    }

    return filtered;
  }

  private extractCategoryFromQuery(query: string): string | undefined {
    if (!query) return;
    const lower = query.toLowerCase();
    // Updated for new 12-category structure
    const hints: { [k: string]: string } = {
      'dj sets': 'Clubs & Nachtleben',
      'electronic': 'Clubs & Nachtleben',
      'club': 'Clubs & Nachtleben',
      'disco': 'Clubs & Nachtleben',
      'party': 'Clubs & Nachtleben',
      'nachtleben': 'Clubs & Nachtleben',
      'konzert': 'Live-Konzerte',
      'concert': 'Live-Konzerte',
      'musik': 'Live-Konzerte',
      'live': 'Live-Konzerte',
      'klassik': 'Klassik & Oper',
      'classical': 'Klassik & Oper',
      'oper': 'Klassik & Oper',
      'opera': 'Klassik & Oper',
      'orchester': 'Klassik & Oper',
      'kultur': 'Bildung & Workshops',
      'tradition': 'Bildung & Workshops',
      'workshop': 'Bildung & Workshops',
      'seminar': 'Bildung & Workshops',
      'theater': 'Theater & Comedy',
      'theatre': 'Theater & Comedy',
      'performance': 'Theater & Comedy',
      'comedy': 'Theater & Comedy',
      'kabarett': 'Theater & Comedy',
      'festival': 'Open Air & Festivals',
      'open air': 'Open Air & Festivals',
      'outdoor': 'Open Air & Festivals',
      'food': 'Kulinarik & Märkte',
      'kulinarik': 'Kulinarik & Märkte',
      'markt': 'Kulinarik & Märkte',
      'market': 'Kulinarik & Märkte'
    };
    for (const [kw, cat] of Object.entries(hints)) {
      if (lower.includes(kw)) return normalizeCategory(cat);
    }
    return undefined;
  }

  // Core robust parsing pipeline
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

      // 1) Try parsing the entire response as JSON first
      try {
        const json = JSON.parse(trimmed);
        if (Array.isArray(json)) {
          const arr = this.parseJsonArray(json, requestCategory, requestDate);
          if (arr.length > 0) return arr;
        } else if (json && typeof json === 'object') {
          const ev = this.createEventFromObject(json, requestCategory, requestDate);
          if (ev.title) return [ev];
        }
      } catch { /* continue */ }

      // 2) Extract embedded JSON arrays/objects within noisy text
      const jsonBlocks = this.extractJsonBlocks(trimmed);
      for (const blk of jsonBlocks) {
        try {
          const parsed = JSON.parse(blk);
          if (Array.isArray(parsed)) {
            events.push(...this.parseJsonArray(parsed, requestCategory, requestDate));
          } else if (parsed && typeof parsed === 'object') {
            const ev = this.createEventFromObject(parsed, requestCategory, requestDate);
            if (ev.title) events.push(ev);
          }
        } catch { /* ignore broken blocks */ }
      }
      if (events.length > 0) return events;

      // 3) Reconstruct contiguous key/value lines to objects
      const reconstructed = this.tryAssembleEventsFromKeyValueLines(trimmed, requestCategory, requestDate);
      if (reconstructed.length > 0) return reconstructed;

      // 4) Accept only strict single-line JSON objects containing a title
      const lineJson = this.parseJsonEvents(trimmed, requestCategory, requestDate);
      if (lineJson.length > 0) events.push(...lineJson);

      // 5) Pipe table fallback
      if (events.length === 0) {
        const md = this.parseMarkdownTable(trimmed, requestCategory, requestDate);
        if (md.length > 0) events.push(...md);
      }

      // 6) Free text salvage – skip property-like lines to avoid “Fetzen”
      if (events.length === 0) {
        events.push(...this.extractKeywordBasedEvents(trimmed, requestCategory, requestDate));
      }
    } catch (err) {
      console.error('Event parsing error:', err);
    }
    return events;
  }

  // Detect JSON blocks (arrays/objects); JSON.parse verifies the correctness later
  private extractJsonBlocks(text: string): string[] {
    const blocks: string[] = [];
    const regex = /\[[\s\S]*?\]|\{[\s\S]*?\}/g;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(text)) !== null) {
      blocks.push(m[0]);
    }
    return blocks;
  }

  private parseMarkdownTable(text: string, requestCategory?: string, requestDate?: string): EventData[] {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const tableLines = lines.filter(l => l.startsWith('|') && l.endsWith('|'));
    if (tableLines.length < 2) return [];

    const header = tableLines[0].split('|').map(s => s.trim()).filter(Boolean);
    const titleIdx = this.findHeaderIndex(header, ['title', 'event', 'name']);
    const catIdx = this.findHeaderIndex(header, ['category', 'type', 'genre']);
    const dateIdx = this.findHeaderIndex(header, ['date', 'datum', 'day']);
    const timeIdx = this.findHeaderIndex(header, ['time', 'start', 'starttime', 'begin']);
    const venueIdx = this.findHeaderIndex(header, ['venue', 'location', 'place']);
    const priceIdx = this.findHeaderIndex(header, ['price', 'cost', 'ticketprice', 'entry']);
    const webIdx = this.findHeaderIndex(header, ['website', 'url', 'link']);

    const out: EventData[] = [];
    for (let i = 1; i < tableLines.length; i++) {
      const cols = tableLines[i].split('|').map(s => s.trim()).filter(Boolean);
      const title = titleIdx >= 0 ? (cols[titleIdx] || '') : '';
      if (!title || title.length < 3) continue;

      const category = catIdx >= 0 ? (cols[catIdx] || '') : (requestCategory || '');
      const date = dateIdx >= 0 ? (cols[dateIdx] || '') : (requestDate || '');
      const time = timeIdx >= 0 ? (cols[timeIdx] || '') : '';
      const venue = venueIdx >= 0 ? (cols[venueIdx] || '') : '';
      const price = priceIdx >= 0 ? (cols[priceIdx] || '') : '';
      const website = webIdx >= 0 ? (cols[webIdx] || '') : '';

      out.push({ title, category, date, time, venue, price, website });
    }
    return out;
  }

  private findHeaderIndex(header: string[], candidates: string[]): number {
    const lower = header.map(h => h.toLowerCase());
    for (const c of candidates) {
      const idx = lower.indexOf(c.toLowerCase());
      if (idx >= 0) return idx;
    }
    return -1;
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
      if (t.startsWith('{') && t.endsWith('}') && /"title"\s*:/.test(t)) {
        try {
          const raw = JSON.parse(t);
          const ev = this.createEventFromObject(raw, requestCategory, requestDate);
          if (ev.title) out.push(ev);
        } catch { /* ignore */ }
      }
    }
    return out;
  }

  private createEventFromObject(raw: any, requestCategory?: string, requestDate?: string): EventData {
    const title = this.extractField(raw, ['title', 'name', 'event', 'eventName']) || '';
    if (!title || title.trim().length < 3) {
      // strict: reject fragments
      return {
        title: '',
        category: '',
        date: '',
        time: '',
        venue: '',
        price: '',
        website: '',
      };
    }
    return {
      title: title.trim(),
      category: (this.extractField(raw, ['category', 'type', 'genre']) || requestCategory || '').trim(),
      date: (this.extractField(raw, ['date', 'eventDate', 'day']) || requestDate || '').trim(),
      time: (this.extractField(raw, ['time', 'startTime', 'start', 'begin', 'doors']) || '').trim(),
      venue: (this.extractField(raw, ['venue', 'location', 'place']) || '').trim(),
      price: (this.extractField(raw, ['price', 'cost', 'ticketPrice', 'entry']) || '').trim(),
      website: (this.extractField(raw, ['website', 'url', 'link']) || '').trim(),
      endTime: this.extractField(raw, ['endTime', 'end', 'finish']),
      address: this.extractField(raw, ['address', 'venueAddress']),
      ticketPrice: this.extractField(raw, ['ticketPrice', 'cost', 'entry']),
      eventType: this.extractField(raw, ['eventType']),
      description: this.extractField(raw, ['description', 'details', 'info']),
      bookingLink: this.extractField(raw, ['bookingLink', 'ticketLink', 'tickets', 'booking']),
      ageRestrictions: this.extractField(raw, ['ageRestrictions', 'age', 'ageLimit', 'restrictions']),
      imageUrl: this.extractField(raw, ['imageUrl', 'image_url', 'imageURL', 'image', 'poster', 'thumbnail']),
    };
  }

  private extractField(obj: any, names: string[]): string | undefined {
    if (!obj || typeof obj !== 'object') return undefined;
    for (const n of names) {
      if (Object.prototype.hasOwnProperty.call(obj, n) && typeof obj[n] === 'string') {
        return (obj[n] as string).trim();
      }
    }
    // case-insensitive fallback
    const dict = Object.keys(obj).reduce((acc, k) => { acc[k.toLowerCase()] = k; return acc; }, {} as Record<string, string>);
    for (const n of names) {
      const real = dict[n.toLowerCase()];
      if (real && typeof obj[real] === 'string') return (obj[real] as string).trim();
    }
    return undefined;
  }

  // Attempts to rebuild events from contiguous `"key": "value"` lines
  private tryAssembleEventsFromKeyValueLines(text: string, requestCategory?: string, requestDate?: string): EventData[] {
    const lines = text.split('\n');
    const out: EventData[] = [];
    let buffer: string[] = [];

    const flush = () => {
      if (buffer.length === 0) return;
      const objStr = '{' + buffer.join(',') + '}';
      buffer = [];
      try {
        const raw = JSON.parse(objStr);
        const ev = this.createEventFromObject(raw, requestCategory, requestDate);
        if (ev.title) out.push(ev);
      } catch { /* ignore */ }
    };

    for (const rawLine of lines) {
      const line = rawLine.trim().replace(/,\s*$/, '');
      if (this.isKeyValueJsonLine(line)) {
        buffer.push(line);
      } else {
        flush();
      }
    }
    flush();

    return out;
  }

  private isKeyValueJsonLine(line: string): boolean {
    // "key": "value" | key: "value" | 'key': 'value'
    if (/^"[^"]+"\s*:\s*".*"$/.test(line)) return true;
    if (/^[a-zA-Z_][\w\s-]*\s*:\s*".*"$/.test(line)) return true;
    if (/^'[^']+'\s*:\s*'.*'$/.test(line)) return true;
    if (line.includes('{') || line.includes('}')) return false;
    return false;
  }

  private extractKeywordBasedEvents(text: string, requestCategory?: string, requestDate?: string): EventData[] {
    const out: EventData[] = [];
    for (const rawLine of text.split('\n')) {
      const line = rawLine.trim();
      if (!line) continue;

      // Skip JSON property fragments like `"title": "X"`
      if (this.looksLikeJsonPropertyFragment(line)) continue;
      // Skip bare URLs
      if (this.looksLikeBareUrl(line)) continue;
      // Skip too short lines
      if (line.length < 6) continue;

      const ev = this.parseEventFromText(line, requestCategory, requestDate);
      if (ev.title && ev.title.length >= 3) out.push(ev);
    }
    return out;
  }

  private looksLikeJsonPropertyFragment(line: string): boolean {
    if (/^"[^"]+"\s*:/.test(line)) return true;
    if (/^[a-zA-Z_][\w\s-]*\s*:/.test(line) && line.includes('"')) return true;
    return false;
  }

  private looksLikeBareUrl(line: string): boolean {
    if (/https?:\/\/\S+/i.test(line)) return true;
    if (/(^|\s)(www\.[^\s]+)/i.test(line)) return true;
    if (/[a-z0-9.-]+\.(com|net|org|io|de|at)(\/\S*)?$/i.test(line)) return true;
    return false;
  }

  private parseEventFromText(line: string, requestCategory?: string, requestDate?: string): EventData {
    const timePattern = /(\d{1,2}:\d{2}|\d{1,2}\s*Uhr)/i;
    const datePattern = /(\d{1,2}\.\d{1,2}\.\d{2,4})/;
    const pricePattern = /(€\s?\d+[.,]?\d*|kostenlos|frei|free)/i;

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
      description: line.length > 80 ? `${line.slice(0, 120)}...` : undefined
    };
  }

  // Deduplication with normalization + fuzzy title matching (same date)
  // Uses shared eventId generation from eventId module for consistency with day-bucket cache
  deduplicateEvents(events: EventData[]): EventData[] {
    const map = new Map<string, EventData>();
    for (const ev of events) {
      if (!ev.title) continue;
      const k = generateEventId(ev);
      const existing = map.get(k);

      if (!existing) {
        map.set(k, { ...ev });
        continue;
      }

      // Merge: prefer non-empty fields, keep earliest price/links if missing
      map.set(k, {
        ...existing,
        category: existing.category || ev.category,
        date: existing.date || ev.date,
        time: existing.time || ev.time,
        endTime: existing.endTime || ev.endTime,
        venue: existing.venue || ev.venue,
        address: existing.address || ev.address,
        price: existing.price || ev.price,
        ticketPrice: existing.ticketPrice || ev.ticketPrice,
        website: existing.website || ev.website,
        bookingLink: existing.bookingLink || ev.bookingLink,
        eventType: existing.eventType || ev.eventType,
        ageRestrictions: existing.ageRestrictions || ev.ageRestrictions,
        description: existing.description || ev.description,
        imageUrl: existing.imageUrl || ev.imageUrl,
        source: existing.source || ev.source
      });
    }

    // Secondary fuzzy dedup across keys with same date
    const list = Array.from(map.values());
    const out: EventData[] = [];
    const used = new Set<number>();

    for (let i = 0; i < list.length; i++) {
      if (used.has(i)) continue;
      let base = list[i];
      for (let j = i + 1; j < list.length; j++) {
        if (used.has(j)) continue;
        if ((base.date || '').slice(0,10) !== (list[j].date || '').slice(0,10)) continue;

        const sTitle = this.sim(normalizeForEventId(base.title), normalizeForEventId(list[j].title));
        const sVenue = this.sim(normalizeForEventId(base.venue), normalizeForEventId(list[j].venue || ''));
        if (sTitle >= 0.5 && sVenue >= 0.5) {
          // merge j into base
          base = {
            ...base,
            category: base.category || list[j].category,
            time: base.time || list[j].time,
            endTime: base.endTime || list[j].endTime,
            venue: base.venue || list[j].venue,
            address: base.address || list[j].address,
            price: base.price || list[j].price,
            ticketPrice: base.ticketPrice || list[j].ticketPrice,
            website: base.website || list[j].website,
            bookingLink: base.bookingLink || list[j].bookingLink,
            eventType: base.eventType || list[j].eventType,
            ageRestrictions: base.ageRestrictions || list[j].ageRestrictions,
            description: base.description || list[j].description,
            imageUrl: base.imageUrl || list[j].imageUrl,
            source: base.source || list[j].source
          };
          used.add(j);
        }
      }
      out.push(base);
    }

    return out;
  }

  private sim(a: string, b: string): number {
    if (!a && !b) return 1;
    if (!a || !b) return 0;
    // token-based similarity
    const ta = new Set(a.split(/\s+/).filter(Boolean));
    const tb = new Set(b.split(/\s+/).filter(Boolean));
    const inter = Array.from(ta).filter(x => tb.has(x)).length;
    const union = new Set([...Array.from(ta), ...Array.from(tb)]).size || 1;
    return inter / union;
  }
}

export const eventAggregator = new EventAggregator();
