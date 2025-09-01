import './globals.css';
import type { Metadata } from 'next';
import { getBrowserLanguage, getTranslations } from './lib/i18n';

// Get translations for metadata (defaults to German for SSR)
const language = typeof window !== 'undefined' ? getBrowserLanguage() : 'de';
const translations = getTranslations(language);

export const metadata: Metadata = {
  title: translations['meta.title'],
  description: translations['meta.description'],
  keywords: ['events', 'stadt', 'veranstaltungen', 'event finder', 'where2go'],
  authors: [{ name: 'Where2Go Team' }],
  creator: 'Where2Go',
  publisher: 'Where2Go',
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: 'website',
    locale: language === 'de' ? 'de_DE' : 'en_US',
    url: 'https://where2go.example.com',
    title: translations['meta.title'],
    description: translations['meta.description'],
    siteName: 'Where2Go',
  },
  twitter: {
    card: 'summary_large_image',
    title: translations['meta.title'],
    description: translations['meta.description'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang={language} style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
