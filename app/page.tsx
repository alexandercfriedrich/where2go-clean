'use client';

import { useState } from 'react';

export default function Home() {
  const [city, setCity] = useState('');
  const [timePeriod, setTimePeriod] = useState('heute');
  const [customDate, setCustomDate] = useState('');
  const [events] = useState([]);

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
              <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-2">
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
              <label htmlFor="timePeriod" className="block text-sm font-medium text-gray-700 mb-2">
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
                <label htmlFor="customDate" className="block text-sm font-medium text-gray-700 mb-2">
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
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              >
                Suchen
              </button>
            </div>
          </div>
        </div>

        {/* Events List */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">
            Events
          </h2>
          
          {events.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
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
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  {/* Event details will be displayed here */}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
