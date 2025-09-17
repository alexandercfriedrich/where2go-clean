'use client';
import { useState, useRef, useEffect } from 'react';
import { EVENT_CATEGORY_SUBCATEGORIES, EVENT_CATEGORIES } from './lib/eventCategories';
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

const ALL_SUPER_CATEGORIES = EVENT_CATEGORIES;
const MAX_CATEGORY_SELECTION = 3;
const MAX_POLLS = 60;

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
  const [jobStatus, setJobStatus] = useState<'idle' | 'pending' | 'done' | 'error'>('idle');
  const [pollCount, setPollCount] = useState(0);
  const [progress, setProgress] = useState<{completedCategories: number, totalCategories: number} | null>(null);
  const [newEvents, setNewEvents] = useState<Set<string>>(new Set());
  const [debugMode, setDebugMode] = useState(false);
  const [toast, setToast] = useState<{show: boolean, message: string}>({show: false, message: ''});
  const [cacheInfo, setCacheInfo] = useState<{fromCache: boolean, totalEvents: number, cachedEvents: number} | null>(null);

  const [isDesign1, setIsDesign1] = useState(false);
  const [searchSubmitted, setSearchSubmitted] = useState(false);
  const [searchedSuperCategories, setSearchedSuperCategories] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState<string>('Alle');

  const pollInterval = useRef<ReturnType<typeof setTimeout> | null>(null);
  const eventsRef = useRef<EventData[]>([]);
  const pollCountRef = useRef(0);
  const eventsGridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setDebugMode(params.get('debug') === '1');
    const design = params.get('design') || '1';
    setIsDesign1(design === '1');
  }, []);

  useEffect(() => { eventsRef.current = events; }, [events]);

  const getSelectedSubcategories = (): string[] =>
    selectedSuperCategories.flatMap(superCat => EVENT_CATEGORY_SUBCATEGORIES[superCat] || []);

  const toggleSuperCategory = (category: string) => {
    setCategoryLimitError(null);
    setSelectedSuperCategories(prev => {
      if (prev.includes(category)) {
        return prev.filter(c => c !== category);
      }
      if (prev.length >= MAX_CATEGORY_SELECTION) {
        setCategoryLimitError(`Du kannst maximal ${MAX_CATEGORY_SELECTION} Kategorien auswählen.`);
        return prev;
      }
      return [...prev, category];
    });
  };

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
    setNewEvents(new Set());
    setJobStatus('pending');
    setPollCount(0);
    setProgress(null);
    setCacheInfo(null);
    setSearchSubmitted(true);
    setSearchedSuperCategories([...selectedSuperCategories]);
    setActiveFilter('Alle');

    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
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
            minEventsPerCategory: 14
          }
        })
      });
      if (!res.ok) {
        const data = await res.json().catch(()=> ({}));
        throw new Error(data.error || `Serverfehler ${res.status}`);
      }
      const data = await res.json();
      if (data.status === 'completed') {
        setEvents(data.events || []);
        setCacheInfo(data.cacheInfo);
        setJobStatus('done');
        setLoading(false);
        setToast({show:true,message:`${data.events?.length || 0} Events geladen`});
        setTimeout(()=> setToast({show:false,message:''}), 3000);
      } else {
        setLoading(false);
        setJobStatus('done');
      }
    } catch (e:any) {
      setError(e.message || 'Fehler bei der Suche');
      setLoading(false);
      setJobStatus('error');
    }
  }

  const createEventKey = (ev: EventData) => `${ev.title}_${ev.date}_${ev.venue}`;

  const displayedEvents = (() => {
    if (!isDesign1 || !searchSubmitted) return events;
    if (activeFilter === 'Alle') return events;
    const selectedSubs = EVENT_CATEGORY_SUBCATEGORIES[activeFilter] || [];
    return events.filter(e => selectedSubs.includes(e.category));
  })();

  const getCategoryCounts = () => {
    const counts: Record<string, number> = { 'Alle': events.length };
    searchedSuperCategories.forEach(cat => {
      const subs = EVENT_CATEGORY_SUBCATEGORIES[cat] || [];
      counts[cat] = events.filter(e => subs.includes(e.category)).length;
    });
    return counts;
  };

  return (
    <div className="min-h-screen">
      <section className="search-section">
        <div className="container">
          <form onSubmit={e => { e.preventDefault(); searchEvents(); }}>
            <div className="form-row">
              <div className="form-group">
                <label>Stadt</label>
                <input value={city} onChange={e=>setCity(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Zeitraum</label>
                <select value={timePeriod} onChange={e=>setTimePeriod(e.target.value)}>
                  <option value="heute">Heute</option>
                  <option value="morgen">Morgen</option>
                  <option value="kommendes-wochenende">Kommendes Wochenende</option>
                  <option value="benutzerdefiniert">Benutzerdefiniert</option>
                </select>
              </div>
            </div>
            {timePeriod === 'benutzerdefiniert' && (
              <div className="form-group">
                <label>Datum</label>
                <input type="date" value={customDate} onChange={e=>setCustomDate(e.target.value)} />
              </div>
            )}
            <div>
              <label>Kategorien (max {MAX_CATEGORY_SELECTION})</label>
              <div className="categories-grid">
                {ALL_SUPER_CATEGORIES.map(cat => (
                  <label key={cat}>
                    <input
                      type="checkbox"
                      checked={selectedSuperCategories.includes(cat)}
                      disabled={
                        !selectedSuperCategories.includes(cat) &&
                        selectedSuperCategories.length >= MAX_CATEGORY_SELECTION
                      }
                      onChange={()=>toggleSuperCategory(cat)}
                    />
                    {cat}
                  </label>
                ))}
              </div>
              {categoryLimitError && <div style={{color:'red'}}>{categoryLimitError}</div>}
            </div>
            <button type="submit">Events suchen</button>
          </form>
        </div>
      </section>

      <div className="container">
        {loading && <p>Suche läuft...</p>}
        {error && <p style={{color:'red'}}>{error}</p>}
        {!loading && !error && displayedEvents.length === 0 && <p>Keine Events gefunden.</p>}
        {cacheInfo && (
          <div style={{margin:'12px 0', fontSize:'0.9rem', color:'#666'}}>
            {cacheInfo.fromCache
              ? `📁 ${cacheInfo.cachedEvents} Events aus Cache`
              : `🔄 ${cacheInfo.totalEvents} Events frisch`}
          </div>
        )}
        {isDesign1 && searchSubmitted && (
          <div className="filter-chips">
            <button
              className={activeFilter==='Alle'?'active':''}
              onClick={()=>setActiveFilter('Alle')}
            >Alle ({getCategoryCounts()['Alle']})</button>
            {searchedSuperCategories.map(cat => (
              <button
                key={cat}
                className={activeFilter===cat?'active':''}
                onClick={()=>setActiveFilter(cat)}
              >
                {cat} ({getCategoryCounts()[cat]||0})
              </button>
            ))}
          </div>
        )}
        <div className="events-grid" ref={eventsGridRef}>
          {displayedEvents.map(ev => {
            const key = createEventKey(ev);
            return (
              <div key={key} className="event-card">
                <h3>{ev.title}</h3>
                <div>{ev.date}{ev.time && ` • ${ev.time}`}</div>
                <div>{ev.venue}</div>
                <div>{ev.category}</div>
                {ev.price && <div>{ev.price}</div>}
                {ev.website && <a href={ev.website} target="_blank">Website →</a>}
              </div>
            );
          })}
        </div>
      </div>

      {toast.show && (
        <div className="toast-container">
          <div className="toast">{toast.message}</div>
        </div>
      )}
    </div>
  );
}
