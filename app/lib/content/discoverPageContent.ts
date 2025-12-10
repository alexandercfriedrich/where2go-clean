/**
 * Content for Discover Page - FAQs, HowTo, and SEO content
 * Functions generate city-specific content dynamically
 */

/**
 * Generate city-specific FAQs
 */
export function getDiscoverPageFAQs(city: string = 'Wien') {
  return [
    {
      question: `Was kann ich heute in ${city} machen?`,
      answer: `Where2Go bietet eine umfassende Übersicht aller aktuellen Events in ${city}. Von Konzerten über Theatervorstellungen bis hin zu Clubnächten - entdecke täglich neue Veranstaltungen. Nutze unsere Filterfunktionen, um gezielt nach Events für heute zu suchen und finde genau das Richtige für deine Interessen.`
    },
    {
      question: `Wo finde ich die besten Konzerte in ${city}?`,
      answer: `Auf Where2Go findest du alle Konzerte in ${city} auf einen Blick. Unsere Plattform aggregiert Events von allen wichtigen Veranstaltungsorten. Filtere nach Musikgenres wie Rock, Pop, Jazz oder Klassik und entdecke sowohl etablierte Künstler als auch aufstrebende Talente.`
    },
    {
      question: 'Wie finde ich Events in meiner Nähe?',
      answer: `Where2Go zeigt dir Events in ganz ${city} und du kannst nach Stadtteilen und Bezirken filtern. Finde Veranstaltungen in deiner Umgebung. Nutze unsere Kategoriefilter, um gezielt nach Events wie Clubnächten, Kulturveranstaltungen oder Sportevents in deiner Nähe zu suchen.`
    },
    {
      question: `Was sind die besten Events am Wochenende in ${city}?`,
      answer: `Unser Weekend-Bereich zeigt dir alle Highlights für das kommende Wochenende in ${city}. Von Freitag bis Sonntag findest du hier handverlesene Events, beliebte Partys, kulturelle Veranstaltungen und Familienevents. Plane dein perfektes Wochenende mit den besten Events der Stadt.`
    },
    {
      question: 'Wie funktioniert die Eventsuche auf Where2Go?',
      answer: `Where2Go macht die Eventsuche kinderleicht: Wähle deine Stadt (z.B. ${city}), nutze Filter für Datum, Kategorie und Preis, und durchsuche unsere umfangreiche Event-Datenbank. Unsere KI-gestützte Suche aggregiert Events von allen wichtigen Quellen und präsentiert sie übersichtlich. Speichere deine Favoriten und erhalte personalisierte Empfehlungen.`
    },
    {
      question: 'Sind alle Events auf Where2Go aktuell und verifiziert?',
      answer: 'Ja, Where2Go aktualisiert die Event-Daten kontinuierlich. Wir aggregieren Informationen von offiziellen Veranstaltern, Ticketplattformen und Venue-Websites. Jedes Event wird mit wichtigen Details wie Datum, Uhrzeit, Location, Preis und Buchungslink angezeigt. Bei Änderungen oder Absagen aktualisieren wir die Informationen schnellstmöglich.'
    },
    {
      question: `Kann ich kostenlose Events in ${city} finden?`,
      answer: `Absolut! Where2Go zeigt auch alle kostenlosen Events und Veranstaltungen in ${city}. Nutze den Preisfilter oder suche gezielt nach "Frei" bzw. "Gratis" Events. Von Open-Air-Konzerten über Ausstellungseröffnungen bis zu Community-Events - entdecke die vielfältige Kulturszene auch ohne Eintritt zu bezahlen.`
    }
  ];
}

/**
 * Generate city-specific HowTo content
 */
export function getDiscoverPageHowTo(city: string = 'Wien') {
  return {
    title: `So nutzt du Where2Go für die Eventsuche in ${city}`,
    description: `Eine einfache Anleitung, wie du die perfekten Events in ${city} findest`,
    steps: [
      {
        name: 'Stadt und Datum auswählen',
        text: `Wähle ${city} als deine Stadt und das gewünschte Datum. Du kannst nach Events für heute, morgen, das Wochenende oder einen bestimmten Zeitraum suchen.`
      },
      {
        name: 'Kategorien durchstöbern',
        text: 'Nutze unsere Kategoriefilter wie Konzerte, Clubnächte, Theater, Kunst & Kultur oder Sport, um Events nach deinen Interessen zu filtern.'
      },
      {
        name: 'Events entdecken und filtern',
        text: 'Durchsuche die Event-Liste, nutze zusätzliche Filter für Preis, Location oder Uhrzeit. Sieh dir Event-Details, Bilder und Beschreibungen an.'
      },
      {
        name: 'Favoriten speichern',
        text: 'Speichere interessante Events als Favoriten, um sie später wiederzufinden und deine persönliche Event-Liste zu erstellen.'
      },
      {
        name: 'Tickets buchen',
        text: 'Klicke auf den Ticket-Link des Events, um direkt zur Buchungsseite des Veranstalters zu gelangen und deine Tickets zu sichern.'
      }
    ]
  };
}

// Keep old exports for backward compatibility with homepage (defaults to Wien)
export const discoverPageFAQs = getDiscoverPageFAQs('Wien');
export const discoverPageHowTo = getDiscoverPageHowTo('Wien');

export const discoverPageMetadata = {
  title: 'Entdecke Events in Wien | Where2Go - Konzerte, Clubs, Kultur & mehr',
  description: 'Finde die besten Events in Wien: Konzerte, Clubnächte, Theater, Ausstellungen und mehr. Deine zentrale Plattform für alle Veranstaltungen in Wien. Aktuell, umfassend, übersichtlich.',
  keywords: [
    'Events Wien',
    'Konzerte Wien',
    'Veranstaltungen Wien',
    'Clubnächte Wien',
    'Theater Wien',
    'Kulturevents Wien',
    'Was tun in Wien',
    'Wien Events heute',
    'Ausgehen Wien',
    'Eventkalender Wien',
    'Wochenende Wien',
    'Wien Veranstaltungskalender',
    'Live Musik Wien',
    'Party Wien',
    'Wien Nachtleben'
  ],
  openGraph: {
    title: 'Entdecke Events in Wien | Where2Go',
    description: 'Die zentrale Plattform für alle Events in Wien - Konzerte, Clubs, Theater, Kultur und mehr',
    locale: 'de_AT',
    type: 'website' as const,
    siteName: 'Where2Go'
  }
};
