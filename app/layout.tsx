import './globals.css';
import type { Metadata } from 'next';
import Script from 'next/script';
// RADICAL FIX: Use minimal design to avoid CSS conflicts
// Temporarily using design1-minimal.css instead of design1.css
import '../public/designs/design1-minimal.css';
import DesignCssLoader from './components/DesignCssLoader';
import SchemaOrg from './components/SchemaOrg';
import MainFooter from './components/MainFooter';
import { generateWebSiteSchema } from './lib/schemaOrg';

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
    url: 'https://www.where2go.at',
    title: 'Where2Go - Alle Events. Weltweit. Eine Plattform.',
    description: 'Finde Events in deiner Stadt',
    siteName: 'Where2Go',
  },
  twitter: {
    card: 'summary_large_image',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const websiteSchema = generateWebSiteSchema();
  
  return (
    <html lang="de">
      <head>
        {/* Schema.org structured data for SEO */}
        <SchemaOrg schema={websiteSchema} />
        
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
