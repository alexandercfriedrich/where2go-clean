// Auto-generates SEO-optimized content for city pages
// 100% optimized for Google and AI crawlers

export interface CitySEOContent {
  title: string;
  description: string;
  whyVisit: string;
  popularCategories: string[];
  faq: Array<{
    question: string;
    answer: string;
  }>;
}

export function generateCitySEO(cityName: string, date?: string, category?: string): CitySEOContent {
  const city = cityName.charAt(0).toUpperCase() + cityName.slice(1);
  const dateText = date ? formatDateText(date) : '';
  
  return {
    title: category 
      ? `${category} Events in ${city}${dateText}`
      : `Events und Veranstaltungen in ${city}${dateText}`,
    
    description: generateDescription(city, date, category),
    whyVisit: generateWhyVisit(city),
    popularCategories: [
      'Live-Konzerte & Musik',
      'Clubs & Discos',
      'Theater & Shows',
      'Kunst & Ausstellungen',
      'Sport & Fitness',
      'Kulinarik & Genuss'
    ],
    faq: generateFAQ(city, date, category)
  };
}

function formatDateText(date: string): string {
  if (date === 'heute') return ' heute';
  if (date === 'morgen') return ' morgen';
  if (date === 'wochenende') return ' am Wochenende';
  return '';
}

function generateDescription(city: string, date?: string, category?: string): string {
  const baseTexts = {
    Wien: `Wien, die Hauptstadt Österreichs, ist ein kulturelles Zentrum mit einer reichen Geschichte und einem vielfältigen Veranstaltungsangebot. Von klassischen Konzerten in historischen Sälen bis zu modernen Club-Events in angesagten Locations – die Stadt bietet für jeden Geschmack das passende Event.`,
    
    Linz: `Linz, die Kulturhauptstadt an der Donau, verbindet Tradition mit Innovation. Die Stadt ist bekannt für ihre lebendige Kunst- und Musikszene, von elektronischer Musik beim Ars Electronica Festival bis zu klassischen Aufführungen im Brucknerhaus. Entdecken Sie die vielfältigen Events in Linz.`,
    
    Graz: `Graz, die steirische Landeshauptstadt, begeistert mit südlichem Flair und einem pulsierenden Kulturleben. Die UNESCO-Altstadt bietet eine beeindruckende Kulisse für zahlreiche Events, Konzerte und Festivals. Von Jazz über Theater bis zu modernen DJ-Sets – Graz hat für jeden etwas zu bieten.`,
    
    Salzburg: `Salzburg, die Mozartstadt, ist weltbekannt für ihre erstklassigen kulturellen Veranstaltungen. Die Stadt verbindet barocke Pracht mit zeitgenössischer Kultur. Neben den weltberühmten Festspielen bietet Salzburg das ganze Jahr über hochkarätige Events in allen Bereichen.`,
    
    Innsbruck: `Innsbruck, die Hauptstadt der Alpen, bietet eine einzigartige Mischung aus urbanem Flair und alpinem Charme. Die Stadt ist bekannt für ihre vielseitige Kulturszene, von traditionellen Veranstaltungen bis zu modernen Konzerten und Club-Events inmitten einer atemberaubenden Bergkulisse.`
  };
  
  const baseText = baseTexts[city as keyof typeof baseTexts] || 
    `${city} bietet eine vielfältige und lebendige Event-Szene. Von kulturellen Highlights über sportliche Veranstaltungen bis zu kulinarischen Erlebnissen – entdecken Sie die besten Events in ${city} und erleben Sie unvergessliche Momente.`;
  
  let additionalInfo = '';
  
  if (category) {
    additionalInfo = ` Besonders die ${category}-Szene ist hier sehr lebendig und bietet regelmäßig hochwertige Veranstaltungen für Enthusiasten und Neueinsteiger.`;
  }
  
  if (date) {
    const dateInfo = date === 'heute' ? ' Entdecken Sie, was heute in der Stadt los ist.' :
                     date === 'morgen' ? ' Planen Sie Ihren morgigen Abend mit unseren aktuellen Event-Tipps.' :
                     date === 'wochenende' ? ' Das Wochenende steht vor der Tür – finden Sie die besten Events für Ihre Freizeitgestaltung.' :
                     '';
    additionalInfo += dateInfo;
  }
  
  return baseText + additionalInfo;
}

