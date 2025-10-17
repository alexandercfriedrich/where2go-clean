import type { Metadata } from 'next';
import { resolveCityFromParam } from '@/lib/city';

export async function generateMetadata({ params }: { params: { city: string } }): Promise<Metadata> {
  const resolved = await resolveCityFromParam(params.city);
  const cityName = resolved?.name || 'Deiner Stadt';
  const url = `https://www.where2go.at/${resolved?.slug || ''}`;

  return {
    title: `Events in ${cityName} | Where2Go`,
    description: `Entdecke Events, Konzerte und Veranstaltungen in ${cityName}.`,
    alternates: { canonical: url },
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
