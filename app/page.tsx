'use client';
import { useState, useRef } from 'react';

interface EventData {
  title: string;
  category: string;
  date: string;
  time: string;
  venue: string;
  price: string;
  website: string;
}

export default function Home() {
  const [city, setCity] = useState('');
  const [timePeriod, setTimePeriod] = useState('heute');
  const [customDate, setCustomDate] = useState('');
  const [events, setEvents] = useState<EventData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<'idle' | 'pending' | 'done' | 'error'>('idle');
  const [pollCount, setPollCount] = useState(0);
  
  // To store polling interval id persistently
  const pollInterval = useRef<NodeJS.Timeout | null>(null);

  const formatDateForAPI = (): string => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (timePeriod === 'heute') return today.toISOString().split('T')[0];
    else if (timePeriod === 'morgen') return tomorrow.toISOString().split('T')[0];
    else return customDate || today.toISOString().split('T')[0];
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
    setJobId(null);
    setJobStatus('pending');
    setPollCount(0);

    // Job starten
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city: city.trim(), date: formatDateForAPI() }),
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

  // Polling-Funktion (jetzt: max 4 Minuten)
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
        const res = await fetch(`/api/jobs/${jobId}`);
        if (!res.ok) throw new Error(`Status ${res.status}`);
        
        const job = await res.json();
        
        if (job.status === 'pending') return;
        
        clearInterval(pollInterval.current!);
        setLoading(false);
        
        if (job.status === 'done') {
          setEvents(job.events);
          setJobStatus('done');
        } else {
          setJobStatus('error');
          setError(job.message || 'Fehler bei der Eventsuche.');
        }
      } catch (err) {
        clearInterval(pollInterval.current!);
        setLoading(false);
        setJobStatus('error');
        setError('Fehler beim Abrufen des Jobs/Ergebnisses.');
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
            <p>Suche läuft … bitte habe etwas Geduld.</p>
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
            {events.map((event, index) => (
              <div key={index} className="event-card">
                <div className="event-content">
                  <h3 className="event-title">{event.title}</h3>
                  <div className="event-date">{event.date} {event.time && ` • ${event.time}`}</div>
                  <div className="event-location">📍 {event.venue}</div>
                  {event.category && (
                    <div className="event-category">🏷️ {event.category}</div>
                  )}
                  {event.price && (
                    <div className="event-price">💰 {event.price}</div>
                  )}
                  {event.website && (
                    <a 
                      href={event.website} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="event-link"
                    >
                      Mehr Infos →
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <p>© 2025 Where2Go - Entdecke deine Stadt neu</p>
        </div>
      </footer>
    </div>
  );
}
