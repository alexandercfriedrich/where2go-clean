/**
 * Content for Discover Page - FAQs, HowTo, and SEO content
 */

export const discoverPageFAQs = [
  {
    question: 'Was kann ich heute in Wien machen?',
    answer: 'Where2Go bietet eine umfassende Übersicht aller aktuellen Events in Wien. Von Konzerten über Theatervorstellungen bis hin zu Clubnächten - entdecke täglich neue Veranstaltungen. Nutze unsere Filterfunktionen, um gezielt nach Events für heute zu suchen und finde genau das Richtige für deine Interessen.'
  },
  {
    question: 'Wo finde ich die besten Konzerte in Wien?',
    answer: 'Auf Where2Go findest du alle Konzerte in Wien auf einen Blick. Unsere Plattform aggregiert Events von allen wichtigen Veranstaltungsorten wie dem Wiener Stadthalle, Arena Wien, WUK und vielen mehr. Filtere nach Musikgenres wie Rock, Pop, Jazz oder Klassik und entdecke sowohl etablierte Künstler als auch aufstrebende Talente.'
  },
  {
    question: 'Wie finde ich Events in meiner Nähe?',
    answer: 'Where2Go zeigt dir Events in ganz Wien und du kannst nach Stadtteilen und Bezirken filtern. Ob Ottakring, Innere Stadt oder Favoriten - finde Veranstaltungen in deiner Umgebung. Nutze unsere Kategoriefilter, um gezielt nach Events wie Clubnächten, Kulturveranstaltungen oder Sportevents in deiner Nähe zu suchen.'
  },
  {
    question: 'Was sind die besten Events am Wochenende in Wien?',
    answer: 'Unser Weekend-Bereich zeigt dir alle Highlights für das kommende Wochenende in Wien. Von Freitag bis Sonntag findest du hier handverlesene Events, beliebte Partys, kulturelle Veranstaltungen und Familienevents. Plane dein perfektes Wochenende mit den besten Events der Stadt.'
  },
  {
    question: 'Wie funktioniert die Eventsuche auf Where2Go?',
    answer: 'Where2Go macht die Eventsuche kinderleicht: Wähle deine Stadt (z.B. Wien), nutze Filter für Datum, Kategorie und Preis, und durchsuche unsere umfangreiche Event-Datenbank. Unsere KI-gestützte Suche aggregiert Events von allen wichtigen Quellen und präsentiert sie übersichtlich. Speichere deine Favoriten und erhalte personalisierte Empfehlungen.'
  },
  {
    question: 'Sind alle Events auf Where2Go aktuell und verifiziert?',
    answer: 'Ja, Where2Go aktualisiert die Event-Daten kontinuierlich. Wir aggregieren Informationen von offiziellen Veranstaltern, Ticketplattformen und Venue-Websites. Jedes Event wird mit wichtigen Details wie Datum, Uhrzeit, Location, Preis und Buchungslink angezeigt. Bei Änderungen oder Absagen aktualisieren wir die Informationen schnellstmöglich.'
  },
  {
    question: 'Kann ich kostenlose Events in Wien finden?',
    answer: 'Absolut! Where2Go zeigt auch alle kostenlosen Events und Veranstaltungen in Wien. Nutze den Preisfilter oder suche gezielt nach "Frei" bzw. "Gratis" Events. Von Open-Air-Konzerten über Ausstellungseröffnungen bis zu Community-Events - entdecke die vielfältige Kulturszene Wiens auch ohne Eintritt zu bezahlen.'
  }
];

export const discoverPageHowTo = {
  title: 'So nutzt du Where2Go für die Eventsuche in Wien',
  description: 'Eine einfache Anleitung, wie du die perfekten Events in Wien findest',
  steps: [
    {
      name: 'Stadt und Datum auswählen',
      text: 'Wähle Wien als deine Stadt und das gewünschte Datum. Du kannst nach Events für heute, morgen, das Wochenende oder einen bestimmten Zeitraum suchen.'
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
