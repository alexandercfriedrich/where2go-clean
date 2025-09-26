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
  }
];