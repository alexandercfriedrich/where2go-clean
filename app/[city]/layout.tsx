import type { Metadata } from 'next';
import { resolveCityFromParam } from '@/lib/city';
import { locales, getCitySlugForLocale, type SupportedLocale } from '@/i18n.config';

export async function generateMetadata({ params }: { params: { city: string } }): Promise<Metadata> {
  const resolved = await resolveCityFromParam(params.city);
  const cityName = resolved?.name || 'Deiner Stadt';
  const baseUrl = (process.env.SITE_URL || 'https://www.where2go.at').replace(/\/$/, '');
  const url = `${baseUrl}/${resolved?.slug || ''}`;

  const languageAlternates: Record<string, string> = {};
  const canonicalSlug = resolved?.slug;
  if (canonicalSlug) {
    (Object.keys(locales) as SupportedLocale[]).forEach((locale) => {
      const localizedSlug = getCitySlugForLocale(canonicalSlug, locale);
      const prefix = locales[locale].prefix;
      const localizedUrl = `${baseUrl}${prefix}/${localizedSlug}`;
      languageAlternates[locale === 'de' ? 'de-AT' : locale] = localizedUrl;
    });
    languageAlternates['x-default'] = `${baseUrl}/${canonicalSlug}`;
  }

  return {
    title: `Events in ${cityName} | Where2Go`,
    description: `Entdecke Events, Konzerte und Veranstaltungen in ${cityName}.`,
    alternates: { canonical: url, languages: languageAlternates },
    openGraph: {
      type: 'website',
      url,
      siteName: 'Where2Go',
      title: `Events in ${cityName} | Where2Go`,
      description: `Finde Events, Konzerte und Veranstaltungen in ${cityName}.`
    }
  };
}

export default function CityLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
