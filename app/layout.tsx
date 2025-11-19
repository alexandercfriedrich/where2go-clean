import './globals.css';
import type { Metadata } from 'next';
import Script from 'next/script';
// Basis-Design 1 früh laden, damit kein FOUC auftritt.
// Der DesignCssLoader schaltet bei ?design=2 nachträglich auf design2.css um.
import '../public/designs/design1.css';
// React-Quill CSS für Rich Text Editor
import 'react-quill-new/dist/quill.snow.css';
import DesignCssLoader from './components/DesignCssLoader';
import SchemaOrg from './components/SchemaOrg';
import MainFooter from './components/MainFooter';
import { generateWebSiteSchema, generateViennaPlaceSchema } from './lib/schemaOrg';

export const metadata: Metadata = {
  title: 'Where2Go - Entdecke Events in deiner Stadt!',
  description: 'Entdecke Events in deiner Stadt - Alle Events. Weltweit. Eine Plattform.',
  keywords: ['events', 'stadt', 'veranstaltungen', 'event finder', 'where2go'],
  authors: [{ name: 'Where2Go Team' }],
  creator: 'Where2Go',
  publisher: 'Where2Go',
  robots: { index: true, follow: true },
  alternates: {
    canonical: 'https://www.where2go.at',
    languages: {
      'de-AT': 'https://www.where2go.at',
    },
  },
  openGraph: {
    type: 'website',
    locale: 'de_AT',
    url: 'https://www.where2go.at',
    title: 'Where2Go - Alle Events. Weltweit. Eine Plattform.',
    description: 'Finde Events in deiner Stadt',
    siteName: 'Where2Go',
  },
  twitter: {
    card: 'summary_large_image',
  },
  other: {
    'geo.region': 'AT-9',
    'geo.placename': 'Wien',
    'geo.position': '48.2082;16.3738',
    'ICBM': '48.2082, 16.3738',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const websiteSchema = generateWebSiteSchema();
  const viennaPlaceSchema = generateViennaPlaceSchema();
  
  return (
    <html lang="de-AT">
      <head>
        {/* Schema.org structured data for SEO */}
        <SchemaOrg schema={websiteSchema} />
        <SchemaOrg schema={viennaPlaceSchema} />
        
        {/* Google tag (gtag.js) */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-HEC3GGDFZD"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-HEC3GGDFZD');
          `}
        </Script>
      </head>
      <body>
        {/* Lädt das gewünschte Design basierend auf ?design=… */}
        <DesignCssLoader />
        {children}
        <MainFooter />
      </body>
    </html>
  );
}