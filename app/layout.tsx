import './globals.css';
import type { Metadata } from 'next';
import '../public/designs/design1.css';

export const metadata: Metadata = {
  title: 'Where2Go - Entdecke Events in deiner Stadt!',
  description: 'Entdecke Events in deiner Stadt - Alle Events. Weltweit. Eine Plattform.',
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
    title: 'Where2Go - Alle Events. Weltweit. Eine Plattform.',
    description: 'Finde Events in deiner Stadt',
    siteName: 'Where2Go',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Where2Go - Alle Events. Weltweit. Eine Plattform.',
    description: 'Finde Events in deiner Stadt',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
