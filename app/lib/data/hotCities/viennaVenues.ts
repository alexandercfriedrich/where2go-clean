/**
 * Vienna Venues Data
 * Structured venue information for Vienna hot city
 */

export const VIENNA_VENUES = [
  {
    id: 'venue-konzerthaus-wien',
    name: 'Wiener Konzerthaus',
    categories: ['Live-Konzerte', 'Kultur/Traditionen'],
    description: 'Premier concert hall for classical and contemporary music',
    priority: 9,
    isActive: true,
    address: {
      full: 'Lothringerstraße 20, 1030 Wien, Österreich',
      street: 'Lothringerstraße',
      houseNumber: '20',
      postalCode: '1030',
      city: 'Wien',
      country: 'Österreich'
    },
    website: 'https://konzerthaus.at',
    eventsUrl: 'https://konzerthaus.at/programm',
    aiQueryTemplate: 'Events and concerts at Wiener Konzerthaus Vienna classical music performances'
  },
  {
    id: 'venue-staatsoper-wien',
    name: 'Wiener Staatsoper',
    categories: ['Live-Konzerte', 'Theater/Performance', 'Kultur/Traditionen'],
    description: 'World-famous Vienna State Opera',
    priority: 10,
    isActive: true,
    address: {
      full: 'Opernring 2, 1010 Wien, Österreich',
      street: 'Opernring',
      houseNumber: '2',
      postalCode: '1010',
      city: 'Wien',
      country: 'Österreich'
    },
    website: 'https://www.wiener-staatsoper.at',
    eventsUrl: 'https://www.wiener-staatsoper.at/spielplan',
    aiQueryTemplate: 'Opera performances and events at Vienna State Opera Wiener Staatsoper'
  },
  {
    id: 'venue-flex-wien',
    name: 'Flex Wien',
    categories: ['DJ Sets/Electronic', 'Clubs/Discos', 'Live-Konzerte'],
    description: 'Electronic music club and live venue',
    priority: 8,
    isActive: true,
    address: {
      full: 'Augartenbrücke, Am Donaukanal, 1010 Wien, Österreich',
      street: 'Augartenbrücke',
      houseNumber: '',
      postalCode: '1010',
      city: 'Wien',
      country: 'Österreich'
    },
    website: 'https://flex.at',
    eventsUrl: 'https://flex.at/programm',
    aiQueryTemplate: 'Electronic music events DJ sets concerts at Flex Wien club'
  },
  {
    id: 'venue-belvedere-museum',
    name: 'Belvedere Museum',
    categories: ['Museen', 'Kunst/Design'],
    description: 'Baroque palace complex housing Austrian art collections',
    priority: 8,
    isActive: true,
    address: {
      full: 'Prinz Eugen-Straße 27, 1030 Wien, Österreich',
      street: 'Prinz Eugen-Straße',
      houseNumber: '27',
      postalCode: '1030',
      city: 'Wien',
      country: 'Österreich'
    },
    website: 'https://www.belvedere.at',
    eventsUrl: 'https://www.belvedere.at/veranstaltungen',
    aiQueryTemplate: 'Art exhibitions and cultural events at Belvedere Museum Vienna'
  },
  {
    id: 'venue-burgtheater',
    name: 'Burgtheater',
    categories: ['Theater/Performance', 'Kultur/Traditionen'],
    description: 'Austrian National Theatre and one of the most important German-language theatres',
    priority: 9,
    isActive: true,
    address: {
      full: 'Universitätsring 2, 1010 Wien, Österreich',
      street: 'Universitätsring',
      houseNumber: '2',
      postalCode: '1010',
      city: 'Wien',
      country: 'Österreich'
    },
    website: 'https://burgtheater.at',
    eventsUrl: 'https://burgtheater.at/spielplan',
    aiQueryTemplate: 'Theater performances and plays at Burgtheater Vienna'
  },
  {
    id: 'venue-donauinsel',
    name: 'Donauinsel',
    categories: ['Open Air', 'Natur/Outdoor', 'Sport'],
    description: 'Recreational island on the Danube river, host to outdoor events and festivals',
    priority: 7,
    isActive: true,
    address: {
      full: 'Donauinsel, 1220 Wien, Österreich',
      street: 'Donauinsel',
      houseNumber: '',
      postalCode: '1220',
      city: 'Wien',
      country: 'Österreich'
    },
    website: 'https://www.wien.gv.at/umwelt/gewaesser/donauinsel/',
    eventsUrl: 'https://www.wien.gv.at/freizeit/donauinsel/veranstaltungen/',
    aiQueryTemplate: 'Outdoor events festivals sports activities at Donauinsel Vienna'
  },
  {
    id: 'venue-albertina-museum',
    name: 'Albertina Museum',
    categories: ['Museen', 'Kunst/Design'],
    description: 'Major art museum with extensive collections of prints, drawings and modern art',
    priority: 8,
    isActive: true,
    address: {
      full: 'Albertinaplatz 1, 1010 Wien, Österreich',
      street: 'Albertinaplatz',
      houseNumber: '1',
      postalCode: '1010',
      city: 'Wien',
      country: 'Österreich'
    },
    website: 'https://www.albertina.at',
    eventsUrl: 'https://www.albertina.at/en/exhibitions',
    aiQueryTemplate: 'Art exhibitions and events at Albertina Museum Vienna'
  },
  {
    id: 'venue-volkstheater',
    name: 'Volkstheater Wien',
    categories: ['Theater/Performance', 'Kultur/Traditionen'],
    description: 'Major theatre venue for contemporary and classical performances',
    priority: 8,
    isActive: true,
    address: {
      full: 'Arthur-Schnitzler-Platz 1, 1070 Wien, Österreich',
      street: 'Arthur-Schnitzler-Platz',
      houseNumber: '1',
      postalCode: '1070',
      city: 'Wien',
      country: 'Österreich'
    },
    website: 'https://www.volkstheater.at',
    eventsUrl: 'https://www.volkstheater.at/spielplan',
    aiQueryTemplate: 'Theater performances and plays at Volkstheater Vienna'
  },
  {
    id: 'venue-arena-wien',
    name: 'Arena Wien',
    categories: ['Live-Konzerte', 'Open Air', 'Kultur/Traditionen'],
    description: 'Historic venue for concerts, festivals and cultural events',
    priority: 7,
    isActive: true,
    address: {
      full: 'Baumgasse 80, 1030 Wien, Österreich',
      street: 'Baumgasse',
      houseNumber: '80',
      postalCode: '1030',
      city: 'Wien',
      country: 'Österreich'
    },
    website: 'https://www.arena.wien',
    eventsUrl: 'https://www.arena.wien/programm',
    aiQueryTemplate: 'Concerts festivals and cultural events at Arena Wien Vienna'
  },
  {
    id: 'venue-wiener-prater',
    name: 'Wiener Prater',
    categories: ['Natur/Outdoor', 'Familien/Kids', 'Sport'],
    description: 'Large public park and amusement park with events and attractions',
    priority: 7,
    isActive: true,
    address: {
      full: 'Prater, 1020 Wien, Österreich',
      street: 'Prater',
      houseNumber: '',
      postalCode: '1020',
      city: 'Wien',
      country: 'Österreich'
    },
    website: 'https://www.praterwien.com',
    eventsUrl: 'https://www.praterwien.com/home/events/',
    aiQueryTemplate: 'Family events outdoor activities at Wiener Prater Vienna amusement park'
  },
  {
    id: 'venue-grelle-forelle',
    name: 'Grelle Forelle',
    categories: ['DJ Sets/Electronic', 'Clubs/Discos'],
    description: 'Popular electronic music club and techno venue',
    priority: 7,
    isActive: true,
    address: {
      full: 'Spittelauer Lände 12, 1090 Wien, Österreich',
      street: 'Spittelauer Lände',
      houseNumber: '12',
      postalCode: '1090',
      city: 'Wien',
      country: 'Österreich'
    },
    website: 'https://www.grelleforelle.com',
    eventsUrl: 'https://www.grelleforelle.com/events',
    aiQueryTemplate: 'Electronic music DJ sets and techno events at Grelle Forelle Vienna club'
  },
  {
    id: 'venue-porgy-bess',
    name: 'Porgy & Bess',
    categories: ['Live-Konzerte', 'Kultur/Traditionen'],
    description: 'Renowned jazz club and concert venue',
    priority: 7,
    isActive: true,
    address: {
      full: 'Riemergasse 11, 1010 Wien, Österreich',
      street: 'Riemergasse',
      houseNumber: '11',
      postalCode: '1010',
      city: 'Wien',
      country: 'Österreich'
    },
    website: 'https://www.porgy.at',
    eventsUrl: 'https://www.porgy.at/programm.html',
    aiQueryTemplate: 'Jazz concerts and live music events at Porgy & Bess Vienna'
  },
  {
    id: 'venue-ronacher-theater',
    name: 'Ronacher Theater',
    categories: ['Theater/Performance', 'Live-Konzerte'],
    description: 'Musical theatre and entertainment venue',
    priority: 8,
    isActive: true,
    address: {
      full: 'Seilerstätte 9, 1010 Wien, Österreich',
      street: 'Seilerstätte',
      houseNumber: '9',
      postalCode: '1010',
      city: 'Wien',
      country: 'Österreich'
    },
    website: 'https://www.musicalvienna.at',
    eventsUrl: 'https://www.musicalvienna.at/ronacher',
    aiQueryTemplate: 'Musical performances and shows at Ronacher Theater Vienna'
  },
  {
    id: 'venue-mak-museum',
    name: 'MAK - Museum für angewandte Kunst',
    categories: ['Museen', 'Kunst/Design'],
    description: 'Museum of Applied Arts with contemporary art and design exhibitions',
    priority: 7,
    isActive: true,
    address: {
      full: 'Stubenring 5, 1010 Wien, Österreich',
      street: 'Stubenring',
      houseNumber: '5',
      postalCode: '1010',
      city: 'Wien',
      country: 'Österreich'
    },
    website: 'https://www.mak.at',
    eventsUrl: 'https://www.mak.at/en/program',
    aiQueryTemplate: 'Design exhibitions and contemporary art events at MAK Museum Vienna'
  },
  {
    id: 'venue-rathausplatz',
    name: 'Rathausplatz',
    categories: ['Open Air', 'Film', 'Kultur/Traditionen', 'Märkte/Shopping'],
    description: 'Historic city square hosting film festivals, markets and cultural events',
    priority: 8,
    isActive: true,
    address: {
      full: 'Rathausplatz, 1010 Wien, Österreich',
      street: 'Rathausplatz',
      houseNumber: '',
      postalCode: '1010',
      city: 'Wien',
      country: 'Österreich'
    },
    website: 'https://www.wien.gv.at',
    eventsUrl: 'https://www.filmfestival-rathausplatz.at',
    aiQueryTemplate: 'Open air film festival Christmas market and cultural events at Rathausplatz Vienna'
  },
  {
    id: 'venue-mumok',
    name: 'mumok - Museum Moderner Kunst',
    categories: ['Museen', 'Kunst/Design'],
    description: 'Museum of Modern Art featuring contemporary and modern art',
    priority: 7,
    isActive: true,
    address: {
      full: 'Museumsplatz 1, 1070 Wien, Österreich',
      street: 'Museumsplatz',
      houseNumber: '1',
      postalCode: '1070',
      city: 'Wien',
      country: 'Österreich'
    },
    website: 'https://www.mumok.at',
    eventsUrl: 'https://www.mumok.at/en/events',
    aiQueryTemplate: 'Modern art exhibitions and events at mumok Museum Vienna'
  },
  {
    id: 'venue-kunsthistorisches-museum',
    name: 'Kunsthistorisches Museum',
    categories: ['Museen', 'Kunst/Design', 'Kultur/Traditionen'],
    description: 'World-renowned art history museum with extensive collections',
    priority: 9,
    isActive: true,
    address: {
      full: 'Maria-Theresien-Platz, 1010 Wien, Österreich',
      street: 'Maria-Theresien-Platz',
      houseNumber: '',
      postalCode: '1010',
      city: 'Wien',
      country: 'Österreich'
    },
    website: 'https://www.khm.at',
    eventsUrl: 'https://www.khm.at/en/visit/exhibitions-presentations/',
    aiQueryTemplate: 'Art exhibitions and cultural events at Kunsthistorisches Museum Vienna'
  },
  {
    id: 'venue-pratersauna',
    name: 'Pratersauna',
    categories: ['DJ Sets/Electronic', 'Clubs/Discos', 'Live-Konzerte'],
    description: 'Club and cultural venue for electronic music and parties',
    priority: 7,
    isActive: true,
    address: {
      full: 'Waldsteingartenstraße 135, 1020 Wien, Österreich',
      street: 'Waldsteingartenstraße',
      houseNumber: '135',
      postalCode: '1020',
      city: 'Wien',
      country: 'Österreich'
    },
    website: 'https://www.pratersauna.tv',
    eventsUrl: 'https://www.pratersauna.tv/events',
    aiQueryTemplate: 'Electronic music club events and DJ sets at Pratersauna Vienna'
  },
  {
    id: 'venue-chelsea',
    name: 'Chelsea',
    categories: ['Live-Konzerte', 'Clubs/Discos', 'DJ Sets/Electronic'],
    description: 'Underground venue for alternative music and club nights',
    priority: 6,
    isActive: true,
    address: {
      full: 'Lerchenfelder Gürtel, Stadtbahnbogen 29-31, 1080 Wien, Österreich',
      street: 'Lerchenfelder Gürtel',
      houseNumber: '29-31',
      postalCode: '1080',
      city: 'Wien',
      country: 'Österreich'
    },
    website: 'https://www.chelsea.co.at',
    eventsUrl: 'https://www.chelsea.co.at/events',
    aiQueryTemplate: 'Alternative music concerts and club events at Chelsea Vienna'
  },
  {
    id: 'venue-stadthalle',
    name: 'Wiener Stadthalle',
    categories: ['Live-Konzerte', 'Sport', 'Theater/Performance'],
    description: 'Major indoor arena for concerts, sports and large-scale events',
    priority: 8,
    isActive: true,
    address: {
      full: 'Roland-Rainer-Platz 1, 1150 Wien, Österreich',
      street: 'Roland-Rainer-Platz',
      houseNumber: '1',
      postalCode: '1150',
      city: 'Wien',
      country: 'Österreich'
    },
    website: 'https://www.stadthalle.com',
    eventsUrl: 'https://www.stadthalle.com/de/events',
    aiQueryTemplate: 'Concerts sports events and shows at Wiener Stadthalle Vienna arena'
  }
];