import { EventData } from './types';
import { normalizeCategory, EVENT_CATEGORY_SUBCATEGORIES } from './eventCategories';

// Local whitelist for tolerant fallback categories that are not part of prompts
const TOLERANT_EXTRA_CATEGORIES = new Set<string>(['Unclassified']);

function isAcceptableCategory(cat: string): boolean {
  return !!EVENT_CATEGORY_SUBCATEGORIES[cat] || TOLERANT_EXTRA_CATEGORIES.has(cat);
}

/**
 * Tolerant validation and normalization:
 * - Attempts to normalize raw categories to one of the 20 main categories
 * - If category is missing or unrecognized, sets category to "Unclassified"
 * - Accepts events without title if at least one of: venue, date, description, website is present
 * - Trims string values and preserves optional fields if present
 * - Adds parsingWarning="title missing" when title is empty but event is otherwise useful
 */
export function validateAndNormalizeEventsTolerant(events: any[]): EventData[] {
  if (!Array.isArray(events)) return [];

  const out: EventData[] = [];
  for (const raw of events) {
    if (!raw || typeof raw !== 'object') continue;

    const e: any = { ...raw };

    // Normalize primitives to strings, keep empties as ''
    const s = (v: unknown) => (v == null ? '' : typeof v === 'string' ? v.trim() : String(v));

    const title = s(e.title);
    const venue = s(e.venue);
    const date = s(e.date);
    const description = s(e.description);
    const website = s(e.website);

    const minimallyValid = !!(title || venue || date || description || website);
    if (!minimallyValid) continue;

    let catRaw = s(e.category);
    let cat = catRaw || 'Unclassified';
    if (catRaw) {
      const norm = normalizeCategory(catRaw);
      cat = isAcceptableCategory(norm) ? norm : 'Unclassified';
    } else {
      cat = 'Unclassified';
    }

    const ev: EventData = {
      title,
      category: cat,
      date,
      time: s(e.time),
      venue,
      price: s(e.price),
      website,
      endTime: e.endTime ? s(e.endTime) : undefined,
      address: e.address ? s(e.address) : undefined,
      ticketPrice: e.ticketPrice ? s(e.ticketPrice) : undefined,
      eventType: e.eventType ? s(e.eventType) : undefined,
      description: description || undefined,
      bookingLink: e.bookingLink ? s(e.bookingLink) : undefined,
      ageRestrictions: e.ageRestrictions ? s(e.ageRestrictions) : undefined,
      source: e.source,
    };

    if (!ev.title) {
      ev.parsingWarning = appendWarning(ev.parsingWarning, 'title missing');
    }

    out.push(ev);
  }

  return out;
}

function appendWarning(existing: string | string[] | undefined, warn: string): string | string[] {
  if (!existing) return warn;
  if (Array.isArray(existing)) return [...existing, warn];
  return [existing, warn];
}
