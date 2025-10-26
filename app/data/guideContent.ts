import { FAQ } from './cityContent';

interface GuideSection {
  title: string;
  content: string;
}

interface GuideVenue {
  name: string;
  description: string;
  address?: string;
  priceRange?: string;
  bestFor?: string;
  insiderTip?: string;
}

export interface GuideContent {
  slug: string;
  title: string;
  description: string;
  city: string;
  category: string;
  heroText: string;
  tldrItems: string[];
  sections: GuideSection[];
  venues: GuideVenue[];
  faqs: FAQ[];
  ctaText: string;
  ctaLink: string;
}

// Wien - Live Konzerte Guide
const liveKonzerteWienGuide: GuideContent = {
  slug: 'live-konzerte-wien',
  title: 'Live-Konzerte in Wien: Der ultimative Guide 2024',
  description: 'Entdecke die besten Live-Konzerte, Locations und Events in Wien. Von klassischen Konzerten bis zu elektronischer Musik – dein kompletter Guide für unvergessliche Musik-Erlebnisse.',
  city: 'Wien',
  category: 'Live Konzerte',
  heroText: 'Wien ist die Musikhauptstadt Europas. Mit über 100 Live-Events pro Woche, von der Staatsoper bis zum Underground-Club, bietet die Stadt für jeden Musikgeschmack das Richtige.',
  tldrItems: [
    'Täglich 50+ Live-Konzerte in allen Genres',
    'Tickets ab 10€, Stehplätze oft günstiger',
    'Weltklasse-Locations von Staatsoper bis Club',
    'Beste Zeit: September-Juni für Indoor-Events',
    'Viele kostenlose Open-Air-Konzerte im Sommer',
  ],
  sections: [
    {
      title: 'Warum ist Wien perfekt für Live-Musik?',
      content: 'Wien hat eine über 300-jährige Musiktradition. Von Mozart über Beethoven bis zu modernen Acts – die Stadt atmet Musik. Mit einer einzigartigen Dichte an Konzerthallen, Clubs und Venues ist Wien die perfekte Stadt für Musikliebhaber. Die Akustik in den historischen Sälen ist weltberühmt, und die Club-Szene ist lebendig und innovativ.',
    },
    {
      title: 'Welche Genres kannst du in Wien erleben?',
      content: 'Klassik in der Staatsoper, Jazz im Porgy & Bess, Rock und Indie im Arena Wien, elektronische Musik im Flex oder Grelle Forelle. Von Singer-Songwriter-Abenden in gemütlichen Bars bis zu großen Festival-Acts – Wien deckt alle Genres ab. Besonders stark sind Klassik, Jazz und elektronische Musik vertreten.',
    },
    {
      title: 'Wie findest du die besten Events?',
      content: 'Nutze unsere täglichen Updates, um immer die neuesten Events zu entdecken. Filtere nach Genre, Preis und Location. Viele Venues haben feste Wochentage für bestimmte Musik-Richtungen. Folge deinen Lieblings-Locations auf Social Media für Last-Minute-Tipps.',
    },
  ],
  venues: [
    {
      name: 'Wiener Staatsoper',
      description: 'Das Flaggschiff der klassischen Musik. Täglich wechselndes Opern- und Ballett-Programm.',
      address: 'Opernring 2, 1010 Wien',
      priceRange: '€€€ (Stehplätze ab 15€)',
      bestFor: 'Klassische Musik und Oper',
      insiderTip: 'Stehplätze 80 Minuten vor Vorstellung kaufen – beste Qualität zu kleinem Preis',
    },
    {
      name: 'Wiener Konzerthaus',
      description: 'Vier Säle mit perfekter Akustik für alle Genres von Klassik bis Jazz.',
      address: 'Lothringerstraße 20, 1030 Wien',
      priceRange: '€€-€€€',
      bestFor: 'Klassik, Jazz, Weltmusik',
      insiderTip: 'Der Berio-Saal ist perfekt für experimentelle Jazz-Konzerte',
    },
    {
      name: 'Porgy & Bess',
      description: 'Wiens erste Adresse für Jazz und improvisierte Musik.',
      address: 'Riemergasse 11, 1010 Wien',
      priceRange: '€€ (10-30€)',
      bestFor: 'Jazz, Weltmusik, Fusion',
      insiderTip: 'Tischreservierung empfohlen, früh kommen für freie Platzwahl',
    },
    {
      name: 'Arena Wien',
      description: 'Große Open-Air- und Indoor-Location für Rock, Pop und elektronische Musik.',
      address: 'Baumgasse 80, 1030 Wien',
      priceRange: '€€-€€€',
      bestFor: 'Rock, Pop, elektronische Musik',
      insiderTip: 'Im Sommer Open-Air, im Winter Indoor – immer tolle Atmosphäre',
    },
  ],
  faqs: [
    {
      question: 'Wie teuer sind Konzerte in Wien?',
      answer: 'Die Preise variieren stark. Stehplätze in der Staatsoper gibt es ab 15€, Club-Konzerte meist zwischen 10-30€. Große Acts kosten 40-100€. Es gibt auch viele kostenlose Events, besonders im Sommer.',
    },
    {
      question: 'Brauche ich Tickets im Voraus?',
      answer: 'Für beliebte Acts und Staatsoper: unbedingt! Für kleine Club-Konzerte oft auch an der Abendkasse möglich. Last-Minute-Tickets manchmal online günstiger.',
    },
    {
      question: 'Gibt es Altersbeschränkungen?',
      answer: 'Klassische Konzerte: keine Beschränkung. Clubs meist ab 16 oder 18 Jahren. Check die Venue-Website vor dem Kauf.',
    },
    {
      question: 'Wo finde ich kostenlose Konzerte?',
      answer: 'Im Sommer viele Open-Air-Events am Rathausplatz, Donauinselfest (Juni), und Straßenmusiker-Festivals. Auch in Parks und öffentlichen Plätzen gibt es oft kostenlose Auftritte.',
    },
  ],
  ctaText: 'Entdecke jetzt die aktuellen Live-Konzerte in Wien',
  ctaLink: '/wien/live-konzerte',
};

// Guide database
export const guideDatabase: Record<string, GuideContent> = {
  'live-konzerte-wien': liveKonzerteWienGuide,
};

// Helper function to get guide content
export function getGuideContent(slug: string): GuideContent | null {
  return guideDatabase[slug] || null;
}

// Helper to list all available guides
export function getAllGuideSlugs(): string[] {
  return Object.keys(guideDatabase);
}
