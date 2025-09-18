import { EventData } from '@/lib/types';

const BASE_DEFAULT = 'http://www.wien.gv.at/vadb/internet/AdvPrSrv.asp';

export type WienAtParams = {
  baseUrl?: string;            // optional Override (ansonsten BASE_DEFAULT)
  fromISO: string;             // YYYY-MM-DD
  toISO: string;               // YYYY-MM-DD
  extraQuery?: string;         // z.B. aus website.searchQuery
  limit?: number;              // clientseitiges Limit (Feed max. 500)
};

function isoToAt(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}
function stripHtml(input: string): string {
  return input.replace(/<\/?[^>]+(>|$)/g, '').replace(/\s+/g, ' ').trim();
}
function simpleTag(text: string, tag: string): string[] {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi');
  const out: string[] = [];
  let m;
  while ((m = re.exec(text)) !== null) out.push(m[1]);
  return out;
}
function parseItems(xml: string) {
  const items: string[] = [];
  const re = /<item>([\s\S]*?)<\/item>/gi;
  let m;
  while ((m = re.exec(xml)) !== null) items.push(m[1]);
  return items.map(x => ({
    title: simpleTag(x, 'title')[0] ?? '',
    link: simpleTag(x, 'link')[0] ?? '',
    description: simpleTag(x, 'description')[0] ?? '',
    category: simpleTag(x, 'category')[0] ?? '',
    pubDate: simpleTag(x, 'pubDate')[0] ?? ''
  }));
}
function tryExtractDate(desc: string): { date?: string; time?: string } {
  const dateMatch = desc.match(/(\d{1,2}\.\d{1,2}\.\d{4})/);
  const timeMatch = desc.match(/(\d{1,2}[:.]\d{2})/);
  let dateISO: string | undefined;
  if (dateMatch) {
    const [d, m, y] = dateMatch[1].split('.');
    dateISO = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  const time = timeMatch ? timeMatch[1].replace('.', ':') : undefined;
  return { date: dateISO, time };
}
function tryExtractVenue(desc: string): string | undefined {
  const m = desc.match(/(?:Ort|Location)\s*:\s*([^\n\r|]+)/i);
  return m ? m[1].trim() : undefined;
}
function mapCategory(cat?: string): string {
  if (!cat) return 'Sonstiges';
  const c = cat.toLowerCase();
  if (/museum|ausstellung|kunst/.test(c)) return 'Kunst/Design';
  if (/kinder|familie/.test(c)) return 'Familien/Kids';
  if (/musik|konzert|party|club/.test(c)) return 'Clubs/Discos';
  if (/theater|bühne|performance/.test(c)) return 'Theater/Performance';
  if (/film|kino/.test(c)) return 'Film';
  return 'Sonstiges';
}

/**
 * Holt Events aus dem Wien.at-RSS basierend auf ISO-Datum und optionalen Parametern
 */
export async function fetchWienAtEvents(params: WienAtParams): Promise<EventData[]> {
  const base = params.baseUrl || BASE_DEFAULT;
  const url = new URL(base);
  // Pflicht-Parameter
  url.searchParams.set('Layout', 'rss-vadb_neu');
  url.searchParams.set('Type', 'R');
  url.searchParams.set('hmwd', 'd');
  url.searchParams.set('vie_range-from', isoToAt(params.fromISO));
  url.searchParams.set('vie_range-to', isoToAt(params.toISO));

  // optionale Zusatz-Parameter aus Admin (searchQuery-Kette)
  if (params.extraQuery) {
    for (const kv of params.extraQuery.split('&')) {
      if (!kv) continue;
      const [k, v] = kv.split('=');
      if (k && typeof v !== 'undefined') url.searchParams.set(k, decodeURIComponent(v));
    }
  }

  const res = await fetch(url.toString(), { cache: 'no-store' });
  if (!res.ok) throw new Error(`Wien.at RSS Fehler ${res.status}`);
  const xml = await res.text();

  const items = parseItems(xml);
  const events = items.slice(0, params.limit ?? 500).map(i => {
    const clean = stripHtml(i.description || '');
    const when = tryExtractDate(clean);
    const venue = tryExtractVenue(clean);
    return <EventData>{
      title: stripHtml(i.title || ''),
      category: mapCategory(i.category),
      date: when.date ?? params.fromISO,
      time: when.time ?? '',
      venue: venue ?? 'Wien',
      price: '',
      website: i.link || '',
      description: clean
    };
  });
  return events;
}
