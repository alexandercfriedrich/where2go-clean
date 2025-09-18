import { EventData } from '@/lib/types';

const BASE_DEFAULT = 'http://www.wien.gv.at/vadb/internet/AdvPrSrv.asp';

export type WienAtParams = {
  baseUrl?: string;            // optional Override (ansonsten BASE_DEFAULT)
  fromISO: string;             // YYYY-MM-DD
  toISO: string;               // YYYY-MM-DD
  extraQuery?: string;         // optional: z.B. Bezirk1=05&GANZJAEHRIG=ja
  viennaKats?: string[];       // optional: Wien-spezifische Kategorien (KAT1)
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
function mapCategoryForOurApp(cat?: string): string {
  if (!cat) return 'Sonstiges';
  const c = cat.toLowerCase();
  if (/museum|ausstellung|kunst/.test(c)) return 'Kunst/Design';
  if (/kinder|familie/.test(c)) return 'Familien/Kids';
  if (/musik|konzert|party|club/.test(c)) return 'Clubs/Discos';
  if (/theater|bühne|performance/.test(c)) return 'Theater/Performance';
  if (/film|kino/.test(c)) return 'Film';
  return 'Sonstiges';
}

// Mappt eure Hauptkategorien -> plausible Wien-KAT Begriffe (KAT1)
export function mapMainToViennaKats(mainCats: string[]): string[] {
  const dict: Record<string, string[]> = {
    'Museen': ['Museum'],
    'Kunst/Design': ['Ausstellung', 'Kunst'],
    'Familien/Kids': ['Kinder'],
    'Theater/Performance': ['Theater'],
    'Live-Konzerte': ['Konzert', 'Musik'],
    'Clubs/Discos': ['Club', 'Disco'],
    'DJ Sets/Electronic': ['Club', 'Party'],
    'Film': ['Film', 'Kino'],
    'Sport': ['Sport'],
    'Bildung/Lernen': ['Bildung', 'Vortrag'],
    'Networking/Business': ['Business', 'Messe', 'Networking'],
    'Natur/Outdoor': ['Natur', 'Outdoor'],
    'Kultur/Traditionen': ['Kultur', 'Tradition'],
    'Wellness/Spirituell': ['Wellness'],
    'Open Air': ['Open Air', 'Festival'],
    'LGBTQ+': ['LGBTQ', 'Queer'],
    'Food/Culinary': ['Kulinarik', 'Food', 'Essen'],
  };
  const out = new Set<string>();
  for (const m of mainCats) (dict[m] || []).forEach(v => out.add(v));
  return Array.from(out);
}

function buildUrl(params: WienAtParams, kat1?: string) {
  const base = params.baseUrl || BASE_DEFAULT;
  const url = new URL(base);
  url.searchParams.set('Layout', 'rss-vadb_neu');
  url.searchParams.set('Type', 'R');
  url.searchParams.set('hmwd', 'd');
  url.searchParams.set('vie_range-from', isoToAt(params.fromISO));
  url.searchParams.set('vie_range-to', isoToAt(params.toISO));
  if (params.extraQuery) {
    for (const kv of params.extraQuery.split('&')) {
      if (!kv) continue;
      const [k, v] = kv.split('=');
      if (!k || typeof v === 'undefined') continue;
      // Wenn wir KAT1 gezielt setzen, ignoriere KATx aus extraQuery
      if (/^KAT\d*$/i.test(k) && kat1) continue;
      url.searchParams.set(k, decodeURIComponent(v));
    }
  }
  if (kat1) url.searchParams.set('KAT1', kat1);
  return url;
}

function dedupeByKey(events: EventData[]): EventData[] {
  const seen = new Set<string>();
  const out: EventData[] = [];
  for (const e of events) {
    const key = `${(e.title||'').toLowerCase()}_${e.date||''}_${(e.venue||'').toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(e);
  }
  return out;
}

/**
 * Holt Events aus Wien.at. Wenn viennaKats gesetzt ist, werden mehrere Abfragen (pro KAT1) gemacht.
 * Bei 0 Treffern mit KATs kann der Aufrufer optional noch einen Fallback ohne KAT erzeugen.
 */
export async function fetchWienAtEvents(params: WienAtParams): Promise<EventData[]> {
  const { viennaKats } = params;
  const limit = params.limit ?? 500;

  const fetchOnce = async (kat?: string) => {
    const url = buildUrl(params, kat);
    const res = await fetch(url.toString(), { cache: 'no-store' });
    if (!res.ok) throw new Error(`Wien.at RSS Fehler ${res.status}`);
    const xml = await res.text();
    const items = parseItems(xml);
    const events = items.slice(0, limit).map(i => {
      const clean = stripHtml(i.description || '');
      const when = tryExtractDate(clean);
      const venue = tryExtractVenue(clean);
      return <EventData>{
        title: stripHtml(i.title || ''),
        category: mapCategoryForOurApp(i.category),
        date: when.date ?? params.fromISO,
        time: when.time ?? '',
        venue: venue ?? 'Wien',
        price: '',
        website: i.link || '',
        description: clean
      };
    });
    return events;
  };

  // Ohne KATs: einfache Einzelabfrage
  if (!viennaKats || viennaKats.length === 0) {
    return dedupeByKey(await fetchOnce());
  }

  // Mit KATs: mehrere Abfragen und mergen
  const uniqKats = Array.from(new Set(viennaKats));
  const settled = await Promise.allSettled(uniqKats.map(k => fetchOnce(k)));
  const merged: EventData[] = [];
  for (const s of settled) {
    if (s.status === 'fulfilled') merged.push(...s.value);
  }
  return dedupeByKey(merged);
}
