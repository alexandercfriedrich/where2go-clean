'use client';

import { useState, useEffect } from 'react';
import { HotCity, HotCityWebsite } from '@/lib/types';
import { extractErrorMessage, createApiErrorMessage } from '../lib/error-utils';

export default function AdminPage() {
  const [cities, setCities] = useState<HotCity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingCity, setEditingCity] = useState<HotCity | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadCities();
  }, []);

  const loadCities = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/hot-cities');
      if (!response.ok) throw new Error('Failed to load cities');
      const data = await response.json();
      setCities(data.cities);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCity = () => {
    const newCity: HotCity = {
      id: '',
      name: '',
      country: '',
      isActive: true,
      websites: [],
      defaultSearchQuery: '',
      customPrompt: '',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    setEditingCity(newCity);
    setIsCreating(true);
  };

  const handleEditCity = (city: HotCity) => {
    setEditingCity({ ...city });
    setIsCreating(false);
  };

  const handleSaveCity = async (city: HotCity) => {
    try {
      const response = await fetch('/api/admin/hot-cities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(city)
      });
      
      if (!response.ok) {
        const errorMessage = await createApiErrorMessage(response);
        throw new Error(errorMessage);
      }

      await loadCities();
      setEditingCity(null);
      setIsCreating(false);
      alert(`City ${isCreating ? 'created' : 'updated'} successfully!`);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleDeleteCity = async (cityId: string, cityName: string) => {
    if (!confirm(`Are you sure you want to delete "${cityName}"?`)) return;

    try {
      const city = cities.find(c => c.id === cityId);
      if (!city) throw new Error('City not found');
      
      const slug = city.name.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');
      const response = await fetch(`/api/admin/hot-cities/${slug}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const errorMessage = await createApiErrorMessage(response);
        throw new Error(errorMessage);
      }

      await loadCities();
      alert('City deleted successfully!');
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  if (loading) return <div className="admin-container"><p>Loading...</p></div>;
  if (error) return <div className="admin-container"><p>Error: {error}</p></div>;

  return (
    <div className="admin-container">
      <style jsx>{`
        .admin-container {
          max-width: 1200px;
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
        .btn-danger {
          background-color: #dc3545;
          color: white;
        }
        .btn-danger:hover {
          background-color: #c82333;
        }
        .cities-grid {
          display: grid;
          gap: 20px;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
        }
        .city-card {
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 20px;
          background: white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .city-header {
          display: flex;
          justify-content: between;
          align-items: center;
          margin-bottom: 15px;
        }
        .city-name {
          font-size: 1.5rem;
          font-weight: bold;
          color: #333;
          margin: 0;
        }
        .city-country {
          color: #666;
          font-size: 0.9rem;
          margin: 5px 0;
        }
        .city-status {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 0.8rem;
          font-weight: bold;
          margin-bottom: 15px;
        }
        .status-active {
          background-color: #d4edda;
          color: #155724;
        }
        .status-inactive {
          background-color: #f8d7da;
          color: #721c24;
        }
        .websites-count {
          margin: 10px 0;
          font-weight: bold;
          color: #007bff;
        }
        .city-actions {
          display: flex;
          gap: 10px;
          margin-top: 15px;
        }
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .modal {
          background: white;
          border-radius: 8px;
          padding: 30px;
          max-width: 600px;
          width: 90%;
          max-height: 80vh;
          overflow-y: auto;
        }
        .form-group {
          margin-bottom: 20px;
        }
        .form-label {
          display: block;
          margin-bottom: 5px;
          font-weight: bold;
          color: #333;
        }
        .form-input, .form-textarea {
          width: 100%;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
        }
        .form-textarea {
          min-height: 80px;
          resize: vertical;
        }
        .form-checkbox {
          margin-right: 8px;
        }
        .form-actions {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
          margin-top: 30px;
        }
      `}</style>
      
      <div className="admin-header">
        <h1 className="admin-title">Admin Dashboard</h1>
        <div>
          <a href="/admin/events" className="btn btn-secondary">
            View Events Cache
          </a>
          <a href="/admin/hot-cities-stats" className="btn btn-secondary">
            View Statistics
          </a>
          <a href="/admin/static-pages" className="btn btn-secondary">
            Manage Static Pages
          </a>
          <a href="/admin/affiliates" className="btn btn-secondary">
            Manage Affiliates
          </a>
          <button className="btn btn-primary" onClick={handleCreateCity}>
            Add New City
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '30px' }}>
        <h2 style={{ color: '#333', fontSize: '1.8rem' }}>Hot Cities Management</h2>
        <p style={{ color: '#666' }}>Manage city-specific event sources and configurations</p>
      </div>

      <div className="cities-grid">
        {cities.map(city => (
          <div key={city.id} className="city-card">
            <div className="city-header">
              <div>
                <h2 className="city-name">{city.name}</h2>
                <p className="city-country">{city.country}</p>
                <span className={`city-status ${city.isActive ? 'status-active' : 'status-inactive'}`}>
                  {city.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
            
            <div className="websites-count">
              {city.websites.length} website{city.websites.length !== 1 ? 's' : ''}
            </div>
            
            {city.defaultSearchQuery && (
              <p><strong>Search Query:</strong> {city.defaultSearchQuery}</p>
            )}
            
            <div className="city-actions">
              <button className="btn btn-secondary" onClick={() => handleEditCity(city)}>
                Edit
              </button>
              <button 
                className="btn btn-danger" 
                onClick={() => handleDeleteCity(city.id, city.name)}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {editingCity && (
        <div className="modal-overlay" onClick={() => setEditingCity(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>{isCreating ? 'Create New City' : 'Edit City'}</h2>
            
            <div className="form-group">
              <label className="form-label">City Name *</label>
              <input
                type="text"
                className="form-input"
                value={editingCity.name}
                onChange={e => setEditingCity({...editingCity, name: e.target.value})}
                placeholder="e.g., Berlin"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Country *</label>
              <input
                type="text"
                className="form-input"
                value={editingCity.country}
                onChange={e => setEditingCity({...editingCity, country: e.target.value})}
                placeholder="e.g., Germany"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Default Search Query</label>
              <input
                type="text"
                className="form-input"
                value={editingCity.defaultSearchQuery || ''}
                onChange={e => setEditingCity({...editingCity, defaultSearchQuery: e.target.value})}
                placeholder="e.g., Berlin events Veranstaltungen heute today"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Custom Prompt</label>
              <textarea
                className="form-textarea"
                value={editingCity.customPrompt || ''}
                onChange={e => setEditingCity({...editingCity, customPrompt: e.target.value})}
                placeholder="Additional context for search prompts..."
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <input
                  type="checkbox"
                  className="form-checkbox"
                  checked={editingCity.isActive}
                  onChange={e => setEditingCity({...editingCity, isActive: e.target.checked})}
                />
                Active
              </label>
            </div>

            <div className="form-actions">
              <button className="btn btn-secondary" onClick={() => setEditingCity(null)}>
                Cancel
              </button>
              <button 
                className="btn btn-primary" 
                onClick={() => handleSaveCity(editingCity)}
                disabled={!editingCity.name?.trim() || !editingCity.country?.trim()}
              >
                {isCreating ? 'Create' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}