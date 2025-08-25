import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Where2Go - Event Finder',
  description: 'Finde Events in deiner Stadt - Saubere Neuentwicklung der Eventsuchseite für Städte- und Zeitraumfilter',
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
    locale: 'de_DE',
    url: 'https://where2go.example.com',
    title: 'Where2Go - Event Finder',
    description: 'Finde Events in deiner Stadt',
    siteName: 'Where2Go',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Where2Go - Event Finder',
    description: 'Finde Events in deiner Stadt',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de" className={inter.className}>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
