import type { EventData } from '../types';

type Params = {
  url: string;   // RSS feed URL (ra.co/residentadvisor.net)
  city: string;
  date: string;  // ISO YYYY-MM-DD (wir filtern grob nach diesem Datum falls möglich)
};

function logLine(scope: string, data: Record<string, any>) {
  try {
    console.log(`[w2g:${scope}] ${JSON.stringify(data)}`);
  } catch {
    console.log(`[w2g:${scope}]`, data);
  }
}

// Minimaler RSS-Parser (ohne externe Abhängigkeiten)
function extractTag(xml: string, tag: string): string[] {
  const out: string[] = [];
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi');
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    out.push(m[1].trim());
  }
  return out;
}

export async function fetchResidentAdvisorRss({ url, city, date }: Params): Promise<EventData[]> {
  try {
    logLine('rss:ra:request', { url, city, date });
    const res = await fetch(url, { headers: { 'User-Agent': 'where2go-bot/1.0' } });
    if (!res.ok) {
      logLine('rss:ra:error', { url, status: res.status });
      return [];
    }
    const xml = await res.text();

    // Naiver RSS-Parser: sammelt item-Blöcke via Split (vereinfachter Ansatz)
    const itemsRaw = xml.split(/<item>/i).slice(1).map(block => block.split(/<\/item>/i)[0]);

    const out: EventData[] = [];
    for (const block of itemsRaw) {
      const titles = extractTag(block, 'title');
      const links = extractTag(block, 'link');
      const pubDates = extractTag(block, 'pubDate');
      const title = titles[0] || 'RA Event';
      const link = links[0] || '';
      const pubDate = pubDates[0] || '';

      // Datum-Heuristik: falls pubDate vorhanden, sonst nimm requested date
      // Im Idealfall sollten wir das Event-Datum parsen; RSS bietet oft Event-Datum im Titel/Description.
      const eventDateISO = date;

      out.push({
        title,
        category: 'Clubs/Discos', // Default; feineres Mapping möglich (Techno, DJ etc.)
        date: eventDateISO,
        time: '',
        venue: '',
        price: '',
        website: link,
        source: 'ra'
      });
    }

    logLine('rss:ra:parse', { url, items: out.length });
    return out;
  } catch (e: any) {
    logLine('rss:ra:exception', { url, error: e?.message || 'unknown' });
    return [];
  }
}
