'use client';
import { useState, useRef, useEffect } from 'react';
import { CATEGORY_MAP } from './categories';

interface EventData {
  title: string;
  category: string;
  date: string;
  time: string;
  venue: string;
  price: string;
  website: string;
  endTime?: string;
  address?: string;
  ticketPrice?: string;
  eventType?: string;
  description?: string;
  bookingLink?: string;
  ageRestrictions?: string;
}

const ALL_SUPER_CATEGORIES = Object.keys(CATEGORY_MAP);
const MAX_CATEGORY_SELECTION: number = 3;
const MAX_POLLS = 104;

export default function Home() {
  const [city, setCity] = useState('');
  const [timePeriod, setTimePeriod] = useState('heute');
  const [customDate, setCustomDate] = useState('');
  const [selectedSuperCategories, setSelectedSuperCategories] = useState<string[]>(ALL_SUPER_CATEGORIES.slice(0, MAX_CATEGORY_SELECTION));
  const [categoryLimitError, setCategoryLimitError] = useState<string | null>(null);
  const [events, setEvents] = useState<EventData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<'idle' | 'pending' | 'done' | 'error'>('idle');
  const [pollCount, setPollCount] = useState(0);
  const [progress, setProgress] = useState<{completedCategories: number, totalCategories: number} | null>(null);
  const [newEvents, setNewEvents] = useState<Set<string>>(new Set());
  const [debugMode, setDebugMode] = useState(false);
  const [debugData, setDebugData] = useState<any>(null);
  const [toast, setToast] = useState<{show: boolean, message: string}>({show: false, message: ''});
  
  // Design 1 specific state
  const [isDesign1, setIsDesign1] = useState(false);
  const [searchSubmitted, setSearchSubmitted] = useState(false);
  const [searchedSuperCategories, setSearchedSuperCategories] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState<string>('Alle');
  
  const pollInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const eventsRef = useRef<EventData[]>([]);
  const pollCountRef = useRef<number>(0);

  // Reactive design switching based on URL params
  useEffect(() => {
    const updateFromURL = () => {
      const params = new URLSearchParams(window.location.search);
      const design = params.get('design');
      const id = 'w2g-design-css';
      const existing = document.getElementById(id) as HTMLLinkElement | null;

      const isValid = design === '1' || design === '2' || design === '3';
      setIsDesign1(!design || design === '1'); // true wenn KEIN parameter ODER "1"
      
      if (isValid) {
        const href = `/designs/design${design}.css`;
        if (existing) {
          if (existing.getAttribute('href') !== href) existing.setAttribute('href', href);
        } else {
          const link = document.createElement('link');
          link.id = id;
          link.rel = 'stylesheet';
          link.href = href;
          document.head.appendChild(link);
        }
      } else {
        if (existing) existing.remove();
        setIsDesign1(false);
      }
    };

    // Initial update
    updateFromURL();

    // Listen for URL changes (for client-side navigation)
    const handlePopState = () => {
      updateFromURL();
    };

    window.addEventListener('popstate', handlePopState);
    
    // Also listen for hash/search changes
    const handleHashChange = () => {
      updateFromURL();
    };
    
    window.addEventListener('hashchange', handleHashChange);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  // Reactive debug mode based on URL params
  useEffect(() => {
    const updateDebugMode = () => {
      const params = new URLSearchParams(window.location.search);
      setDebugMode(params.get('debug') === '1');
    };

    // Initial update
    updateDebugMode();

    // Listen for URL changes
    const handlePopState = () => {
      updateDebugMode();
    };

    const handleHashChange = () => {
      updateDebugMode();
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handleHashChange);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  useEffect(() => {
    eventsRef.current = events;
  }, [events]);

  useEffect(() => {
    return () => {
      if (pollInterval.current) {
        clearInterval(pollInterval.current);
        clearTimeout(pollInterval.current);
        pollInterval.current = null;
      }
    };
  }, []);

  const createEventKey = (event: EventData): string => {
    return `${event.title}_${event.date}_${event.venue}`;
  };

  // Helper function to format date and time for Design 1
  const formatEventDateTime = (date: string, time?: string) => {
    if (!isDesign1) {
      return { 
        date: time ? `${date} • ${time}` : date,
        time: null 
      };
    }

    // Parse the date
    const dateObj = new Date(date);
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'short', 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    };
    
    // Format like "Fr 31st Dec. 2025"
    const formattedDate = dateObj.toLocaleDateString('en-GB', options)
      .replace(/(\d+)/, (match) => {
        const day = parseInt(match);
        const suffix = day === 1 || day === 21 || day === 31 ? 'st' :
                      day === 2 || day === 22 ? 'nd' :
                      day === 3 || day === 23 ? 'rd' : 'th';
        return `${day}${suffix}`;
      })
      .replace(',', '.');

    // Format time if available
    let formattedTime = null;
    if (time) {
      // Convert 24h to 12h format if needed
      const timeMatch = time.match(/(\d{1,2}):(\d{2})/);
      if (timeMatch) {
        const hours = parseInt(timeMatch[1]);
        const minutes = timeMatch[2];
        const ampm = hours >= 12 ? 'pm' : 'am';
        const displayHours = hours % 12 || 12;
        formattedTime = `${displayHours}:${minutes} ${ampm}`;
      } else {
        formattedTime = time;
      }
    }

    return { date: formattedDate, time: formattedTime };
  };

  // Helper function to format price for Design 1
  const formatEventPrice = (event: EventData) => {
    if (!isDesign1) return null;
    
    const price = event.ticketPrice || event.price;
    if (!price) return null;
    
    // Extract price and add currency if needed
    const priceText = price.toString();
    if (priceText.includes('€') || priceText.includes('EUR')) {
      return priceText;
    }
    
    // Assume Euro if no currency specified
    return `${priceText} €`;
  };

  // For testing Design 1 - inject sample events when on ?design=1&test=1
  const getSampleEvents = (): EventData[] => {
    if (!isDesign1) return [];
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('test') !== '1') return [];
    
    return [
      {
        title: "Electronic Music Night",
        category: "DJ Sets/Electronic",
        date: "2025-01-03",
        time: "23:30",
        venue: "Hï Ibiza",
        price: "35 €",
        website: "https://example.com",
        bookingLink: "https://tickets.example.com",
        description: "Eine unvergessliche Nacht mit den besten DJs der Welt."
      },
      {
        title: "Jazz Live Concert",
        category: "Live-Konzerte", 
        date: "2025-01-04",
        time: "20:00",
        venue: "Blue Note",
        price: "45",
        website: "https://example.com",
        address: "131 W 3rd St, New York, NY 10012",
        description: "Authentischer Jazz in gemütlicher Atmosphäre."
      }
    ];
  };

  const formatDateForAPI = (): string => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    if (timePeriod === 'heute') return today.toISOString().split('T')[0];
    else if (timePeriod === 'morgen') return tomorrow.toISOString().split('T')[0];
    else if (timePeriod === 'kommendes-wochenende') {
      // Find the next Friday (start of weekend)
      const nextFriday = new Date(today);
      const daysUntilFriday = (5 - today.getDay() + 7) % 7; // 5 = Friday
      if (daysUntilFriday === 0 && today.getDay() === 5) {
        // If today is Friday, use today
        return today.toISOString().split('T')[0];
      } else {
        nextFriday.setDate(today.getDate() + (daysUntilFriday === 0 ? 7 : daysUntilFriday));
        return nextFriday.toISOString().split('T')[0];
      }
    }
    else return customDate || today.toISOString().split('T')[0];
  };

  // Helper function to get weekend dates (Friday, Saturday, Sunday)
  const getWeekendDates = (): string[] => {
    const today = new Date();
    const nextFriday = new Date(today);
    const daysUntilFriday = (5 - today.getDay() + 7) % 7; // 5 = Friday
    
    if (daysUntilFriday === 0 && today.getDay() === 5) {
      // If today is Friday, start from today
      nextFriday.setDate(today.getDate());
    } else {
      nextFriday.setDate(today.getDate() + (daysUntilFriday === 0 ? 7 : daysUntilFriday));
    }
    
    const saturday = new Date(nextFriday);
    saturday.setDate(nextFriday.getDate() + 1);
    
    const sunday = new Date(nextFriday);
    sunday.setDate(nextFriday.getDate() + 2);
    
    return [
      nextFriday.toISOString().split('T')[0],
      saturday.toISOString().split('T')[0],
      sunday.toISOString().split('T')[0]
    ];
  };

  // Filter events by weekend when applicable
  const filterEventsByTimePeriod = (eventList: EventData[]): EventData[] => {
    if (timePeriod !== 'kommendes-wochenende') return eventList;
    
    const weekendDates = getWeekendDates();
    return eventList.filter(event => weekendDates.includes(event.date));
  };

  const toggleSuperCategory = (category: string) => {
    setCategoryLimitError(null); // Fehler zurücksetzen
    setSelectedSuperCategories(prev => {
      if (prev.includes(category)) {
        // Kategorie abwählen
        return prev.filter(c => c !== category);
      } else {
        if (prev.length >= MAX_CATEGORY_SELECTION) {
          setCategoryLimitError(`Du kannst maximal ${MAX_CATEGORY_SELECTION} Kategorien auswählen.`);
          return prev; // Keine weitere Auswahl zulassen
        }
        return [...prev, category];
      }
    });
  };

  // Flaches Array aller Unterkategorien der ausgewählten Überkategorien
  const getSelectedSubcategories = (): string[] =>
    selectedSuperCategories.flatMap(superCat => CATEGORY_MAP[superCat]);

  // Design 1: Compute displayed events based on active filter
  const displayedEvents = isDesign1 && searchSubmitted ? 
    filterEventsByTimePeriod(activeFilter === 'Alle' ? events : events.filter(event => {
      const eventSuperCategory = searchedSuperCategories.find(cat =>
        CATEGORY_MAP[cat]?.includes(event.category)
      );
      return eventSuperCategory === activeFilter;
    })) : events;

  // Design 1: Compute category counts for sidebar
  const getCategoryCounts = () => {
    const counts: { [key: string]: number } = { 'Alle': events.length };
    searchedSuperCategories.forEach(category => {
      const subcategories = CATEGORY_MAP[category] || [];
      const count = events.filter(event => subcategories.includes(event.category)).length;
      counts[category] = count;
    });
    return counts;
  };

  const searchEvents = async () => {
    if (!city.trim()) {
      setError('Bitte gib eine Stadt ein.');
      return;
    }

    setLoading(true);
    setError(null);
    setEvents([]);
    setNewEvents(new Set());
    setJobId(null);
    setJobStatus('pending');
    setPollCount(0);
    setProgress(null);
    setDebugData(null);
    
    // Design 1: Set search state
    if (isDesign1) {
      setSearchSubmitted(true);
      setSearchedSuperCategories([...selectedSuperCategories]);
      setActiveFilter('Alle');
    }

    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          city: city.trim(), 
          date: formatDateForAPI(),
          categories: getSelectedSubcategories(),
          options: { 
            temperature: 0.2, 
            max_tokens: 10000,
            debug: debugMode,
            disableCache: debugMode,
            categoryConcurrency: 5,
            categoryTimeoutMs: 90000,
            overallTimeoutMs: 240000,
            maxAttempts: 5
          }
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Serverfehler (${res.status})`);
      }

      const { jobId } = await res.json();
      if (!jobId) {
        throw new Error('Kein Job ID erhalten.');
      }

      setJobId(jobId);
      startPolling(jobId);
    } catch (err: any) {
      setError(err?.message || 'Fehler beim Starten der Eventsuche.');
      setLoading(false);
      setJobStatus('idle');
    }
  };

  const startPolling = (jobId: string) => {
    if (pollInterval.current) {
      clearInterval(pollInterval.current);
      clearTimeout(pollInterval.current);
    }
    pollCountRef.current = 0;
    const maxPolls = MAX_POLLS;
    const performPoll = async (): Promise<void> => {
      pollCountRef.current++;
      setPollCount(pollCountRef.current);
      
      if (pollCountRef.current > maxPolls) {
        if (pollInterval.current) {
          clearInterval(pollInterval.current);
          clearTimeout(pollInterval.current);
        }
        setLoading(false);
        setJobStatus('error');
        setError('Die Suche dauert zu lange (Timeout nach 8 Minuten). Bitte versuche es später erneut.');
        return;
      }

      try {
        const debugParam = debugMode ? '?debug=1' : '';
        const res = await fetch(`/api/jobs/${jobId}${debugParam}`);
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const job = await res.json();
        if (job.progress) setProgress(job.progress);

        if (job.status === 'pending' && job.events && job.events.length > 0) {
          const currentEventKeys = new Set(eventsRef.current.map(createEventKey));
          const incomingEvents = job.events;
          const newEventKeys = new Set<string>();
          incomingEvents.forEach((event: EventData) => {
            const key = createEventKey(event);
            if (!currentEventKeys.has(key)) newEventKeys.add(key);
          });
          setEvents([...incomingEvents]);
          if (newEventKeys.size > 0) {
            setNewEvents(newEventKeys);
            setToast({
              show: true,
              message: `${newEventKeys.size} neue Event${newEventKeys.size !== 1 ? 's' : ''} gefunden`
            });
            setTimeout(() => {
              setToast({show: false, message: ''});
              setNewEvents(new Set());
            }, 3000);
          }
          if (job.debug) setDebugData(job.debug);
          if (pollInterval.current) {
            clearInterval(pollInterval.current);
            clearTimeout(pollInterval.current);
          }
          const nextIntervalMs = pollCountRef.current < 20 ? 3000 : 5000;
          pollInterval.current = setTimeout(performPoll, nextIntervalMs);
          return;
        }

        if (job.status !== 'pending') {
          if (pollInterval.current) {
            clearInterval(pollInterval.current);
            clearTimeout(pollInterval.current);
          }
          setLoading(false);

          if (job.status === 'done') {
            const incomingEvents: EventData[] = job.events || [];
            if (eventsRef.current.length === 0 && incomingEvents.length > 0) {
              const allNewEventKeys = new Set(incomingEvents.map(createEventKey));
              setNewEvents(allNewEventKeys);
              setToast({
                show: true,
                message: `${incomingEvents.length} Event${incomingEvents.length !== 1 ? 's' : ''} gefunden`
              });
              setTimeout(() => {
                setToast({show: false, message: ''});
                setNewEvents(new Set());
              }, 3000);
            }
            setEvents([...incomingEvents]);
            setJobStatus('done');
            if (job.debug) setDebugData(job.debug);
          } else {
            setJobStatus('error');
            setError(job.error || 'Fehler bei der Eventsuche.');
          }
        } else {
          if (pollInterval.current) {
            clearInterval(pollInterval.current);
            clearTimeout(pollInterval.current);
          }
          const nextIntervalMs = pollCountRef.current < 20 ? 3000 : 5000;
          pollInterval.current = setTimeout(performPoll, nextIntervalMs);
        }
      } catch (err) {
        setToast({
          show: true,
          message: `Netzwerkfehler (Versuch ${pollCountRef.current}) - Suche läuft weiter...`
        });
        setTimeout(() => {
          setToast({show: false, message: ''});
        }, 3000);
        if (pollInterval.current) {
          clearInterval(pollInterval.current);
          clearTimeout(pollInterval.current);
        }
        const nextIntervalMs = pollCountRef.current < 20 ? 3000 : 5000;
        pollInterval.current = setTimeout(performPoll, nextIntervalMs);
      }
    };
    performPoll();
  };

  return (
    <div className="min-h-screen">
      {/* Design 1: Sticky Header */}
      {isDesign1 && (
        <header className="design1-header">
          <div className="header-container">
            <div className="header-logo">
              <img src="/logo.svg" alt="Where2Go" className="logo" />
            </div>
            <div className="header-actions">
              <a href="#premium" className="premium-link">
                <span className="premium-icon">⭐</span>
                Premium
              </a>
            </div>
          </div>
        </header>
      )}

      {/* Hero Section */}
      <section className={`hero ${isDesign1 && searchSubmitted ? 'hero-collapsed' : ''}`}>
        <div className="container">
          <h1>Where2Go</h1>
          <p>Entdecke die besten Events in deiner Stadt!</p>
        </div>
      </section>

      {/* Search Section */}
      <section className={`search-section ${isDesign1 && searchSubmitted ? 'search-section-collapsed' : ''}`}>
        <div className="container">
          <form 
            className="search-form"
            onSubmit={e => {
              e.preventDefault();
              searchEvents();
            }}
          >
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="city">Stadt</label>
                <input
                  className="form-input"
                  type="text"
                  id="city"
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  placeholder="z.B. Linz, Berlin, Hamburg ..."
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="timePeriod">Zeitraum</label>
                <select
                  className="form-input"
                  id="timePeriod"
                  value={timePeriod}
                  onChange={e => setTimePeriod(e.target.value)}
                >
                  <option value="heute">Heute</option>
                  <option value="morgen">Morgen</option>
                  <option value="kommendes-wochenende">Kommendes Wochenende</option>
                  <option value="benutzerdefiniert">Benutzerdefiniert</option>
                </select>
              </div>
            </div>

            {timePeriod === 'benutzerdefiniert' && (
              <div className="form-group">
                <label htmlFor="customDate">Datum</label>
                <input
                  className="form-input"
                  type="date"
                  id="customDate"
                  value={customDate}
                  onChange={e => setCustomDate(e.target.value)}
                />
              </div>
            )}

            {/* Categories Section */}
            <div className="categories-section">
              <label className="categories-label">Kategorien</label>
              <div className="categories-grid">
                {ALL_SUPER_CATEGORIES.map((category) => (
                  <label key={category} className="category-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedSuperCategories.includes(category)}
                      onChange={() => toggleSuperCategory(category)}
                      disabled={
                        !selectedSuperCategories.includes(category) &&
                        selectedSuperCategories.length >= MAX_CATEGORY_SELECTION
                      }
                    />
                    <span className="category-name">{category}</span>
                  </label>
                ))}
              </div>
              <div className="categories-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setSelectedSuperCategories(ALL_SUPER_CATEGORIES.slice(0, MAX_CATEGORY_SELECTION));
                    setCategoryLimitError(null);
                  }}
                >
                  {`Max. ${MAX_CATEGORY_SELECTION} auswählen`}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setSelectedSuperCategories([]);
                    setCategoryLimitError(null);
                  }}
                >
                  Alle abwählen
                </button>
              </div>
              {categoryLimitError && (
                <div style={{ color: "red", marginTop: "8px" }}>
                  {categoryLimitError}
                </div>
              )}
            </div>

            <button type="submit" className="btn-search">
              Events suchen
            </button>
          </form>
        </div>
      </section>

      {/* Main Content */}
      <div className="container">
        <div className={isDesign1 && searchSubmitted ? "content-with-sidebar" : ""}>
          {/* Design 1: Filter Sidebar */}
          {isDesign1 && searchSubmitted && (
            <aside className="filter-sidebar">
              <h3 className="sidebar-title">Filter & Kategorien</h3>
              <div className="filter-chips">
                {/* All filter chip */}
                <button
                  className={`filter-chip ${activeFilter === 'Alle' ? 'filter-chip-active' : ''}`}
                  onClick={() => setActiveFilter('Alle')}
                  role="button"
                  aria-pressed={activeFilter === 'Alle'}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setActiveFilter('Alle');
                    }
                  }}
                >
                  Alle
                  <span className="filter-count">{getCategoryCounts()['Alle']}</span>
                </button>
                
                {/* Category filter chips */}
                {searchedSuperCategories.map(category => (
                  <button
                    key={category}
                    className={`filter-chip ${activeFilter === category ? 'filter-chip-active' : ''}`}
                    onClick={() => setActiveFilter(category)}
                    role="button"
                    aria-pressed={activeFilter === category}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setActiveFilter(category);
                      }
                    }}
                  >
                    {category}
                    <span className="filter-count">{getCategoryCounts()[category] || 0}</span>
                  </button>
                ))}
              </div>
            </aside>
          )}

          {/* Main Content Area */}
          <main className={isDesign1 && searchSubmitted ? "main-content" : ""}>
        {error && (
          <div className="error">
            {error}
          </div>
        )}

        {loading && (
          <div className="loading">
            <div className="loading-spinner"></div>
            <p>
              {jobStatus === 'pending' && events.length > 0 
                ? 'Suche läuft – Ergebnisse werden ergänzt' 
                : 'Suche läuft … bitte habe etwas Geduld.'
              }
            </p>
            <p>Abfrage <span className="font-mono">{pollCount}/{MAX_POLLS}</span> (max. 480 sec / 8min)</p>
            {jobStatus === 'pending' && progress && (
              <p>Kategorien: <span className="font-mono">{progress.completedCategories}/{progress.totalCategories}</span> abgeschlossen</p>
            )}
            <p>KI-Auswertung kann länger dauern!</p>
          </div>
        )}

        {!loading && !displayedEvents.length && !error && (
          <div className="empty-state">
            <h3>{isDesign1 && searchSubmitted ? 'Keine Events gefunden' : 'Bereit für dein nächstes Abenteuer?'}</h3>
            <p>{isDesign1 && searchSubmitted ? 'Versuche andere Filter oder starte eine neue Suche.' : 'Starte eine Suche, um die besten Events in deiner Stadt zu entdecken.'}</p>
          </div>
        )}

        {!!displayedEvents.length && (
          <div className="events-grid">
            {displayedEvents.map((event) => {
              const eventKey = createEventKey(event);
              const isNew = newEvents.has(eventKey);
              const superCategory = isDesign1 && searchSubmitted 
                ? searchedSuperCategories.find(cat => CATEGORY_MAP[cat]?.includes(event.category)) || event.category
                : ALL_SUPER_CATEGORIES.find(cat => CATEGORY_MAP[cat].includes(event.category)) || event.category;

              return (
                <div key={eventKey} className={`event-card ${isNew ? 'event-card-new' : ''}`}>
                  {isNew && <div className="badge-new">Neu</div>}
                  <div className="event-content">
                    <h3 className="event-title">{event.title}</h3>
                    
                    {isDesign1 ? (
                      // Design 1: New format with icons
                      <>
                        <div className="event-datetime">
                          <div className="event-date-d1">
                            <svg className="icon-clock" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <circle cx="12" cy="12" r="10"/>
                              <polyline points="12,6 12,12 16,14"/>
                            </svg>
                            {(() => {
                              const { date, time } = formatEventDateTime(event.date, event.time);
                              return (
                                <>
                                  {date}
                                  {time && (
                                    <>
                                      <svg className="icon-time" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="12" cy="12" r="10"/>
                                        <polyline points="12,6 12,12 16,14"/>
                                      </svg>
                                      {time}
                                    </>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        </div>
                        
                        <div className="event-location-d1">
                          <svg className="icon-location" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                            <circle cx="12" cy="10" r="3"/>
                          </svg>
                          {event.venue}
                          {event.address && (
                            <a 
                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.address)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="event-address-link"
                              title="Adresse in Google Maps öffnen"
                            >
                              <br />{event.address}
                            </a>
                          )}
                        </div>
                        
                        {superCategory && (
                          <div className="event-category">🏷️ {superCategory}</div>
                        )}
                        
                        {event.eventType && (
                          <div className="event-type">🎭 {event.eventType}</div>
                        )}
                        
                        {event.ageRestrictions && (
                          <div className="event-age">🔞 {event.ageRestrictions}</div>
                        )}
                        
                        {event.description && (
                          <div className="event-description">{event.description}</div>
                        )}
                        
                        {/* Bottom row with price and action buttons */}
                        <div className="event-bottom-row">
                          <div className="event-price-d1">
                            {formatEventPrice(event)}
                          </div>
                          <div className="event-actions">
                            {event.website && (
                              <a 
                                href={event.website} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="event-action-btn event-info-btn"
                              >
                                <svg className="icon-info" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <circle cx="12" cy="12" r="10"/>
                                  <line x1="12" y1="16" x2="12" y2="12"/>
                                  <line x1="12" y1="8" x2="12.01" y2="8"/>
                                </svg>
                                more Info
                              </a>
                            )}
                            {event.bookingLink && (
                              <a 
                                href={event.bookingLink} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="event-action-btn event-tickets-btn"
                              >
                                <svg className="icon-tickets" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2z"/>
                                  <path d="M13 5v2"/>
                                  <path d="M13 17v2"/>
                                  <path d="M13 11v2"/>
                                </svg>
                                Tickets
                              </a>
                            )}
                          </div>
                        </div>
                      </>
                    ) : (
                      // Default design: keep existing structure
                      <>
                        <div className="event-date">
                          {event.date}
                          {event.time && ` • ${event.time}`}
                          {event.endTime && ` - ${event.endTime}`}
                        </div>
                        
                        <div className="event-location">
                          📍 {event.venue}
                          {event.address ? (
                            <a 
                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.address)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="event-address-link"
                              title="Adresse in Google Maps öffnen"
                            >
                              <br />📍 {event.address}
                            </a>
                          ) : (
                            <a 
                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${event.venue}, ${city}`)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="event-address-link"
                              title="Venue in Google Maps öffnen"
                            >
                              <br />🗺️ In Maps öffnen
                            </a>
                          )}
                        </div>
                        
                        {superCategory && (
                          <div className="event-category">🏷️ {superCategory}</div>
                        )}
                        
                        {event.eventType && (
                          <div className="event-type">🎭 {event.eventType}</div>
                        )}
                        
                        {(event.price || event.ticketPrice) && (
                          <div className="event-price">
                            💰 {event.ticketPrice || event.price}
                          </div>
                        )}
                        
                        {event.ageRestrictions && (
                          <div className="event-age">🔞 {event.ageRestrictions}</div>
                        )}
                        
                        {event.description && (
                          <div className="event-description">{event.description}</div>
                        )}
                        
                        <div className="event-links">
                          {event.website && (
                            <a 
                              href={event.website} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="event-link"
                            >
                              Website →
                            </a>
                          )}
                          {event.bookingLink && (
                            <a 
                              href={event.bookingLink} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="event-link event-booking-link"
                            >
                              Tickets →
                            </a>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
          </main>
        </div>
      </div>

      {toast.show && (
        <div className="toast-container">
          <div className="toast">
            {toast.message}
          </div>
        </div>
      )}

      {debugMode && debugData && (
        <div className="debug-panel">
          <div className="debug-header">
            <h3>Debug Information</h3>
            <button 
              className="debug-toggle"
              onClick={() => setDebugData(null)}
            >
              ✕
            </button>
          </div>
          <div className="debug-content">
            <div className="debug-summary">
              <p><strong>Stadt:</strong> {debugData.city}</p>
              <p><strong>Datum:</strong> {debugData.date}</p>
              <p><strong>Kategorien:</strong> {debugData.categories?.join(', ')}</p>
              <p><strong>Erstellt:</strong> {new Date(debugData.createdAt).toLocaleString()}</p>
              <p><strong>Schritte:</strong> {debugData.steps?.length || 0}</p>
            </div>
            
            {debugData.steps && debugData.steps.map((step: any, index: number) => (
              <div key={index} className="debug-step">
                <h4>Schritt {index + 1}: {step.category}</h4>
                <div className="debug-query">
                  <strong>Query:</strong> {step.query}
                </div>
                <div className="debug-metrics">
                  <strong>Parsed Events:</strong> {step.parsedCount || 0} | 
                  <strong> Added to Total:</strong> {step.addedCount || 0} | 
                  <strong> Total After:</strong> {step.totalAfter || 0}
                </div>
                <details className="debug-response">
                  <summary>Rohdaten anzeigen</summary>
                  <pre>{step.response}</pre>
                </details>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      {isDesign1 ? (
        <footer className="design1-footer">
          <div className="footer-container">
            <div className="footer-section">
              <h4>Where2Go</h4>
              <p>Entdecke die besten Events in deiner Stadt</p>
            </div>
            <div className="footer-section">
              <h4>Service</h4>
              <ul>
                <li><a href="#events">Events</a></li>
                <li><a href="#premium">Premium</a></li>
                <li><a href="#api">API</a></li>
              </ul>
            </div>
            <div className="footer-section">
              <h4>Unternehmen</h4>
              <ul>
                <li><a href="#about">Über uns</a></li>
                <li><a href="#contact">Kontakt</a></li>
                <li><a href="#jobs">Jobs</a></li>
              </ul>
            </div>
            <div className="footer-section">
              <h4>Rechtliches</h4>
              <ul>
                <li><a href="#privacy">Datenschutz</a></li>
                <li><a href="#terms">AGB</a></li>
                <li><a href="#imprint">Impressum</a></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <p>© 2025 Where2Go</p>
          </div>
        </footer>
      ) : (
        <footer className="footer">
          <div className="container">
            <p>© 2025 Where2Go - Entdecke deine Stadt neu</p>
          </div>
        </footer>
      )}
    </div>
  );
}
