'use client';

import { useEffect, useMemo, useState } from 'react';

type AdminEvent = {
  title?: string;
  category?: string;
  date?: string;
  time?: string;
  venue?: string;
  price?: string;
  website?: string;
};

type AdminEventsResponse = {
  city: string;
  date: string;
  totalEvents: number;
  cachedCategories: number;
  totalCategories: number;
  missingCategories: string[];
  events: AdminEvent[];
  cacheBreakdown: Record<string, { fromCache: boolean; eventCount: number }>;
  debug?: {
    cacheSize: number;
    searchCity: string;
    searchDate: string;
    requestedCategories: string[];
    foundCategories: string[];
    cacheKeys: string[];
    cacheEntries: Array<{
      key: string;
      hasData: boolean;
      dataLength: number | string;
      timestamp: string;
      ttl: number;
    }>;
  };
};

function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function AdminEventsPage() {
  const [city, setCity] = useState('Wien');
  const [date, setDate] = useState(todayISO());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AdminEventsResponse | null>(null);
  const [showDebug, setShowDebug] = useState(false);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    params.set('city', city);
    params.set('date', date);
    if (showDebug) params.set('debug', '1');
    return params.toString();
  }, [city, date, showDebug]);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/admin/events?${query}`, { cache: 'no-store' });
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(`Failed to fetch admin events: ${res.status} ${txt}`);
      }
      const json = (await res.json()) as AdminEventsResponse;
      setData(json);
    } catch (e: any) {
      setError(e.message || 'Unbekannter Fehler');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []); // initial load

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 20 }}>
      <h1 style={{ fontSize: '2rem', marginBottom: 16 }}>Admin: Events Cache</h1>

      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label htmlFor="city" style={{ fontWeight: 600, marginBottom: 4 }}>City</label>
          <input
            id="city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="z.B. Berlin"
            style={{ padding: '8px 10px', border: '1px solid #ddd', borderRadius: 6, minWidth: 200 }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label htmlFor="date" style={{ fontWeight: 600, marginBottom: 4 }}>Date</label>
          <input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{ padding: '8px 10px', border: '1px solid #ddd', borderRadius: 6 }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="checkbox"
            id="debug"
            checked={showDebug}
            onChange={(e) => setShowDebug(e.target.checked)}
            style={{ marginRight: 4 }}
          />
          <label htmlFor="debug" style={{ fontWeight: 600 }}>Debug Mode</label>
        </div>

        <button
          onClick={load}
          disabled={loading}
          style={{
            padding: '10px 16px',
            border: 'none',
            borderRadius: 8,
            background: '#007bff',
            color: '#fff',
            cursor: 'pointer',
            opacity: loading ? 0.7 : 1
          }}
        >
          {loading ? 'Laden…' : 'Neu laden'}
        </button>
      </div>

      {error && (
        <div style={{ padding: 12, background: '#fdecea', color: '#611a15', borderRadius: 8, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {data && (
        <div style={{ display: 'grid', gap: 16 }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(220px, 1fr))',
              gap: 12,
              padding: 12,
              border: '1px solid #eee',
              borderRadius: 8,
              background: '#fff'
            }}
          >
            <div><strong>City:</strong> {data.city}</div>
            <div><strong>Date:</strong> {data.date}</div>
            <div><strong>Total Events:</strong> {data.totalEvents}</div>
            <div><strong>Cached Categories:</strong> {data.cachedCategories} / {data.totalCategories}</div>
            <div style={{ gridColumn: '1 / -1' }}>
              <strong>Missing Categories:</strong>{' '}
              {data.missingCategories.length > 0 ? data.missingCategories.join(', ') : '—'}
            </div>
          </div>

          <div
            style={{
              padding: 12,
              border: '1px solid #eee',
              borderRadius: 8,
              background: '#fff'
            }}
          >
            <h2 style={{ fontSize: '1.2rem', marginBottom: 8 }}>Events (Preview)</h2>
            {data.events.length === 0 ? (
              <div style={{ color: '#666' }}>Keine Events im Cache.</div>
            ) : (
              <div style={{ display: 'grid', gap: 8 }}>
                {data.events.slice(0, 50).map((ev, idx) => (
                  <div
                    key={`${ev.title || 'event'}_${idx}`}
                    style={{ padding: 8, border: '1px solid #f0f0f0', borderRadius: 6 }}
                  >
                    <div style={{ fontWeight: 600 }}>{ev.title || '(ohne Titel)'}</div>
                    <div style={{ fontSize: 12, color: '#555' }}>
                      {ev.category || '—'} • {ev.date || '—'}{ev.venue ? ` • ${ev.venue}` : ''}
                    </div>
                    {ev.website && (
                      <div style={{ marginTop: 4 }}>
                        <a href={ev.website} target="_blank" rel="noopener noreferrer">
                          Website
                        </a>
                      </div>
                    )}
                  </div>
                ))}
                {data.events.length > 50 && (
                  <div style={{ color: '#666', fontSize: 12 }}>
                    … und {data.events.length - 50} weitere.
                  </div>
                )}
              </div>
            )}
          </div>

          {showDebug && data.debug && (
            <div style={{ padding: 16, background: '#f8f9fa', borderRadius: 8, border: '1px solid #dee2e6' }}>
              <h3 style={{ marginTop: 0, marginBottom: 16, fontSize: '1.2rem' }}>Debug Information</h3>
              
              <div style={{ display: 'grid', gap: 16 }}>
                <div>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '1rem' }}>Cache Overview</h4>
                  <div style={{ fontFamily: 'monospace', fontSize: 14, lineHeight: 1.4 }}>
                    <div>Cache Size: {data.debug.cacheSize} entries</div>
                    <div>Search City: {data.debug.searchCity}</div>
                    <div>Search Date: {data.debug.searchDate}</div>
                    <div>Requested Categories: {data.debug.requestedCategories.length}</div>
                    <div>Found Categories: {data.debug.foundCategories.length}</div>
                  </div>
                </div>

                <div>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '1rem' }}>Cache Keys</h4>
                  <div style={{ fontFamily: 'monospace', fontSize: 12, maxHeight: 200, overflow: 'auto', background: '#fff', padding: 8, border: '1px solid #ddd', borderRadius: 4 }}>
                    {data.debug.cacheKeys.length > 0 ? (
                      data.debug.cacheKeys.map((key, idx) => (
                        <div key={idx} style={{ marginBottom: 4 }}>{key}</div>
                      ))
                    ) : (
                      <div style={{ color: '#666' }}>No cache keys found</div>
                    )}
                  </div>
                </div>

                <div>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '1rem' }}>Cache Entries</h4>
                  <div style={{ maxHeight: 300, overflow: 'auto' }}>
                    {data.debug.cacheEntries.length > 0 ? (
                      <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ background: '#e9ecef' }}>
                            <th style={{ padding: 4, border: '1px solid #ddd', textAlign: 'left' }}>Key</th>
                            <th style={{ padding: 4, border: '1px solid #ddd', textAlign: 'left' }}>Data Length</th>
                            <th style={{ padding: 4, border: '1px solid #ddd', textAlign: 'left' }}>Timestamp</th>
                            <th style={{ padding: 4, border: '1px solid #ddd', textAlign: 'left' }}>TTL (ms)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.debug.cacheEntries.map((entry, idx) => (
                            <tr key={idx} style={{ background: idx % 2 === 0 ? '#f8f9fa' : '#fff' }}>
                              <td style={{ padding: 4, border: '1px solid #ddd', fontFamily: 'monospace', fontSize: 11 }}>{entry.key}</td>
                              <td style={{ padding: 4, border: '1px solid #ddd' }}>{entry.dataLength}</td>
                              <td style={{ padding: 4, border: '1px solid #ddd', fontSize: 10 }}>{new Date(entry.timestamp).toLocaleString()}</td>
                              <td style={{ padding: 4, border: '1px solid #ddd' }}>{entry.ttl}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div style={{ color: '#666', padding: 8 }}>No cache entries found</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
