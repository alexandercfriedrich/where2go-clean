'use client';
import { useEffect, useRef, useState } from 'react';
import { EVENT_CATEGORY_SUBCATEGORIES } from './lib/eventCategories';
import { useTranslation } from './lib/useTranslation';

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
  source?: 'cache' | 'ai' | 'rss' | 'ra' | string; // Badge-Quelle
}

const ALL_SUPER_CATEGORIES = Object.keys(EVENT_CATEGORY_SUBCATEGORIES);
const MAX_CATEGORY_SELECTION = 3;

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
  const [stepLoading, setStepLoading] = useState<string | null>(null); // progressive Status je Superkategorie
  const [error, setError] = useState<string | null>(null);

  const [searchSubmitted, setSearchSubmitted] = useState(false);
  const [searchedSuperCategories, setSearchedSuperCategories] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState('Alle');

  const [cacheInfo, setCacheInfo] = useState<{fromCache: boolean; totalEvents: number; cachedEvents: number} | null>(null);
  const [toast, setToast] = useState<{show:boolean; message:string}>({show:false,message:''});

  const resultsAnchorRef = useRef<HTMLDivElement | null>(null);
  const timeSelectWrapperRef = useRef<HTMLDivElement | null>(null);
  const cancelRef = useRef<{cancel:boolean}>({cancel:false});

  // design1.css laden und andere Designs entfernen
  useEffect(() => {
    const id = 'w2g-design-css';
    const href = '/designs/design1.css';
    let link = document.getElementById(id) as HTMLLinkElement | null;
    if (link) {
      if (link.getAttribute('href') !== href) link.setAttribute('href', href);
    } else {
      link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      link.href = href;
      document.head.appendChild(link);
    }
    document.querySelectorAll('link[href*="/designs/design"]').forEach(l => {
      const el = l as HTMLLinkElement;
      if (!el.href.endsWith('design1.css')) el.parentElement?.removeChild(el);
    });
  }, []);

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
    const map = new Map<string, EventData>();
    for (const e of current) map.set(`${e.title}__${e.date}__${e.venue}`, e);
    for (const e of incoming) map.set(`${e.title}__${e.date}__${e.venue}`, e);
    return Array.from(map.values());
  }

  async function fetchForSuperCategory(superCat: string) {
    const subs = EVENT_CATEGORY_SUBCATEGORIES[superCat] || [];
    if (subs.length === 0) return;
    setStepLoading(superCat);
    const res = await fetch('/api/events', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        city: city.trim(),
        date: formatDateForAPI(),
        categories: subs,
        options: {
          temperature: 0.2,
          max_tokens: 12000,
          expandedSubcategories: true,
          minEventsPerCategory: 14
        }
      })
    });
    if (!res.ok) {
      const data = await res.json().catch(()=> ({}));
      throw new Error(data.error || `Serverfehler ${res.status}`);
    }
    const data = await res.json();
    // Quelle wird vom Backend jetzt gestempelt; falls nicht, lassen
    const incoming: EventData[] = data.events || [];
    setEvents(prev => dedupMerge(prev, incoming));
    if (data.cacheInfo) setCacheInfo(data.cacheInfo);
  }

  async function progressiveSearchEvents() {
    if (!city.trim()) {
      setError('Bitte gib eine Stadt ein.');
      return;
    }
    cancelRef.current.cancel = true; // existierende Läufe beenden
    await new Promise(r=>setTimeout(r,0)); // Yield
    cancelRef.current = { cancel:false };

    setLoading(true);
    setError(null);
    setEvents([]);
    setCacheInfo(null);
    setSearchSubmitted(true);
    setSearchedSuperCategories([...selectedSuperCategories]);
    setActiveFilter('Alle');

    try {
      // Falls keine Auswahl getroffen wurde, alle Superkategorien (kann länger dauern)
      const superCats =
        selectedSuperCategories.length > 0 ? [...selectedSuperCategories] : [...ALL_SUPER_CATEGORIES];

      // sequenziell für "versetztes" Laden
      for (const sc of superCats) {
        if (cancelRef.current.cancel) return;
        await fetchForSuperCategory(sc);
      }

      setLoading(false);
      setStepLoading(null);
      setTimeout(()=> setToast({show:false, message:''}), 2000);
      if (resultsAnchorRef.current) {
        resultsAnchorRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } catch(e:any){
      setError(e.message || 'Fehler bei der Suche');
      setLoading(false);
      setStepLoading(null);
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
                  onClick={() => {
                    if (timePeriod === 'benutzerdefiniert') setShowDateDropdown(v => !v);
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
                      <span>{formattedDate}</span>
                      {formattedTime && (
                        <>
                          <svg width="16" height="16" strokeWidth={2} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/>
                          </svg>
                          <span>{formattedTime}</span>
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

      <footer className="footer">
        <div className="container">
          <p>© 2025 Where2Go - Entdecke deine Stadt neu</p>
        </div>
      </footer>
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
              } as React.CSSProperties
            }
          />
        ))}
      </div>
    </div>
  );
}
