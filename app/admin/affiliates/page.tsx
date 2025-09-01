'use client';

import { useState, useEffect } from 'react';

interface AffiliateLink {
  id: string;
  domain: string;
  affiliate: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function AffiliateLinksAdmin() {
  const [affiliates, setAffiliates] = useState<AffiliateLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingAffiliate, setEditingAffiliate] = useState<AffiliateLink | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadAffiliates();
  }, []);

  const loadAffiliates = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/affiliates');
      if (!response.ok) throw new Error('Failed to load affiliates');
      const data = await response.json();
      setAffiliates(data.affiliates || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAffiliate = () => {
    const newAffiliate: AffiliateLink = {
      id: '',
      domain: '',
      affiliate: '',
      description: '',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setEditingAffiliate(newAffiliate);
    setIsCreating(true);
  };

  const handleEditAffiliate = (affiliate: AffiliateLink) => {
    setEditingAffiliate({ ...affiliate });
    setIsCreating(false);
  };

  const handleSaveAffiliate = async () => {
    if (!editingAffiliate) return;
    
    try {
      setSaving(true);
      const response = await fetch('/api/admin/affiliates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingAffiliate)
      });
      
      if (!response.ok) throw new Error('Failed to save affiliate');
      
      await loadAffiliates();
      setEditingAffiliate(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAffiliate = async (id: string, domain: string) => {
    if (!confirm(`Delete affiliate for ${domain}?`)) return;
    
    try {
      const response = await fetch(`/api/admin/affiliates?id=${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('Failed to delete affiliate');
      
      await loadAffiliates();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCancel = () => {
    setEditingAffiliate(null);
    setIsCreating(false);
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
        .btn-danger {
          background-color: #dc3545;
          color: white;
        }
        .btn-danger:hover {
          background-color: #c82333;
        }
        .affiliates-grid {
          display: grid;
          gap: 20px;
          grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
        }
        .affiliate-card {
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 20px;
          background: white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .affiliate-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
        }
        .affiliate-domain {
          font-size: 1.2rem;
          font-weight: bold;
          color: #333;
          margin: 0;
        }
        .affiliate-status {
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
        .affiliate-details {
          margin-bottom: 15px;
        }
        .affiliate-code {
          background: #f8f9fa;
          padding: 8px 12px;
          border-radius: 4px;
          font-family: monospace;
          font-size: 0.9rem;
          border: 1px solid #dee2e6;
          margin: 5px 0;
        }
        .affiliate-actions {
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
        .form-group label {
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
        .modal-actions {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
          margin-top: 20px;
        }
        .help-text {
          font-size: 0.85rem;
          color: #666;
          margin-top: 5px;
        }
      `}</style>

      <div className="admin-header">
        <h1 className="admin-title">Affiliate Links Management</h1>
        <div>
          <a href="/admin" className="btn btn-secondary">Back to Admin</a>
          <button className="btn btn-primary" onClick={handleCreateAffiliate}>
            Add New Affiliate
          </button>
        </div>
      </div>

      <div className="affiliates-grid">
        {affiliates.map(affiliate => (
          <div key={affiliate.id} className="affiliate-card">
            <div className="affiliate-header">
              <h3 className="affiliate-domain">{affiliate.domain}</h3>
              <span className={`affiliate-status ${affiliate.isActive ? 'status-active' : 'status-inactive'}`}>
                {affiliate.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            
            <div className="affiliate-details">
              <div>
                <strong>Affiliate Extension:</strong>
                <div className="affiliate-code">{affiliate.affiliate}</div>
              </div>
              
              {affiliate.description && (
                <div style={{ marginTop: '10px' }}>
                  <strong>Description:</strong>
                  <p style={{ margin: '5px 0', color: '#666' }}>{affiliate.description}</p>
                </div>
              )}
              
              <div style={{ marginTop: '10px', fontSize: '0.85rem', color: '#666' }}>
                <div>Created: {new Date(affiliate.createdAt).toLocaleDateString()}</div>
                <div>Updated: {new Date(affiliate.updatedAt).toLocaleDateString()}</div>
              </div>
            </div>
            
            <div className="affiliate-actions">
              <button 
                className="btn btn-secondary"
                onClick={() => handleEditAffiliate(affiliate)}
                style={{ fontSize: '12px', padding: '6px 12px' }}
              >
                Edit
              </button>
              <button 
                className="btn btn-danger"
                onClick={() => handleDeleteAffiliate(affiliate.id, affiliate.domain)}
                style={{ fontSize: '12px', padding: '6px 12px' }}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {affiliates.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
          <p>No affiliate links configured yet.</p>
          <button className="btn btn-primary" onClick={handleCreateAffiliate}>
            Add Your First Affiliate
          </button>
        </div>
      )}

      {editingAffiliate && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>{isCreating ? 'Add New Affiliate' : 'Edit Affiliate'}</h2>
            
            <div className="form-group">
              <label>Domain *</label>
              <input
                type="text"
                className="form-input"
                value={editingAffiliate.domain}
                onChange={(e) => setEditingAffiliate({
                  ...editingAffiliate,
                  domain: e.target.value
                })}
                placeholder="example.com"
              />
              <div className="help-text">Enter the domain name (without http://)</div>
            </div>

            <div className="form-group">
              <label>Affiliate Extension *</label>
              <input
                type="text"
                className="form-input"
                value={editingAffiliate.affiliate}
                onChange={(e) => setEditingAffiliate({
                  ...editingAffiliate,
                  affiliate: e.target.value
                })}
                placeholder="?ref=yourcode or &partner=123"
              />
              <div className="help-text">The affiliate parameter to append to URLs from this domain</div>
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                className="form-textarea"
                value={editingAffiliate.description || ''}
                onChange={(e) => setEditingAffiliate({
                  ...editingAffiliate,
                  description: e.target.value
                })}
                placeholder="Optional description for this affiliate partnership"
              />
            </div>

            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  className="form-checkbox"
                  checked={editingAffiliate.isActive}
                  onChange={(e) => setEditingAffiliate({
                    ...editingAffiliate,
                    isActive: e.target.checked
                  })}
                />
                Active
              </label>
            </div>

            <div className="modal-actions">
              <button 
                className="btn btn-secondary"
                onClick={handleCancel}
                disabled={saving}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleSaveAffiliate}
                disabled={saving || !editingAffiliate.domain?.trim() || !editingAffiliate.affiliate?.trim()}
              >
                {saving ? 'Saving...' : isCreating ? 'Create' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}