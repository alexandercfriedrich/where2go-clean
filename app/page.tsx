'use client';
import { useState, useRef, useEffect } from 'react';
import { CATEGORY_MAP } from './categories';
import { useTranslation } from './lib/useTranslation';

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
const MAX_POLLS = 120; // Increased to allow for longer processing time (120 * 5s = 10min max)

export default function Home() {
  const { t, formatEventDate, formatEventTime } = useTranslation();
  const [city, setCity] = useState('');
  const [timePeriod, setTimePeriod] = useState('heute');
  const [customDate, setCustomDate] = useState('');
  const [selectedSuperCategories, setSelectedSuperCategories] = useState<string[]>([]);
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
  const [cacheInfo, setCacheInfo] = useState<{fromCache: boolean, totalEvents: number, cachedEvents: number} | null>(null);
  
  // Design 1 always active
  const isDesign1 = true;
  const [searchSubmitted, setSearchSubmitted] = useState(false);
  const [searchedSuperCategories, setSearchedSuperCategories] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState<string>('Alle');
  
  const pollInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const eventsRef = useRef<EventData[]>([]);
  const pollCountRef = useRef<number>(0);
  const eventsGridRef = useRef<HTMLDivElement>(null);

  // Reactive debug mode based on URL params
  useEffect(() => {
    const updateDebugMode = () => {
      const params = new URLSearchParams(window.location.search);
      setDebugMode(params.get('debug') === '1');
    };
    updateDebugMode();
    window.addEventListener('popstate', updateDebugMode);
    window.addEventListener('hashchange', updateDebugMode);
    return () => {
      window.removeEventListener('popstate', updateDebugMode);
      window.removeEventListener('hashchange', updateDebugMode);
    };
  }, []);

  useEffect(() => {
    eventsRef.current = events;
  }, [events]);

  // Inject sample events when in test mode
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('test') === '1' && events.length === 0) {
      setEvents(getSampleEvents());
      setSearchSubmitted(true);
    }
  }, [events]);

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (pollInterval.current) {
        clearInterval(pollInterval.current);
        clearTimeout(pollInterval.current);
        pollInterval.current = null;
      }
    };
  }, []);

  // Scroll to events grid when events are found and search is submitted
  useEffect(() => {
    if (searchSubmitted && events.length > 0 && eventsGridRef.current) {
      setTimeout(() => {
        eventsGridRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      }, 100);
    }
  }, [searchSubmitted, events.length]);

  const createEventKey = (event: EventData): string =>
    `${event.title}_${event.date}_${event.venue}`;

  const isLikelyVenue = (event: EventData): boolean => {
    const indicators = ['club','bar','restaurant','hotel','theater','opera','hall','arena','stadium','gallery','museum','lounge','café','cafe','bistro','venue','location','space'];
    return indicators.some(ind => event.venue.toLowerCase().includes(ind));
  };

  const formatEventDateTime = (date: string, time?: string, endTime?: string) => {
    // Always design1 format
    const dateObj = new Date(date);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const isToday = dateObj.toDateString() === today.toDateString();
    const isTomorrow = dateObj.toDateString() === tomorrow.toDateString();
    let formattedDate = isToday ? t('event.today')
      : isTomorrow ? t('event.tomorrow')
      : dateObj.toLocaleDateString('en-GB', {
          weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
        })
        .replace(/(\d+)/, m => {
          const d = parseInt(m);
          const suffix = d===1||d===21||d===31?'st':d===2||d===22?'nd':d===3||d===23?'rd':'th';
          return `${d}${suffix}`;
        })
        .replace(',', '.');
    const formatTime = (tStr: string) => {
      const match = tStr.match(/(\d{1,2}):(\d{2})/);
      if (!match) return tStr;
      const [,h, min] = match;
      const hr = parseInt(h);
      const ampm = hr>=12?'pm':'am';
      const disp = hr%12||12;
      return `${disp}:${min} ${ampm}`;
    };
    let formattedTime = null;
    if (time) {
      formattedTime = endTime
        ? `${formatTime(time)} - ${formatTime(endTime)}`
        : formatTime(time);
    }
    return { date: formattedDate, time: formattedTime };
  };

  const getCategoryIcon = (category: string) => {
    const style = { width: '16px', height: '16px', strokeWidth: '2' };
    switch (category) {
      case 'DJ Sets/Electronic':
      case 'Clubs/Discos':
        return (
          <svg style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M9 18V5l12-2v13"/>
            <circle cx="6" cy="18" r="3"/>
            <circle cx="18" cy="16" r="3"/>
          </svg>
        );
      case 'Live-Konzerte':
        return (
          <svg style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M12 3v18"/><path d="M8 21l4-7 4 7"/><path d="M8 3l4 7 4-7"/>
          </svg>
        );
      case 'Theater/Performance':
        return (
          <svg style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M20 9V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v2"/>
            <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V9s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
            <line x1="4" y1="22" x2="4" y2="15"/>
            <line x1="20" y1="22" x2="20" y2="15"/>
          </svg>
        );
      // ... weitere Icons ...
      default:
        return (
          <svg style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
            <line x1="7" y1="7" x2="7.01" y2="7"/>
          </svg>
        );
    }
  };

  const getEventTypeIcon = () => (
    <svg style={{ width: '16px', height: '16px', strokeWidth: '2' }} viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d="M20 9V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v2"/>
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V9s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
      <line x1="4" y1="22" x2="4" y2="15"/>
      <line x1="20" y1="22" x2="20" y2="15"/>
    </svg>
  );

  const getAgeRestrictionIcon = () => (
    <svg style={{ width: '16px', height: '16px', strokeWidth: '2' }} viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <circle cx="12" cy="12" r="10"/>
      <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
    </svg>
  );

  const formatEventPrice = (event: EventData) => {
    const price = event.ticketPrice || event.price;
    if (!price) return t('event.pricesVary');
    const text = price.toString();
    return text.includes('€') || text.includes('EUR') ? text : `${text} €`;
  };

  const getSampleEvents = (): EventData[] => ([
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
  ]);

  const formatDateForAPI = (): string => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    if (timePeriod === 'heute') return today.toISOString().split('T')[0];
    if (timePeriod === 'morgen') return tomorrow.toISOString().split('T')[0];
    if (timePeriod === 'kommendes-wochenende') {
      const nextFri = new Date(today);
      const days = (5 - today.getDay() + 7) % 7;
      if (days !== 0) nextFri.setDate(today.getDate() + days);
      const sat = new Date(nextFri); sat.setDate(nextFri.getDate() + 1);
      const sun = new Date(nextFri); sun.setDate(nextFri.getDate() + 2);
      return [nextFri, sat, sun].map(d => d.toISOString().split('T')[0]).join(',');
    }
    return customDate || today.toISOString().split('T')[0];
  };

  const filterEventsByTimePeriod = (list: EventData[]): EventData[] =>
    timePeriod !== 'kommendes-wochenende' ? list : list.filter(e => {
      const [fri, sat, sun] = getWeekendDates();
      return [fri, sat, sun].includes(e.date);
    });

  function getWeekendDates(): string[] {
    const today = new Date();
    const nextFri = new Date(today);
    const days = (5 - today.getDay() + 7) % 7;
    if (days !== 0) nextFri.setDate(today.getDate() + days);
    const sat = new Date(nextFri); sat.setDate(nextFri.getDate() + 1);
    const sun = new Date(nextFri); sun.setDate(nextFri.getDate() + 2);
    return [nextFri, sat, sun].map(d => d.toISOString().split('T')[0]);
  }

  const toggleSuperCategory = (cat: string) => {
    setCategoryLimitError(null);
    setSelectedSuperCategories(prev => {
      if (prev.includes(cat)) return prev.filter(c => c !== cat);
      if (prev.length >= MAX_CATEGORY_SELECTION) {
        setCategoryLimitError(`Du kannst maximal ${MAX_CATEGORY_SELECTION} Kategorien auswählen.`);
        return prev;
      }
      return [...prev, cat];
    });
  };

  const getSelectedSubcategories = (): string[] =>
    selectedSuperCategories.flatMap(s => CATEGORY_MAP[s]);

  const displayedEvents = searchSubmitted
    ? filterEventsByTimePeriod(
        activeFilter === 'Alle'
          ? events
          : events.filter(ev => {
              const sc = searchedSuperCategories.find(s => CATEGORY_MAP[s]?.includes(ev.category));
              return sc === activeFilter;
            })
      )
    : events;

  const getCategoryCounts = () => {
    const counts: Record<string, number> = { 'Alle': events.length };
    searchedSuperCategories.forEach(c => {
      counts[c] = events.filter(ev => CATEGORY_MAP[c]?.includes(ev.category)).length;
    });
    return counts;
  };

  const searchEvents = async () => {
    if (!city.trim()) {
      setError('Bitte gib eine Stadt ein.');
      return;
    }
    setLoading(true); setError(null); setEvents([]); setNewEvents(new Set());
    setJobId(null); setJobStatus('pending'); setPollCount(0);
    setProgress(null); setDebugData(null); setCacheInfo(null);

    setSearchSubmitted(true);
    setSearchedSuperCategories([...selectedSuperCategories]);
    setActiveFilter('Alle');

    setTimeout(() => {
      const section = document.querySelector('.search-section');
      if (section) {
        const bottom = section.getBoundingClientRect().bottom + window.scrollY;
        window.scrollTo({ top: bottom, behavior: 'smooth' });
      }
    }, 100);

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
      const data = await res.json();
      if (data.status === 'completed') {
        setEvents(data.events || []);
        if (data.cacheInfo) setCacheInfo(data.cacheInfo);
        setLoading(false); setJobStatus('done');
        setToast({ show: true, message: data.message || `${data.events?.length || 0} Events aus dem Cache geladen` });
        setTimeout(() => setToast({ show: false, message: '' }), 3000);
      } else if (data.status === 'partial') {
        setEvents(data.events || []);
        if (data.cacheInfo) setCacheInfo(data.cacheInfo);
        if (data.progress) setProgress(data.progress);
        if (data.events?.length) {
          setToast({ show: true, message: data.message || `${data.events.length} Events aus dem Cache, weitere werden geladen...` });
          setTimeout(() => setToast({ show: false, message: '' }), 4000);
        }
        setJobId(data.jobId);
        startPolling(data.jobId);
      } else if (data.jobId) {
        setJobId(data.jobId);
        startPolling(data.jobId);
      } else {
        throw new Error('Unerwartete API-Antwort');
      }
    } catch (err: any) {
      setError(err.message || 'Fehler beim Starten der Eventsuche.');
      setLoading(false); setJobStatus('idle');
    }
  };

  const startPolling = (jid: string) => {
    if (pollInterval.current) {
      clearInterval(pollInterval.current);
      clearTimeout(pollInterval.current);
    }
    pollCountRef.current = 0;
    const performPoll = async () => {
      pollCountRef.current++;
      setPollCount(pollCountRef.current);
      if (pollCountRef.current > MAX_POLLS) {
        if (pollInterval.current) {
          clearInterval(pollInterval.current);
          clearTimeout(pollInterval.current);
        }
        setLoading(false);
        setJobStatus('error');
        setError('Die Suche dauert zu lange (Timeout nach 10 Minuten). Bitte versuche es später erneut oder kontaktiere den Support.');
        return;
      }
      try {
        const debugParam = debugMode ? '?debug=1' : '';
        const res = await fetch(`/api/jobs/${jid}${debugParam}`);
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const job = await res.json();
        if (job.progress) setProgress(job.progress);
        if (job.status === 'pending' && job.events?.length) {
          const currentKeys = new Set(eventsRef.current.map(createEventKey));
          const newKeys = new Set<string>();
          job.events.forEach((ev: EventData) => {
            const k = createEventKey(ev);
            if (!currentKeys.has(k)) newKeys.add(k);
          });
          setEvents(job.events);
          if (job.cacheInfo) setCacheInfo(job.cacheInfo);
          if (newKeys.size) {
            setNewEvents(newKeys);
            setToast({ show: true, message: `${newKeys.size} neue Event${newKeys.size!==1?'s':''} gefunden` });
            setTimeout(() => {
              setToast({ show: false, message: '' });
              setNewEvents(new Set());
            }, 3000);
          }
          if (job.debug) setDebugData(job.debug);
          if (pollInterval.current) {
            clearInterval(pollInterval.current);
            clearTimeout(pollInterval.current);
          }
          const next = pollCountRef.current < 20 ? 3000 : 5000;
          pollInterval.current = setTimeout(performPoll, next);
          return;
        }
        if (job.status !== 'pending') {
          if (pollInterval.current) {
            clearInterval(pollInterval.current);
            clearTimeout(pollInterval.current);
          }
          setLoading(false);
          if (job.status === 'done') {
            const inc = job.events || [];
            if (eventsRef.current.length === 0 && inc.length) {
              const allKeys = new Set(inc.map(createEventKey));
              setNewEvents(allKeys);
              setToast({ show: true, message: job.message || `${inc.length} Event${inc.length!==1?'s':''} gefunden` });
              setTimeout(() => { setToast({ show: false, message: '' }); setNewEvents(new Set()); }, 3000);
            } else if (inc.length > eventsRef.current.length) {
              const diff = inc.length - eventsRef.current.length;
              setToast({ show: true, message: `${diff} weitere Event${diff!==1?'s':''} gefunden` });
              setTimeout(() => setToast({ show: false, message: '' }), 3000);
            }
            setEvents(inc);
            if (job.cacheInfo) setCacheInfo(job.cacheInfo);
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
          const next = pollCountRef.current < 20 ? 3000 : 5000;
          pollInterval.current = setTimeout(performPoll, next);
        }
      } catch (err) {
        setToast({ show: true, message: `Netzwerkfehler (Versuch ${pollCountRef.current}) - Suche läuft weiter...` });
        setTimeout(() => setToast({ show: false, message: '' }), 3000);
        if (pollInterval.current) {
          clearInterval(pollInterval.current);
          clearTimeout(pollInterval.current);
        }
        const next = pollCountRef.current < 20 ? 3000 : 5000;
        pollInterval.current = setTimeout(performPoll, next);
      }
    };
    performPoll();
  };

  return (
    <div className="min-h-screen">
      <header className="design1-header">
        <div className="header-container">
          <div className="header-logo">
            <img src="/where2go-logo.svg" alt="Where2Go" className="logo" />
          </div>
          <div className="header-actions">
            <a href="#premium" className="premium-link">
              <span className="premium-icon">⭐</span> Premium
            </a>
          </div>
        </div>
      </header>

      <section className={`hero ${searchSubmitted ? 'hero-collapsed' : ''}`}>
        <div className="container">
          <h1>Where2Go</h1>
          <p>{t('page.tagline')}</p>
        </div>
      </section>

      <section className="search-section">
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
                <label htmlFor="city">{t('form.city')}</label>
                <input
                  className="form-input"
                  type="text"
                  id="city"
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  placeholder={t('form.cityPlaceholder')}
                />
              </div>
              <div className="form-group">
                <label htmlFor="timePeriod">{t('form.timePeriod')}</label>
                <select
                  className="form-input"
                  id="timePeriod"
                  value={timePeriod}
                  onChange={e => setTimePeriod(e.target.value)}
                >
                  <option value="heute">{t('time.today')}</option>
                  <option value="morgen">{t('time.tomorrow')}</option>
                  <option value="kommendes-wochenende">{t('time.upcomingWeekend')}</option>
                  <option value="benutzerdefiniert">{t('time.custom')}</option>
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
            <div className="categories-section">
              <label className="categories-label">Kategorien</label>
              <div className="categories-grid">
                {ALL_SUPER_CATEGORIES.map(cat => (
                  <label key={cat} className="category-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedSuperCategories.includes(cat)}
                      onChange={() => toggleSuperCategory(cat)}
                      disabled={!selectedSuperCategories.includes(cat) && selectedSuperCategories.length >= MAX_CATEGORY_SELECTION}
                    />
                    <span className="category-name">{cat}</span>
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
                <div style={{ color: 'red', marginTop: 8 }}>{categoryLimitError}</div>
              )}
            </div>
            <button type="submit" className="btn-search">
              {t('button.searchEvents')}
            </button>
          </form>
        </div>
      </section>

      <div className="container">
        <div className={searchSubmitted ? 'content-with-sidebar' : ''}>
          {searchSubmitted && (
            <aside className="filter-sidebar">
              <h3 className="sidebar-title">Filter & Kategorien</h3>
              <div className="filter-chips">
                <button
                  className={`filter-chip ${activeFilter === 'Alle' ? 'filter-chip-active' : ''}`}
                  onClick={() => setActiveFilter('Alle')}
                  role="button"
                  aria-pressed={activeFilter === 'Alle'}
                  tabIndex={0}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setActiveFilter('Alle');
                    }
                  }}
                >
                  Alle
                  <span className="filter-count">{getCategoryCounts()['Alle']}</span>
                </button>
                {searchedSuperCategories.map(cat => (
                  <button
                    key={cat}
                    className={`filter-chip ${activeFilter === cat ? 'filter-chip-active' : ''}`}
                    onClick={() => setActiveFilter(cat)}
                    role="button"
                    aria-pressed={activeFilter === cat}
                    tabIndex={0}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setActiveFilter(cat);
                      }
                    }}
                  >
                    {cat}
                    <span className="filter-count">{getCategoryCounts()[cat] || 0}</span>
                  </button>
                ))}
              </div>
            </aside>
          )}
          <main className={searchSubmitted ? 'main-content' : ''}>
            {error && <div className="error">{error}</div>}
            {loading && (
              <div className="loading">
                <div className="loading-spinner" />
                <p>
                  {jobStatus === 'pending' && events.length > 0
                    ? 'Weitere Events werden geladen...'
                    : 'Suche läuft... bitte habe etwas Geduld'}
                </p>
                {jobStatus === 'pending' && progress && (
                  <p>
                    Kategorien:{' '}
                    <span className="font-mono">
                      {progress.completedCategories}/{progress.totalCategories}
                    </span>{' '}
                    abgeschlossen
                  </p>
                )}
                {jobStatus === 'pending' && pollCount > 10 && (
                  <p className="text-sm opacity-70">
                    Suche dauert länger als erwartet (ca. {Math.round((pollCount * 5) / 60)} Min.)
                  </p>
                )}
              </div>
            )}
            {!loading && !displayedEvents.length && !error && (
              <div className="empty-state">
                <h3>Keine Events gefunden</h3>
                <p>Versuche andere Filter oder starte eine neue Suche.</p>
              </div>
            )}
            {!!displayedEvents.length && (
              <>
                {cacheInfo && (
                  <div
                    style={{
                      textAlign: 'center',
                      marginBottom: 20,
                      color: '#666',
                      fontWeight: '300',
                      fontSize: '0.9rem'
                    }}
                  >
                    {cacheInfo.fromCache ? (
                      <span>📁 {cacheInfo.cachedEvents} Events aus dem Cache geladen</span>
                    ) : (
                      <span>🔄 {cacheInfo.totalEvents} Events frisch geladen</span>
                    )}
                  </div>
                )}
                <div className="events-grid" ref={eventsGridRef}>
                  {displayedEvents.map(event => {
                    const key = createEventKey(event);
                    const isNew = newEvents.has(key);
                    const superCat =
                      searchedSuperCategories.find(sc => CATEGORY_MAP[sc]?.includes(event.category)) ||
                      ALL_SUPER_CATEGORIES.find(sc => CATEGORY_MAP[sc].includes(event.category)) ||
                      event.category;
                    const venueFlag = isLikelyVenue(event);
                    return (
                      <div
                        key={key}
                        className={`event-card ${isNew ? 'event-card-new' : ''} ${
                          venueFlag ? 'event-card-venue' : ''
                        }`}
                      >
                        {isNew && <div className="badge-new">Neu</div>}
                        <div className="event-content">
                          <h3 className="event-title">{event.title}</h3>
                          {/* Design1 layout */}
                          <div className="event-datetime">
                            <div className="event-date-d1">
                              <svg
                                className="icon-date"
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                              >
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                <line x1="16" y1="2" x2="16" y2="6" />
                                <line x1="8" y1="2" x2="8" y2="6" />
                                <line x1="3" y1="10" x2="21" y2="10" />
                              </svg>
                              {(() => {
                                const { date, time } = formatEventDateTime(
                                  event.date,
                                  event.time,
                                  event.endTime
                                );
                                return (
                                  <>
                                    {date}
                                    {time && (
                                      <>
                                        <svg
                                          className="icon-time"
                                          width="16"
                                          height="16"
                                          viewBox="0 0 24 24"
                                          fill="none"
                                          stroke="currentColor"
                                          strokeWidth="2"
                                        >
                                          <circle cx="12" cy="12" r="10" />
                                          <polyline points="12,6 12,12 16,14" />
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
                            <svg
                              className="icon-location"
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                              <circle cx="12" cy="10" r="3" />
                            </svg>
                            <div className="event-location-content">
                              <a
                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                                  event.address || event.venue
                                )}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Venue in Google Maps öffnen"
                                className="event-venue-link"
                              >
                                {event.venue}
                              </a>
                            </div>
                          </div>

                          {superCat && (
                            <div className="event-category">
                              {getCategoryIcon(superCat)}
                              {superCat}
                            </div>
                          )}

                          {event.eventType && (
                            <div className="event-type">
                              {getEventTypeIcon()}
                              {event.eventType}
                            </div>
                          )}

                          {event.ageRestrictions && (
                            <div className="event-age">
                              {getAgeRestrictionIcon()}
                              {event.ageRestrictions}
                            </div>
                          )}

                          {event.description && (
                            <div className="event-description">{event.description}</div>
                          )}

                          <div className="event-bottom-row">
                            <div className="event-price-d1">{formatEventPrice(event)}</div>
                            <div className="event-actions">
                              {event.website && (
                                <a
                                  href={event.website}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="event-action-btn event-info-btn"
                                >
                                  <svg
                                    className="icon-info"
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                  >
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="12" y1="16" x2="12" y2="12" />
                                    <line x1="12" y1="8" x2="12.01" y2="8" />
                                  </svg>
                                  {t('button.moreInfo')}
                                </a>
                              )}
                              {event.bookingLink && (
                                <a
                                  href={event.bookingLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="event-action-btn event-tickets-btn"
                                >
                                  <svg
                                    className="icon-tickets"
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                  >
                                    <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2z" />
                                    <path d="M13 5v2" />
                                    <path d="M13 17v2" />
                                    <path d="M13 11v2" />
                                  </svg>
                                  Tickets
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </main>
        </div>
      </div>

      {toast.show && (
        <div className="toast-container">
          <div className="toast">{toast.message}</div>
        </div>
      )}

      {debugMode && debugData && (
        <div className="debug-panel">
          <div className="debug-header">
            <h3>Debug Information</h3>
            <button className="debug-toggle" onClick={() => setDebugData(null)}>
              ✕
            </button>
          </div>
          <div className="debug-content">
            <div className="debug-summary">
              <p>
                <strong>Stadt:</strong> {debugData.city}
              </p>
              <p>
                <strong>Datum:</strong> {debugData.date}
              </p>
              <p>
                <strong>Kategorien:</strong> {debugData.categories?.join(', ')}
              </p>
              <p>
                <strong>Erstellt:</strong> {new Date(debugData.createdAt).toLocaleString()}
              </p>
              <p>
                <strong>Schritte:</strong> {debugData.steps?.length || 0}
              </p>
            </div>
            {debugData.steps?.map((step: any, i: number) => (
              <div key={i} className="debug-step">
                <h4>
                  Schritt {i + 1}: {step.category}
                </h4>
                <div className="debug-query">
                  <strong>Query:</strong> {step.query}
                </div>
                <div className="debug-metrics">
                  <strong>Parsed Events:</strong> {step.parsedCount || 0} |{' '}
                  <strong>Added to Total:</strong> {step.addedCount || 0} |{' '}
                  <strong>Total After:</strong> {step.totalAfter || 0}
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
              <li><a href="/premium">Premium</a></li>
              <li><a href="#api">API</a></li>
            </ul>
          </div>
          <div className="footer-section">
            <h4>Unternehmen</h4>
            <ul>
              <li><a href="/ueber-uns">Über uns</a></li>
              <li><a href="/kontakt">Kontakt</a></li>
              <li><a href="#jobs">Jobs</a></li>
            </ul>
          </div>
          <div className="footer-section">
            <h4>Rechtliches</h4>
            <ul>
              <li><a href="#privacy">Datenschutz</a></li>
              <li><a href="#terms">AGB</a></li>
              <li><a href="/impressum">Impressum</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© 2025 Where2Go</p>
        </div>
      </footer>
    </div>
  );
}
