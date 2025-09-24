import { getWienInfoF1IdsForCategories, buildWienInfoUrl } from '@/event_mapping_wien_info';

export interface WienInfoFetchOptions {
  fromISO: string;
  toISO: string;
  categories: string[];
  limit?: number;
  debug?: boolean;
  debugVerbose?: boolean;
}

interface RawParsed {
  title: string;
  url?: string;
  dateISO?: string;
  snippet?: string;
}

function logDebug(enabled: boolean, payload: any, verboseEnabled?: boolean, verbosePayload?: any) {
  if (enabled || process.env.LOG_WIENINFO_DEBUG === '1') {
    console.log('[WIEN.INFO]', payload);
    if (verboseEnabled || process.env.LOG_WIENINFO_VERBOSE === '1') {
      console.log('[WIEN.INFO:VERBOSE]', verbosePayload ?? payload);
    }
  }
}

/**
 * Heuristischer HTML Parser:
 * - findet <a href=\".../en/now-on/event...\">Titel</a>
 * - zieht Datum aus Umgebung (YYYY-MM-DD oder DD.MM.YYYY)
 */
function parseHtml(html: string, limit?: number): RawParsed[] {
  const out: RawParsed[] = [];
  const anchorRegex = /<a[^>]+href="([^"]+\/en\/now-on\/event[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  const seen = new Set<string>();

  while ((m = anchorRegex.exec(html)) !== null) {
    const href = m[1];
    const textRaw = m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (!textRaw) continue;

    const key = href + '|' + textRaw;
    if (seen.has(key)) continue;
    seen.add(key);

    const context = html.slice(Math.max(0, m.index - 400), m.index + 400);

    let dateISO: string | undefined;
    const isoMatch = context.match(/\b20\d{2}-\d{2}-\d{2}\b/);
    if (isoMatch) {
      dateISO = isoMatch[0];
    } else {
      const deMatch = context.match(/\b(\d{1,2})\.(\d{1,2})\.(20\d{2})\b/);
      if (deMatch) {
        const dd = deMatch[1].padStart(2, '0');
        const mm = deMatch[2].padStart(2, '0');
        dateISO = `${deMatch[3]}-${mm}-${dd}`;
      }
    }

    out.push({
      title: textRaw,
      url: href.startsWith('http') ? href : `https://www.wien.info${href.replace(/^\/+/, '')}`,
      dateISO,
      snippet: context.slice(0, 800)
    });

    if (limit && out.length >= limit) break;
  }
  return out;
}

function mapParsedToEvents(parsed: RawParsed[], mainCategories: string[], fallbackDate: string) {
  return parsed.map(p => ({
    id: p.url || p.title,
    title: p.title,
    date: p.dateISO || fallbackDate,
    time: '',
    venue: '',
    price: '',
    website: p.url || '',
    category: mainCategories[0] || 'Kultur/Traditionen', // placeholder mapping
    description: '',
    source: 'wien.info',
    city: 'Wien'
  }));
}

export async function fetchWienInfoEvents(opts: WienInfoFetchOptions): Promise<any[]> {
  const { fromISO, toISO, categories, limit, debug, debugVerbose } = opts;
  try {
    const f1Ids = getWienInfoF1IdsForCategories(categories);
    const url = buildWienInfoUrl(fromISO, toISO, f1Ids.length ? f1Ids : undefined);

    const t0 = Date.now();
    const res = await fetch(url, { method: 'GET' });
    const dt = Date.now() - t0;

    if (!res.ok) {
      logDebug(debug || false, { level: 'error', status: res.status, url, dtMs: dt });
      return [];
    }

    const html = await res.text();
    logDebug(debug || false,
      { level: 'fetched', status: res.status, url, dtMs: dt, length: html.length },
      debugVerbose,
      html.slice(0, 4000)
    );

    const parsed = parseHtml(html, limit || 150);
    const events = mapParsedToEvents(parsed, categories, fromISO);
    logDebug(debug || false, { level: 'parsed', count: events.length });

    return events;
  } catch (e: any) {
    logDebug(true, { level: 'exception', message: e?.message || String(e) });
    return [];
  }
}