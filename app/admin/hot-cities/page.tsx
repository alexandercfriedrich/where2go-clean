'use client';

import { useState, useEffect } from 'react';
import { HotCity, HotCityWebsite, HotCityVenue } from '@/lib/types';

export default function HotCitiesDetailPage() {
  const [cities, setCities] = useState<HotCity[]>([]);
  const [selectedCity, setSelectedCity] = useState<HotCity | null>(null);
  const [editingWebsite, setEditingWebsite] = useState<HotCityWebsite | null>(null);
  const [isCreatingWebsite, setIsCreatingWebsite] = useState(false);
  const [editingVenue, setEditingVenue] = useState<HotCityVenue | null>(null);
  const [isCreatingVenue, setIsCreatingVenue] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const availableCategories = [
    'Live-Konzerte', 'DJ Sets/Electronic', 'Clubs/Discos', 'Theater/Performance',
    'Museen', 'Kunst/Design', 'Food/Culinary', 'Sport', 'Networking/Business',
    'Natur/Outdoor', 'Kultur/Traditionen', 'Familien/Kids', 'Wellness/Spirituell',
    'Bildung/Lernen', 'Open Air', 'LGBTQ+'
  ];

  useEffect(() => {
    loadCities();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadCities = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/hot-cities');
      if (!response.ok) throw new Error('Failed to load cities');
      const data = await response.json();
      setCities(data.cities);
      if (data.cities.length > 0 && !selectedCity) {
        setSelectedCity(data.cities[0]);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddWebsite = () => {
    const newWebsite: HotCityWebsite = {
      id: `website-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: '',
      url: '',
      categories: [],
      description: '',
      searchQuery: '',
      priority: 5,
      isActive: true,
      isVenue: false,
      isVenuePrioritized: false,
    };
    setEditingWebsite(newWebsite);
    setIsCreatingWebsite(true);
  };

  const handleEditWebsite = (website: HotCityWebsite) => {
    setEditingWebsite({ ...website });
    setIsCreatingWebsite(false);
  };

  const handleSaveWebsite = async (website: HotCityWebsite) => {
    if (!selectedCity) return;

    try {
      const updatedWebsites = isCreatingWebsite
        ? [...selectedCity.websites, website]
        : selectedCity.websites.map(w => w.id === website.id ? website : w);

      const updatedCity = {
        ...selectedCity,
        websites: updatedWebsites,
        updatedAt: new Date()
      };

      const response = await fetch('/api/admin/hot-cities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedCity)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save website');
      }

      await loadCities();
      const refreshedCity = cities.find(c => c.id === selectedCity.id);
      if (refreshedCity) setSelectedCity(refreshedCity);
      setEditingWebsite(null);
      setIsCreatingWebsite(false);
      alert(`Website ${isCreatingWebsite ? 'added' : 'updated'} successfully!`);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleDeleteWebsite = async (websiteId: string, websiteName: string) => {
    if (!selectedCity) return;
    if (!confirm(`Are you sure you want to delete "${websiteName}"?`)) return;

    try {
      const updatedWebsites = selectedCity.websites.filter(w => w.id !== websiteId);
      const updatedCity = {
        ...selectedCity,
        websites: updatedWebsites,
        updatedAt: new Date()
      };

      const response = await fetch('/api/admin/hot-cities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedCity)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete website');
      }

      await loadCities();
      const refreshedCity = cities.find(c => c.id === selectedCity.id);
      if (refreshedCity) setSelectedCity(refreshedCity);
      alert('Website deleted successfully!');
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleAddVenue = () => {
    const newVenue: HotCityVenue = {
      id: `venue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: '',
      categories: [],
      description: '',
      priority: 5,
      isActive: true,
      isVenue: true,
      isVenuePrioritized: false,
      address: {
        full: '',
        street: '',
        houseNumber: '',
        postalCode: '',
        city: '',
        country: ''
      },
      website: '',
      eventsUrl: '',
      aiQueryTemplate: ''
    };
    setEditingVenue(newVenue);
    setIsCreatingVenue(true);
  };

  const handleEditVenue = (venue: HotCityVenue) => {
    setEditingVenue({ ...venue });
    setIsCreatingVenue(false);
  };

  const handleSaveVenue = async (venue: HotCityVenue) => {
    if (!selectedCity) return;

    try {
      const currentVenues = selectedCity.venues || [];
      const updatedVenues = isCreatingVenue
        ? [...currentVenues, venue]
        : currentVenues.map(v => v.id === venue.id ? venue : v);

      const updatedCity = {
        ...selectedCity,
        venues: updatedVenues,
        updatedAt: new Date()
      };

      const response = await fetch('/api/admin/hot-cities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedCity)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save venue');
      }

      await loadCities();
      const refreshedCity = cities.find(c => c.id === selectedCity.id);
      if (refreshedCity) setSelectedCity(refreshedCity);
      setEditingVenue(null);
      setIsCreatingVenue(false);
      alert(`Venue ${isCreatingVenue ? 'added' : 'updated'} successfully!`);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleDeleteVenue = async (venueId: string, venueName: string) => {
    if (!selectedCity) return;
    if (!confirm(`Are you sure you want to delete "${venueName}"?`)) return;

    try {
      const currentVenues = selectedCity.venues || [];
      const updatedVenues = currentVenues.filter(v => v.id !== venueId);
      const updatedCity = {
        ...selectedCity,
        venues: updatedVenues,
        updatedAt: new Date()
      };

      const response = await fetch('/api/admin/hot-cities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedCity)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete venue');
      }

      await loadCities();
      const refreshedCity = cities.find(c => c.id === selectedCity.id);
      if (refreshedCity) setSelectedCity(refreshedCity);
      alert('Venue deleted successfully!');
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleSeedCities = async () => {
    if (!confirm('This will seed Wien, Linz, Ibiza, and Berlin with sample websites. Continue?')) return;

    try {
      const response = await fetch('/api/admin/hot-cities/seed', {
        method: 'POST'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to seed cities');
      }

      await loadCities();
      alert('Cities seeded successfully!');
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
          margin-right: 10px;
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
        .btn-success {
          background-color: #28a745;
          color: white;
        }
        .btn-success:hover {
          background-color: #218838;
        }
        .main-content {
          display: grid;
          grid-template-columns: 300px 1fr;
          gap: 30px;
        }
        .cities-list {
          background: white;
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          height: fit-content;
        }
        .city-item {
          padding: 12px;
          border-radius: 6px;
          cursor: pointer;
          margin-bottom: 8px;
          border: 1px solid #eee;
          transition: all 0.2s;
        }
        .city-item:hover {
          background-color: #f8f9fa;
        }
        .city-item.active {
          background-color: #e3f2fd;
          border-color: #2196f3;
        }
        .city-name {
          font-weight: bold;
          color: #333;
        }
        .city-country {
          font-size: 0.9rem;
          color: #666;
        }
        .websites-section {
          background: white;
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        .website-card {
          border: 1px solid #ddd;
          border-radius: 6px;
          padding: 15px;
          margin-bottom: 15px;
          transition: all 0.2s;
        }
        .website-card:hover {
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .website-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }
        .website-name {
          font-weight: bold;
          color: #333;
        }
        .website-url {
          color: #007bff;
          text-decoration: none;
          font-size: 0.9rem;
        }
        .website-url:hover {
          text-decoration: underline;
        }
        .website-meta {
          display: flex;
          gap: 15px;
          font-size: 0.9rem;
          color: #666;
          margin-bottom: 10px;
        }
        .priority-badge {
          background: #17a2b8;
          color: white;
          padding: 2px 6px;
          border-radius: 3px;
          font-size: 0.8rem;
        }
        .status-badge {
          padding: 2px 6px;
          border-radius: 3px;
          font-size: 0.8rem;
          font-weight: bold;
        }
        .status-active {
          background: #d4edda;
          color: #155724;
        }
        .status-inactive {
          background: #f8d7da;
          color: #721c24;
        }
        .venue-badge {
          background: #28a745;
          color: white;
          padding: 2px 6px;
          border-radius: 3px;
          font-size: 0.8rem;
          font-weight: bold;
        }
        .categories-list {
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
          margin-bottom: 10px;
        }
        .category-tag {
          background: #e9ecef;
          color: #495057;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 0.8rem;
        }
        .website-actions {
          display: flex;
          gap: 10px;
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
        .form-input, .form-textarea, .form-select {
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
        .categories-checkboxes {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
          max-height: 200px;
          overflow-y: auto;
          border: 1px solid #ddd;
          padding: 10px;
          border-radius: 4px;
        }
        .category-checkbox {
          display: flex;
          align-items: center;
          font-size: 0.9rem;
        }
      `}</style>
      
      <div className="admin-header">
        <h1 className="admin-title">Hot Cities Management</h1>
        <div>
          <button className="btn btn-success" onClick={handleSeedCities}>
            Seed Sample Cities
          </button>
          <a href="/admin" className="btn btn-secondary">
            Back to Dashboard
          </a>
        </div>
      </div>

      <div className="main-content">
        <div className="cities-list">
          <h3>Cities</h3>
          {cities.map(city => (
            <div 
              key={city.id} 
              className={`city-item ${selectedCity?.id === city.id ? 'active' : ''}`}
              onClick={() => setSelectedCity(city)}
            >
              <div className="city-name">{city.name}</div>
              <div className="city-country">{city.country}</div>
              <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '5px' }}>
                {city.websites.length} websites
              </div>
            </div>
          ))}
        </div>

        <div className="websites-section">
          {selectedCity ? (
            <>
              <div className="section-header">
                <h3>Websites for {selectedCity.name}</h3>
                <button className="btn btn-primary" onClick={handleAddWebsite}>
                  Add Website
                </button>
              </div>

              {selectedCity.websites.map(website => (
                <div key={website.id} className="website-card">
                  <div className="website-header">
                    <div>
                      <div className="website-name">{website.name}</div>
                      <a href={website.url} target="_blank" rel="noopener noreferrer" className="website-url">
                        {website.url}
                      </a>
                    </div>
                    <div className="website-actions">
                      <button 
                        className="btn btn-secondary" 
                        onClick={() => handleEditWebsite(website)}
                      >
                        Edit
                      </button>
                      <button 
                        className="btn btn-danger" 
                        onClick={() => handleDeleteWebsite(website.id, website.name)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <div className="website-meta">
                    <span className="priority-badge">Priority: {website.priority}</span>
                    <span className={`status-badge ${website.isActive ? 'status-active' : 'status-inactive'}`}>
                      {website.isActive ? 'Active' : 'Inactive'}
                    </span>
                    {website.isVenue && (
                      <span className="venue-badge">
                        📍 Venue{website.isVenuePrioritized ? ' (Prioritized)' : ''}
                      </span>
                    )}
                  </div>

                  {website.categories.length > 0 && (
                    <div className="categories-list">
                      {website.categories.map(cat => (
                        <span key={cat} className="category-tag">{cat}</span>
                      ))}
                    </div>
                  )}

                  {website.description && (
                    <p style={{ fontSize: '0.9rem', color: '#666', margin: '10px 0' }}>
                      {website.description}
                    </p>
                  )}

                  {website.searchQuery && (
                    <div style={{ fontSize: '0.9rem', color: '#666' }}>
                      <strong>Custom Query:</strong> {website.searchQuery}
                    </div>
                  )}
                </div>
              ))}

              {selectedCity.websites.length === 0 && (
                <p style={{ textAlign: 'center', color: '#666', fontStyle: 'italic' }}>
                  No websites configured for this city. Click &quot;Add Website&quot; to get started.
                </p>
              )}

              {/* Venues Section */}
              {(selectedCity.venues && selectedCity.venues.length > 0) || true ? (
                <>
                  <div className="section-header" style={{ marginTop: '40px' }}>
                    <h3>Venues for {selectedCity.name}</h3>
                    <button className="btn btn-primary" onClick={handleAddVenue}>
                      Add Venue
                    </button>
                  </div>

                  {selectedCity.venues && selectedCity.venues.length > 0 ? (
                    selectedCity.venues.map(venue => (
                      <div key={venue.id} className="website-card">
                        <div className="website-header">
                          <div>
                            <div className="website-name">📍 {venue.name}</div>
                            {venue.address.full && (
                              <div style={{ fontSize: '0.9rem', color: '#666', marginTop: '5px' }}>
                                {venue.address.full}
                              </div>
                            )}
                          </div>
                          <div className="website-actions">
                            <button 
                              className="btn btn-secondary" 
                              onClick={() => handleEditVenue(venue)}
                            >
                              Edit
                            </button>
                            <button 
                              className="btn btn-danger" 
                              onClick={() => handleDeleteVenue(venue.id, venue.name)}
                            >
                              Delete
                            </button>
                          </div>
                        </div>

                      <div className="website-meta">
                        <span className="priority-badge">Priority: {venue.priority}</span>
                        <span className={`status-badge ${venue.isActive ? 'status-active' : 'status-inactive'}`}>
                          {venue.isActive ? 'Active' : 'Inactive'}
                        </span>
                        {venue.isVenuePrioritized && (
                          <span className="venue-badge">
                            Prioritized
                          </span>
                        )}
                      </div>

                      {venue.categories.length > 0 && (
                        <div className="categories-list">
                          {venue.categories.map(cat => (
                            <span key={cat} className="category-tag">{cat}</span>
                          ))}
                        </div>
                      )}

                      {(venue.website || venue.eventsUrl) && (
                        <div style={{ marginBottom: '10px' }}>
                          {venue.website && (
                            <div>
                              <a href={venue.website} target="_blank" rel="noopener noreferrer" className="website-url">
                                🌐 Website
                              </a>
                            </div>
                          )}
                          {venue.eventsUrl && (
                            <div>
                              <a href={venue.eventsUrl} target="_blank" rel="noopener noreferrer" className="website-url">
                                📅 Events Page
                              </a>
                            </div>
                          )}
                        </div>
                      )}

                      {venue.description && (
                        <p style={{ fontSize: '0.9rem', color: '#666', margin: '10px 0' }}>
                          {venue.description}
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  <p style={{ textAlign: 'center', color: '#666', fontStyle: 'italic' }}>
                    No venues configured for this city. Click &quot;Add Venue&quot; to get started.
                  </p>
                )}
                </>
              ) : null}
            </>
          ) : (
            <p style={{ textAlign: 'center', color: '#666', fontStyle: 'italic' }}>
              Select a city to manage its websites.
            </p>
          )}
        </div>
      </div>

      {editingWebsite && (
        <div className="modal-overlay" onClick={() => setEditingWebsite(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>{isCreatingWebsite ? 'Add New Website' : 'Edit Website'}</h2>
            
            <div className="form-group">
              <label className="form-label">Website Name *</label>
              <input
                type="text"
                className="form-input"
                value={editingWebsite.name}
                onChange={e => setEditingWebsite({...editingWebsite, name: e.target.value})}
                placeholder="e.g., Berlin.de Events"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Website URL *</label>
              <input
                type="url"
                className="form-input"
                value={editingWebsite.url}
                onChange={e => setEditingWebsite({...editingWebsite, url: e.target.value})}
                placeholder="https://example.com"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                className="form-textarea"
                value={editingWebsite.description || ''}
                onChange={e => setEditingWebsite({...editingWebsite, description: e.target.value})}
                placeholder="Brief description of this website..."
              />
            </div>

            <div className="form-group">
              <label className="form-label">Priority (1-10)</label>
              <input
                type="number"
                min="1"
                max="10"
                className="form-input"
                value={editingWebsite.priority}
                onChange={e => setEditingWebsite({...editingWebsite, priority: parseInt(e.target.value) || 5})}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Custom Search Query</label>
              <input
                type="text"
                className="form-input"
                value={editingWebsite.searchQuery || ''}
                onChange={e => setEditingWebsite({...editingWebsite, searchQuery: e.target.value})}
                placeholder="Custom query template for this website..."
              />
            </div>

            <div className="form-group">
              <label className="form-label">Categories</label>
              <div className="categories-checkboxes">
                {availableCategories.map(category => (
                  <label key={category} className="category-checkbox">
                    <input
                      type="checkbox"
                      className="form-checkbox"
                      checked={editingWebsite.categories.includes(category)}
                      onChange={e => {
                        const categories = e.target.checked
                          ? [...editingWebsite.categories, category]
                          : editingWebsite.categories.filter(c => c !== category);
                        setEditingWebsite({...editingWebsite, categories});
                      }}
                    />
                    {category}
                  </label>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                <input
                  type="checkbox"
                  className="form-checkbox"
                  checked={editingWebsite.isActive}
                  onChange={e => setEditingWebsite({...editingWebsite, isActive: e.target.checked})}
                />
                Active
              </label>
            </div>

            <div className="form-group">
              <label className="form-label">
                <input
                  type="checkbox"
                  className="form-checkbox"
                  checked={editingWebsite.isVenue || false}
                  onChange={e => setEditingWebsite({...editingWebsite, isVenue: e.target.checked})}
                />
                Is Venue (Physical Location)
              </label>
            </div>

            {editingWebsite.isVenue && (
              <div className="form-group">
                <label className="form-label">
                  <input
                    type="checkbox"
                    className="form-checkbox"
                    checked={editingWebsite.isVenuePrioritized || false}
                    onChange={e => setEditingWebsite({...editingWebsite, isVenuePrioritized: e.target.checked})}
                  />
                  Prioritize Venue (Show with special highlighting when events found)
                </label>
              </div>
            )}

            <div className="form-actions">
              <button className="btn btn-secondary" onClick={() => setEditingWebsite(null)}>
                Cancel
              </button>
              <button 
                className="btn btn-primary" 
                onClick={() => handleSaveWebsite(editingWebsite)}
                disabled={!editingWebsite.name?.trim() || !editingWebsite.url?.trim()}
              >
                {isCreatingWebsite ? 'Add Website' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {editingVenue && (
        <div className="modal-overlay" onClick={() => setEditingVenue(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>{isCreatingVenue ? 'Add New Venue' : 'Edit Venue'}</h2>
            
            <div className="form-group">
              <label className="form-label">Venue Name *</label>
              <input
                type="text"
                className="form-input"
                value={editingVenue.name}
                onChange={e => setEditingVenue({...editingVenue, name: e.target.value})}
                placeholder="e.g., Wiener Konzerthaus"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Full Address *</label>
              <input
                type="text"
                className="form-input"
                value={editingVenue.address.full}
                onChange={e => setEditingVenue({
                  ...editingVenue, 
                  address: {...editingVenue.address, full: e.target.value}
                })}
                placeholder="e.g., Lothringerstraße 20, 1030 Wien, Österreich"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Street</label>
              <input
                type="text"
                className="form-input"
                value={editingVenue.address.street}
                onChange={e => setEditingVenue({
                  ...editingVenue, 
                  address: {...editingVenue.address, street: e.target.value}
                })}
                placeholder="e.g., Lothringerstraße"
              />
            </div>

            <div className="form-group">
              <label className="form-label">House Number</label>
              <input
                type="text"
                className="form-input"
                value={editingVenue.address.houseNumber}
                onChange={e => setEditingVenue({
                  ...editingVenue, 
                  address: {...editingVenue.address, houseNumber: e.target.value}
                })}
                placeholder="e.g., 20"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Postal Code</label>
              <input
                type="text"
                className="form-input"
                value={editingVenue.address.postalCode}
                onChange={e => setEditingVenue({
                  ...editingVenue, 
                  address: {...editingVenue.address, postalCode: e.target.value}
                })}
                placeholder="e.g., 1030"
              />
            </div>

            <div className="form-group">
              <label className="form-label">City</label>
              <input
                type="text"
                className="form-input"
                value={editingVenue.address.city}
                onChange={e => setEditingVenue({
                  ...editingVenue, 
                  address: {...editingVenue.address, city: e.target.value}
                })}
                placeholder="e.g., Wien"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Country</label>
              <input
                type="text"
                className="form-input"
                value={editingVenue.address.country}
                onChange={e => setEditingVenue({
                  ...editingVenue, 
                  address: {...editingVenue.address, country: e.target.value}
                })}
                placeholder="e.g., Österreich"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Website</label>
              <input
                type="url"
                className="form-input"
                value={editingVenue.website || ''}
                onChange={e => setEditingVenue({...editingVenue, website: e.target.value})}
                placeholder="https://example.com"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Events URL</label>
              <input
                type="url"
                className="form-input"
                value={editingVenue.eventsUrl || ''}
                onChange={e => setEditingVenue({...editingVenue, eventsUrl: e.target.value})}
                placeholder="https://example.com/events"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                className="form-textarea"
                value={editingVenue.description || ''}
                onChange={e => setEditingVenue({...editingVenue, description: e.target.value})}
                placeholder="Brief description of this venue..."
              />
            </div>

            <div className="form-group">
              <label className="form-label">Priority (1-10)</label>
              <input
                type="number"
                min="1"
                max="10"
                className="form-input"
                value={editingVenue.priority}
                onChange={e => setEditingVenue({...editingVenue, priority: parseInt(e.target.value) || 5})}
              />
            </div>

            <div className="form-group">
              <label className="form-label">AI Query Template</label>
              <input
                type="text"
                className="form-input"
                value={editingVenue.aiQueryTemplate || ''}
                onChange={e => setEditingVenue({...editingVenue, aiQueryTemplate: e.target.value})}
                placeholder="Custom AI query template for this venue..."
              />
            </div>

            <div className="form-group">
              <label className="form-label">Categories</label>
              <div className="categories-checkboxes">
                {availableCategories.map(category => (
                  <label key={category} className="category-checkbox">
                    <input
                      type="checkbox"
                      className="form-checkbox"
                      checked={editingVenue.categories.includes(category)}
                      onChange={e => {
                        const categories = e.target.checked
                          ? [...editingVenue.categories, category]
                          : editingVenue.categories.filter(c => c !== category);
                        setEditingVenue({...editingVenue, categories});
                      }}
                    />
                    {category}
                  </label>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                <input
                  type="checkbox"
                  className="form-checkbox"
                  checked={editingVenue.isActive}
                  onChange={e => setEditingVenue({...editingVenue, isActive: e.target.checked})}
                />
                Active
              </label>
            </div>

            <div className="form-group">
              <label className="form-label">
                <input
                  type="checkbox"
                  className="form-checkbox"
                  checked={editingVenue.isVenuePrioritized || false}
                  onChange={e => setEditingVenue({...editingVenue, isVenuePrioritized: e.target.checked})}
                />
                Prioritize Venue (Show with special highlighting when events found)
              </label>
            </div>

            <div className="form-actions">
              <button className="btn btn-secondary" onClick={() => setEditingVenue(null)}>
                Cancel
              </button>
              <button 
                className="btn btn-primary" 
                onClick={() => handleSaveVenue(editingVenue)}
                disabled={!editingVenue.name?.trim() || !editingVenue.address.full?.trim()}
              >
                {isCreatingVenue ? 'Add Venue' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}