function generateWhyVisit(city: string): string {
  const reasons = {
    Wien: 'Wien bietet eine unvergleichliche Mischung aus historischem Charme und modernem Lifestyle. Die Stadt ist bekannt für ihre Kaffeehauskultur, erstklassige Museen, prachtvolle Architektur und ein ganzjährig reichhaltiges Kulturprogramm. Ob Opernball, Donauinselfest oder Underground-Club – Wien hat für jeden Geschmack etwas zu bieten.',
    
    Linz: 'Linz hat sich zu einem Hotspot für Innovation und Kreativität entwickelt. Die Stadt verbindet industrielles Erbe mit zukunftsweisender Technologie und Kunst. Das Ars Electronica Center, die lebendige Musikszene und zahlreiche Festivals machen Linz zu einem Muss für kulturinteressierte Besucher.',
    
    Graz: 'Graz besticht durch seine mediterrane Atmosphäre und die perfekte Balance zwischen Tradition und Moderne. Die zweitgrößte Stadt Österreichs punktet mit einer UNESCO-Welterbe-Altstadt, innovativer Architektur und einer florierenden Gastronomieszene. Die entspannte Lebensart und das vielfältige Kulturangebot ziehen Besucher aus aller Welt an.',
    
    Salzburg: 'Salzburg ist nicht nur Mozarts Geburtsstadt, sondern auch ein kulturelles Juwel mit weltweiter Strahlkraft. Die barocke Altstadt, die majestätische Festung und die spektakuläre Lage am Fuße der Alpen schaffen eine einzigartige Atmosphäre. Die berühmten Salzburger Festspiele sind nur einer von vielen Gründen, diese Stadt zu besuchen.',
    
    Innsbruck: 'Innsbruck vereint als einzige Stadt alpines Outdoor-Erlebnis mit urbanem Kulturleben. Innerhalb von Minuten wechseln Sie von der historischen Altstadt auf über 2.000 Meter Seehöhe. Diese einzigartige Kombination macht Innsbruck zu einem ganzjährigen Reiseziel für Kultur-, Sport- und Naturliebhaber.'
  };
  
  return reasons[city as keyof typeof reasons] || 
    `${city} ist eine lebendige Stadt mit einem reichen kulturellen Angebot und einer einladenden Atmosphäre. Besucher schätzen die Vielfalt der Veranstaltungen, die authentische Kultur und die herzliche Gastfreundschaft.`;
}

function generateFAQ(city: string, date?: string, category?: string): Array<{ question: string; answer: string }> {
  const baseFAQs = [
    {
      question: `Welche Events finden heute in ${city} statt?`,
      answer: `In ${city} finden täglich zahlreiche Events statt. Von Live-Konzerten über Theater-Aufführungen bis zu Club-Events und kulturellen Veranstaltungen – auf Where2Go finden Sie eine vollständige Übersicht aller aktuellen Events in ${city}.`
    },
    {
      question: `Wie finde ich kostenlose Events in ${city}?`,
      answer: `Viele Veranstalter in ${city} bieten regelmäßig kostenlose Events an. Nutzen Sie unsere Filterfunktion, um gezielt nach kostenlosen Veranstaltungen zu suchen. Besonders Parks, öffentliche Plätze und einige Kultureinrichtungen bieten freien Eintritt zu ausgewählten Events.`
    },
    {
      question: `Kann ich Tickets für Events in ${city} über Where2Go buchen?`,
      answer: `Where2Go ist eine Event-Discovery-Plattform, die Ihnen eine Übersicht aller Veranstaltungen in ${city} bietet. Für die Ticketbuchung werden Sie direkt zu den offiziellen Veranstalter-Websites oder Ticketing-Partnern weitergeleitet.`
    },
    {
      question: `Gibt es Last-Minute-Events in ${city}?`,
      answer: `Ja! Unsere Plattform wird kontinuierlich aktualisiert und zeigt auch kurzfristig angekündigte Events. Schauen Sie regelmäßig vorbei oder aktivieren Sie Benachrichtigungen, um über Last-Minute-Veranstaltungen in ${city} informiert zu bleiben.`
    },
    {
      question: `Welche sind die beliebtesten Event-Locations in ${city}?`,
      answer: `${city} verfügt über eine Vielzahl erstklassiger Event-Locations. Von historischen Veranstaltungssälen über moderne Konzerthallen bis zu angesagten Clubs – die Stadt bietet für jeden Anlass die passende Location. Eine detaillierte Übersicht finden Sie auf unserer Platform.`
    }
  ];
  
  if (category) {
    baseFAQs.push({
      question: `Was macht ${category}-Events in ${city} besonders?`,
      answer: `Die ${category}-Szene in ${city} zeichnet sich durch hohe Qualität und Vielfalt aus. Regelmäßige Veranstaltungen, professionelle Künstler und eine engagierte Community sorgen für ein lebendiges Angebot. ${city} ist bekannt dafür, sowohl etablierte Stars als auch aufstrebende Talente zu präsentieren.`
    });
  }
  
  return baseFAQs;
}
