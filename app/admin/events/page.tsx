'use client';

import { useState, useEffect, useCallback } from 'react';
import { EventData } from '@/lib/types';

interface AdminEventsData {
  city: string;
  date: string;
  totalEvents: number;
  cachedCategories: number;
  totalCategories: number;
  missingCategories: string[];
  events: EventData[];
  cacheBreakdown: { [category: string]: { fromCache: boolean; eventCount: number } };
}

export default function AdminEventsPage() {
  const [eventsData, setEventsData] = useState<AdminEventsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [city, setCity] = useState('Berlin');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const loadEventsData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/events?city=${encodeURIComponent(city)}&date=${date}`);
      if (!response.ok) throw new Error('Failed to load events data');
      const data = await response.json();
      setEventsData(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [city, date]);

  useEffect(() => {
    loadEventsData();
  }, [loadEventsData]);

  if (loading) return <div className="admin-container"><p>Loading...</p></div>;
  if (error) return <div className="admin-container"><p>Error: {error}</p></div>;

  return (
    <div className="admin-container">
      <style jsx>{`
        .admin-container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 20px;
        }
        .admin-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 2px solid #eee;
        }
        .admin-title {
          font-size: 2.5rem;
          color: #333;
          margin: 0;
        }
        .filters {
          display: flex;
          gap: 15px;
          margin-bottom: 30px;
          padding: 20px;
          background: #f8f9fa;
          border-radius: 8px;
        }
        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }
        .filter-label {
          font-weight: bold;
          color: #333;
        }
        .filter-input {
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
        }
        .btn {
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          transition: background-color 0.3s;
        }
        .btn-primary {
          background-color: #007bff;
          color: white;
        }
        .btn-primary:hover {
          background-color: #0056b3;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }
        .stat-card {
          background: white;
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 20px;
          text-align: center;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .stat-number {
          font-size: 2rem;
          font-weight: bold;
          color: #007bff;
        }
        .stat-label {
          color: #666;
          font-size: 0.9rem;
          margin-top: 5px;
        }
        .events-section {
          margin-bottom: 30px;
        }
        .section-title {
          font-size: 1.5rem;
          color: #333;
          margin-bottom: 15px;
        }
        .events-grid {
          display: grid;
          gap: 15px;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
        }
        .event-card {
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 15px;
          background: white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .event-title {
          font-weight: bold;
          color: #333;
          margin-bottom: 8px;
        }
        .event-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          font-size: 0.9rem;
          color: #666;
        }
        .event-meta span {
          background: #f8f9fa;
          padding: 2px 6px;
          border-radius: 3px;
        }
        .missing-categories {
          margin-top: 20px;
          padding: 15px;
          background: #fff3cd;
          border: 1px solid #ffeaa7;
          border-radius: 8px;
        }
        .cache-breakdown {
          margin-top: 20px;
        }
        .cache-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 10px;
          margin-top: 10px;
        }
        .cache-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          background: white;
          border: 1px solid #ddd;
          border-radius: 4px;
        }
        .cache-status {
          padding: 2px 6px;
          border-radius: 3px;
          font-size: 0.8rem;
          font-weight: bold;
        }
        .cache-hit {
          background: #d4edda;
          color: #155724;
        }
        .cache-miss {
          background: #f8d7da;
          color: #721c24;
        }
      `}</style>
      
      <div className="admin-header">
        <h1 className="admin-title">Events Administration</h1>
        <div>
          <a href="/admin" className="btn btn-primary">
            Back to Admin Dashboard
          </a>
        </div>
      </div>

      <div className="filters">
        <div className="filter-group">
          <label className="filter-label">City</label>
          <input
            type="text"
            className="filter-input"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Enter city name"
          />
        </div>
        <div className="filter-group">
          <label className="filter-label">Date</label>
          <input
            type="date"
            className="filter-input"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <label className="filter-label">&nbsp;</label>
          <button className="btn btn-primary" onClick={loadEventsData}>
            Refresh Data
          </button>
        </div>
      </div>

      {eventsData && (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-number">{eventsData.totalEvents}</div>
              <div className="stat-label">Total Events</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{eventsData.cachedCategories}</div>
              <div className="stat-label">Cached Categories</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{eventsData.totalCategories}</div>
              <div className="stat-label">Total Categories</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{eventsData.missingCategories.length}</div>
              <div className="stat-label">Missing Categories</div>
            </div>
          </div>

          {eventsData.missingCategories.length > 0 && (
            <div className="missing-categories">
              <h3>Missing Categories</h3>
              <p>These categories are not cached and would require AI calls:</p>
              <ul>
                {eventsData.missingCategories.map(category => (
                  <li key={category}>{category}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="cache-breakdown">
            <h3 className="section-title">Cache Status by Category</h3>
            <div className="cache-grid">
              {Object.entries(eventsData.cacheBreakdown).map(([category, info]) => (
                <div key={category} className="cache-item">
                  <span>{category}</span>
                  <div>
                    <span className={`cache-status ${info.fromCache ? 'cache-hit' : 'cache-miss'}`}>
                      {info.fromCache ? 'CACHED' : 'MISSING'}
                    </span>
                    <span style={{ marginLeft: '8px', fontSize: '0.9rem' }}>
                      ({info.eventCount} events)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="events-section">
            <h3 className="section-title">Cached Events ({eventsData.events.length})</h3>
            {eventsData.events.length > 0 ? (
              <div className="events-grid">
                {eventsData.events.slice(0, 50).map((event, index) => (
                  <div key={index} className="event-card">
                    <div className="event-title">{event.title}</div>
                    <div className="event-meta">
                      <span>📅 {event.date}</span>
                      <span>🕐 {event.time}</span>
                      <span>🏷️ {event.category}</span>
                      <span>📍 {event.venue}</span>
                      <span>💰 {event.price}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p>No events found in cache for {city} on {date}</p>
            )}
            {eventsData.events.length > 50 && (
              <p style={{ marginTop: '15px', fontStyle: 'italic', color: '#666' }}>
                Showing first 50 events. Total: {eventsData.events.length}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}