interface Venue {
  name: string;
  description: string;
  address?: string;
  capacity?: number;
  priceRange?: string;
  specialFeature?: string;
  insiderTip?: string;
}

export interface CategoryContent {
  city: string;
  category: string;
  description: string;
  topVenues: Venue[];
  insiderTips: string[];
  tldrItems: string[];
}

// Wien - Live Konzerte content
const wienLiveKonzerteContent: CategoryContent = {
  city: 'wien',
  category: 'live-konzerte',
  description: 'Wien ist eine der Musikhauptstädte Europas. Ob klassische Konzerte in der Staatsoper, Jazz im Porgy & Bess oder Rock im Arena Wien – die Stadt bietet jeden Abend erstklassige Live-Musik für jeden Geschmack.',
  topVenues: [
    {
      name: 'Wiener Staatsoper',
      description: 'Die weltberühmte Oper im Herzen Wiens. Eines der führenden Opernhäuser mit täglich wechselndem Programm.',
      address: 'Opernring 2, 1010 Wien',
      capacity: 1709,
      priceRange: '€€€ (ab 15€ Stehplätze)',
      specialFeature: 'UNESCO Weltkulturerbe',
      insiderTip: 'Stehplätze sind günstig und bieten oft eine tolle Sicht. 80 Minuten vor Vorstellungsbeginn erhältlich.',
    },
    {
      name: 'Wiener Konzerthaus',
      description: 'Eines der renommiertesten Konzerthäuser weltweit mit exzellenter Akustik.',
      address: 'Lothringerstraße 20, 1030 Wien',
      capacity: 1865,
      priceRange: '€€-€€€',
      specialFeature: 'Vier Säle mit unterschiedlicher Kapazität',
      insiderTip: 'Für Jazz-Liebhaber: Der Neue Saal bietet oft experimentelle Konzerte.',
    },
    {
      name: 'Porgy & Bess',
      description: 'Der Jazz-Hotspot Wiens mit täglich wechselndem Programm.',
      address: 'Riemergasse 11, 1010 Wien',
      capacity: 300,
      priceRange: '€€ (10-30€)',
      specialFeature: 'Beste Jazz-Location Wiens',
      insiderTip: 'Früh kommen für die besten Sitzplätze. Reservierung empfohlen.',
    },
  ],
  insiderTips: [
    'Viele Locations bieten Last-Minute-Tickets zu reduzierten Preisen an',
    'Studenten und Senioren erhalten oft Ermäßigungen',
    'Im Sommer gibt es zahlreiche kostenlose Open-Air-Konzerte',
    'Die Karlsplatz-Passage hat regelmäßig kostenlose Straßenmusiker-Auftritte',
  ],
  tldrItems: [
    'Wien bietet täglich über 50 Live-Konzerte in allen Genres',
    'Von der Staatsoper bis zum Underground-Club ist alles dabei',
    'Tickets ab 10€, viele Locations bieten Stehplätze',
    'Beste Zeit: Herbst und Frühjahr für Indoor-Konzerte, Sommer für Open-Air',
  ],
};

// Default fallback content
export function getDefaultCategoryContent(city: string, category: string): CategoryContent {
  return {
    city,
    category,
    description: `Entdecke die besten ${category}-Events in ${city}. Unsere Plattform zeigt dir tägliche Updates zu allen aktuellen Veranstaltungen.`,
    topVenues: [],
    insiderTips: [
      'Tickets frühzeitig buchen für beliebte Events',
      'Viele Locations bieten Frühbucher-Rabatte',
      'Achte auf Last-Minute-Angebote',
    ],
    tldrItems: [
      `Täglich neue ${category}-Events in ${city}`,
      'Verschiedene Locations und Preis-Kategorien',
      'Von bekannten Acts bis zu lokalen Künstlern',
    ],
  };
}

// Main function to get category content
export function getCategoryContent(city: string, category: string): CategoryContent {
  const normalizedCity = city.toLowerCase().trim();
  const normalizedCategory = category.toLowerCase().trim()
    .replace(/\s+/g, '-')
    .replace(/ä/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .replace(/ß/g, 'ss');
  
  const key = `${normalizedCity}-${normalizedCategory}`;
  
  switch (key) {
    case 'wien-live-konzerte':
    case 'wien-konzerte':
    case 'wien-music':
      return wienLiveKonzerteContent;
    default:
      return getDefaultCategoryContent(city, category);
  }
}
