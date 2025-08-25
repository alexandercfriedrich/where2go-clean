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

  // Polling-Funktion
  const startPolling = (jobId: string) => {
    if (pollInterval.current) clearInterval(pollInterval.current);
    let count = 0;
    pollInterval.current = setInterval(async () => {
      count++;
      setPollCount(count);
      if (count > 7) { // nach 7x (ca. 70s) abbrechen
        clearInterval(pollInterval.current!);
        setLoading(false);
        setJobStatus('error');
        setError('Die Suche dauert zu lange (Timeout nach über einer Minute). Bitte versuche es später erneut.');
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
    }, 10000); // alle 10 Sekunden poll
  };

  return (
    <main className="max-w-lg mx-auto p-4">
      <h1 className="text-2xl font-bold mb-2">Where2Go</h1>
      <p className="mb-4">Eventsuche für verschiedene Städte – unterstützt auch längere KI-Auswertung!</p>

      <form
        onSubmit={e => {
          e.preventDefault();
          searchEvents();
        }}
        className="space-y-2 mb-6"
      >
        <label>
          Stadt
          <input
            type="text"
            id="city"
            value={city}
            onChange={e => setCity(e.target.value)}
            placeholder="z.B. Linz, Berlin, Hamburg ..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </label>
        <label>
          Zeitraum
          <select
            id="timePeriod"
            value={timePeriod}
            onChange={e => setTimePeriod(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="heute">Heute</option>
            <option value="morgen">Morgen</option>
            <option value="benutzerdefiniert">Benutzerdefiniert</option>
          </select>
        </label>
        {timePeriod === 'benutzerdefiniert' && (
          <label>
            Datum
            <input
              type="date"
              id="customDate"
              value={customDate}
              onChange={e => setCustomDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </label>
        )}
        <button
          type="submit"
          className="block w-full bg-blue-600 text-white py-2 rounded font-bold hover:bg-blue-700"
        >
          Events suchen
        </button>
      </form>
      {error && <div className="bg-red-100 text-red-800 px-3 py-2 rounded mb-3">{error}</div>}
      {loading && (
        <div className="mb-3">
          <div className="animate-spin h-6 w-6 mr-3 inline-block border-4 border-blue-400 border-t-transparent rounded-full" />
          Suche läuft … bitte habe etwas Geduld.<br />
          Abfrage <span className="font-mono">{pollCount}/7</span> (max. 70 sec) – KI-Auswertung kann länger dauern!
        </div>
      )}

      <h2 className="text-lg font-bold mt-4 mb-2">Events</h2>
      {!loading && !events.length && !error && (
        <p className="text-gray-500">Starte eine Suche, um Events zu sehen.</p>
      )}
      {!!events.length && (
        <table className="w-full border mt-3 text-sm">
          <thead>
            <tr>
              <th>Titel</th><th>Kategorie</th><th>Datum</th><th>Zeit</th><th>Ort</th><th>Preis</th><th>Website</th>
            </tr>
          </thead>
          <tbody>
            {events.map((ev, i) => (
              <tr key={i} className="border-t">
                <td>{ev.title}</td>
                <td>{ev.category}</td>
                <td>{ev.date}</td>
                <td>{ev.time}</td>
                <td>{ev.venue}</td>
                <td>{ev.price}</td>
                <td>
                  {ev.website &&
                    <a href={ev.website.startsWith('http') ? ev.website : `https://${ev.website}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Link</a>
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
