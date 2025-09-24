@@
-import { generateWebsiteId } from './utils';
+import { generateWebsiteId } from './utils';
+import { VIENNA_VENUES } from './data/hotCities/viennaVenues';
@@
   {
     city: 'Wien',
     country: 'AT',
     websites: [
       {
         id: generateWebsiteId(),
         name: 'Wien.gv.at Kultur',
         url: 'https://www.wien.gv.at/kultur/abteilung/veranstaltungen/',
         categories: [],
         description: 'Official Vienna city events',
         priority: 10,
         isActive: true
       },
       {
         id: generateWebsiteId(),
         name: 'Wien.gv.at VADB RSS',
         url: 'https://www.wien.gv.at/vadb/internet/AdvPrSrv.asp',
         categories: [],
         description: 'Wien VADB RSS feed for structured event data',
         priority: 10,
         isActive: true
       },
       {
         id: generateWebsiteId(),
         name: 'Wiener Staatsoper',
         url: 'https://www.wiener-staatsoper.at',
         categories: ['Live-Konzerte', 'Theater/Performance', 'Kultur/Traditionen'],
         description: 'Vienna State Opera performances',
         priority: 9,
         isActive: true
       },
       {
         id: generateWebsiteId(),
         name: 'Wiener Konzerthaus',
         url: 'https://konzerthaus.at',
         categories: ['Live-Konzerte', 'Kultur/Traditionen'],
         description: 'Vienna Concert House events',
         priority: 9,
         isActive: true
       },
       {
         id: generateWebsiteId(),
         name: 'Flex Wien',
         url: 'https://flex.at',
         categories: ['DJ Sets/Electronic', 'Clubs/Discos', 'Live-Konzerte'],
         description: 'Electronic music and club events',
         priority: 8,
         isActive: true
       },
       {
         id: generateWebsiteId(),
         name: 'Belvedere Museum',
         url: 'https://www.belvedere.at',
         categories: ['Museen', 'Kunst/Design'],
         description: 'Art exhibitions and cultural events',
         priority: 8,
         isActive: true
       },
       {
         id: generateWebsiteId(),
         name: 'Vienna Tourist Board',
         url: 'https://www.vienna.info',
         categories: [],
         description: 'Tourist events and attractions',
         priority: 7,
         isActive: true
       }
     ],
+    // NEU: venues
+    venues: VIENNA_VENUES.map(v => ({
+      id: v.id,
+      name: v.name,
+      categories: v.categories,
+      description: v.description,
+      priority: v.priority,
+      isActive: v.isActive,
+      isVenue: true,
+      address: v.address,
+      website: v.website,
+      eventsUrl: v.eventsUrl,
+      aiQueryTemplate: v.aiQueryTemplate
+    })),
     createdAt: new Date(),
     updatedAt: new Date()
   },