// City- und Datums-Helfer, 100% repo-kompatibel (HotCities + Date-Tokens)
import { getHotCityBySlug, getHotCity, slugify as slugifyCity } from '@/lib/hotCityStore';

export type DateToken = 'heute' | 'morgen' | 'wochenende' | string;

/**
 * Resolves a city parameter to a city object
 * @param param - The city parameter from the URL
 * @param strictMode - If true, only accept cities from the Hot Cities list (default: false)
 * @returns City object or null if not found
 */
export async function resolveCityFromParam(
  param: string, 
  strictMode: boolean = false
): Promise<{ slug: string; name: string } | null> {
  const decoded = decodeURIComponent(param || '').trim();
  if (!decoded) return null;

  // Slug → HotCity
  const bySlug = await getHotCityBySlug(decoded);
  if (bySlug) return { slug: slugifyCity(bySlug.name), name: bySlug.name };

  // Name → HotCity
  const byName = await getHotCity(decoded);
  if (byName) return { slug: slugifyCity(byName.name), name: byName.name };

  // In strict mode, only accept known cities
  if (strictMode) {
    return null;
  }

  // Fallback: accept any city name (for flexibility)
  return { slug: slugifyCity(decoded), name: capitalize(decoded) };
}

export function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function dateTokenToISO(token: DateToken): string {
  const t = (token || '').toLowerCase().trim();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (t === 'heute') return toISODate(today);

  if (t === 'morgen') {
    const d = new Date(today);
    d.setDate(d.getDate() + 1);
    return toISODate(d);
  }

  if (t === 'wochenende') {
    // nächster Samstag (nie heute)
    const d = new Date(today);
    const day = d.getDay(); // 0=So, 6=Sa
    const delta = (6 - day + 7) % 7;
    d.setDate(d.getDate() + (delta === 0 ? 7 : delta));
    return toISODate(d);
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;

  return toISODate(today);
}

export function formatGermanDate(dateISO: string): string {
  try {
    const d = new Date(dateISO + 'T00:00:00');
    if (isNaN(d.getTime())) {
      return dateISO;
    }
    return d.toLocaleDateString('de-AT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return dateISO;
  }
}

function toISODate(d: Date): string {
  return d.toISOString().split('T')[0];
}

export const KNOWN_DATE_TOKENS = ['heute', 'morgen', 'wochenende'];
