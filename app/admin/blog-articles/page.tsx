'use client';

import { useEffect, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { EVENT_CATEGORIES } from '@/lib/eventCategories';
import { VALID_CITIES } from '@/lib/cities';
import type { BlogArticle, BlogArticleUpdatePayload } from '@/lib/types';

// Dynamic import for React-Quill to avoid SSR issues
const ReactQuill = dynamic(() => import('react-quill-new'), { 
  ssr: false,
  loading: () => <div className="form-textarea" style={{ minHeight: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #ddd' }}>Editor wird geladen...</div>
});

export default function BlogArticlesAdmin() {
  const [articles, setArticles] = useState<BlogArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingArticle, setEditingArticle] = useState<BlogArticle | null>(null);
  const [saving, setSaving] = useState(false);
  const [isClient, setIsClient] = useState(false);
  
  // Filters
  const [filterCity, setFilterCity] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Make.com trigger state
  const [showMakeTrigger, setShowMakeTrigger] = useState(false);
  const [makeCity, setMakeCity] = useState<string>('wien');
  const [makeCategory, setMakeCategory] = useState<string>(EVENT_CATEGORIES[0]);
  const [makeTriggerLoading, setMakeTriggerLoading] = useState(false);
  const [makeTriggerMessage, setMakeTriggerMessage] = useState<string | null>(null);

  // React-Quill Configuration
  const quillModules = useMemo(() => ({
    toolbar: [
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      [{ 'font': [] }],
      [{ 'size': ['small', false, 'large', 'huge'] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'script': 'sub'}, { 'script': 'super' }],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'indent': '-1'}, { 'indent': '+1' }],
      [{ 'align': [] }],
      ['blockquote', 'code-block'],
      ['link', 'image'],
      ['clean']
    ],
  }), []);

  const quillFormats = [
    'header', 'font', 'size',
    'bold', 'italic', 'underline', 'strike',
    'color', 'background',
    'script',
    'list', 'bullet',
    'indent',
    'align',
    'blockquote', 'code-block',
    'link', 'image'
  ];

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    loadArticles();
  }, [filterCity, filterCategory, filterStatus]);

  async function loadArticles() {
    try {
      setLoading(true);
      setError(null);
      
      // Build query params
      const params = new URLSearchParams();
      if (filterCity) params.append('city', filterCity);
      if (filterCategory) params.append('category', filterCategory);
      if (filterStatus) params.append('status', filterStatus);
      params.append('limit', '100');
      
      const res = await fetch(`/api/admin/blog-articles?${params.toString()}`, { 
        cache: 'no-store' 
      });
      
      if (!res.ok) {
        const err = await res.json().catch(() => ({} as any));
        throw new Error(err?.error || 'Failed to load articles');
      }
      
      const data = await res.json();
      setArticles(data.articles || []);
    } catch (e: any) {
      setError(e.message || 'Unknown error');
      console.error('Error loading articles:', e);
    } finally {
      setLoading(false);
    }
  }

  function handleEditArticle(article: BlogArticle) {
    setEditingArticle(article);
  }

  function handleCreateNew() {
    // Create a new empty article for editing
    setEditingArticle({
      id: '',
      city: 'wien',
      category: EVENT_CATEGORIES[0],
      slug: '',
      title: '',
      content: '',
      status: 'draft',
      generated_by: 'manual',
      generated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  async function handleSaveArticle() {
    if (!editingArticle) return;

    // Validation
    if (!editingArticle.title?.trim()) {
      setError('Bitte Titel ausfüllen.');
      return;
    }
    if (!editingArticle.content?.trim() || editingArticle.content === '<p><br></p>') {
      setError('Bitte Content hinzufügen.');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const isNew = !editingArticle.id;
      const url = isNew 
        ? '/api/admin/blog-articles'
        : `/api/admin/blog-articles?id=${editingArticle.id}`;
      const method = isNew ? 'POST' : 'PUT';

      const payload: any = isNew ? {
        city: editingArticle.city,
        category: editingArticle.category,
        title: editingArticle.title,
        content: editingArticle.content,
        seo_keywords: editingArticle.seo_keywords,
        meta_description: editingArticle.meta_description,
        featured_image: editingArticle.featured_image,
      } : {
        title: editingArticle.title,
        content: editingArticle.content,
        seo_keywords: editingArticle.seo_keywords,
        meta_description: editingArticle.meta_description,
        featured_image: editingArticle.featured_image,
        status: editingArticle.status,
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({} as any));
        throw new Error(err?.error || 'Failed to save article');
      }

      await loadArticles();
      setEditingArticle(null);
    } catch (e: any) {
      setError(e.message || 'Unknown error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteArticle(articleId: string) {
    if (!confirm('Are you sure you want to delete this article?')) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/blog-articles?id=${articleId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({} as any));
        throw new Error(err?.error || 'Failed to delete article');
      }

      await loadArticles();
    } catch (e: any) {
      setError(e.message || 'Unknown error');
    }
  }

  async function handleToggleStatus(article: BlogArticle) {
    const newStatus = article.status === 'published' ? 'draft' : 'published';
    
    try {
      const res = await fetch(`/api/admin/blog-articles?id=${article.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({} as any));
        throw new Error(err?.error || 'Failed to update status');
      }

      await loadArticles();
    } catch (e: any) {
      setError(e.message || 'Unknown error');
    }
  }

  function handleCancel() {
    setEditingArticle(null);
    setError(null);
  }

  async function handleTriggerMake() {
    try {
      setMakeTriggerLoading(true);
      setMakeTriggerMessage(null);
      setError(null);

      // Call the Make.com webhook endpoint
      const response = await fetch('/api/admin/trigger-blog-article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city: makeCity,
          category: makeCategory,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to trigger Make.com');
      }

      setMakeTriggerMessage(`✅ Successfully triggered Make.com for ${makeCity} - ${makeCategory}`);
      setShowMakeTrigger(false);
      
      // Reload articles after a short delay to show newly created article
      setTimeout(() => loadArticles(), 2000);
    } catch (e: any) {
      setMakeTriggerMessage(`❌ Error: ${e.message || 'Unknown error'}`);
    } finally {
      setMakeTriggerLoading(false);
    }
  }

  function handleContentChange(value: string) {
    if (editingArticle) {
      setEditingArticle({ ...editingArticle, content: value });
    }
  }

  // Filter articles by search query
  const filteredArticles = useMemo(() => {
    if (!searchQuery) return articles;
    const query = searchQuery.toLowerCase();
    return articles.filter(a => 
      a.title.toLowerCase().includes(query) ||
      a.city.toLowerCase().includes(query) ||
      a.category.toLowerCase().includes(query)
    );
  }, [articles, searchQuery]);

  if (loading) {
    return (
      <div className="admin-container">
        <p>Loading...</p>
        <style jsx>{`
          .admin-container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 20px;
          }
        `}</style>
      </div>
    );
  }

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
          font-size: 2rem;
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
        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .btn-primary {
          background-color: #007bff;
          color: white;
        }
        .btn-primary:hover:not(:disabled) {
          background-color: #0056b3;
        }
        .btn-secondary {
          background-color: #6c757d;
          color: white;
          margin-right: 10px;
        }
        .btn-secondary:hover:not(:disabled) {
          background-color: #545b62;
        }
        .btn-success {
          background-color: #28a745;
          color: white;
        }
        .btn-success:hover:not(:disabled) {
          background-color: #218838;
        }
        .btn-danger {
          background-color: #dc3545;
          color: white;
          margin-left: 10px;
        }
        .btn-danger:hover:not(:disabled) {
          background-color: #c82333;
        }
        .btn-warning {
          background-color: #ffc107;
          color: #212529;
        }
        .btn-warning:hover:not(:disabled) {
          background-color: #e0a800;
        }
        .btn-small {
          padding: 5px 10px;
          font-size: 12px;
        }
        .filters {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 20px;
          display: flex;
          gap: 15px;
          flex-wrap: wrap;
          align-items: center;
        }
        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }
        .filter-group label {
          font-size: 12px;
          font-weight: bold;
          color: #666;
        }
        .filter-select, .filter-input {
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
        }
        .articles-table {
          width: 100%;
          border-collapse: collapse;
          background: white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          border-radius: 8px;
          overflow: hidden;
        }
        .articles-table th {
          background: #f8f9fa;
          padding: 12px;
          text-align: left;
          font-weight: bold;
          border-bottom: 2px solid #dee2e6;
        }
        .articles-table td {
          padding: 12px;
          border-bottom: 1px solid #dee2e6;
        }
        .articles-table tr:hover {
          background: #f8f9fa;
        }
        .status-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: bold;
        }
        .status-draft {
          background: #ffc107;
          color: #212529;
        }
        .status-published {
          background: #28a745;
          color: white;
        }
        .actions {
          display: flex;
          gap: 5px;
          flex-wrap: wrap;
        }
        .error {
          background: #fdecea;
          color: #b71c1c;
          border: 1px solid #f5c6cb;
          padding: 10px 12px;
          border-radius: 6px;
          margin-bottom: 16px;
        }
        .empty-state {
          text-align: center;
          padding: 60px 20px;
          color: #666;
        }
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          overflow-y: auto;
        }
        .modal {
          background: white;
          border-radius: 8px;
          padding: 30px;
          max-width: 1200px;
          width: 95%;
          max-height: 90vh;
          overflow-y: auto;
          margin: 20px;
        }
        .form-group {
          margin-bottom: 20px;
        }
        .form-group label {
          display: block;
          margin-bottom: 8px;
          font-weight: bold;
          color: #333;
        }
        .form-input, .form-select {
          width: 100%;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
          box-sizing: border-box;
        }
        .form-textarea {
          width: 100%;
          min-height: 400px;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 13px;
          resize: vertical;
          box-sizing: border-box;
        }
        .modal-actions {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
          margin-top: 20px;
          padding-top: 20px;
          border-top: 1px solid #eee;
        }
        .editor-container {
          border: 1px solid #ddd;
          border-radius: 4px;
          background: white;
        }
        .editor-container :global(.ql-container) {
          min-height: 300px;
          font-size: 14px;
        }
        .editor-container :global(.ql-editor) {
          min-height: 300px;
        }
        .char-counter {
          font-size: 12px;
          color: #666;
          margin-top: 5px;
        }
        .char-counter.warning {
          color: #ffc107;
        }
        .char-counter.error {
          color: #dc3545;
        }
      `}</style>

      <div className="admin-header">
        <h1 className="admin-title">Blog Articles Management</h1>
        <div>
          <button 
            className="btn btn-primary" 
            onClick={() => setShowMakeTrigger(!showMakeTrigger)}
            style={{ marginRight: '10px' }}
          >
            🚀 Artikel via Make erstellen
          </button>
          <button className="btn btn-success" onClick={handleCreateNew}>
            + New Article
          </button>
          <a className="btn btn-secondary" href="/admin">
            Back to Admin
          </a>
        </div>
      </div>

      {makeTriggerMessage && (
        <div style={{
          padding: '15px',
          marginBottom: '20px',
          borderRadius: '5px',
          backgroundColor: makeTriggerMessage.startsWith('✅') ? '#d4edda' : '#f8d7da',
          color: makeTriggerMessage.startsWith('✅') ? '#155724' : '#721c24',
          border: makeTriggerMessage.startsWith('✅') ? '1px solid #c3e6cb' : '1px solid #f5c6cb',
          fontSize: '14px'
        }}>
          {makeTriggerMessage}
        </div>
      )}

      {showMakeTrigger && (
        <div style={{
          background: '#f8f9fa',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '20px',
          border: '1px solid #dee2e6'
        }}>
          <h3 style={{ margin: '0 0 15px 0', fontSize: '1.2rem' }}>Trigger Make.com Blog Article Generation</h3>
          <p style={{ margin: '0 0 15px 0', color: '#666', fontSize: '14px' }}>
            Select a city and category to automatically generate a blog article using Make.com automation.
          </p>
          
          <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div className="filter-group" style={{ flex: '1', minWidth: '200px' }}>
              <label>City *</label>
              <select 
                className="filter-select" 
                value={makeCity} 
                onChange={(e) => setMakeCity(e.target.value)}
                disabled={makeTriggerLoading}
              >
                {VALID_CITIES.map(city => (
                  <option key={city.value} value={city.value}>{city.label}</option>
                ))}
              </select>
            </div>
            
            <div className="filter-group" style={{ flex: '1', minWidth: '200px' }}>
              <label>Category *</label>
              <select 
                className="filter-select" 
                value={makeCategory} 
                onChange={(e) => setMakeCategory(e.target.value)}
                disabled={makeTriggerLoading}
              >
                {EVENT_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                className="btn btn-primary" 
                onClick={handleTriggerMake}
                disabled={makeTriggerLoading}
              >
                {makeTriggerLoading ? '⏳ Triggering...' : '🚀 Trigger Generation'}
              </button>
              <button 
                className="btn btn-secondary" 
                onClick={() => setShowMakeTrigger(false)}
                disabled={makeTriggerLoading}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {error && <div className="error">{error}</div>}

      <div className="filters">
        <div className="filter-group">
          <label>City</label>
          <select 
            className="filter-select" 
            value={filterCity} 
            onChange={(e) => setFilterCity(e.target.value)}
          >
            <option value="">All Cities</option>
            {VALID_CITIES.map(city => (
              <option key={city.value} value={city.value}>{city.label}</option>
            ))}
          </select>
        </div>
        
        <div className="filter-group">
          <label>Category</label>
          <select 
            className="filter-select" 
            value={filterCategory} 
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            {EVENT_CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
        
        <div className="filter-group">
          <label>Status</label>
          <select 
            className="filter-select" 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">All Status</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </div>
        
        <div className="filter-group" style={{ flex: 1 }}>
          <label>Search</label>
          <input 
            type="text" 
            className="filter-input" 
            placeholder="Search by title, city, or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="filter-group">
          <label>&nbsp;</label>
          <button 
            className="btn btn-secondary" 
            onClick={() => {
              setFilterCity('');
              setFilterCategory('');
              setFilterStatus('');
              setSearchQuery('');
              loadArticles();
            }}
          >
            Clear Filters
          </button>
        </div>
      </div>

      {filteredArticles.length === 0 ? (
        <div className="empty-state">
          <h3>No articles found</h3>
          <p>Create your first blog article using the &quot;+ New Article&quot; button above.</p>
        </div>
      ) : (
        <table className="articles-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>City</th>
              <th>Category</th>
              <th>Status</th>
              <th>Generated By</th>
              <th>Updated</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredArticles.map((article) => (
              <tr key={article.id}>
                <td>
                  <strong>{article.title}</strong>
                  {article.meta_description && (
                    <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                      {article.meta_description.substring(0, 80)}...
                    </div>
                  )}
                </td>
                <td>{article.city}</td>
                <td>{article.category}</td>
                <td>
                  <span className={`status-badge status-${article.status}`}>
                    {article.status}
                  </span>
                </td>
                <td style={{ fontSize: '12px', color: '#666' }}>
                  {article.generated_by}
                </td>
                <td style={{ fontSize: '12px', color: '#666' }}>
                  {new Date(article.updated_at).toLocaleString()}
                </td>
                <td>
                  <div className="actions">
                    <button 
                      className="btn btn-primary btn-small" 
                      onClick={() => handleEditArticle(article)}
                    >
                      Edit
                    </button>
                    <button 
                      className={`btn ${article.status === 'published' ? 'btn-warning' : 'btn-success'} btn-small`}
                      onClick={() => handleToggleStatus(article)}
                    >
                      {article.status === 'published' ? 'Unpublish' : 'Publish'}
                    </button>
                    <button 
                      className="btn btn-danger btn-small" 
                      onClick={() => handleDeleteArticle(article.id)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {editingArticle && (
        <div 
          className="modal-overlay" 
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setEditingArticle(null);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setEditingArticle(null);
            }
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 id="modal-title">{editingArticle.id ? 'Edit Article' : 'Create New Article'}</h2>

            <div className="form-group">
              <label>Title *</label>
              <input
                type="text"
                className="form-input"
                value={editingArticle.title}
                onChange={(e) => setEditingArticle({ ...editingArticle, title: e.target.value })}
                placeholder="Enter article title"
              />
            </div>

            <div style={{ display: 'flex', gap: '15px' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label>City *</label>
                <select
                  className="form-select"
                  value={editingArticle.city}
                  onChange={(e) => setEditingArticle({ ...editingArticle, city: e.target.value })}
                  disabled={!!editingArticle.id}
                >
                  {VALID_CITIES.map(city => (
                    <option key={city.value} value={city.value}>{city.label}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ flex: 1 }}>
                <label>Category *</label>
                <select
                  className="form-select"
                  value={editingArticle.category}
                  onChange={(e) => setEditingArticle({ ...editingArticle, category: e.target.value })}
                  disabled={!!editingArticle.id}
                >
                  {EVENT_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ flex: 1 }}>
                <label>Status</label>
                <select
                  className="form-select"
                  value={editingArticle.status}
                  onChange={(e) => setEditingArticle({ ...editingArticle, status: e.target.value as 'draft' | 'published' })}
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Content (Rich Text Editor) *</label>
              {isClient ? (
                <div className="editor-container">
                  <ReactQuill
                    theme="snow"
                    value={editingArticle.content}
                    onChange={handleContentChange}
                    modules={quillModules}
                    formats={quillFormats}
                    placeholder="Enter your article content here..."
                  />
                </div>
              ) : (
                <div className="form-textarea" style={{ minHeight: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  Editor wird geladen...
                </div>
              )}
            </div>

            <div className="form-group">
              <label>Meta Description</label>
              <textarea
                className="form-input"
                value={editingArticle.meta_description || ''}
                onChange={(e) => setEditingArticle({ ...editingArticle, meta_description: e.target.value })}
                placeholder="Brief description for search engines"
                maxLength={500}
                rows={3}
              />
              <div className={`char-counter ${(editingArticle.meta_description?.length || 0) > 160 ? 'warning' : ''}`}>
                {editingArticle.meta_description?.length || 0} / 500 characters
                {(editingArticle.meta_description?.length || 0) > 160 && (
                  <span style={{ marginLeft: '10px', color: '#ffc107' }}>
                    (SEO recommendation: 160 chars)
                  </span>
                )}
              </div>
            </div>

            <div className="form-group">
              <label>SEO Keywords (comma-separated)</label>
              <input
                type="text"
                className="form-input"
                value={editingArticle.seo_keywords || ''}
                onChange={(e) => setEditingArticle({ ...editingArticle, seo_keywords: e.target.value })}
                placeholder="e.g., vienna, events, nightlife"
              />
            </div>

            <div className="form-group">
              <label>Featured Image URL</label>
              <input
                type="text"
                className="form-input"
                value={editingArticle.featured_image || ''}
                onChange={(e) => setEditingArticle({ ...editingArticle, featured_image: e.target.value })}
                placeholder="https://example.com/image.jpg"
              />
            </div>

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={handleCancel} disabled={saving}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSaveArticle} disabled={saving}>
                {saving ? 'Saving...' : 'Save Article'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
