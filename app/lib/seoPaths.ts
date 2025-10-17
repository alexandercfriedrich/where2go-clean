// Programmatic SEO Pfade aus echten Datenquellen (HotCities + Kategorien)
// Longtail-Muster sind begrenzt, ohne Analytics/Mocks.
import { getActiveHotCities, slugify as slugifyCity } from '@/lib/hotCityStore';
import { EVENT_CATEGORY_SUBCATEGORIES } from '@/lib/eventCategories';

export async function generateSeoPaths(limit?: number): Promise<string[]> {
  const cities = await getActiveHotCities();
  const slugs = cities.map(c => slugifyCity(c.name));

  const coreDates = ['heute', 'morgen', 'wochenende'];
  const today = new Date();
  const next14 = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    return d.toISOString().split('T')[0];
  });

  // Kategorien (Super-Kategorien als Einstieg)
  const superCats = Object.keys(EVENT_CATEGORY_SUBCATEGORIES);
  const slugify = (s: string) =>
    s.toLowerCase().trim()
      .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-').replace(/-+/g, '-');

  const catSlugs = superCats.map(c => ({ slug: slugify(c), label: c }));
  const urls = new Set<string>();

  // Städte / Kerndaten / nächste 14 Tage
  slugs.forEach(city => {
    urls.add(`/${city}`);
    coreDates.forEach(dt => urls.add(`/${city}/${dt}`));
    next14.forEach(dt => urls.add(`/${city}/${dt}`));
  });

  // Stadt + Kategorie (+ Kerndaten)
  slugs.forEach(city => {
    catSlugs.forEach(cat => {
      urls.add(`/${city}/${cat.slug}`);
      coreDates.forEach(dt => urls.add(`/${city}/${cat.slug}/${dt}`));
    });
  });

  // Ein paar Longtail-Varianten pro Stadt (begrenzt)
  slugs.forEach(city => {
    urls.add(`/${city}/kostenlose-events`);
    urls.add(`/${city}/events-heute-abend`);
    urls.add(`/${city}/was-ist-los`);
  });

  const out = Array.from(urls);
  return typeof limit === 'number' ? out.slice(0, limit) : out;
}
