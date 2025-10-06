// Translation keys and their values
export interface Translations {
  // Page metadata
  'meta.title': string;
  'meta.description': string;
  
  // Main page
  'page.tagline': string;
  'page.adventureReady': string;
  'page.noEventsFound': string;
  
  // Form labels
  'form.city': string;
  'form.cityPlaceholder': string;
  'form.timePeriod': string;
  'form.date': string;
  'form.categories': string;
  
  // Time periods
  'time.today': string;
  'time.tomorrow': string;
  'time.upcomingWeekend': string;
  'time.custom': string;
  
  // Buttons
  'button.searchEvents': string;
  'button.selectMax': string;
  'button.deselectAll': string;
  'button.moreInfo': string;
  'button.tickets': string;
  
  // Event display
  'event.today': string;
  'event.tomorrow': string;
  'event.pricesVary': string;
  'event.venueMapTitle': string;
  
  // Loading and errors
  'loading.query': string;
  'loading.maxSeconds': string;
  'error.enterCity': string;
  'error.categoryLimit': string;
  
  // Filters
  'filter.all': string;
  'filter.filtersAndCategories': string;
  'filter.todaysEventsIn': string;
  
  // Static pages
  'footer.impressum': string;
  'footer.contact': string;
  'footer.about': string;
  'footer.premium': string;
}

// German translations (default)
const de: Translations = {
  'meta.title': 'Where2Go - Entdecke Events in deiner Stadt!',
  'meta.description': 'Entdecke Events in deiner Stadt - Alle Events. Weltweit. Eine Plattform.',
  
  'page.tagline': 'Entdecke die besten Events in deiner Stadt!',
  'page.adventureReady': 'Bereit für dein nächstes Abenteuer?',
  'page.noEventsFound': 'Keine Events gefunden',
  
  'form.city': 'Stadt',
  'form.cityPlaceholder': 'z.B. Linz, Berlin, Hamburg ...',
  'form.timePeriod': 'Zeitraum',
  'form.date': 'Datum',
  'form.categories': 'Kategorien',
  
  'time.today': 'Heute',
  'time.tomorrow': 'Morgen',
  'time.upcomingWeekend': 'Kommendes Wochenende',
  'time.custom': 'Benutzerdefiniert',
  
  'button.searchEvents': 'Events suchen',
  'button.selectMax': 'Max. 3 auswählen',
  'button.deselectAll': 'Alle abwählen',
  'button.moreInfo': 'Mehr Info',
  'button.tickets': 'Tickets',
  
  'event.today': 'heute',
  'event.tomorrow': 'morgen',
  'event.pricesVary': 'Preise variieren',
  'event.venueMapTitle': 'Venue in Google Maps öffnen',
  
  'loading.query': 'Abfrage',
  'loading.maxSeconds': 'max 60 Sekunden',
  'error.enterCity': 'Bitte gib eine Stadt ein.',
  'error.categoryLimit': 'Du kannst maximal 3 Kategorien auswählen.',
  
  'filter.all': 'Alle',
  'filter.filtersAndCategories': 'Filter & Kategorien',
  'filter.todaysEventsIn': 'Heutige Events in',
  
  'footer.impressum': 'Impressum',
  'footer.contact': 'Kontakt',
  'footer.about': 'Über uns',
  'footer.premium': 'Premium',
};

// English translations
const en: Translations = {
  'meta.title': 'Where2Go - Discover Events in Your City!',
  'meta.description': 'Discover events in your city - All Events. Worldwide. One Platform.',
  
  'page.tagline': 'Discover the best events in your city!',
  'page.adventureReady': 'Ready for your next adventure?',
  'page.noEventsFound': 'No events found',
  
  'form.city': 'City',
  'form.cityPlaceholder': 'e.g. Vienna, Berlin, Hamburg ...',
  'form.timePeriod': 'Time Period',
  'form.date': 'Date',
  'form.categories': 'Categories',
  
  'time.today': 'Today',
  'time.tomorrow': 'Tomorrow',
  'time.upcomingWeekend': 'Upcoming Weekend',
  'time.custom': 'Custom',
  
  'button.searchEvents': 'Search Events',
  'button.selectMax': 'Select max. 3',
  'button.deselectAll': 'Deselect all',
  'button.moreInfo': 'More info',
  'button.tickets': 'Tickets',
  
  'event.today': 'today',
  'event.tomorrow': 'tomorrow',
  'event.pricesVary': 'prices vary',
  'event.venueMapTitle': 'Open venue in Google Maps',
  
  'loading.query': 'Query',
  'loading.maxSeconds': 'max 60 seconds',
  'error.enterCity': 'Please enter a city.',
  'error.categoryLimit': 'You can select a maximum of 3 categories.',
  
  'filter.all': 'All',
  'filter.filtersAndCategories': 'Filters & Categories',
  'filter.todaysEventsIn': "Today's events in",
  
  'footer.impressum': 'Legal Notice',
  'footer.contact': 'Contact',
  'footer.about': 'About',
  'footer.premium': 'Premium',
};

// Available translations
const translations = {
  de,
  en,
};

// Supported languages
export type SupportedLanguage = keyof typeof translations;

// Get translations for a language
export function getTranslations(language: SupportedLanguage): Translations {
  return translations[language] || translations.de;
}

// Get translation key
export function getTranslation(language: SupportedLanguage, key: keyof Translations): string {
  const t = getTranslations(language);
  return t[key] || key;
}