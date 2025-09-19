/**
 * Wien.gv.at (VADB) RSS Source
 * - Baut RSS-URLs nach Datum und optional KAT1-Filter(n)
 * - Parst RSS rudimentär ohne zusätzliche Dependencies
 * - Gibt Event-Objekte zurück (minimal, für Deployment ausreichend)
 *
 * Hinweis: Diese Implementierung ist bewusst leichtgewichtig und robust für den Build.
 * Sie kann später mit besserem XML-Parsing und Feld-Mapping erweitert werden.
 */

type FetchOptions = {
  baseUrl: string;          // z. B. https://www.wien.gv.at/vadb/internet/AdvPrSrv.asp
  fromISO: string;          // YYYY-MM-DD
  toISO: string;            // YYYY-MM-DD
  extraQuery?: string;      // z. B. Bezirk1=01&GANZJAEHRIG=ja
  viennaKats?: string[];    // z. B. ['Museum','Ausstellung']
  limit?: number;           // weiches Limit (Client-seitig)
};

/**
 * Mappt where2go-Hauptkategorien auf Wien.gv.at KAT1-Begriffe.
 * (Heuristik; kann bei Bedarf angepasst/erweitert werden.)
 */
export function mapMainToViennaKats(mainCategories: string[]): string[] {
  const map: Record<string, string[]> = {
    'Museen': ['Museum', 'Ausstellung', 'Kunst'],
    'Kunst/Design': ['Ausstellung', 'Kunst'],
    'Theater/Performance': ['Theater'],
    'Live-Konzerte': ['Konzert', 'Musik'],
    'Clubs/Discos': ['Club', 'Disco'],
    'DJ Sets/Electronic': ['Club', 'Party'],
    'Film': ['Film', 'Kino'],
    'Comedy/Kabarett': ['Kabarett', 'Comedy', 'Theater'],
    'Kultur/Traditionen': ['Kultur', 'Tradition'],
    'Märkte/Shopping': ['Markt', 'Shopping'],
    'Food/Culinary': ['Kulinarik', 'Essen', 'Culinary'],
    'Familien/Kids': ['Familie', 'Kinder'],
    'Sport': ['Sport'],
    'Open Air': ['Festival', 'Open Air', 'Party'],
  };

  const out = new Set<string>();
  for (const m of mainCategories || []) {
    const arr = map[m];
    if (arr && arr.length) arr.forEach((k) => out.add(k));
  }
  return Array.from(out);
}

/**
 * Baut die RSS-URL. Wenn kat (KAT1) gesetzt ist, wird sie als zusätzlicher Filter angehängt.
 */
function buildVadbUrl(
  baseUrl: string,
  fromISO: string,
  toISO: string,
  extraQuery?: string,
  kat1?: string
): string {
  const url = new URL(baseUrl);
  // Sicherstellen, dass die Basis wirklich auf AdvPrSrv.asp zeigt
  if (!/AdvPrSrv\.asp$/i.test(url.pathname)) {
    url.pathname = url.pathname.replace(/\/?$/, '/AdvPrSrv.asp');
  }
  const params = url.searchParams;
  params.set('Layout', 'rss-vadb_neu');
  params.set('Type', 'R');
  params.set('hmwd', 'd');
  params.set('vie_range-from', fromISO);
  params.set('vie_range-to', toISO);

  // extraQuery als Fallback übernehmen (falls in Admin gepflegt)
  if (extraQuery) {
    for (const pair of extraQuery.split('&')) {
      const [k, v] = pair.split('=');
      if (k) params.set(k, v ?? '');
    }
  }

  // KAT1 aus unserem Mapping priorisieren (überschreibt evtl. extraQuery)
  if (kat1) {
    params.set('KAT1', kat1);
  }

  url.search = params.toString();
  return url.toString();
}

/**
 * Sehr einfacher RSS-Parser, der <item>-Blöcke extrahiert und ein paar Felder mappt.
 * Verwendet keine externen Libraries.
 */
function parseRssItems(xml: string, fallbackCategory?: string) {
  const items: any[] = [];
  const clean = (s: string | null | undefined) =>
    (s ?? '')
      .replace(/<!\[CDATA\[/g, '')
      .replace(/\]\]>/g, '')
      .trim();

  // Split auf <item>…</item>
  const parts = xml.split(/<item>/i).slice(1);
  for (const chunk of parts) {
    const itemXml = chunk.split(/<\/item>/i)[0] || '';

    const getTag = (tag: string) => {
      const m = itemXml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
      return clean(m?.[1]);
    };

    const title = getTag('title');
    const link = getTag('link');
    const description = getTag('description');
    const pubDate = getTag('pubDate') || getTag('dc:date') || '';
    const categoryTag = getTag('category');

    const start = pubDate ? new Date(pubDate) : null;

    // Minimales Event-Objekt; Felder können später erweitert werden.
    const ev: any = {
      id: link || `${title}-${pubDate}`.slice(0, 200),
      title,
      url: link,
      description,
      startDateTime: start && !isNaN(start.getTime()) ? start.toISOString() : undefined,
      category: categoryTag || fallbackCategory || 'Wien.at RSS',
      source: 'wien.gv.at RSS',
      city: 'Wien',
    };

    if (title || link) {
      items.push(ev);
    }
  }
  return items;
}

/**
 * Holt Events aus dem Wien.gv.at RSS-Feed.
 * - Wenn viennaKats gesetzt: wird pro KAT1 eine Abfrage gemacht und zusammengeführt.
 * - Sonst: eine breite Abfrage ohne KAT1.
 */
export async function fetchWienAtEvents(opts: FetchOptions): Promise<any[]> {
  const { baseUrl, fromISO, toISO, extraQuery, viennaKats, limit } = opts;

  const katList = (viennaKats && viennaKats.length) ? viennaKats : [undefined];

  const all: any[] = [];
  const seen = new Set<string>();

  for (const kat of katList) {
    const url = buildVadbUrl(baseUrl, fromISO, toISO, extraQuery, kat);
    try {
      const res = await fetch(url, { method: 'GET' });
      if (!res.ok) {
        console.warn(`Wien.at RSS HTTP ${res.status} for ${url}`);
        continue;
      }
      const xml = await res.text();
      const items = parseRssItems(xml, kat);
      for (const ev of items) {
        const key = ev.id || ev.url || ev.title;
        if (!key) continue;
        if (seen.has(key)) continue;
        seen.add(key);
        all.push(ev);
        if (limit && all.length >= limit) break;
      }
      if (limit && all.length >= limit) break;
    } catch (e: any) {
      console.warn('Wien.at RSS fetch failed:', e?.message || e);
    }
  }

  return all;
}
