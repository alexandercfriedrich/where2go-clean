/* 
  Event parsing and aggregation utilities.

  This version strengthens JSON-first parsing to avoid "Event-Fetzen" (fragmented events),
  reconstructs object-like key/value lines into proper JSON objects, and strictly rejects
  partial fragments that don't have a valid title. It preserves table and free-text fallbacks,
  but guards them so property fragments like `"time": "20:00"` are not turned into events.

  Key changes:
  - parseEventsFromResponse:
    * Try full JSON (array/object) first.
    * Extract embedded JSON blocks via regex.
    * Reconstruct contiguous `"key": "value"` lines into JSON objects.
    * Only then fall back to line-JSON (requires a title), table, and free text parsing.
  - createEventFromObject:
    * Validates presence of a human-readable title (>=3 chars). Otherwise drop.
  - parseJsonEvents:
    * Only accepts lines that look like a complete JSON object AND contain a "title".
  - extractKeywordBasedEvents:
    * Skips lines that look like JSON property fragments to avoid "Fetzen".
*/

export interface EventData {
  title: string;
  category: string;
  date: string;
  time: string;
  venue: string;
  price: string;
  website: string;
  endTime?: string;
  address?: string;
  ticketPrice?: string;
  eventType?: string;
  description?: string;
  bookingLink?: string;
  ageRestrictions?: string;
  source?: string;
  parsingWarning?: string;
}

export interface PerplexityResult {
  query: string;
  responseText: string;
  categoryHint?: string;
  dateHint?: string;
}

export class EventAggregator {
  aggregateResults(results: PerplexityResult[], requestedDate?: string | string[]): EventData[] {
    const out: EventData[] = [];
    for (const r of results) {
      const reqDate = Array.isArray(requestedDate) ? requestedDate[0] : requestedDate;
      const categoryFromQuery = this.extractCategoryFromQuery(r.query) || r.categoryHint;
      const parsed = this.parseEventsFromResponse(r.responseText, categoryFromQuery, r.dateHint || reqDate);
      out.push(...parsed);
    }
    return out;
  }

