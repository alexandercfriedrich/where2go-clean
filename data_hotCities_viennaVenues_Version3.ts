import crypto from 'crypto';

export interface ViennaVenue {
  id: string;
  name: string;
  categories: string[];
  description?: string;
  priority: number;
  isActive: boolean;
  isVenue: true;
  isVenuePrioritized?: boolean;
  address: {
    full: string;
    street: string;
    houseNumber: string;
    postalCode: string;
    city: string;
    country: string;
  };
  website?: string;
  eventsUrl?: string;
  aiQueryTemplate?: string;
}

function makeId(name: string, street: string) {
  return 'venue-' + crypto.createHash('md5')
    .update(`${name}|${street}`)
    .digest('hex')
    .slice(0, 10);
}

// Hinweis: Nur 3 Beispiele hier. Auf Wunsch komplette 100 Venues als Erweiterung hinzufügen.
export const VIENNA_VENUES: ViennaVenue[] = [
  {
    id: makeId('Grelle Forelle', 'Spittelauer Lände'),
    name: 'Grelle Forelle',
    categories: ['Clubs/Discos', 'DJ Sets/Electronic'],
    description: 'Popular techno club at Danube Canal',
    priority: 9,
    isActive: true,
    isVenue: true,
    address: {
      full: 'Grelle Forelle, Spittelauer Lände 12, 1090 Wien, Austria',
      street: 'Spittelauer Lände',
      houseNumber: '12',
      postalCode: '1090',
      city: 'Wien',
      country: 'Austria'
    },
    website: 'https://www.grelleforelle.com',
    eventsUrl: 'https://www.grelleforelle.com/events',
    aiQueryTemplate: 'Suche alle Events im <venue>Grelle Forelle</venue> zwischen {start_date} und {end_date}.'
  },
  {
    id: makeId('Wiener Staatsoper', 'Opernring'),
    name: 'Wiener Staatsoper',
    categories: ['Live-Konzerte', 'Theater/Performance', 'Kultur/Traditionen'],
    description: 'Vienna State Opera performances',
    priority: 9,
    isActive: true,
    isVenue: true,
    address: {
      full: 'Wiener Staatsoper, Opernring 2, 1010 Wien, Austria',
      street: 'Opernring',
      houseNumber: '2',
      postalCode: '1010',
      city: 'Wien',
      country: 'Austria'
    },
    website: 'https://www.wiener-staatsoper.at',
    eventsUrl: 'https://www.wiener-staatsoper.at/spielplan',
    aiQueryTemplate: '<venue>Wiener Staatsoper</venue> Spielplan {start_date} bis {end_date}.'
  },
  {
    id: makeId('Belvedere', 'Prinz Eugen-Straße'),
    name: 'Belvedere',
    categories: ['Museen', 'Kunst/Design'],
    description: 'Austrian art including Klimt collection',
    priority: 8,
    isActive: true,
    isVenue: true,
    address: {
      full: 'Belvedere, Prinz Eugen-Straße 27, 1030 Wien, Austria',
      street: 'Prinz Eugen-Straße',
      houseNumber: '27',
      postalCode: '1030',
      city: 'Wien',
      country: 'Austria'
    },
    website: 'https://www.belvedere.at',
    eventsUrl: 'https://www.belvedere.at/events',
    aiQueryTemplate: '<venue>Belvedere</venue> Wien Events {start_date} bis {end_date}.'
  }
];