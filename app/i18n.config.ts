export const locales = {
  de: { name: 'Deutsch', prefix: '' },
  en: { name: 'English', prefix: '/en' },
  es: { name: 'Español', prefix: '/es' },
  it: { name: 'Italiano', prefix: '/it' },
  fr: { name: 'Français', prefix: '/fr' },
};

export type SupportedLocale = keyof typeof locales;

export const localesWithPrefix: SupportedLocale[] = ['en', 'es', 'it', 'fr'];
export const localeWithoutPrefix: SupportedLocale = 'de';

export const cityNames: Record<SupportedLocale, Record<string, string>> = {
  de: { wien: 'wien', berlin: 'berlin', ibiza: 'ibiza' },
  en: { wien: 'vienna', berlin: 'berlin', ibiza: 'ibiza' },
  es: { wien: 'viena', berlin: 'berlin', ibiza: 'ibiza' },
  it: { wien: 'venice', berlin: 'berlino', ibiza: 'ibiza' },
  fr: { wien: 'vienne', berlin: 'berlin', ibiza: 'ibiza' },
};

export function getCitySlugForLocale(
  canonicalSlug: string,
  locale: SupportedLocale
): string {
  const mapping = cityNames[locale];
  return mapping?.[canonicalSlug] ?? canonicalSlug;
}

export function resolveCanonicalCitySlugFromLocalized(slug: string): string | null {
  const normalized = slug.toLowerCase();

  for (const locale of Object.keys(cityNames) as SupportedLocale[]) {
    const entries = Object.entries(cityNames[locale]);
    for (const [canonical, localized] of entries) {
      if (localized === normalized) {
        return canonical;
      }
    }
  }

  return null;
}
