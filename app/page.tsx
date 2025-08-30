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

  const formatDateForAPI = (): string => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    if (timePeriod === 'heute') return today.toISOString().split('T')[0];
    else if (timePeriod === 'morgen') return tomorrow.toISOString().split('T')[0];
    else return customDate || today.toISOString().split('T')[0];
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
      {/* Hero Section */}
      <section className="hero">
        <div className="container">
          <h1>Where2Go</h1>
          <p>Entdecke die besten Events in deiner Stadt – KI-gestützte Suche für unvergessliche Erlebnisse</p>
        </div>
      </section>

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
      <main className="container">
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

        {!loading && !events.length && !error && (
          <div className="empty-state">
            <h3>Bereit für dein nächstes Abenteuer?</h3>
            <p>Starte eine Suche, um die besten Events in deiner Stadt zu entdecken.</p>
          </div>
        )}

        {!!events.length && (
          <div className="events-grid">
            {events.map((event) => {
              const eventKey = createEventKey(event);
              const isNew = newEvents.has(eventKey);
              const superCategory = ALL_SUPER_CATEGORIES.find(cat =>
                CATEGORY_MAP[cat].includes(event.category)
              ) || event.category;

              return (
                <div key={eventKey} className={`event-card ${isNew ? 'event-card-new' : ''}`}>
                  {isNew && <div className="badge-new">Neu</div>}
                  <div className="event-content">
                    <h3 className="event-title">{event.title}</h3>
                    
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
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

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

      <footer className="footer">
        <div className="container">
          <p>© 2025 Where2Go - Entdecke deine Stadt neu</p>
        </div>
      </footer>
    </div>
  );
}
