export interface FAQ {
  question: string;
  answer: string;
}

export interface CityContent {
  city: string;
  intro: string;
  highlights: string[];
  faqs: FAQ[];
}

// Wien content
const wienContent: CityContent = {
  city: 'wien',
  intro: 'Wien ist die pulsierende Hauptstadt Österreichs und bietet eine einzigartige Mischung aus Kultur, Geschichte und modernem Lifestyle. Von klassischen Konzerten in historischen Sälen bis zu angesagten Club-Nächten – hier ist für jeden etwas dabei.',
  highlights: [
    'Über 100 Live-Events pro Woche in verschiedenen Genres',
    'Weltklasse-Theater und Opernhäuser mit täglichen Aufführungen',
    'Innovative Club-Szene mit elektronischer Musik',
    'Gemütliche Jazz-Lokale und Live-Musik-Bars',
    'Kulturelle Vielfalt von klassisch bis experimentell',
  ],
  faqs: [
    {
      question: 'Welche Events gibt es heute in Wien?',
      answer: 'In Wien finden täglich zahlreiche Events statt: von Live-Konzerten über Theater bis zu Club-Partys. Nutze unsere Filter, um genau die Events zu finden, die dich interessieren.',
    },
    {
      question: 'Wie finde ich günstige Events in Wien?',
      answer: 'Viele Veranstaltungen in Wien sind kostenlos oder haben ermäßigte Preise. Achte auf unsere Preisangaben und filtere nach deinem Budget. Besonders unter der Woche gibt es oft günstigere Tickets.',
    },
    {
      question: 'Welche sind die besten Locations für Live-Musik in Wien?',
      answer: 'Zu den Top-Locations gehören die Wiener Staatsoper, das Konzerthaus, aber auch kleinere Venues wie das Porgy & Bess für Jazz oder das Flex für elektronische Musik.',
    },
    {
      question: 'Brauche ich Tickets im Voraus oder kann ich spontan hingehen?',
      answer: 'Das kommt auf die Veranstaltung an. Beliebte Events sind oft ausverkauft, daher empfehlen wir eine frühzeitige Buchung. Für kleinere Club-Events ist spontanes Vorbeikommen meist möglich.',
    },
  ],
};

// Default fallback content
export function getDefaultCityContent(city: string): CityContent {
  return {
    city,
    intro: `${city} bietet eine lebendige Event-Szene mit vielfältigen Kulturangeboten. Entdecke heute die besten Veranstaltungen in der Stadt!`,
    highlights: [
      'Aktuelle Live-Events und Konzerte',
      'Theater und kulturelle Veranstaltungen',
      'Club-Partys und DJ-Sets',
      'Lokale Künstler und internationale Acts',
    ],
    faqs: [
      {
        question: `Welche Events gibt es heute in ${city}?`,
        answer: `In ${city} finden täglich verschiedene Events statt. Nutze unsere Suchfunktion, um aktuelle Veranstaltungen zu entdecken.`,
      },
      {
        question: `Wie finde ich Events in ${city}?`,
        answer: `Unsere Plattform aggregiert Events aus verschiedenen Quellen. Du kannst nach Datum, Kategorie und weiteren Kriterien filtern.`,
      },
    ],
  };
}

// Main function to get city content
export function getCityContent(city: string): CityContent {
  const normalizedCity = city.toLowerCase().trim();
  
  switch (normalizedCity) {
    case 'wien':
    case 'vienna':
      return wienContent;
    default:
      return getDefaultCityContent(city);
  }
}
