'use client';
import { useState, useRef, useEffect } from 'react';
import { EVENT_CATEGORY_SUBCATEGORIES } from './lib/eventCategories';
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

const ALL_SUPER_CATEGORIES = Object.keys(EVENT_CATEGORY_SUBCATEGORIES);
const MAX_CATEGORY_SELECTION: number = 3;
const MAX_POLLS = 60;

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

  // Design 1 specific state
  const [isDesign1, setIsDesign1] = useState(false);
  const [searchSubmitted, setSearchSubmitted] = useState(false);
  const [searchedSuperCategories, setSearchedSuperCategories] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState<string>('Alle');

  const pollInterval = useRef<ReturnType<typeof setTimeout> | null>(null);
  const eventsRef = useRef<EventData[]>([]);
  const pollCountRef = useRef<number>(0);
  const eventsGridRef = useRef<HTMLDivElement>(null);

  // Reactive design switching based on URL params
  useEffect(() => {
    const updateFromURL = () => {
      const params = new URLSearchParams(window.location.search);
      const design = params.get('design') || '1';
      const id = 'w2g-design-css';
      const existing = document.getElementById(id) as HTMLLinkElement | null;
      const isValid = design === '1' || design === '2' || design === '3';
      setIsDesign1(design === '1');

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
        const href = `/designs/design1.css`;
        if (existing) {
          if (existing.getAttribute('href') !== href) existing.setAttribute('href', href);
        } else {
          const link = document.createElement('link');
          link.id = id;
          link.rel = 'stylesheet';
          link.href = href;
          document.head.appendChild(link);
        }
        setIsDesign1(true);
      }
    };
    updateFromURL();
    const handlePopState = () => updateFromURL();
    const handleHashChange = () => updateFromURL();
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  // Reactive debug mode
  useEffect(() => {
    const updateDebugMode = () => {
      const params = new URLSearchParams(window.location.search);
      setDebugMode(params.get('debug') === '1');
    };
    updateDebugMode();
    const handlePopState = () => updateDebugMode();
    const handleHashChange = () => updateDebugMode();
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

  // Design 1 test mode sample events
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (isDesign1 && urlParams.get('test') === '1' && events.length === 0) {
      setEvents(getSampleEvents());
    }
  }, [isDesign1]);

  useEffect(() => {
    return () => {
      if (pollInterval.current) {
        clearTimeout(pollInterval.current);
        pollInterval.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (isDesign1 && searchSubmitted && events.length > 0 && eventsGridRef.current) {
      setTimeout(() => {
        eventsGridRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }, 100);
    }
  }, [isDesign1, searchSubmitted, events.length]);

  const createEventKey = (event: EventData): string => {
    return `${event.title}_${event.date}_${event.venue}`;
  };

  const isLikelyVenue = (event: EventData): boolean => {
    const venueIndicators = [
      'club','bar','restaurant','hotel','theater','opera','hall','center','arena','stadium',
      'gallery','museum','lounge','café','cafe','bistro','venue','location','space'
    ];
    const venueLower = event.venue.toLowerCase();
    return venueIndicators.some(indicator => venueLower.includes(indicator));
  };

  const formatEventDateTime = (date: string, time?: string, endTime?: string) => {
    if (!isDesign1) {
      return {
        date: time ? `${date} • ${time}` : date,
        time: null
      };
    }
    const dateObj = new Date(date);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const isToday = dateObj.toDateString() === today.toDateString();
    const isTomorrow = dateObj.toDateString() === tomorrow.toDateString();

    let formattedDate;
    if (isToday) {
      formattedDate = t('event.today');
    } else if (isTomorrow) {
      formattedDate = t('event.tomorrow');
    } else {
      const options: Intl.DateTimeFormatOptions = {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      };
      formattedDate = dateObj.toLocaleDateString('en-GB', options)
        .replace(/(\d+)/, (match) => {
          const day = parseInt(match);
          const suffix = day === 1 || day === 21 || day === 31 ? 'st' :
                        day === 2 || day === 22 ? 'nd' :
                        day === 3 || day === 23 ? 'rd' : 'th';
          return `${day}${suffix}`;
        })
        .replace(',', '.');
    }

    const formatTime = (timeStr: string) => {
      const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})/);
      if (timeMatch) {
        const hours = parseInt(timeMatch[1]);
        const minutes = timeMatch[2];
        const ampm = hours >= 12 ? 'pm' : 'am';
        const displayHours = hours % 12 || 12;
        return `${displayHours}:${minutes} ${ampm}`;
      }
      return timeStr;
    };

    let formattedTime = null;
    if (time) {
      if (endTime) {
        formattedTime = `${formatTime(time)} - ${formatTime(endTime)}`;
      } else {
        formattedTime = formatTime(time);
      }
    }
    return { date: formattedDate, time: formattedTime };
  };

  const getCategoryIcon = (category: string) => {
    const iconStyle = { width: '16px', height: '16px', strokeWidth: '2' };
    switch (category) {
      case 'DJ Sets/Electronic':
      case 'Clubs/Discos':
        return (
          <svg style={iconStyle} viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M9 18V5l12-2v13"/>
            <circle cx="6" cy="18" r="3"/>
            <circle cx="18" cy="16" r="3"/>
          </svg>
        );
      case 'Live-Konzerte':
        return (
          <svg style={iconStyle} viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M12 3v18"/>
            <path d="M8 21l4-7 4 7"/>
            <path d="M8 3l4 7 4-7"/>
          </svg>
        );
      case 'Theater/Performance':
        return (
          <svg style={iconStyle} viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M20 9V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v2"/>
            <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V9s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
            <line x1="4" y1="22" x2="4" y2="15"/>
            <line x1="20" y1="22" x2="20" y2="15"/>
          </svg>
        );
      case 'Museen':
      case 'Kunst/Design':
        return (
          <svg style={iconStyle} viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <path d="M21 15l-5-5L5 21"/>
          </svg>
        );
      case 'Sport':
        return (
          <svg style={iconStyle} viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/>
            <path d="M2 12h20"/>
          </svg>
        );
      case 'Food/Culinary':
        return (
          <svg style={iconStyle} viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M18 8h1a4 4 0 0 1 0 8h-1"/>
            <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/>
            <line x1="6" y1="1" x2="6" y2="4"/>
            <line x1="10" y1="1" x2="10" y2="4"/>
            <line x1="14" y1="1" x2="14" y2="4"/>
          </svg>
        );
      case 'Film':
        return (
          <svg style={iconStyle} viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
            <line x1="8" y1="21" x2="16" y2="21"/>
            <line x1="12" y1="17" x2="12" y2="21"/>
          </svg>
        );
      default:
        return (
          <svg style={iconStyle} viewBox="0 0 24 24" fill="none" stroke="currentColor">
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
    if (!isDesign1) return null;
    const price = event.ticketPrice || event.price;
    if (!price) return t('event.pricesVary');
    const priceText = price.toString();
    if (priceText.includes('€') || priceText.includes('EUR')) return priceText;
    return `${priceText} €`;
  };

  const getSampleEvents = (): EventData[] => {
    const urlParams = new URLSearchParams(window.location.search);
    if (!isDesign1 || urlParams.get('test') !== '1') return [];
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
      const nextFriday = new Date(today);
      const daysUntilFriday = (5 - today.getDay() + 7) % 7;
      if (daysUntilFriday === 0 && today.getDay() === 5) {
        return today.toISOString().split('T')[0];
      } else {
        nextFriday.setDate(today.getDate() + (daysUntilFriday === 0 ? 7 : daysUntilFriday));
        return nextFriday.toISOString().split('T')[0];
      }
    }
    else return customDate || today.toISOString().split('T')[0];
  };

  const getWeekendDates = (): string[] => {
    const today = new Date();
    const nextFriday = new Date(today);
    const daysUntilFriday = (5 - today.getDay() + 7) % 7;
    if (daysUntilFriday === 0 && today.getDay() === 5) {
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

  const filterEventsByTimePeriod = (eventList: EventData[]): EventData[] => {
    if (timePeriod !== 'kommendes-wochenende') return eventList;
    const weekendDates = getWeekendDates();
    return eventList.filter(event => weekendDates.includes(event.date));
  };

  const toggleSuperCategory = (category: string) => {
    setCategoryLimitError(null);
    setSelectedSuperCategories(prev => {
      if (prev.includes(category)) {
        return prev.filter(c => c !== category);
      } else {
        if (prev.length >= MAX_CATEGORY_SELECTION) {
          setCategoryLimitError(`Du kannst maximal ${MAX_CATEGORY_SELECTION} Kategorien auswählen.`);
          return prev;
        }
        return [...prev, category];
      }
    });
  };

  const getSelectedSubcategories = (): string[] =>
    selectedSuperCategories.flatMap(superCat => EVENT_CATEGORY_SUBCATEGORIES[superCat]);

  const displayedEvents = isDesign1 && searchSubmitted ?
    filterEventsByTimePeriod(
      activeFilter === 'Alle'
        ? events
        : events.filter(event => {
            const eventSuperCategory = searchedSuperCategories.find(cat =>
              EVENT_CATEGORY_SUBCATEGORIES[cat]?.includes(event.category)
            );
            return eventSuperCategory === activeFilter;
          })
    ) : events;

  const getCategoryCounts = () => {
    const counts: { [key: string]: number } = { 'Alle': events.length };
    searchedSuperCategories.forEach(category => {
      const subcategories = EVENT_CATEGORY_SUBCATEGORIES[category] || [];
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
    setCacheInfo(null);

    if (isDesign1) {
      setSearchSubmitted(true);
      setSearchedSuperCategories([...selectedSuperCategories]);
      setActiveFilter('Alle');
      setTimeout(() => {
        const searchSection = document.querySelector('.search-section');
        if (searchSection) {
          const searchSectionBottom = searchSection.getBoundingClientRect().bottom + window.scrollY;
          window.scrollTo({
            top: searchSectionBottom,
            behavior: 'smooth'
          });
        }
      }, 100);
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
            max_tokens: 12000,
            debug: debugMode,
            disableCache: debugMode,
            expandedSubcategories: true,
            categoryConcurrency: 5,
            minEventsPerCategory: 14,
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

      const responseData = await res.json();
      if (responseData.status === 'completed') {
        setEvents(responseData.events || []);
        if (responseData.cacheInfo) setCacheInfo(responseData.cacheInfo);
        setLoading(false);
        setJobStatus('done');
        setToast({
          show: true,
          message: responseData.message || `${responseData.events?.length || 0} Events geladen`
        });
        setTimeout(() => setToast({show: false, message: ''}), 3000);
      } else if (responseData.status === 'partial') {
        setEvents(responseData.events || []);
        if (responseData.cacheInfo) setCacheInfo(responseData.cacheInfo);
        if (responseData.progress) setProgress(responseData.progress);
        if (responseData.events?.length > 0) {
          setToast({
            show: true,
            message: responseData.message || `${responseData.events.length} Events aus dem Cache, weitere werden geladen...`
          });
          setTimeout(() => setToast({show: false, message: ''}), 4000);
        }
        setJobId(responseData.jobId);
        startPolling(responseData.jobId);
      } else if (responseData.jobId) {
        setJobId(responseData.jobId);
        startPolling(responseData.jobId);
      } else {
        throw new Error('Unerwartete API-Antwort');
      }
    } catch (err: any) {
      setError(err?.message || 'Fehler beim Starten der Eventsuche.');
      setLoading(false);
      setJobStatus('idle');
    }
  };

  const startPolling = (jobId: string) => {
    if (pollInterval.current) {
      clearTimeout(pollInterval.current);
    }
    pollCountRef.current = 0;
    const maxPolls = MAX_POLLS;

    const performPoll = async (): Promise<void> => {
      pollCountRef.current++;
      setPollCount(pollCountRef.current);
      if (pollCountRef.current > maxPolls) {
        if (pollInterval.current) clearTimeout(pollInterval.current);
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
            if (job.cacheInfo) setCacheInfo(job.cacheInfo);
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
            if (pollInterval.current) clearTimeout(pollInterval.current);
            const nextIntervalMs = pollCountRef.current < 20 ? 3000 : 5000;
            pollInterval.current = setTimeout(performPoll, nextIntervalMs);
            return;
        }

        if (job.status !== 'pending') {
          if (pollInterval.current) clearTimeout(pollInterval.current);
          setLoading(false);
          if (job.status === 'done') {
            const incomingEvents: EventData[] = job.events || [];
            if (eventsRef.current.length === 0 && incomingEvents.length > 0) {
              const allNewEventKeys = new Set(incomingEvents.map(createEventKey));
              setNewEvents(allNewEventKeys);
              setToast({
                show: true,
                message: job.message || `${incomingEvents.length} Event${incomingEvents.length !== 1 ? 's' : ''} gefunden`
              });
              setTimeout(() => {
                setToast({show: false, message: ''});
                setNewEvents(new Set());
              }, 3000);
            } else if (incomingEvents.length > eventsRef.current.length) {
              const newCount = incomingEvents.length - eventsRef.current.length;
              setToast({
                show: true,
                message: `${newCount} weitere Event${newCount !== 1 ? 's' : ''} gefunden`
              });
              setTimeout(() => {
                setToast({show: false, message: ''});
              }, 3000);
            }
            setEvents([...incomingEvents]);
            if (job.cacheInfo) setCacheInfo(job.cacheInfo);
            setJobStatus('done');
            if (job.debug) setDebugData(job.debug);
          } else {
            setJobStatus('error');
            setError(job.error || 'Fehler bei der Eventsuche.');
          }
        } else {
          if (pollInterval.current) clearTimeout(pollInterval.current);
          const nextIntervalMs = pollCountRef.current < 20 ? 3000 : 5000;
          pollInterval.current = setTimeout(performPoll, nextIntervalMs);
        }
      } catch {
        setToast({
          show: true,
          message: `Netzwerkfehler (Versuch ${pollCountRef.current}) - Suche läuft weiter...`
        });
        setTimeout(() => {
          setToast({show: false, message: ''});
        }, 3000);
        if (pollInterval.current) clearTimeout(pollInterval.current);
        const nextIntervalMs = pollCountRef.current < 20 ? 3000 : 5000;
        pollInterval.current = setTimeout(performPoll, nextIntervalMs);
      }
    };

    performPoll();
  };

  return (
    <div className="min-h-screen">
      {isDesign1 && (
        <header className="design1-header">
          <div className="header-container">
            <div className="header-logo">
              <img src="/where2go-logo.svg" alt="Where2Go" className="logo" />
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

      <section className={`hero ${isDesign1 && searchSubmitted ? 'hero-collapsed' : ''}`}>
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
              {t('button.searchEvents')}
            </button>
          </form>
        </div>
      </section>

      <div className="container">
        <div className={isDesign1 && searchSubmitted ? "content-with-sidebar" : ""}>
          {isDesign1 && searchSubmitted && (
            <aside className="filter-sidebar">
              <h3 className="sidebar-title">Filter & Kategorien</h3>
              <div className="filter-chips">
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
                    ? 'Weitere Events werden geladen...'
                    : 'Suche läuft... bitte habe etwas Geduld'
                  }
                </p>
                {jobStatus === 'pending' && progress && (
                  <p>Kategorien: <span className="font-mono">{progress.completedCategories}/{progress.totalCategories}</span> abgeschlossen</p>
                )}
                {jobStatus === 'pending' && pollCount > 10 && (
                  <p className="text-sm opacity-70">Suche dauert länger als erwartet (ca. {Math.round(pollCount * 5 / 60)} Min.)</p>
                )}
              </div>
            )}

            {!loading && !displayedEvents.length && !error && (
              <div className="empty-state">
                <h3>{isDesign1 && searchSubmitted ? 'Keine Events gefunden' : 'Bereit für dein nächstes Abenteuer?'}</h3>
                <p>{isDesign1 && searchSubmitted ? 'Versuche andere Filter oder starte eine neue Suche.' : 'Starte eine Suche, um die besten Events in deiner Stadt zu entdecken.'}</p>
              </div>
            )}

            {!!displayedEvents.length && (
              <>
                {cacheInfo && (
                  <div style={{
                    textAlign: 'center',
                    marginBottom: '20px',
                    color: '#666',
                    fontWeight: '300',
                    fontSize: '0.9rem'
                  }}>
                    {cacheInfo.fromCache ? (
                      <span>📁 {cacheInfo.cachedEvents} Events aus dem Cache geladen</span>
                    ) : (
                      <span>🔄 {cacheInfo.totalEvents} Events frisch geladen</span>
                    )}
                  </div>
                )}
                <div className="events-grid" ref={eventsGridRef}>
                  {displayedEvents.map((event) => {
                    const eventKey = createEventKey(event);
                    const isNew = newEvents.has(eventKey);
                    const superCategory = isDesign1 && searchSubmitted
                      ? searchedSuperCategories.find(cat => EVENT_CATEGORY_SUBCATEGORIES[cat]?.includes(event.category)) || event.category
                      : ALL_SUPER_CATEGORIES.find(cat => EVENT_CATEGORY_SUBCATEGORIES[cat].includes(event.category)) || event.category;

                    const isVenueEvent = isLikelyVenue(event);

                    return (
                      <div key={eventKey} className={`event-card ${isNew ? 'event-card-new' : ''} ${isVenueEvent ? 'event-card-venue' : ''}`}>
                        {isNew && <div className="badge-new">Neu</div>}
                        <div className="event-content">
                          <h3 className="event-title">{event.title}</h3>

                          {isDesign1 ? (
                            <>
                              <div className="event-datetime">
                                <div className="event-date-d1">
                                  <svg className="icon-date" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                                    <line x1="16" y1="2" x2="16" y2="6"/>
                                    <line x1="8" y1="2" x2="8" y2="6"/>
                                    <line x1="3" y1="10" x2="21" y2="10"/>
                                  </svg>
                                  {(() => {
                                    const { date, time } = formatEventDateTime(event.date, event.time, event.endTime);
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
                                <div className="event-location-content">
                                  <a
                                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.address || event.venue)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="event-venue-link"
                                    title="Venue in Google Maps öffnen"
                                  >
                                    {event.venue}
                                  </a>
                                </div>
                              </div>

                              {superCategory && (
                                <div className="event-category">
                                  {getCategoryIcon(superCategory)}
                                  {superCategory}
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
                                <div className="event-category">
                                  {getCategoryIcon(superCategory)}
                                  {superCategory}
                                </div>
                              )}

                              {event.eventType && (
                                <div className="event-type">
                                  {getEventTypeIcon()}
                                  {event.eventType}
                                </div>
                              )}

                              {(event.price || event.ticketPrice) && (
                                <div className="event-price">
                                  💰 {event.ticketPrice || event.price}
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
              </>
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
                  <strong> Added:</strong> {step.addedCount || 0} |
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
