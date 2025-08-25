'use client';
import { useState } from 'react';

// Event interface to match API response
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

  // Funktion zum Formatieren des Datums
  const formatDateForAPI = (): string => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (timePeriod === 'heute') {
      return today.toISOString().split('T')[0];
    } else if (timePeriod === 'morgen') {
      return tomorrow.toISOString().split('T')[0];
    } else {
      return customDate || today.toISOString().split('T')[0];
    }
  };

  // Funktion zum Suchen von Events
  const searchEvents = async () => {
    if (!city.trim()) {
      setError('Bitte gib eine Stadt ein');
      return;
    }

    setLoading(true);
    setError(null);
    setEvents([]);

    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          city: city.trim(),
          date: formatDateForAPI(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Fehler beim Laden der Events');
      }

      if (data.success) {
        setEvents(data.events || []);
        if (data.events.length === 0) {
          setError('Keine Events für diese Stadt und dieses Datum gefunden.');
        }
      } else {
        setError(data.error || 'Unbekannter Fehler');
      }
    } catch (err) {
      console.error('Search error:', err);
      setError(err instanceof Error ? err.message : 'Netzwerkfehler beim Laden der Events');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Where2Go
          </h1>
          <p className="text-gray-600">
            Finde Events in deiner Stadt
          </p>
        </header>

        {/* Search Form */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* City Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="city">
                Stadt
              </label>
              <input
                type="text"
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="z.B. Berlin, München..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Time Period Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="timePeriod">
                Zeitraum
              </label>
              <select
                id="timePeriod"
                value={timePeriod}
                onChange={(e) => setTimePeriod(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="heute">Heute</option>
                <option value="morgen">Morgen</option>
                <option value="benutzerdefiniert">Benutzerdefiniert</option>
              </select>
            </div>

            {/* Custom Date Input (shows when benutzerdefiniert is selected) */}
            {timePeriod === 'benutzerdefiniert' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="customDate">
                  Datum
                </label>
                <input
                  type="date"
                  id="customDate"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            )}

            {/* Search Button */}
            <div className="flex items-end">
              <button
                type="button"
                onClick={searchEvents}
                disabled={loading}
                className={`w-full py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors ${
                  loading
                    ? 'bg-gray-400 cursor-not-allowed text-white'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {loading ? 'Suchen...' : 'Suchen'}
              </button>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
            <div className="flex items-center">
              <div className="text-red-400 mr-3">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-red-800">{error}</p>
            </div>
          </div>
        )}

        {/* Events List */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">
            Events
          </h2>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mb-4"></div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Events werden geladen...
              </h3>
              <p className="text-gray-500">
                Suche nach Events in {city} für {formatDateForAPI()}
              </p>
            </div>
          ) : events.length === 0 && !error ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Noch keine Events
              </h3>
              <p className="text-gray-500">
                Gib eine Stadt ein und wähle einen Zeitraum, um Events zu finden.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {events.map((event, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
                    <div className="md:col-span-2">
                      <h3 className="font-semibold text-gray-900 mb-1">{event.title || 'Unbekannt'}</h3>
                      <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                        event.category.toLowerCase().includes('konzert') ? 'bg-purple-100 text-purple-800' :
                        event.category.toLowerCase().includes('theater') ? 'bg-red-100 text-red-800' :
                        event.category.toLowerCase().includes('club') ? 'bg-pink-100 text-pink-800' :
                        event.category.toLowerCase().includes('museum') ? 'bg-green-100 text-green-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {event.category || 'Event'}
                      </span>
                    </div>
                    
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Datum</p>
                      <p className="text-sm font-medium">{event.date || 'Nicht angegeben'}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Zeit</p>
                      <p className="text-sm font-medium">{event.time || 'Nicht angegeben'}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Ort</p>
                      <p className="text-sm font-medium">{event.venue || 'Nicht angegeben'}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Preis</p>
                      <p className="text-sm font-medium">{event.price || 'Nicht angegeben'}</p>
                    </div>
                    
                    <div className="flex items-center">
                      {event.website && (
                        <a
                          href={event.website.startsWith('http') ? event.website : `https://${event.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-3 py-1 border border-blue-300 text-sm leading-4 font-medium rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          Website
                          <svg className="ml-1 h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Event Count */}
              <div className="text-center pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-500">
                  {events.length} Event{events.length !== 1 ? 's' : ''} gefunden
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
