import './globals.css';
import type { Metadata } from 'next';
// Basis-Design 1 früh laden, damit kein FOUC auftritt.
// Der DesignCssLoader schaltet bei ?design=2 nachträglich auf design2.css um.
import '../public/designs/design1.css';
import DesignCssLoader from './components/DesignCssLoader';

export const metadata: Metadata = {
  title: 'Where2Go - Entdecke Events in deiner Stadt!',
  description: 'Entdecke Events in deiner Stadt - Alle Events. Weltweit. Eine Plattform.',
  keywords: ['events', 'stadt', 'veranstaltungen', 'event finder', 'where2go'],
  authors: [{ name: 'Where2Go Team' }],
  creator: 'Where2Go',
  publisher: 'Where2Go',
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    locale: 'de_DE',
    url: 'https://where2go.example.com',
    title: 'Where2Go - Alle Events. Weltweit. Eine Plattform.',
    description: 'Finde Events in deiner Stadt',
    siteName: 'Where2Go',
  },
  twitter: {
    card: 'summary_large_image',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>
        {/* Lädt das gewünschte Design basierend auf ?design=… */}
        <DesignCssLoader />
        {children}
      </body>
    </html>
  );
}
