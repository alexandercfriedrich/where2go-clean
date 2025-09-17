'use client';
import { useState, useEffect } from 'react';
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

  // Debug Mode (URL ?debug=1)
  const [debugMode, setDebugMode] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setDebugMode(params.get('debug') === '1');
  }, []);

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

  // Date handling
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
            debug: debugMode,
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
    } catch(e:any){
      setError(e.message || 'Fehler bei der Suche');
      setLoading(false);
    }
  }

  // Filtering for activeFilter
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
    const iconStyle: any = { width:'16px', height:'16px', strokeWidth:'2' };
    switch(cat){
      case 'DJ Sets/Electronic':
      case 'Clubs/Discos':
        return <svg style={iconStyle} viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>;
      case 'Live-Konzerte':
        return <svg style={iconStyle} viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 3v18"/><path d="M8 21l4-7 4 7"/><path d="M8 3l4 7 4-7"/></svg>;
      case 'Film':
        return <svg style={iconStyle} viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>;
      default:
        return <svg style={iconStyle} viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/></svg>;
    }
  };

  return (
    <div className="min-h-screen">
      {/* Header mit neuem Logo */}
      <div className="header">
        <div className="header-logo-wrapper">
          <img src="/where2go-full.svg" alt="Where2Go Logo" />
        </div>
      </div>

      {/* Search Section */}
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
                  id="city"
                  value={city}
                  onChange={e=>setCity(e.target.value)}
                  placeholder={t('form.cityPlaceholder')}
                />
              </div>
              <div className="form-group">
                <label htmlFor="timePeriod">{t('form.timePeriod')}</label>
                <select
                  className="form-input"
                  id="timePeriod"
                  value={timePeriod}
                  onChange={e=>setTimePeriod(e.target.value)}
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
                  id="customDate"
                  type="date"
                  value={customDate}
                  onChange={e=>setCustomDate(e.target.value)}
                />
              </div>
            )}

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
                >{`Max. ${MAX_CATEGORY_SELECTION} auswählen`}</button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setSelectedSuperCategories([]);
                    setCategoryLimitError(null);
                  }}
                >Alle abwählen</button>
              </div>
              {categoryLimitError && <div style={{color:'red', marginTop:4}}>{categoryLimitError}</div>}
            </div>

            <button className="btn-search" type="submit">
              {t('button.searchEvents')}
            </button>
          </form>
        </div>
      </section>

      <div className="container">
        <div className="content-with-sidebar">
          {searchSubmitted && (
            <aside className="filter-sidebar">
              <h3 className="sidebar-title">Filter</h3>
              <div className="filter-chips">
                <button
                  className={`filter-chip ${activeFilter==='Alle' ? 'filter-chip-active':''}`}
                  onClick={()=>setActiveFilter('Alle')}
                >
                  Alle
                  <span className="filter-count">{getCategoryCounts()['Alle']}</span>
                </button>
                {searchedSuperCategories.map(c => (
                  <button
                    key={c}
                    className={`filter-chip ${activeFilter===c ? 'filter-chip-active':''}`}
                    onClick={()=>setActiveFilter(c)}
                  >
                    {c}
                    <span className="filter-count">
                      {getCategoryCounts()[c] || 0}
                    </span>
                  </button>
                ))}
              </div>
            </aside>
          )}

            <main className="main-content">
              {error && <div className="error">{error}</div>}
              {loading && <div className="loading"><div className="loading-spinner"></div><p>Suche läuft...</p></div>}
              {!loading && !error && searchSubmitted && displayedEvents.length === 0 && (
                <div className="empty-state">
                  <h3>Keine Events gefunden</h3>
                  <p>Probiere andere Kategorien oder ein anderes Datum.</p>
                </div>
              )}
              {cacheInfo && !!displayedEvents.length && (
                <div style={{textAlign:'center', margin:'10px 0 14px', fontSize:'0.85rem', color:'#666'}}>
                  {cacheInfo.fromCache
                    ? `📁 ${cacheInfo.cachedEvents} Events aus Cache`
                    : `🔄 ${cacheInfo.totalEvents} Events geladen`}
                </div>
              )}

              {displayedEvents.length > 0 && (
                <div className="events-grid">
                  {displayedEvents.map(ev => {
                    const key = `${ev.title}_${ev.date}_${ev.venue}`;
                    const superCat = searchedSuperCategories.find(c => EVENT_CATEGORY_SUBCATEGORIES[c]?.includes(ev.category)) ||
                      ALL_SUPER_CATEGORIES.find(c => EVENT_CATEGORY_SUBCATEGORIES[c]?.includes(ev.category)) ||
                      ev.category;
                    return (
                      <div key={key} className="event-card">
                        <h3 className="event-title">{ev.title}</h3>
                        <div className="event-datetime">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                          </svg>
                          {ev.date}{ev.time && ` • ${ev.time}`}{ev.endTime && ` - ${ev.endTime}`}
                        </div>
                        <div className="event-location-d1">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                          </svg>
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ev.address || ev.venue)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="event-venue-link"
                          >{ev.venue}</a>
                        </div>
                        {superCat && (
                          <div className="event-category">
                            {eventIcon(superCat)}
                            {superCat}
                          </div>
                        )}
                        {ev.price && <div className="event-price-d1">{ev.price}</div>}
                        {ev.description && <div className="event-description">{ev.description}</div>}
                        <div className="event-bottom-row">
                          <div />
                          <div className="event-actions">
                            {ev.website && (
                              <a className="event-action-btn event-info-btn" href={ev.website} target="_blank" rel="noopener noreferrer">
                                Info
                              </a>
                            )}
                            {ev.bookingLink && (
                              <a className="event-action-btn event-tickets-btn" href={ev.bookingLink} target="_blank" rel="noopener noreferrer">
                                Tickets
                              </a>
                            )}
                          </div>
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
