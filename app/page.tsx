'use client';
import { useState, useRef, useEffect } from 'react';

interface EventData {
  title: string;
  category: string;
  date: string;
  time: string;
  venue: string;
  price: string;
  website: string;
  // New optional fields for enhanced UI
  endTime?: string;
  address?: string;
  ticketPrice?: string;
  eventType?: string;
  description?: string;
  bookingLink?: string;
  ageRestrictions?: string;
}

// Categories matching backend DEFAULT_CATEGORIES
const ALL_CATEGORIES = [
  'DJ Sets/Electronic',
  'Clubs/Discos',
  'Live-Konzerte',
  'Open Air',
  'Museen',
  'LGBTQ+',
  'Comedy/Kabarett',
  'Theater/Performance',
  'Film',
  'Food/Culinary',
  'Sport',
  'Familien/Kids',
  'Kunst/Design',
  'Wellness/Spirituell',
  'Networking/Business',
  'Natur/Outdoor'
];

export default function Home() {
  const [city, setCity] = useState('');
  const [timePeriod, setTimePeriod] = useState('heute');
  const [customDate, setCustomDate] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>(ALL_CATEGORIES);
  const [events, setEvents] = useState<EventData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<'idle' | 'pending' | 'done' | 'error'>('idle');
  const [pollCount, setPollCount] = useState(0);
  const [newEvents, setNewEvents] = useState<Set<string>>(new Set());
  const [debugMode, setDebugMode] = useState(false);
  const [debugData, setDebugData] = useState<any>(null);
  const [toast, setToast] = useState<{show: boolean, message: string}>({show: false, message: ''});
  
  // To store polling interval id persistently
  const pollInterval = useRef<NodeJS.Timeout | null>(null);
  
  // To store latest events for polling comparison (fixes stale closure issue)
  const eventsRef = useRef<EventData[]>([]);

  // Check for debug mode from URL on component mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    setDebugMode(urlParams.get('debug') === '1');
  }, []);

  // Keep eventsRef in sync with events state to fix stale closure issue
  useEffect(() => {
    eventsRef.current = events;
  }, [events]);

  // Cleanup polling interval on component unmount
  useEffect(() => {
    return () => {
      if (pollInterval.current) {
        clearInterval(pollInterval.current);
        pollInterval.current = null;
      }
    };
  }, []);

  // Helper function to create event key for deduplication
  const createEventKey = (event: EventData): string => {
    return `${event.title}_${event.date}_${event.venue}`;
  };

  const formatDateForAPI = (): string => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (timePeriod === 'heute') return today.toISOString().split('T')[0];
    else if (timePeriod === 'morgen') return tomorrow.toISOString().split('T')[0];
    else return customDate || today.toISOString().split('T')[0];
  };

  // Toggle category selection
  const toggleCategory = (category: string) => {
    setSelectedCategories(prev => 
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  // Asynchrone Suche (Job)
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
    setDebugData(null);

    // Job starten
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          city: city.trim(), 
          date: formatDateForAPI(),
          categories: selectedCategories,
          options: { 
            temperature: 0.2, 
            max_tokens: 5000,
            debug: debugMode
          }
        }),
      });
      const { jobId } = await res.json();
      setJobId(jobId);
      
      // Poll starten
      startPolling(jobId);
    } catch (err) {
      setError('Fehler beim Starten der Eventsuche.');
      setLoading(false);
      setJobStatus('idle');
    }
  };

  // Polling-Funktion (jetzt: max 4 Minuten) with progressive updates
  const startPolling = (jobId: string) => {
    if (pollInterval.current) clearInterval(pollInterval.current);
    
    let count = 0;
    const maxPolls = 24; // 24 x 10s = 240s = 4 Minuten
    
    pollInterval.current = setInterval(async () => {
      count++;
      setPollCount(count);
      
      if (count > maxPolls) { // nach 4 Minuten abbrechen
        clearInterval(pollInterval.current!);
        setLoading(false);
        setJobStatus('error');
        setError('Die Suche dauert zu lange (Timeout nach 4 Minuten). Bitte versuche es später erneut.');
        return;
      }

      try {
        const debugParam = debugMode ? '?debug=1' : '';
        const res = await fetch(`/api/jobs/${jobId}${debugParam}`);
        if (!res.ok) throw new Error(`Status ${res.status}`);
        
        const job = await res.json();
        
        // Handle progressive updates - show events even if still pending
        if (job.status === 'pending' && job.events && job.events.length > 0) {
          const currentEventKeys = new Set(eventsRef.current.map(createEventKey));
          const incomingEvents = job.events;
          const newEventKeys = new Set<string>();
          
          // Find actually new events
          incomingEvents.forEach((event: EventData) => {
            const key = createEventKey(event);
            if (!currentEventKeys.has(key)) {
              newEventKeys.add(key);
            }
          });
          
          // Update events
          setEvents(incomingEvents);
          
          // Show toast for new events
          if (newEventKeys.size > 0) {
            setNewEvents(newEventKeys);
            setToast({
              show: true,
              message: `${newEventKeys.size} neue Event${newEventKeys.size !== 1 ? 's' : ''} gefunden`
            });
            
            // Hide toast after 3 seconds
            setTimeout(() => {
              setToast({show: false, message: ''});
              setNewEvents(new Set()); // Clear new event markers after a delay
            }, 3000);
          }
          
          // Update debug data if available
          if (job.debug) {
            setDebugData(job.debug);
          }
          
          return; // Continue polling
        }
        
        // Handle completion
        if (job.status !== 'pending') {
          clearInterval(pollInterval.current!);
          setLoading(false);
          
          if (job.status === 'done') {
            const incomingEvents: EventData[] = job.events || [];
            
            // If this is the first set of results (no prior events), mark all as new
            if (eventsRef.current.length === 0 && incomingEvents.length > 0) {
              const allNewEventKeys = new Set(incomingEvents.map(createEventKey));
              setNewEvents(allNewEventKeys);
              setToast({
                show: true,
                message: `${incomingEvents.length} Event${incomingEvents.length !== 1 ? 's' : ''} gefunden`
              });
              
              // Hide toast and clear "Neu" markers after 3 seconds
              setTimeout(() => {
                setToast({show: false, message: ''});
                setNewEvents(new Set());
              }, 3000);
            }
            
            setEvents(incomingEvents);
            setJobStatus('done');
            
            // Update debug data if available
            if (job.debug) {
              setDebugData(job.debug);
            }
          } else {
            setJobStatus('error');
            setError(job.error || 'Fehler bei der Eventsuche.');
          }
        }
      } catch (err) {
        // Show non-blocking toast for transient errors, continue polling
        console.warn(`Polling attempt ${count} failed:`, err);
        setToast({
          show: true,
          message: `Netzwerkfehler (Versuch ${count}) - Suche läuft weiter...`
        });
        
        // Hide toast after 3 seconds but don't stop polling
        setTimeout(() => {
          setToast({show: false, message: ''});
        }, 3000);
      }
    }, 10000); // alle 10 Sekunden pollen
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
                {ALL_CATEGORIES.map((category) => (
                  <label key={category} className="category-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedCategories.includes(category)}
                      onChange={() => toggleCategory(category)}
                    />
                    <span className="category-name">{category}</span>
                  </label>
                ))}
              </div>
              <div className="categories-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setSelectedCategories(ALL_CATEGORIES)}
                >
                  Alle auswählen
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setSelectedCategories([])}
                >
                  Alle abwählen
                </button>
              </div>
            </div>

            <button type="submit" className="btn-search">
              Events suchen
            </button>
          </form>
        </div>
      </section>

      {/* Main Content */}
      <main className="container">
        {/* Error Message */}
        {error && (
          <div className="error">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="loading">
            <div className="loading-spinner"></div>
            <p>
              {jobStatus === 'pending' && events.length > 0 
                ? 'Suche läuft – Ergebnisse werden ergänzt' 
                : 'Suche läuft … bitte habe etwas Geduld.'
              }
            </p>
            <p>Abfrage <span className="font-mono">{pollCount}/24</span> (max. 240 sec / 4min)</p>
            <p>KI-Auswertung kann länger dauern!</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && !events.length && !error && (
          <div className="empty-state">
            <h3>Bereit für dein nächstes Abenteuer?</h3>
            <p>Starte eine Suche, um die besten Events in deiner Stadt zu entdecken.</p>
          </div>
        )}

        {/* Events Grid */}
        {!!events.length && (
          <div className="events-grid">
            {events.map((event) => {
              const eventKey = createEventKey(event);
              const isNew = newEvents.has(eventKey);
              
              return (
                <div key={eventKey} className={`event-card ${isNew ? 'event-card-new' : ''}`}>
                  {isNew && <div className="badge-new">Neu</div>}
                  <div className="event-content">
                    <h3 className="event-title">{event.title}</h3>
                    
                    {/* Date and Time */}
                    <div className="event-date">
                      {event.date}
                      {event.time && ` • ${event.time}`}
                      {event.endTime && ` - ${event.endTime}`}
                    </div>
                    
                    {/* Venue and Address */}
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
                    
                    {/* Category */}
                    {event.category && (
                      <div className="event-category">🏷️ {event.category}</div>
                    )}
                    
                    {/* Event Type */}
                    {event.eventType && (
                      <div className="event-type">🎭 {event.eventType}</div>
                    )}
                    
                    {/* Price Information */}
                    {(event.price || event.ticketPrice) && (
                      <div className="event-price">
                        💰 {event.ticketPrice || event.price}
                      </div>
                    )}
                    
                    {/* Age Restrictions */}
                    {event.ageRestrictions && (
                      <div className="event-age">🔞 {event.ageRestrictions}</div>
                    )}
                    
                    {/* Description */}
                    {event.description && (
                      <div className="event-description">{event.description}</div>
                    )}
                    
                    {/* Links */}
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

      {/* Toast Notification */}
      {toast.show && (
        <div className="toast-container">
          <div className="toast">
            {toast.message}
          </div>
        </div>
      )}

      {/* Debug Panel */}
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
                <div className="debug-parsed">
                  <strong>Gefundene Events:</strong> {step.parsedCount}
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
      <footer className="footer">
        <div className="container">
          <p>© 2025 Where2Go - Entdecke deine Stadt neu</p>
        </div>
      </footer>
    </div>
  );
}
