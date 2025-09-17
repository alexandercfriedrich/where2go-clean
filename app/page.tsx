'use client';
import { useState, useEffect, useRef } from 'react';
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
const MAX_CATEGORY_SELECTION = 3;

export default function Home() {
  const { t } = useTranslation();
  const [city, setCity] = useState('');
  const [timePeriod, setTimePeriod] = useState('heute');
  const [customDate, setCustomDate] = useState('');
  const [selectedSuperCategories, setSelectedSuperCategories] = useState<string[]>([]);
  const [categoryLimitError, setCategoryLimitError] = useState<string | null>(null);
  const [events, setEvents] = useState<EventData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchSubmitted, setSearchSubmitted] = useState(false);
  const [searchedSuperCategories, setSearchedSuperCategories] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState('Alle');
  const [cacheInfo, setCacheInfo] = useState<{fromCache: boolean; totalEvents: number; cachedEvents: number} | null>(null);
  const [toast, setToast] = useState<{show:boolean; message:string}>({show:false,message:''});
  const resultsAnchorRef = useRef<HTMLDivElement | null>(null);

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
    selectedSuperCategories.flatMap(superCat => EVENT_CATEGORY_SUBCATEGORIES[superCat]);

  function formatDateForAPI(): string {
    const today = new Date();
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
    if (timePeriod === 'heute') return today.toISOString().split('T')[0];
    if (timePeriod === 'morgen') return tomorrow.toISOString().split('T')[0];
    if (timePeriod === 'kommendes-wochenende') {
      const nextFriday = new Date(today);
      const diff = (5 - today.getDay() + 7) % 7;
      nextFriday.setDate(today.getDate() + diff);
      return nextFriday.toISOString().split('T')[0];
    }
    return customDate || today.toISOString().split('T')[0];
  }

  // Date formatting for card header
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

  async function searchEvents() {
    if (!city.trim()) {
      setError('Bitte gib eine Stadt ein.');
      return;
    }
    setLoading(true);
    setError(null);
    setEvents([]);
    setCacheInfo(null);
    setSearchSubmitted(true);
    setSearchedSuperCategories([...selectedSuperCategories]);
    setActiveFilter('Alle');

    try {
      const res = await fetch('/api/events', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          city: city.trim(),
          date: formatDateForAPI(),
            categories: getSelectedSubcategories(),
            options: {
              temperature: 0.2,
              max_tokens: 12000,
              expandedSubcategories: true,
              minEventsPerCategory: 14
            }
        })
      });
      if(!res.ok){
        const data = await res.json().catch(()=> ({}));
        throw new Error(data.error || `Serverfehler ${res.status}`);
      }
      const data = await res.json();
      setEvents(data.events || []);
      setCacheInfo(data.cacheInfo || null);
      setLoading(false);
      setToast({show:true,message:`${data.events?.length || 0} Events geladen`});
      setTimeout(()=> setToast({show:false,message:''}), 3000);

      // Scroll to results
      requestAnimationFrame(() => {
        if (resultsAnchorRef.current) {
          resultsAnchorRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });

    } catch(e:any){
      setError(e.message || 'Fehler bei der Suche');
      setLoading(false);
    }
  }

  const displayedEvents = (() => {
    if (!searchSubmitted) return events;
    if (activeFilter === 'Alle') return events;
    const subs = EVENT_CATEGORY_SUBCATEGORIES[activeFilter] || [];
    return events.filter(e => subs.includes(e.category));
  })();

  const getCategoryCounts = () => {
    const counts: Record<string, number> = { 'Alle': events.length };
    searchedSuperCategories.forEach(cat => {
      const subs = EVENT_CATEGORY_SUBCATEGORIES[cat] || [];
      counts[cat] = events.filter(e => subs.includes(e.category)).length;
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
    if (!p) return null;
    return <div className="event-price-line">{p}</div>;
  };

  return (
    <div className="min-h-screen">
      <div className="header">
        <div className="header-logo-wrapper">
          <img src="/where2go-full.svg" alt="Where2Go" />
        </div>
        <div className="premium-box">
          <a href="#premium" className="premium-link">
            <span className="premium-icon">⭐</span> Premium
          </a>
        </div>
      </div>

      <section className="hero">
        <div className="container">
          <h1>Where2Go</h1>
          <p>Entdecke die besten Events in deiner Stadt!</p>
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
                <label htmlFor="city">Stadt</label>
                <input
                  id="city"
                  className="form-input"
                  value={city}
                  onChange={e=>setCity(e.target.value)}
                  placeholder="z.B. Berlin, Hamburg ..."
                />
              </div>
              <div className="form-group">
                <label htmlFor="timePeriod">Zeitraum</label>
                <select
                  id="timePeriod"
                  className="form-input"
                  value={timePeriod}
                  onChange={e=>setTimePeriod(e.target.value)}
                >
                  <option value="heute">Heute</option>
                  <option value="morgen">Morgen</option>
                  <option value="kommendes-wochenende">Kommendes Wochenende</option>
                  <option value="benutzerdefiniert">Benutzerdefiniert</option>
                </select>
              </div>
              {timePeriod === 'benutzerdefiniert' && (
                <div className="form-group form-group-full">
                  <label htmlFor="customDate">Datum</label>
                  <input
                    id="customDate"
                    type="date"
                    className="form-input"
                    value={customDate}
                    onChange={e=>setCustomDate(e.target.value)}
                  />
                </div>
              )}
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
        <div className={searchSubmitted ? 'content-with-sidebar' : ''}>
          {searchSubmitted && (
            <aside className="filter-sidebar">
              <h3 className="sidebar-title">Filter & Kategorien</h3>
              <div className="filter-chips">
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
            </aside>
          )}

          <main className="main-content">
            {error && <div className="error">{error}</div>}
            {loading && (
              <div className="loading">
                <div className="loading-spinner" />
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
                      <h3 className="event-title">{ev.title}</h3>
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
                          <svg width="16" height="16" strokeWidth={2} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
                          </svg>
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
                        <div className="event-description">
                          {ev.description}
                        </div>
                      )}
                      {renderPrice(ev)}

                      {(ev.website || ev.bookingLink) && (
                        <div className="event-actions-row">
                          {ev.website && (
                            <a
                              href={ev.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn-outline"
                            >
                              Mehr Info
                            </a>
                          )}
                          {ev.bookingLink && (
                            <a
                              href={ev.bookingLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn-outline tickets"
                            >
                              Tickets
                            </a>
                          )}
                        </div>
                      )}
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