  private extractCategoryFromQuery(query: string): string | undefined {
    if (!query) return;
    const q = query.toLowerCase();
    if (q.includes('live') || q.includes('konzert')) return 'Live-Konzerte';
    if (q.includes('club') || q.includes('disco') || q.includes('party')) return 'Clubs/Discos';
    if (q.includes('dj') || q.includes('electronic')) return 'DJ Sets/Electronic';
    if (q.includes('theater') || q.includes('performance')) return 'Theater/Performance';
    if (q.includes('kultur') || q.includes('tradition')) return 'Kultur/Traditionen';
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

      // 1) JSON first: attempt to parse the whole response
      try {
        const json = JSON.parse(trimmed);
        if (Array.isArray(json)) {
          const arr = this.parseJsonArray(json, requestCategory, requestDate);
          if (arr.length > 0) return arr;
        } else if (json && typeof json === 'object') {
          const one = this.createEventFromObject(json, requestCategory, requestDate);
          if (one.title) return [one];
        }
      } catch {
        // proceed
      }

      // 2) Extract any embedded JSON arrays/objects
      const blocks = this.extractJsonBlocks(trimmed);
      for (const b of blocks) {
        try {
          const parsed = JSON.parse(b);
          if (Array.isArray(parsed)) {
            events.push(...this.parseJsonArray(parsed, requestCategory, requestDate));
          } else if (parsed && typeof parsed === 'object') {
            const ev = this.createEventFromObject(parsed, requestCategory, requestDate);
            if (ev.title) events.push(ev);
          }
        } catch {
          // ignore invalid JSON chunks
        }
      }
      if (events.length > 0) return events;

      // 3) Reconstruct contiguous key/value lines into JSON objects
      const reconstructed = this.tryAssembleEventsFromKeyValueLines(trimmed, requestCategory, requestDate);
      if (reconstructed.length > 0) return reconstructed;

      // 4) Parse single-line JSON objects (strict: must contain "title")
      const lineJson = this.parseJsonEvents(trimmed, requestCategory, requestDate);
      if (lineJson.length > 0) events.push(...lineJson);

      // 5) Fallback to simple markdown table
      if (events.length === 0) {
        const md = this.parseMarkdownTable(trimmed, requestCategory, requestDate);
        if (md.length > 0) events.push(...md);
      }

      // 6) Free-text salvage (skips JSON property-like lines)
      if (events.length === 0) {
        events.push(...this.extractKeywordBasedEvents(trimmed, requestCategory, requestDate));
      }
    } catch (err) {
      console.error('Event parsing error:', err);
    }
    return events;
  }

  private extractJsonBlocks(text: string): string[] {
    const blocks: string[] = [];
    // Match arrays or objects; allow nested via lazy scan, later JSON.parse will verify
    const regex = /\[[\s\S]*?\]|\{[\s\S]*?\}/g;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(text)) !== null) {
      blocks.push(m[0]);
    }
    return blocks;
  }

  private parseMarkdownTable(text: string, requestCategory?: string, requestDate?: string): EventData[] {
    // Very simple pipe table parser: expects header line with fields
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const tableStart = lines.findIndex(l => l.startsWith('|') && l.endsWith('|'));
    if (tableStart === -1) return [];

    // Find header (first pipe line)
    let headerIdx = tableStart;
    const header = lines[headerIdx].split('|').map(s => s.trim()).filter(Boolean);
    if (header.length < 2) return [];

    const titleIdx = this.findHeaderIndex(header, ['title', 'event', 'name']);
    const catIdx = this.findHeaderIndex(header, ['category', 'type', 'genre']);
    const dateIdx = this.findHeaderIndex(header, ['date', 'datum', 'day']);
    const timeIdx = this.findHeaderIndex(header, ['time', 'start', 'starttime', 'begin']);
    const venueIdx = this.findHeaderIndex(header, ['venue', 'location', 'place']);
    const priceIdx = this.findHeaderIndex(header, ['price', 'cost', 'ticketprice', 'entry']);
    const webIdx = this.findHeaderIndex(header, ['website', 'url', 'link']);

    const out: EventData[] = [];
    for (let i = headerIdx + 1; i < lines.length; i++) {
      const l = lines[i];
      if (!l.startsWith('|') || !l.endsWith('|')) break;
      const cols = l.split('|').map(s => s.trim()).filter(Boolean);
      // minimally need a title cell
      const title = titleIdx >= 0 ? (cols[titleIdx] || '') : '';
      if (!title || title.length < 3) continue;

      const category = catIdx >= 0 ? (cols[catIdx] || '') : (requestCategory || '');
      const date = dateIdx >= 0 ? (cols[dateIdx] || '') : (requestDate || '');
      const time = timeIdx >= 0 ? (cols[timeIdx] || '') : '';
      const venue = venueIdx >= 0 ? (cols[venueIdx] || '') : '';
      const price = priceIdx >= 0 ? (cols[priceIdx] || '') : '';
      const website = webIdx >= 0 ? (cols[webIdx] || '') : '';

      out.push({
        title, category, date, time, venue, price, website
      });
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
      // Strict: full object and must include "title"
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
    // Hard validation to avoid "Event-Fetzen"
    if (!title || title.trim().length < 3) {
      return {
        title: '',
        category: '',
        date: '',
        time: '',
        venue: '',
        price: '',
        website: ''
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
    };
  }

  private extractField(obj: any, names: string[]): string | undefined {
    for (const n of names) {
      if (obj && typeof obj === 'object' && n in obj && typeof obj[n] === 'string') {
        return obj[n] as string;
      }
    }
    // Handle case-insensitive keys
    const lowerKeys = obj && typeof obj === 'object'
      ? Object.keys(obj).reduce((acc, k) => { acc[k.toLowerCase()] = k; return acc; }, {} as Record<string, string>)
      : {};
    for (const n of names) {
      const lk = n.toLowerCase();
      if (lk in lowerKeys) {
        const real = lowerKeys[lk];
        if (typeof obj[real] === 'string') return obj[real] as string;
      }
    }
    return undefined;
  }

  private extractKeywordBasedEvents(text: string, requestCategory?: string, requestDate?: string): EventData[] {
    const out: EventData[] = [];
    const lines = text.split('\n');

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      // Skip pure JSON property fragments like `"time": "20:00"` (no braces)
      if (this.looksLikeJsonPropertyFragment(line)) continue;

      // Skip bare URLs or fragments that look like domain tails
      if (this.looksLikeBareUrl(line)) continue;

      // Too short to be an event title
      if (line.length < 6) continue;

      const ev = this.parseEventFromText(line, requestCategory, requestDate);
      if (ev.title && ev.title.length >= 3) out.push(ev);
    }
    return out;
  }

  private looksLikeJsonPropertyFragment(line: string): boolean {
    // e.g. "title": "Abor and Tynna", OR title: "X", OR "ticketPrice": "€54"
    if (/^"[^"]+"\s*:/.test(line)) return true;
    if (/^[a-zA-Z_][\w\s-]*\s*:/.test(line) && line.includes('"')) return true;
    // also fragments like com/show/abor or wavesvienna (domain tails) will be filtered elsewhere
    return false;
  }

  private looksLikeBareUrl(line: string): boolean {
    if (/https?:\/\/\S+/i.test(line)) return true;
    if (/(^|\s)(www\.[^\s]+)/i.test(line)) return true;
    // obvious domain/path tails without protocol
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

  // Reconstruct events from contiguous JSON-like key/value lines:
  // "title": "X"
  // "time": "20:00"
  // ...
  // Produces a JSON object and parses it (only accepted if it has a valid title).
  private tryAssembleEventsFromKeyValueLines(text: string, requestCategory?: string, requestDate?: string): EventData[] {
    const lines = text.split('\n');
    const out: EventData[] = [];

    let buffer: string[] = [];
    const flush = () => {
      if (buffer.length === 0) return;
      const objStr = '{' + buffer.join(',') + '}';
      buffer = [];
      try {
        const candidate = JSON.parse(objStr);
        const ev = this.createEventFromObject(candidate, requestCategory, requestDate);
        if (ev.title) out.push(ev);
      } catch {
        // ignore
      }
    };

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (this.isKeyValueJsonLine(line)) {
        // normalize: ensure ends with "key": "value"
        const normalized = line.replace(/,\s*$/, '');
        buffer.push(normalized);
        continue;
      }
      // On any non key/value line -> flush buffer
      flush();
    }
    // flush remaining
    flush();

    return out;
  }

  private isKeyValueJsonLine(line: string): boolean {
    // Accept lines like: "key": "value" or 'key': 'value' or key: "value"
    if (/^"[^"]+"\s*:\s*".*"$/.test(line)) return true;
    if (/^[a-zA-Z_][\w\s-]*\s*:\s*".*"$/.test(line)) return true;
    if (/^'[^']+'\s*:\s*'.*'$/.test(line)) return true;
    // reject lines that already include braces (handled elsewhere)
    if (line.includes('{') || line.includes('}')) return false;
    return false;
  }
}
