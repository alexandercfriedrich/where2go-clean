'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';

interface Scraper {
  key: string;
  name: string;
  city: string;
  country: string;
  type: 'venue' | 'aggregator';
  category: string;
  website: string;
  isActive: boolean;
  hasDedicatedScraper: boolean;
  description?: string;
}

interface ScraperStats {
  total: number;
  active: number;
  inactive: number;
}

interface StatusMessage {
  text: string;
  type: 'success' | 'error';
  workflowUrl?: string;
}

export default function ScrapersAdminPage() {
  const [scrapers, setScrapers] = useState<Scraper[]>([]);
  const [stats, setStats] = useState<ScraperStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedScrapers, setSelectedScrapers] = useState<Set<string>>(new Set());
  const [runningScrapers, setRunningScrapers] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<StatusMessage | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'venue' | 'aggregator'>('all');
  const [filterCity, setFilterCity] = useState<string>('all');

  useEffect(() => {
    loadScrapers();
  }, []);

  const loadScrapers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/scrapers');
      if (!response.ok) throw new Error('Failed to load scrapers');
      const data = await response.json();
      setScrapers(data.scrapers);
      setStats(data.stats);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectScraper = (key: string) => {
    const newSelected = new Set(selectedScrapers);
    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.add(key);
    }
    setSelectedScrapers(newSelected);
  };

  const handleSelectAll = () => {
    const filtered = getFilteredScrapers();
    if (selectedScrapers.size === filtered.length) {
      setSelectedScrapers(new Set());
    } else {
      setSelectedScrapers(new Set(filtered.map(s => s.key)));
    }
  };

  const handleRunScraper = async (scraperKey: string) => {
    if (!confirm(`Run scraper for ${scraperKey}?`)) return;

    try {
      setRunningScrapers(new Set([...runningScrapers, scraperKey]));
      setMessage({ text: `Starting ${scraperKey} scraper...`, type: 'success' });

      const response = await fetch(`/api/admin/venue-scrapers?venues=${scraperKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || data?.error || 'Failed to run scraper');
      }

      setMessage({
        text: `${scraperKey} scraper started successfully.`,
        type: 'success',
        workflowUrl: data.workflowUrl
      });
    } catch (err: any) {
      setMessage({ text: `Error running ${scraperKey}: ${err.message}`, type: 'error' });
    } finally {
      setRunningScrapers(prev => {
        const next = new Set(prev);
        next.delete(scraperKey);
        return next;
      });
    }
  };

  const handleRunSelected = async () => {
    if (selectedScrapers.size === 0) {
      alert('Please select at least one scraper');
      return;
    }

    const scraperList = Array.from(selectedScrapers).join(', ');
    if (!confirm(`Run ${selectedScrapers.size} selected scraper(s)?\n\n${scraperList}`)) return;

    try {
      setMessage({ text: `Starting ${selectedScrapers.size} scraper(s)...`, type: 'success' });
      const venuesParam = Array.from(selectedScrapers).join(',');

      const response = await fetch(`/api/admin/venue-scrapers?venues=${venuesParam}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || data?.error || 'Failed to run scrapers');
      }

      setMessage({
        text: `${selectedScrapers.size} scraper(s) started successfully.`,
        type: 'success',
        workflowUrl: data.workflowUrl
      });
      setSelectedScrapers(new Set());
    } catch (err: any) {
      setMessage({ text: `Error: ${err.message}`, type: 'error' });
    }
  };

  const handleRunAll = async () => {
    if (!confirm('Run ALL scrapers? This may take a while.')) return;

    try {
      setMessage({ text: 'Starting all scrapers...', type: 'success' });

      const response = await fetch('/api/admin/venue-scrapers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || data?.error || 'Failed to run scrapers');
      }

      setMessage({
        text: 'All scrapers started successfully.',
        type: 'success',
        workflowUrl: data.workflowUrl
      });
    } catch (err: any) {
      setMessage({ text: `Error: ${err.message}`, type: 'error' });
    }
  };

  const getFilteredScrapers = () => {
    return scrapers.filter(s => {
      if (filterType !== 'all' && s.type !== filterType) return false;
      if (filterCity !== 'all' && s.city !== filterCity) return false;
      return true;
    });
  };

  const cities = useMemo(
    () => Array.from(new Set(scrapers.map(s => s.city))).sort(),
    [scrapers]
  );
  const filteredScrapers = getFilteredScrapers();

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
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 2px solid #eee;
        }
        .title {
          font-size: 2.5rem;
          color: #333;
          margin: 0;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }
        .stat-card {
          background: white;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .stat-label {
          font-size: 0.9rem;
          color: #666;
          margin-bottom: 5px;
        }
        .stat-value {
          font-size: 2rem;
          font-weight: bold;
          color: #333;
        }
        .controls {
          background: white;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 20px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .controls-row {
          display: flex;
          gap: 15px;
          align-items: center;
          flex-wrap: wrap;
        }
        .btn {
          padding: 10px 20px;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          font-size: 14px;
          transition: background-color 0.3s;
        }
        .btn-primary {
          background-color: #007bff;
          color: white;
        }
        .btn-primary:hover:not(:disabled) {
          background-color: #0056b3;
        }
        .btn-success {
          background-color: #28a745;
          color: white;
        }
        .btn-success:hover:not(:disabled) {
          background-color: #218838;
        }
        .btn-secondary {
          background-color: #6c757d;
          color: white;
        }
        .btn-secondary:hover:not(:disabled) {
          background-color: #545b62;
        }
        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .filter-group {
          display: flex;
          gap: 10px;
          align-items: center;
        }
        select {
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
        }
        .scrapers-table {
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          overflow: hidden;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        th {
          background: #f8f9fa;
          padding: 15px;
          text-align: left;
          font-weight: 600;
          color: #333;
          border-bottom: 2px solid #dee2e6;
        }
        td {
          padding: 15px;
          border-bottom: 1px solid #dee2e6;
        }
        tr:hover {
          background: #f8f9fa;
        }
        .status-badge {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 0.8rem;
          font-weight: bold;
        }
        .status-active {
          background-color: #d4edda;
          color: #155724;
        }
        .status-inactive {
          background-color: #f8d7da;
          color: #721c24;
        }
        .type-badge {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 0.8rem;
          background: #e7f3ff;
          color: #004085;
        }
        .message {
          padding: 15px;
          margin-bottom: 20px;
          border-radius: 5px;
          font-size: 14px;
        }
        .message-success {
          background-color: #d4edda;
          color: #155724;
          border: 1px solid #c3e6cb;
        }
        .message-error {
          background-color: #f8d7da;
          color: #721c24;
          border: 1px solid #f5c6cb;
        }
      `}</style>

      <div className="header">
        <h1 className="title">🔧 Scrapers Management</h1>
        <Link href="/admin" className="btn btn-secondary">
          ← Back to Admin
        </Link>
      </div>

      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Total Scrapers</div>
            <div className="stat-value">{stats.total}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Active Scrapers</div>
            <div className="stat-value" style={{ color: '#28a745' }}>{stats.active}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Inactive Scrapers</div>
            <div className="stat-value" style={{ color: '#dc3545' }}>{stats.inactive}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Selected</div>
            <div className="stat-value" style={{ color: '#007bff' }}>{selectedScrapers.size}</div>
          </div>
        </div>
      )}

      {message && (
        <div className={`message ${message.type === 'success' ? 'message-success' : 'message-error'}`}>
          {message.type === 'success' ? '✅ ' : '❌ '}
          {message.text}
          {message.workflowUrl && (
            <>
              {' '}
              <a 
                href={message.workflowUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ textDecoration: 'underline', color: 'inherit' }}
              >
                View workflow →
              </a>
            </>
          )}
        </div>
      )}

      <div className="controls">
        <div className="controls-row">
          <div className="filter-group">
            <label>Type:</label>
            <select value={filterType} onChange={(e) => setFilterType(e.target.value as any)}>
              <option value="all">All Types</option>
              <option value="venue">Venues</option>
              <option value="aggregator">Aggregators</option>
            </select>
          </div>

          <div className="filter-group">
            <label>City:</label>
            <select value={filterCity} onChange={(e) => setFilterCity(e.target.value)}>
              <option value="all">All Cities</option>
              {cities.map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>

          <button className="btn btn-primary" onClick={handleSelectAll}>
            {selectedScrapers.size === filteredScrapers.length ? 'Deselect All' : 'Select All'}
          </button>

          <button 
            className="btn btn-success" 
            onClick={handleRunSelected}
            disabled={selectedScrapers.size === 0}
          >
            ▶ Run Selected ({selectedScrapers.size})
          </button>

          <button className="btn btn-success" onClick={handleRunAll}>
            ▶▶ Run All Scrapers
          </button>

          <button className="btn btn-secondary" onClick={loadScrapers}>
            🔄 Refresh
          </button>
        </div>
      </div>

      <div className="scrapers-table">
        <table>
          <thead>
            <tr>
              <th style={{ width: '40px' }}>
                <input
                  type="checkbox"
                  checked={selectedScrapers.size === filteredScrapers.length && filteredScrapers.length > 0}
                  onChange={handleSelectAll}
                />
              </th>
              <th>Name</th>
              <th>Type</th>
              <th>City</th>
              <th>Status</th>
              <th>Website</th>
              <th style={{ width: '120px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredScrapers.map(scraper => (
              <tr key={scraper.key}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedScrapers.has(scraper.key)}
                    onChange={() => handleSelectScraper(scraper.key)}
                  />
                </td>
                <td>
                  <strong>{scraper.name}</strong>
                  {scraper.description && (
                    <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '4px' }}>
                      {scraper.description}
                    </div>
                  )}
                </td>
                <td>
                  <span className="type-badge">{scraper.type}</span>
                </td>
                <td>{scraper.city}, {scraper.country}</td>
                <td>
                  <span className={`status-badge ${scraper.isActive ? 'status-active' : 'status-inactive'}`}>
                    {scraper.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>
                  <a href={scraper.website} target="_blank" rel="noopener noreferrer" style={{ color: '#007bff' }}>
                    Visit →
                  </a>
                </td>
                <td>
                  <button
                    className="btn btn-primary"
                    onClick={() => handleRunScraper(scraper.key)}
                    disabled={runningScrapers.has(scraper.key) || !scraper.isActive}
                    style={{ padding: '6px 12px', fontSize: '12px', width: '100%' }}
                  >
                    {runningScrapers.has(scraper.key) ? '⏳ Running...' : '▶ Run'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredScrapers.length === 0 && (
        <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
          No scrapers found matching the current filters.
        </div>
      )}
    </div>
  );
}
