'use client';

import { useState, useEffect } from 'react';

interface HotCityStats {
  id: string;
  name: string;
  country: string;
  isActive: boolean;
  totalWebsites: number;
  activeWebsites: number;
  cachedSearches: number;
  totalEvents: number;
  lastSearched: string | null;
}

export default function HotCitiesStats() {
  const [stats, setStats] = useState<HotCityStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/hot-cities/stats');
      if (!response.ok) throw new Error('Failed to load stats');
      const data = await response.json();
      setStats(data.stats || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClearCache = async (cityId: string) => {
    try {
      const response = await fetch(`/api/admin/hot-cities/stats/${cityId}/clear-cache`, {
        method: 'POST'
      });
      if (!response.ok) throw new Error('Failed to clear cache');
      await loadStats(); // Reload stats
    } catch (err: any) {
      setError(err.message);
    }
  };

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
        .btn {
          padding: 10px 20px;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          font-size: 14px;
          transition: background-color 0.3s;
          text-decoration: none;
          display: inline-block;
        }
        .btn-primary {
          background-color: #007bff;
          color: white;
        }
        .btn-primary:hover {
          background-color: #0056b3;
        }
        .btn-secondary {
          background-color: #6c757d;
          color: white;
          margin-right: 10px;
        }
        .btn-secondary:hover {
          background-color: #545b62;
        }
        .btn-warning {
          background-color: #ffc107;
          color: #000;
        }
        .btn-warning:hover {
          background-color: #e0a800;
        }
        .stats-table {
          width: 100%;
          border-collapse: collapse;
          background: white;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .stats-table th,
        .stats-table td {
          padding: 12px 15px;
          text-align: left;
          border-bottom: 1px solid #eee;
        }
        .stats-table th {
          background-color: #f8f9fa;
          font-weight: 600;
          color: #333;
        }
        .stats-table tr:hover {
          background-color: #f8f9fa;
        }
        .city-status {
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: bold;
          text-transform: uppercase;
        }
        .status-active {
          background-color: #d4edda;
          color: #155724;
        }
        .status-inactive {
          background-color: #f8d7da;
          color: #721c24;
        }
        .metric {
          font-weight: bold;
          color: #007bff;
        }
        .summary-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }
        .summary-card {
          background: white;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          text-align: center;
        }
        .summary-card h3 {
          margin: 0 0 10px 0;
          color: #666;
          font-size: 0.9rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .summary-card .value {
          font-size: 2rem;
          font-weight: bold;
          color: #007bff;
        }
      `}</style>

      <div className="admin-header">
        <h1 className="admin-title">Hot Cities Statistics</h1>
        <div>
          <a href="/admin" className="btn btn-secondary">Back to Admin</a>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>
            Refresh Stats
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="summary-cards">
        <div className="summary-card">
          <h3>Total Cities</h3>
          <div className="value">{stats.length}</div>
        </div>
        <div className="summary-card">
          <h3>Active Cities</h3>
          <div className="value">{stats.filter(s => s.isActive).length}</div>
        </div>
        <div className="summary-card">
          <h3>Total Websites</h3>
          <div className="value">{stats.reduce((sum, s) => sum + s.totalWebsites, 0)}</div>
        </div>
        <div className="summary-card">
          <h3>Total Cached Events</h3>
          <div className="value">{stats.reduce((sum, s) => sum + s.totalEvents, 0)}</div>
        </div>
      </div>

      {/* Detailed Stats Table */}
      <table className="stats-table">
        <thead>
          <tr>
            <th>City</th>
            <th>Status</th>
            <th>Websites</th>
            <th>Cached Searches</th>
            <th>Total Events</th>
            <th>Last Searched</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {stats.map(city => (
            <tr key={city.id}>
              <td>
                <strong>{city.name}</strong>
                <br />
                <small style={{ color: '#666' }}>{city.country}</small>
              </td>
              <td>
                <span className={`city-status ${city.isActive ? 'status-active' : 'status-inactive'}`}>
                  {city.isActive ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td>
                <span className="metric">{city.activeWebsites}</span> / {city.totalWebsites}
                <br />
                <small style={{ color: '#666' }}>active / total</small>
              </td>
              <td>
                <span className="metric">{city.cachedSearches}</span>
              </td>
              <td>
                <span className="metric">{city.totalEvents}</span>
              </td>
              <td>
                {city.lastSearched ? (
                  <>
                    {new Date(city.lastSearched).toLocaleDateString()}
                    <br />
                    <small style={{ color: '#666' }}>
                      {new Date(city.lastSearched).toLocaleTimeString()}
                    </small>
                  </>
                ) : (
                  <span style={{ color: '#999' }}>Never</span>
                )}
              </td>
              <td>
                <button
                  className="btn btn-warning"
                  onClick={() => handleClearCache(city.id)}
                  disabled={city.totalEvents === 0}
                  style={{ fontSize: '12px', padding: '6px 12px' }}
                >
                  Clear Cache
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {stats.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
          <p>No hot cities configured yet.</p>
          <a href="/admin" className="btn btn-primary">
            Manage Hot Cities
          </a>
        </div>
      )}
    </div>
  );
}