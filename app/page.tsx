'use client';
import { useEffect, useRef, useState } from 'react';
import { EVENT_CATEGORY_SUBCATEGORIES } from './lib/eventCategories';
import { useTranslation } from './lib/useTranslation';
import { startJobPolling, deduplicateEvents as dedupFront } from './lib/polling';

interface EventData {
  title: string;
  category: string;
  date: string;     // YYYY-MM-DD
  time: string;     // "HH:mm"
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
  source?: 'cache' | 'ai' | 'rss' | 'ra' | string;
}

const ALL_SUPER_CATEGORIES = Object.keys(EVENT_CATEGORY_SUBCATEGORIES);
const MAX_CATEGORY_SELECTION = 3;

// Polling config
const POLL_INTERVAL_MS = 2000; // vorher 4000
const MAX_POLLS = 48; // UI and tests may refer to 48; adjust here if you raise global window

export default function Home() {
  const { t } = useTranslation();
  const [city, setCity] = useState('');
  const [timePeriod, setTimePeriod] = useState('heute');
  const [customDate, setCustomDate] = useState('');
  const [showDateDropdown, setShowDateDropdown] = useState(false);

  const [selectedSuperCategories, setSelectedSuperCategories] = useState<string[]>([]);
  const [categoryLimitError, setCategoryLimitError] = useState<string | null>(null);

  const [events, setEvents] = useState<EventData[]>([]);
  const [loading, setLoading] = useState(false);
  const [stepLoading, setStepLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [searchSubmitted, setSearchSubmitted] = useState(false);
  const [searchedSuperCategories, setSearchedSuperCategories] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState('Alle');

  const [cacheInfo, setCacheInfo] = useState<{fromCache: boolean; totalEvents: number; cachedEvents: number} | null>(null);
  const [toast, setToast] = useState<{show:boolean; message:string}>({show:false,message:''});

  // Active polling state (Fix: ensure pollInstanceId is provided)
  const pollInstanceRef = useRef(0);
  const [activePolling, setActivePolling] = useState<{ jobId: string; cleanup: () => void; pollInstanceId: number } | null>(null);

  // Debug logs state
  const [debugLogs, setDebugLogs] = useState<{
    apiCalls: Array<{
      timestamp: string;
      url: string;
      method: string;
      body?: any;
      response?: any;
      status?: number;
    }>;
    aiRequests: Array<{
      timestamp: string;
      query: string;
      response: string;
      category?: string;
      parsedCount?: number;
    }>;
    wienInfoData: Array<{
      timestamp: string;
      url: string;
      query?: string;
      response?: string;
      parsedEvents?: number;
      filteredEvents?: number;
      rawCategoryCounts?: Record<string, number>;
      mappedCategoryCounts?: Record<string, number>;
      unknownRawCategories?: string[];
      scrapedContent?: string;
      events?: any[];
      error?: string;
    }>;
  }>({
    apiCalls: [],
    aiRequests: [],
    wienInfoData: []
  });

  const resultsAnchorRef = useRef<HTMLDivElement | null>(null);
  const timeSelectWrapperRef = useRef<HTMLDivElement | null>(null);
  const cancelRef = useRef<{cancel:boolean}>({cancel:false});

  // Dropdown außerhalb/Escape schließen
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!showDateDropdown) return;
      if (timeSelectWrapperRef.current && !timeSelectWrapperRef.current.contains(e.target as Node)) {
        setShowDateDropdown(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setShowDateDropdown(false);
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [showDateDropdown]);

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

  const getSelectedSubcategories = (superCats: string[]): string[] =>
    superCats.flatMap(superCat => EVENT_CATEGORY_SUBCATEGORIES[superCat]);

  // Date helpers
  function toISODate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  function todayISO() { return toISODate(new Date()); }
  function tomorrowISO() { const d = new Date(); d.setDate(d.getDate()+1); return toISODate(d); }
  function nextWeekendDatesISO(): string[] {
    const t = new Date();
       const day = t.getDay(); // 0 So ... 6 Sa
    const offset = (5 - day + 7) % 7; // nächster Freitag
    const fri = new Date(t); fri.setDate(t.getDate() + offset);
    const sat = new Date(fri); sat.setDate(fri.getDate() + 1);
    const sun = new Date(fri); sun.setDate(fri.getDate() + 2);
    return [toISODate(fri), toISODate(sat), toISODate(sun)];
  }
  function formatLabelDE(iso: string) {
    if (!iso) return 'Benutzerdefiniert';
    const [y,m,d] = iso.split('-');
    return `${d}.${m}.${y}`;
  }

  function formatDateForAPI(): string {
    if (timePeriod === 'heute') return todayISO();
    if (timePeriod === 'morgen') return tomorrowISO();
    if (timePeriod === 'kommendes-wochenende') return nextWeekendDatesISO()[0];
    return customDate || todayISO();
  }

  function matchesSelectedDate(ev: EventData): boolean {
    const evDate = ev.date?.slice(0,10);
    if (!evDate) return true;
    if (timePeriod === 'heute') return evDate === todayISO();
    if (timePeriod === 'morgen') return evDate === tomorrowISO();
    if (timePeriod === 'kommendes-wochenende') {
      const wk = nextWeekendDatesISO();
      return wk.includes(evDate);
    }
    if (customDate) return evDate === customDate;
    return true;
  }

  function formatEventDateTime(dateStr: string, startTime?: string, endTime?: string) {
    const dateObj = new Date(dateStr);
    if (isNaN(dateObj.getTime())) return { date: dateStr, time: startTime || '' };

    const weekday = dateObj.toLocaleDateString('en-GB', { weekday: 'short' }); // Fri
    const day = dateObj.getDate();
    const monthLabel = dateObj.toLocaleDateString('en-GB', { month: 'short' }); // Sept
    const year = dateObj.getFullYear();
    const ordinal = (d: number) => {
      if (d === 1 || d === 21 || d === 31) return `${d}st`;
      if (d === 2 || d === 22) return `${d}nd`;
      if (d === 3 || d === 23) return `${d}rd`;
      return `${d}th`;
    };
    const dateFormatted = `${weekday}. ${ordinal(day)} ${monthLabel} ${year}`;

    const fmtTime = (val?: string) => {
      if (!val) return '';
      const m = val.match(/^(\d{1,2}):(\d{2})/);
      if (!m) return val;
      let h = parseInt(m[1], 10);
      const min = m[2];
      const ampm = h >= 12 ? 'pm' : 'am';
      h = h % 12;
      if (h === 0) h = 12;
      return `${h}:${min} ${ampm}`;
    };

    let timeLabel = '';
    if (startTime && endTime) {
      timeLabel = `${fmtTime(startTime)} - ${fmtTime(endTime)}`;
    } else if (startTime) {
      timeLabel = fmtTime(startTime);
    }
    return { date: dateFormatted, time: timeLabel };
  }

  // Preisformat
  function guessCurrencyByCity(c: string) {
    const cityLC = c.toLowerCase();
    if (/miami|new york|los angeles|san francisco|usa|united states|orlando/.test(cityLC)) return { symbol: '$', code: 'USD' };
    if (/london|uk|united kingdom|manchester|edinburgh/.test(cityLC)) return { symbol: '£', code: 'GBP' };
    if (/zurich|zürich|geneva|genf|basel|bern|switzerland|schweiz/.test(cityLC)) return { symbol: 'CHF', code: 'CHF' };
    return { symbol: '€', code: 'EUR' };
  }
  function normalizePriceString(p: string) { return p.replace(/\s+/g, ' ').trim(); }
  function formatPriceDisplay(p: string): string {
    if (!p) return 'Keine Preisinfos';
    const str = normalizePriceString(p);
    if (/[€$£]|EUR|USD|GBP|CHF|PLN|CZK|HUF|DKK|SEK|NOK|CAD|AUD/i.test(str)) {
      return str.replace(/(\d)\s*€/, '$1 €');
    }
    if (/anfrage/i.test(str)) return 'Preis auf Anfrage';
    const cur = guessCurrencyByCity(city);
    const range = str.match(/^(\d+)\s*[-–]\s*(\d+)$/);
    if (range) return `${range[1]}–${range[2]} ${cur.symbol}`;
    const single = str.match(/^(\d+)(?:[.,](\d{1,2}))?$/);
    if (single) return `${single[1]}${single[2] ? ','+single[2] : ''} ${cur.symbol}`;
    return str;
  }

  function dedupMerge(current: EventData[], incoming: EventData[]) {
    // Reuse front-end light dedup
    return dedupFront(current, incoming);
  }

  async function fetchForSuperCategory(superCat: string) {
    const subs = EVENT_CATEGORY_SUBCATEGORIES[superCat] || [];
    if (subs.length === 0) return;
    setStepLoading(superCat);
    try {
      const reqBody = {
        city: city.trim(),
        date: formatDateForAPI(),
        categories: subs,
        options: {
          temperature: 0.2,
          max_tokens: 12000,
          expandedSubcategories: true,
          debug: true // Always enable debug for logging
        }
      };

      // Log API call
      setDebugLogs(prev => ({
        ...prev,
        apiCalls: [...prev.apiCalls, {
          timestamp: new Date().toISOString(),
          url: '/api/events',
          method: 'POST',
          body: reqBody
        }]
      }));

      const res = await fetch('/api/events', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify(reqBody)
      });
      
      if (!res.ok) {
        const data = await res.json().catch(()=> ({}));
        // Log error response
        setDebugLogs(prev => ({
          ...prev,
          apiCalls: prev.apiCalls.map((call, idx) => 
            idx === prev.apiCalls.length - 1 ? 
            { ...call, status: res.status, response: data } : call
          )
        }));
        throw new Error(data.error || `Serverfehler ${res.status}`);
      }
      
      const data = await res.json();
      
      // Log successful response
      setDebugLogs(prev => ({
        ...prev,
        apiCalls: prev.apiCalls.map((call, idx) => 
          idx === prev.apiCalls.length - 1 ? 
          { ...call, status: res.status, response: data } : call
        )
      }));

      const incoming: EventData[] = data.events || [];
      setEvents(prev => dedupMerge(prev, incoming));
      if (data.cacheInfo) setCacheInfo(data.cacheInfo);
    } finally {
      setStepLoading(null);
    }
  }

  
  async function progressiveSearchEvents() {
    if (!city.trim()) {
      setError('Bitte gib eine Stadt ein.');
      return;
    }
    cancelRef.current.cancel = true;
    await new Promise(r => setTimeout(r, 0));
    cancelRef.current = { cancel:false };

    if (activePolling) {
      try { activePolling.cleanup(); } catch {}
      setActivePolling(null);
    }

    // Clear previous debug logs
    setDebugLogs({
      apiCalls: [],
      aiRequests: [],
      wienInfoData: []
    });

    setLoading(true);
    setError(null);
    setEvents([]);
    setCacheInfo(null);
    setSearchSubmitted(true);
    setSearchedSuperCategories([...selectedSuperCategories]);
    setActiveFilter('Alle');

    try {
      const reqBody = {
        city: city.trim(),
        date: formatDateForAPI(),
        categories: selectedSuperCategories.length ? getSelectedSubcategories(selectedSuperCategories) : [],
        options: {
          progressive: true,
          timePeriod: timePeriod,
          customDate: customDate,
          debug: true, // Always enable debug
          fetchWienInfo: true // Enable Wien.info fetching
        }
      };

      // Log main API call
      setDebugLogs(prev => ({
        ...prev,
        apiCalls: [...prev.apiCalls, {
          timestamp: new Date().toISOString(),
          url: '/api/events',
          method: 'POST',
          body: reqBody
        }]
      }));

      // RICHTIG: Job per /api/events anlegen (keine jobId im Body mitschicken)
      const jobRes = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify(reqBody)
      });
      if (!jobRes.ok) {
        const data = await jobRes.json().catch(()=> ({}));
        // Log error response
        setDebugLogs(prev => ({
          ...prev,
          apiCalls: prev.apiCalls.map((call, idx) => 
            idx === prev.apiCalls.length - 1 ? 
            { ...call, status: jobRes.status, response: data } : call
          )
        }));
        throw new Error(data.error || `Serverfehler ${jobRes.status}`);
      }
      const data = await jobRes.json();
      const initialEvents = Array.isArray(data.events) ? data.events : [];
      if (initialEvents.length) {
        setEvents(prev => dedupMerge(prev, initialEvents));
        if (data.cacheInfo) setCacheInfo(data.cacheInfo);
      }

      // Log successful response
      setDebugLogs(prev => ({
        ...prev,
        apiCalls: prev.apiCalls.map((call, idx) => 
          idx === prev.apiCalls.length - 1 ? 
          { ...call, status: jobRes.status, response: data } : call
        )
      }));

      const onEvents = (chunk: EventData[], _getCurrent: () => EventData[]) => {
        setEvents(prev => dedupMerge(prev, chunk));
      };
      const getCurrent = () => events;
      const onDone = (_final: EventData[], _status: string) => {
        setStepLoading(null);
        setLoading(false);
        setTimeout(()=> setToast({show:false, message:''}), 2000);
        if (resultsAnchorRef.current) {
          resultsAnchorRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        // Fetch debug information after job is done
        if (data.jobId) {
          fetchDebugInfo(data.jobId);
        }
      };

      const cleanup = startJobPolling(data.jobId, onEvents, getCurrent, onDone, POLL_INTERVAL_MS, MAX_POLLS);
      const nextInstance = ++pollInstanceRef.current;
      setActivePolling({ jobId: data.jobId, cleanup, pollInstanceId: nextInstance });

      // Optional: parallele UI-Fetches pro Superkategorie
      const superCats =
        selectedSuperCategories.length > 0 ? [...selectedSuperCategories] : [...ALL_SUPER_CATEGORIES];
      for (const sc of superCats) {
        if (cancelRef.current.cancel) return;
        await fetchForSuperCategory(sc);
      }
    } catch(e:any){
      setError(e.message || 'Fehler bei der Suche');
      setLoading(false);
      setStepLoading(null);
    }
  }

  // Fetch debug information from job
  async function fetchDebugInfo(jobId: string) {
    try {
      const debugRes = await fetch(`/api/jobs/${jobId}?debug=1`);
      if (debugRes.ok) {
        const debugData = await debugRes.json();
        
        // Log debug data
        setDebugLogs(prev => ({
          ...prev,
          apiCalls: [...prev.apiCalls, {
            timestamp: new Date().toISOString(),
            url: `/api/jobs/${jobId}?debug=1`,
            method: 'GET',
            response: debugData,
            status: debugRes.status
          }]
        }));

        // Extract AI requests from debug data
        if (debugData.debug && debugData.debug.steps) {
          const aiRequests = debugData.debug.steps.map((step: any) => ({
            timestamp: debugData.debug.createdAt || new Date().toISOString(),
            query: step.query || '',
            response: step.response || '',
            category: step.category || '',
            parsedCount: step.parsedCount || 0
          }));

          setDebugLogs(prev => ({
            ...prev,
            aiRequests: [...prev.aiRequests, ...aiRequests]
          }));
        }

        // Check for Wien.info specific data
        if (debugData.debug && debugData.debug.wienInfoData) {
          const wienData = debugData.debug.wienInfoData;
          setDebugLogs(prev => ({
            ...prev,
            wienInfoData: [...prev.wienInfoData, {
              timestamp: new Date().toISOString(),
              url: wienData.url || '',
              query: wienData.query || '',
              response: wienData.response || '',
              parsedEvents: wienData.parsedEvents || 0,
              filteredEvents: wienData.filteredEvents || 0,
              rawCategoryCounts: wienData.rawCategoryCounts || {},
              mappedCategoryCounts: wienData.mappedCategoryCounts || {},
              unknownRawCategories: wienData.unknownRawCategories || [],
              scrapedContent: wienData.scrapedContent || '',
              events: wienData.events || [],
              error: wienData.error || ''
            }]
          }));
        }
      }
    } catch (e) {
      console.warn('Failed to fetch debug info:', e);
    }
  }

  const displayedEvents = (() => {
    const dateFiltered = events.filter(matchesSelectedDate);
    if (!searchSubmitted) return dateFiltered;
    if (activeFilter === 'Alle') return dateFiltered;
    const subs = EVENT_CATEGORY_SUBCATEGORIES[activeFilter] || [];
    return dateFiltered.filter(e => subs.includes(e.category));
  })();

  const getCategoryCounts = () => {
    const counts: Record<string, number> = { 'Alle': events.filter(matchesSelectedDate).length };
    searchedSuperCategories.forEach(cat => {
      const subs = EVENT_CATEGORY_SUBCATEGORIES[cat] || [];
      counts[cat] = events.filter(e => subs.includes(e.category)).filter(matchesSelectedDate).length;
    });
    return counts;
  };

  const eventIcon = (cat: string) => {
    const iconProps = { width:16, height:16, strokeWidth:2 };
    switch (cat) {
      case 'DJ Sets/Electronic':
      case 'Clubs/Discos':
        return (
          <svg {...iconProps as any} viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
          </svg>
        );
      case 'Live-Konzerte':
        return (
          <svg {...iconProps as any} viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M12 3v18"/><path d="M8 21l4-7 4 7"/><path d="M8 3l4 7 4-7"/>
          </svg>
        );
      default:
        return (
          <svg {...iconProps as any} viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
            <line x1="7" y1="7" x2="7.01" y2="7"/>
          </svg>
        );
    }
  };

  const renderPrice = (ev: EventData) => {
    const p = ev.ticketPrice || ev.price;
    const text = p ? formatPriceDisplay(p) : 'Keine Preisinfos';
    return <span className="price-chip">{text}</span>;
  };

  const renderSourceBadge = (src?: string) => {
    const label =
      src === 'rss' ? 'RSS' :
      src === 'ai'  ? 'KI'  :
      src === 'ra'  ? 'API' :
      src === 'cache' ? 'Cache' : null;
    if (!label) return null;
    return <span className={`src-badge src-${src}`}>{label}</span>;
  };

  return (
    <div className="min-h-screen">
      <header className="header">
        <div className="container header-inner header-centered">
          <div className="header-logo-wrapper">
            <img src="/where2go-full.png" alt="Where2Go" />
          </div>
          <div className="premium-box">
            <a href="#premium" className="premium-link">
              <span className="premium-icon">⭐</span> Premium
            </a>
          </div>
        </div>
      </header>

      <section className="search-section">
        <div className="container">
          <form
            className="search-form"
            onSubmit={e => {
              e.preventDefault();
              progressiveSearchEvents();
            }}
          >
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="city">Stadt</label>
                <input
                  id="city"
                  className="form-input"
                  value={city}
                  onChange={e=>setCity(e.target.value)}
                  placeholder="z.B. Berlin, Hamburg ..."
                />
              </div>

              <div className="form-group select-with-dropdown" ref={timeSelectWrapperRef}>
                <label htmlFor="timePeriod">Zeitraum</label>
                <select
                  id="timePeriod"
                  className="form-input"
                  value={timePeriod}
                  onChange={e=>{
                    const val = e.target.value;
                    setTimePeriod(val);
                    if (val === 'benutzerdefiniert') {
                      if (!customDate) setCustomDate(todayISO());
                      setShowDateDropdown(true);
                    } else {
                      setShowDateDropdown(false);
                    }
                  }}
                >
                  <option value="heute">Heute</option>
                  <option value="morgen">Morgen</option>
                  <option value="kommendes-wochenende">Kommendes Wochenende</option>
                  <option value="benutzerdefiniert">{customDate ? formatLabelDE(customDate) : 'Benutzerdefiniert'}</option>
                </select>

                {showDateDropdown && (
                  <div className="date-dropdown" role="dialog" aria-label="Datum wählen">
                    <TwoMonthCalendar
                      value={customDate || todayISO()}
                      minISO={todayISO()}
                      onSelect={(iso) => { setCustomDate(iso); setShowDateDropdown(false); }}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="categories-section">
              <label className="categories-label">Kategorien</label>
              <div className="categories-grid">
                {ALL_SUPER_CATEGORIES.map(c => (
                  <label key={c} className="category-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedSuperCategories.includes(c)}
                      onChange={()=>toggleSuperCategory(c)}
                      disabled={
                        !selectedSuperCategories.includes(c) &&
                        selectedSuperCategories.length >= MAX_CATEGORY_SELECTION
                      }
                    />
                    <span className="category-name">{c}</span>
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
              {categoryLimitError && <div className="cat-error">{categoryLimitError}</div>}
            </div>

            <button type="submit" className="btn-search">Events suchen</button>
          </form>
        </div>
      </section>

      <div className="container" ref={resultsAnchorRef}>
        {searchSubmitted && (
          <div className="results-filter-bar">
            <div className="filter-chips-inline">
              <button
                className={`filter-chip ${activeFilter==='Alle' ? 'filter-chip-active':''}`}
                onClick={()=>setActiveFilter('Alle')}
              >
                <span>Alle</span>
                <span className="filter-count">{getCategoryCounts()['Alle']}</span>
              </button>
              {searchedSuperCategories.map(cat => (
                <button
                  key={cat}
                  className={`filter-chip ${activeFilter===cat ? 'filter-chip-active':''}`}
                  onClick={()=>setActiveFilter(cat)}
                >
                  <span>{cat}</span>
                  <span className="filter-count">{getCategoryCounts()[cat] || 0}</span>
                </button>
              ))}
            </div>
            {stepLoading && (
              <div className="progress-note">
                Lädt Kategorie: {stepLoading} ...
              </div>
            )}
          </div>
        )}

        <main className="main-content">
          {error && <div className="error">{error}</div>}

          {loading && events.length === 0 && (
            <div className="loading">
              <W2GLoader5 />
              <p>Suche läuft...</p>
            </div>
          )}

          {!loading && !error && searchSubmitted && displayedEvents.length === 0 && (
            <div className="empty-state">
              <h3>Keine Events gefunden</h3>
              <p>Probiere andere Kategorien oder ein anderes Datum.</p>
            </div>
          )}

          {cacheInfo && displayedEvents.length > 0 && (
            <div className="cache-info-banner">
              {cacheInfo.fromCache
                ? `📁 ${cacheInfo.cachedEvents} Events aus Cache`
                : `🔄 ${cacheInfo.totalEvents} Events frisch geladen`}
            </div>
          )}

          {displayedEvents.length > 0 && (
            <div className="events-grid">
              {displayedEvents.map(ev => {
                const key = `${ev.title}_${ev.date}_${ev.venue}`;
                const superCat =
                  searchedSuperCategories.find(c => EVENT_CATEGORY_SUBCATEGORIES[c]?.includes(ev.category)) ||
                  ALL_SUPER_CATEGORIES.find(c => EVENT_CATEGORY_SUBCATEGORIES[c]?.includes(ev.category)) ||
                  ev.category;

                const { date: formattedDate, time: formattedTime } =
                  formatEventDateTime(ev.date, ev.time, ev.endTime);

                return (
                  <div key={key} className="event-card">
                    <h3 className="event-title">
                      {ev.title}
                      {renderSourceBadge(ev.source)}
                    </h3>

                    <div className="event-meta-line">
                      <svg width="16" height="16" strokeWidth={2} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                        <line x1="16" y1="2" x2="16" y2="6"/>
                        <line x1="8" y1="2" x2="8" y2="6"/>
                        <line x1="3" y1="10" x2="21" y2="10"/>
                      </svg>
                      <span className="event-date">{formattedDate}</span>
                      {formattedTime && (
                        <>
                          <svg width="16" height="16" strokeWidth={2} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/>
                          </svg>
                          <span className="event-time">{formattedTime}</span>
                        </>
                      )}
                    </div>

                    <div className="event-meta-line">
                      <svg width="16" height="16" strokeWidth={2} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                      </svg>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ev.address || ev.venue)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="venue-link"
                      >
                        {ev.venue}
                      </a>
                    </div>

                    {superCat && (
                      <div className="event-meta-line">
                        {eventIcon(superCat)}
                        <span>{superCat}</span>
                      </div>
                    )}

                    {ev.eventType && (
                      <div className="event-meta-line">
                        <svg width="16" height="16" strokeWidth={2} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path d="M20 9V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v2"/>
                          <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V9s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
                          <line x1="4" y1="22" x2="4" y2="15"/>
                          <line x1="20" y1="22" x2="20" y2="15"/>
                        </svg>
                        <span>{ev.eventType}</span>
                      </div>
                    )}

                    {ev.ageRestrictions && (
                      <div className="event-meta-line">
                        <svg width="16" height="16" strokeWidth={2} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <circle cx="12" cy="12" r="10"/>
                          <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                        </svg>
                        <span>{ev.ageRestrictions}</span>
                      </div>
                    )}

                    {ev.description && (
                      <div className="event-description">{ev.description}</div>
                    )}

                    <div className="event-cta-row">
                      {renderPrice(ev)}
                      {ev.website ? (
                        <a
                          href={ev.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-outline with-icon"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
                          </svg>
                          Mehr Info
                        </a>
                      ) : <span />}
                      {ev.bookingLink ? (
                        <a
                          href={ev.bookingLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-outline tickets with-icon"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2z"/>
                            <path d="M13 7v2M13 11v2M13 15v2"/>
                          </svg>
                          Tickets
                        </a>
                      ) : <span />}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {toast.show && (
        <div className="toast-container">
          <div className="toast">{toast.message}</div>
        </div>
      )}

      {/* Debug Logs Section */}
      {(debugLogs.apiCalls.length > 0 || debugLogs.aiRequests.length > 0 || debugLogs.wienInfoData.length > 0) && (
        <div style={{ 
          margin: '40px 0', 
          padding: '20px', 
          background: '#f8f9fa', 
          border: '1px solid #dee2e6',
          borderRadius: '8px',
          fontFamily: 'monospace',
          fontSize: '12px'
        }}>
          <h3 style={{ marginBottom: '20px', color: '#495057' }}>🔍 Debug Logs (Temporary)</h3>
          
          {/* API Calls */}
          {debugLogs.apiCalls.length > 0 && (
            <div style={{ marginBottom: '30px' }}>
              <h4 style={{ color: '#007bff', marginBottom: '10px' }}>📡 API Calls ({debugLogs.apiCalls.length})</h4>
              {debugLogs.apiCalls.map((call, idx) => (
                <div key={idx} style={{ 
                  marginBottom: '15px', 
                  padding: '10px', 
                  background: '#fff', 
                  border: '1px solid #e9ecef',
                  borderRadius: '4px'
                }}>
                  <div style={{ color: '#28a745', fontWeight: 'bold' }}>
                    {call.method} {call.url} {call.status && `(${call.status})`}
                  </div>
                  <div style={{ color: '#6c757d', fontSize: '10px' }}>{call.timestamp}</div>
                  {call.body && (
                    <details style={{ marginTop: '8px' }}>
                      <summary style={{ cursor: 'pointer', color: '#007bff' }}>Request Body</summary>
                      <pre style={{ 
                        marginTop: '5px', 
                        padding: '8px', 
                        background: '#f8f9fa', 
                        border: '1px solid #dee2e6',
                        borderRadius: '3px',
                        overflow: 'auto',
                        maxHeight: '200px'
                      }}>
                        {JSON.stringify(call.body, null, 2)}
                      </pre>
                    </details>
                  )}
                  {call.response && (
                    <details style={{ marginTop: '8px' }}>
                      <summary style={{ cursor: 'pointer', color: '#007bff' }}>Response</summary>
                      <pre style={{ 
                        marginTop: '5px', 
                        padding: '8px', 
                        background: '#f8f9fa', 
                        border: '1px solid #dee2e6',
                        borderRadius: '3px',
                        overflow: 'auto',
                        maxHeight: '200px'
                      }}>
                        {JSON.stringify(call.response, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* AI Requests */}
          {debugLogs.aiRequests.length > 0 && (
            <div style={{ marginBottom: '30px' }}>
              <h4 style={{ color: '#dc3545', marginBottom: '10px' }}>🤖 AI Requests ({debugLogs.aiRequests.length})</h4>
              {debugLogs.aiRequests.map((req, idx) => (
                <div key={idx} style={{ 
                  marginBottom: '15px', 
                  padding: '10px', 
                  background: '#fff', 
                  border: '1px solid #e9ecef',
                  borderRadius: '4px'
                }}>
                  <div style={{ color: '#dc3545', fontWeight: 'bold' }}>
                    AI Query {req.category && `(${req.category})`}
                  </div>
                  <div style={{ color: '#6c757d', fontSize: '10px' }}>
                    {req.timestamp} - Parsed: {req.parsedCount || 0} events
                  </div>
                  <details style={{ marginTop: '8px' }}>
                    <summary style={{ cursor: 'pointer', color: '#007bff' }}>Query</summary>
                    <pre style={{ 
                      marginTop: '5px', 
                      padding: '8px', 
                      background: '#fff3cd', 
                      border: '1px solid #ffeaa7',
                      borderRadius: '3px',
                      overflow: 'auto',
                      maxHeight: '150px'
                    }}>
                      {req.query}
                    </pre>
                  </details>
                  <details style={{ marginTop: '8px' }}>
                    <summary style={{ cursor: 'pointer', color: '#007bff' }}>AI Response</summary>
                    <pre style={{ 
                      marginTop: '5px', 
                      padding: '8px', 
                      background: '#d1ecf1', 
                      border: '1px solid #bee5eb',
                      borderRadius: '3px',
                      overflow: 'auto',
                      maxHeight: '300px'
                    }}>
                      {req.response}
                    </pre>
                  </details>
                </div>
              ))}
            </div>
          )}

          {/* Wien.info Data */}
          {debugLogs.wienInfoData.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ color: '#fd7e14', marginBottom: '10px' }}>🇦🇹 Wien.info Data ({debugLogs.wienInfoData.length})</h4>
              {debugLogs.wienInfoData.map((data, idx) => (
                <div key={idx} style={{ 
                  marginBottom: '15px', 
                  padding: '10px', 
                  background: '#fff', 
                  border: '1px solid #e9ecef',
                  borderRadius: '4px'
                }}>
                  <div style={{ color: '#fd7e14', fontWeight: 'bold' }}>
                    Wien.info JSON API
                  </div>
                  <div style={{ color: '#6c757d', fontSize: '10px' }}>
                    {data.timestamp} - URL: {data.url}
                  </div>
                  {data.query && (
                    <div style={{ marginTop: '8px', fontSize: '11px' }}>
                      <strong>Query:</strong> {data.query}
                    </div>
                  )}
                  {(data.parsedEvents !== undefined || data.filteredEvents !== undefined) && (
                    <div style={{ marginTop: '8px', padding: '8px', background: '#e8f5e8', borderRadius: '3px' }}>
                      {data.parsedEvents !== undefined && <div><strong>Parsed Events:</strong> {data.parsedEvents}</div>}
                      {data.filteredEvents !== undefined && <div><strong>Filtered Events:</strong> {data.filteredEvents}</div>}
                    </div>
                  )}
                  {data.rawCategoryCounts && Object.keys(data.rawCategoryCounts).length > 0 && (
                    <details style={{ marginTop: '8px' }}>
                      <summary style={{ cursor: 'pointer', color: '#007bff' }}>
                        Raw Category Counts ({Object.keys(data.rawCategoryCounts).length} types)
                      </summary>
                      <pre style={{ 
                        marginTop: '5px', 
                        padding: '8px', 
                        background: '#f8f9fa', 
                        border: '1px solid #dee2e6',
                        borderRadius: '3px',
                        overflow: 'auto',
                        maxHeight: '200px'
                      }}>
                        {JSON.stringify(data.rawCategoryCounts, null, 2)}
                      </pre>
                    </details>
                  )}
                  {data.mappedCategoryCounts && Object.keys(data.mappedCategoryCounts).length > 0 && (
                    <details style={{ marginTop: '8px' }}>
                      <summary style={{ cursor: 'pointer', color: '#007bff' }}>
                        Mapped Category Counts ({Object.keys(data.mappedCategoryCounts).length} types)
                      </summary>
                      <pre style={{ 
                        marginTop: '5px', 
                        padding: '8px', 
                        background: '#f8f9fa', 
                        border: '1px solid #dee2e6',
                        borderRadius: '3px',
                        overflow: 'auto',
                        maxHeight: '200px'
                      }}>
                        {JSON.stringify(data.mappedCategoryCounts, null, 2)}
                      </pre>
                    </details>
                  )}
                  {data.unknownRawCategories && data.unknownRawCategories.length > 0 && (
                    <div style={{ 
                      marginTop: '8px', 
                      padding: '8px', 
                      background: '#fff3cd', 
                      border: '1px solid #ffeaa7',
                      borderRadius: '3px',
                      color: '#856404'
                    }}>
                      <strong>Unknown Raw Categories ({data.unknownRawCategories.length}):</strong><br/>
                      {data.unknownRawCategories.join(', ')}
                    </div>
                  )}
                  {data.error && (
                    <div style={{ 
                      marginTop: '8px', 
                      padding: '8px', 
                      background: '#f8d7da', 
                      border: '1px solid #f5c6cb',
                      borderRadius: '3px',
                      color: '#721c24'
                    }}>
                      Error: {data.error}
                    </div>
                  )}
                  {data.events && data.events.length > 0 && (
                    <details style={{ marginTop: '8px' }}>
                      <summary style={{ cursor: 'pointer', color: '#007bff' }}>
                        API Events ({data.events.length})
                      </summary>
                      <pre style={{ 
                        marginTop: '5px', 
                        padding: '8px', 
                        background: '#f8f9fa', 
                        border: '1px solid #dee2e6',
                        borderRadius: '3px',
                        overflow: 'auto',
                        maxHeight: '200px'
                      }}>
                        {JSON.stringify(data.events, null, 2)}
                      </pre>
                    </details>
                  )}
                  {data.scrapedContent && (
                    <details style={{ marginTop: '8px' }}>
                      <summary style={{ cursor: 'pointer', color: '#007bff' }}>
                        Raw HTML Content (first 1000 chars)
                      </summary>
                      <pre style={{ 
                        marginTop: '5px', 
                        padding: '8px', 
                        background: '#f8f9fa', 
                        border: '1px solid #dee2e6',
                        borderRadius: '3px',
                        overflow: 'auto',
                        maxHeight: '150px'
                      }}>
                        {data.scrapedContent.substring(0, 1000)}...
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <footer className="footer">
        <div className="container">
          <p>© 2025 Where2Go - Entdecke deine Stadt neu</p>
        </div>
      </footer>

      {/* Globale Style-Overrides + Date selector/calendar styles */}
      <style jsx global>{`
        .header-inner.header-centered {
          position: relative;
          display:flex;
          align-items:center;
          justify-content:center;
          min-height:64px;
        }
        .header-inner.header-centered .premium-box {
          position:absolute;
          right:0;
        }
        .results-filter-bar {
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap:12px;
          padding:10px 0 18px;
        }
        .filter-chips-inline {
          display:flex;
          flex-wrap:wrap;
          gap:10px;
        }
        .filter-sidebar { display:none !important; }
        .filter-chip {
          display:flex; justify-content:space-between; align-items:center;
          gap:8px;
          font-size:13px; padding:10px 14px;
          border:1px solid #dcdfe3;
          background:transparent; border-radius:10px; cursor:pointer;
          transition:background .2s, border-color .2s, color .2s;
          color:#444; font-weight:500; text-align:left;
        }
        .filter-chip:hover { background:#f3f4f5; }
        .filter-chip-active { background:#404040; color:#fff; border-color:#404040; }
        .filter-chip-active:hover { background:#e5e7eb; color:#9aa0a6; }
        .filter-count { font-size:11px; background:rgba(0,0,0,0.06); padding:3px 8px; border-radius:999px; color:inherit; font-weight:500; }
        .filter-chip-active .filter-count { background:rgba(255,255,255,0.18); }
        .category-checkbox {
          display:flex; align-items:center; gap:8px; padding:8px 10px;
          border:1px solid #dfe1e4; background:transparent; border-radius:8px;
          font-size:13px; cursor:pointer; transition:background .2s, border-color .2s, color .2s;
          color:#444;
        }
        .category-checkbox:hover { background:#f0f2f4; }
        .category-checkbox input { accent-color:#222; width:14px; height:14px; cursor:pointer; margin:0; }
        .category-checkbox:has(input:checked) { background:#404040; color:#fff; border-color:#404040; }
        .category-checkbox:has(input:checked):hover { background:#e5e7eb; color:#9aa0a6; }
        .category-checkbox:has(input:checked) input { accent-color:#ffffff; }
        .btn-search {
          border:none; background:#404040; color:#fff; font-size:15px; padding:14px 20px; border-radius:10px;
          font-weight:500; letter-spacing:.4px; cursor:pointer; box-shadow:0 6px 18px rgba(0,0,0,0.08);
          transition:background .2s, box-shadow .2s, transform .2s, color .2s;
        }
        .btn-search:hover { background:#222; }
        @media (max-width: 600px) {
          .search-form .form-row { gap:12px; }
          .categories-section { gap:10px; }
          .results-filter-bar { flex-direction:column; align-items:flex-start; gap:8px; }
        }
        .src-badge {
          display:inline-block;
          margin-left:8px;
          font-size:11px;
          line-height:1;
          padding:3px 6px;
          border-radius:999px;
          border:1px solid rgba(0,0,0,0.18);
          background:#f7f7f7;
          color:#444;
          vertical-align:middle;
        }
        .src-badge.src-ai    { background:#1f2937; color:#fff; border-color:#1f2937; }
        .src-badge.src-rss   { background:#f59e0b; color:#111; border-color:#d97706; }
        .src-badge.src-ra    { background:#0ea5e9; color:#fff; border-color:#0284c7; }
        .src-badge.src-cache { background:#e5e7eb; color:#111; border-color:#d1d5db; }

        /* Spacing improvement requested between meta rows */
        .event-meta-line { line-height: 1.5; }

        /* ---------------- Date selector dropdown + calendar styles (fixes broken layout) ---------------- */
        .select-with-dropdown { position: relative; }
        .date-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          left: 0;
          z-index: 1000;
          background: var(--color-surface, #fff);
          color: var(--color-text, #111);
          border: 1px solid var(--color-border, #e5e7eb);
          border-radius: 10px;
          box-shadow: 0 12px 28px rgba(0,0,0,0.12);
          padding: 12px;
          min-width: 560px; /* ensures two 7-col grids fit side by side */
        }
        @media (max-width: 640px) {
          .date-dropdown { position: fixed; left: 12px; right: 12px; top: 20%; min-width: unset; }
        }

        .calendar { width: 100%; }
        .calendar-nav {
          display:flex; align-items:center; justify-content:space-between;
          gap:8px; margin-bottom:10px;
        }
        .cal-btn {
          width: 28px; height: 28px;
          display:inline-flex; align-items:center; justify-content:center;
          border:1px solid var(--color-border, #e5e7eb);
          background: var(--color-surface-alt, #fafbfc);
          color: inherit;
          border-radius: 8px;
          cursor: pointer;
        }
        .cal-btn:hover { background: rgba(0,0,0,0.04); }
        .cal-titles { display:flex; gap:16px; }
        .cal-title { font-weight: 600; }

        .calendar-grids {
          display:grid; grid-template-columns: 1fr 1fr; gap: 16px;
        }
        @media (max-width: 640px) {
          .calendar-grids { grid-template-columns: 1fr; }
        }

        .cal-grid {
          display:grid; grid-template-columns: repeat(7, 1fr); gap: 6px;
        }
        .cal-head {
          text-align:center; font-size:12px; color: var(--color-text-faint, #9aa0a6);
          padding: 4px 0;
        }
        .cal-day {
          display:inline-flex; align-items:center; justify-content:center;
          height: 32px;
          border:1px solid var(--color-border, #e5e7eb);
          background: var(--color-surface-alt, #fafbfc);
          color: inherit;
          border-radius: 8px;
          cursor: pointer;
          transition: background .15s, color .15s, border-color .15s, transform .05s;
        }
        .cal-day:hover { background: rgba(0,0,0,0.06); }
        .cal-day--muted { opacity: .5; }
        .cal-day--sel {
          background: #404040; color: #fff; border-color: #404040; font-weight: 600;
        }
        .cal-day--disabled {
          opacity: .4; cursor: not-allowed; background: rgba(0,0,0,0.03);
        }
        /* ----------------------------------------------------------------------------------------------- */
      `}</style>
    </div>
  );
}

/* Zwei-Monats-Kalender mit Min-Datum, Auswahl & Disabled-Days */
function TwoMonthCalendar({
  value,
  minISO,
  onSelect
}: {
  value: string;
  minISO: string;
  onSelect: (iso: string) => void;
}) {
  const [baseMonth, setBaseMonth] = useState(() => {
    const d = value ? new Date(value) : new Date();
    d.setDate(1);
    return d;
  });

  function monthLabel(d: Date) {
    return d.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
  }
  function addMonths(d: Date, n: number) {
    const nd = new Date(d);
    nd.setMonth(nd.getMonth() + n);
    return nd;
  }
  function startOfWeek(d: Date) {
    const nd = new Date(d);
    const day = (nd.getDay() + 6) % 7; // Montag=0
    nd.setDate(nd.getDate() - day);
    nd.setHours(0,0,0,0);
    return nd;
  }
  function daysMatrix(monthStart: Date) {
    const first = new Date(monthStart);
    first.setDate(1);
    const start = startOfWeek(first);
    const weeks: Date[][] = [];
    let cur = new Date(start);
    for (let w=0; w<6; w++) {
      const row: Date[] = [];
      for (let i=0; i<7; i++) {
        row.push(new Date(cur));
        cur.setDate(cur.getDate()+1);
      }
      weeks.push(row);
    }
    return weeks;
  }
  function isSameDay(a: Date, b: Date) {
    return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
  }
  const selected = value ? new Date(value) : null;
  const minDate = new Date(minISO);

  const months = [0,1].map(i => addMonths(baseMonth, i));
  const weeksArr = months.map(m => daysMatrix(m));

  return (
    <div className="calendar">
      <div className="calendar-nav">
        <button type="button" className="cal-btn" onClick={()=>setBaseMonth(addMonths(baseMonth,-1))} aria-label="Vorheriger Monat">‹</button>
        <div className="cal-titles">
          <div className="cal-title">{monthLabel(months[0])}</div>
          <div className="cal-title">{monthLabel(months[1])}</div>
        </div>
        <button type="button" className="cal-btn" onClick={()=>setBaseMonth(addMonths(baseMonth,1))} aria-label="Nächster Monat">›</button>
      </div>

      <div className="calendar-grids">
        {weeksArr.map((weeks, idx) => (
          <div key={idx} className="cal-grid">
            <div className="cal-head">Mo</div><div className="cal-head">Di</div><div className="cal-head">Mi</div><div className="cal-head">Do</div><div className="cal-head">Fr</div><div className="cal-head">Sa</div><div className="cal-head">So</div>
            {weeks.flat().map((d,i) => {
              const inMonth = d.getMonth()===months[idx].getMonth();
              const disabled = d < new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate());
              const isSel = selected && isSameDay(d, selected);
              return (
                <button
                  key={i}
                  type="button"
                  className={`cal-day ${inMonth ? '' : 'cal-day--muted'} ${isSel ? 'cal-day--sel' : ''} ${disabled ? 'cal-day--disabled' : ''}`}
                  onClick={()=>{
                    if (disabled) return;
                    onSelect(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`);
                  }}
                  disabled={disabled}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

/* Loader: 5 ruhige s/w Kreise */
function W2GLoader5() {
  const [orbs] = useState(
    Array.from({length:5}).map((_,i)=>({
      id:i,
      angle: (360/5)*i,
      radius: 12 + i*4,
      speed: 0.7 + i*0.12
    }))
  );
  return (
    <div className="w2g-loader-wrapper">
      <div className="w2g-loader w2g-loader--v3" aria-label="Laden">
        <svg viewBox="-50 -50 100 100" aria-hidden="true">
          <g className="ring ring--1"><circle cx="0" cy="0" r="40" /></g>
          <g className="ring ring--2"><circle cx="0" cy="0" r="28" /></g>
          <g className="ring ring--3"><circle cx="0" cy="0" r="16" /></g>
        </svg>
        {orbs.map(o=>(
          <span
            key={o.id}
            className="orb5"
            style={
              {
                // @ts-ignore custom props
                '--angle': `${o.angle}deg`,
                '--radius': `${o.radius}px`,
                '--speed': `${o.speed}s`
              } as CSSProperties
            }
          />
        ))}
      </div>
    </div>
  );
}
