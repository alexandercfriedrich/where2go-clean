import { StaticPage } from '@/lib/staticPagesStore';

/**
 * Default-Inhalte für statische Seiten.
 * Diese Defaults werden einmalig verwendet, wenn eine Seite noch nicht in KV existiert.
 * Der Public-Endpoint /api/static-pages/[id] seedet sie automatisch in KV,
 * sodass der Admin-Editor beim ersten Öffnen schon vorbefüllt ist.
 */
export const DEFAULT_STATIC_PAGES: Record<string, Omit<StaticPage, 'updatedAt'>> = {
  'seo-footer': {
    id: 'seo-footer',
    title: 'SEO Footer (Homepage)',
    path: '/',
    content: `
      <h2>Where2Go - Deine Event-Plattform</h2>
      <p>Entdecke Events in deiner Stadt: Konzerte, Theater, Ausstellungen, Festivals und mehr.</p>
      <h3>Highlights</h3>
      <ul>
        <li>Komplette Event-Übersicht</li>
        <li>Intelligente Suche</li>
        <li>Aktuelle Daten</li>
      </ul>
      <p>Für Veranstalter: <a href="/kontakt">Kontakt</a> · <a href="/premium">Premium</a></p>
    `
  },
  'impressum': {
    id: 'impressum',
    title: 'Impressum',
    path: '/impressum',
    content: `
      <h2>Impressum</h2>
      <p>Verantwortlich für den Inhalt: Where2Go</p>
    `
  },
  'datenschutz': {
    id: 'datenschutz',
    title: 'Datenschutzerklärung',
    path: '/datenschutz',
    content: `
      <h2>Datenschutzerklärung</h2>
      <p>Wir nehmen den Schutz deiner Daten ernst. Details findest du hier.</p>
    `
  },
  'agb': {
    id: 'agb',
    title: 'Allgemeine Geschäftsbedingungen',
    path: '/agb',
    content: `
      <h2>AGB</h2>
      <p>Allgemeine Nutzungsbedingungen der Plattform.</p>
    `
  },
  'ueber-uns': {
    id: 'ueber-uns',
    title: 'Über uns',
    path: '/ueber-uns',
    content: `
      <h2>Über Where2Go</h2>
      <p>Unsere Mission: Die beste Eventsuche – schnell, komplett, verlässlich.</p>
    `
  },
  'kontakt': {
    id: 'kontakt',
    title: 'Kontakt',
    path: '/kontakt',
    content: `
      <h2>Kontakt</h2>
      <p>Schreib uns gerne eine Nachricht.</p>
    `
  },
  'premium': {
    id: 'premium',
    title: 'Premium',
    path: '/premium',
    content: `
      <h2>Premium</h2>
      <p>Mehr Reichweite für deine Events – mit Where2Go Premium.</p>
    `
  }
};

export function getDefaultStaticPage(id: string): StaticPage | null {
  const def = DEFAULT_STATIC_PAGES[id];
  if (!def) return null;
  return {
    ...def,
    updatedAt: new Date().toISOString()
  };
}
