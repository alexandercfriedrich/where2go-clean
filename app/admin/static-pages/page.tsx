'use client';

import { useEffect, useState } from 'react';

interface StaticPage {
  id: string;
  title: string;
  content: string;
  path: string;
  updatedAt: string;
}

export default function StaticPagesAdmin() {
  const [pages, setPages] = useState<StaticPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingPage, setEditingPage] = useState<StaticPage | null>(null);
  const [saving, setSaving] = useState(false);

  const staticPages = [
    { id: 'seo-footer', title: 'SEO Footer (Homepage)', path: '/' },
    { id: 'datenschutz', title: 'Datenschutzerklärung', path: '/datenschutz' },
    { id: 'agb', title: 'Allgemeine Geschäftsbedingungen', path: '/agb' },
    { id: 'impressum', title: 'Impressum', path: '/impressum' },
    { id: 'ueber-uns', title: 'Über uns', path: '/ueber-uns' },
    { id: 'kontakt', title: 'Kontakt', path: '/kontakt' },
    { id: 'premium', title: 'Premium', path: '/premium' },
  ];

  useEffect(() => {
    loadPages();
  }, []);

  useEffect(() => {
    if (editingPage) {
      console.log('[Admin] editingPage updated in state:', {
        id: editingPage.id,
        title: editingPage.title,
        contentLength: editingPage.content?.length || 0,
        contentPreview: editingPage.content ? editingPage.content.substring(0, 50) : 'EMPTY',
        hasContent: !!editingPage.content
      });
    }
  }, [editingPage]);

  async function loadPages() {
    try {
      setLoading(true);
      setError(null);
      console.log('[Admin] Fetching pages from API...');
      const res = await fetch('/api/admin/static-pages', { cache: 'no-store' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({} as any));
        throw new Error(err?.error || 'Failed to load pages');
      }
      const data = await res.json();
      console.log('[Admin] API response data:', data);
      console.log('[Admin] Pages count:', data.pages?.length || 0);
      if (data.pages && data.pages.length > 0) {
        console.log('[Admin] First page:', {
          id: data.pages[0].id,
          title: data.pages[0].title,
          contentLength: data.pages[0].content?.length || 0,
          hasContent: !!data.pages[0].content
        });
      }
      // Ensure pages is always an array
      const pagesData = data.pages || [];
      setPages(Array.isArray(pagesData) ? pagesData : []);
      console.log('[Admin] State updated with', pagesData.length, 'pages');
    } catch (e: any) {
      console.error('[Admin] Error loading pages:', e);
      setError(e.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  async function handleEditPage(pageInfo: { id: string; title: string; path: string }) {
    try {
      console.log('[Admin] handleEditPage called for:', pageInfo.id);
      console.log('[Admin] Current pages in state:', pages.length);
      
      // First, check if page already exists in local state
      const existing = pages.find(p => p.id === pageInfo.id);
      console.log('[Admin] Found existing page:', existing ? 'YES' : 'NO');
      
      if (existing) {
        console.log('[Admin] Existing page data:', {
          id: existing.id,
          title: existing.title,
          contentLength: existing.content?.length || 0,
          hasContent: !!existing.content,
          contentPreview: existing.content ? existing.content.substring(0, 50) : 'NO CONTENT',
          path: existing.path
        });
        setEditingPage(existing);
        return;
      }

      // If not in state, fetch from public API which will seed defaults if needed
      console.log('[Admin] Page not in state, fetching from public API to seed defaults...');
      const res = await fetch(`/api/static-pages/${pageInfo.id}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const page = data.page as StaticPage;
        console.log('[Admin] Loaded default content from public API:', {
          id: page.id,
          contentLength: page.content?.length || 0,
          contentPreview: page.content ? page.content.substring(0, 50) : 'NO CONTENT'
        });
        // Pre-fill modal with default content
        setEditingPage(page);
        // Reload list so page appears in state
        await loadPages();
      } else {
        console.log('[Admin] No default available, creating empty entry');
        // Fallback: create empty entry
        setEditingPage({
          id: pageInfo.id,
          title: pageInfo.title,
          content: '',
          path: pageInfo.path,
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (e: any) {
      console.error('[Admin] Error in handleEditPage:', e);
      setError(e.message || 'Error loading page');
      // Fallback: create empty entry
      setEditingPage({
        id: pageInfo.id,
        title: pageInfo.title,
        content: '',
        path: pageInfo.path,
        updatedAt: new Date().toISOString(),
      });
    }
  }

  async function handleSavePage() {
    if (!editingPage) return;

    if (!editingPage.id?.trim() || !editingPage.title?.trim()) {
      setError('Bitte ID und Titel ausfüllen.');
      return;
    }
    if (!editingPage.path?.startsWith('/')) {
      setError('Pfad ist ungültig. Er muss mit / beginnen, z. B. /impressum');
      return;
    }
    if (typeof editingPage.content !== 'string') {
      setError('Inhalt ist ungültig.');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const res = await fetch('/api/admin/static-pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingPage.id,
          title: editingPage.title,
          content: editingPage.content,
          path: editingPage.path,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({} as any));
        throw new Error(err?.error || 'Failed to save page');
      }
      await loadPages();
      setEditingPage(null);
    } catch (e: any) {
      setError(e.message || 'Unknown error');
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setEditingPage(null);
  }

  if (loading) {
    return (
      <div className="admin-container">
        <p>Loading...</p>
        <style jsx>{`
          .admin-container {
            max-width: 1200px;
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
        .pages-grid {
          display: grid;
          gap: 20px;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          margin-bottom: 30px;
        }
        .page-card {
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 20px;
          background: #fff;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
        }
        .page-title {
          font-size: 1.2rem;
          font-weight: bold;
          color: #333;
          margin: 0;
        }
        .page-path {
          color: #666;
          font-size: 0.9rem;
          margin: 5px 0;
        }
        .page-status {
          color: #28a745;
          font-weight: bold;
        }
        .error {
          background: #fdecea;
          color: #b71c1c;
          border: 1px solid #f5c6cb;
          padding: 10px 12px;
          border-radius: 6px;
          margin-bottom: 16px;
        }
        .modal-overlay {
          position: fixed;
          inset: 0;
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
          max-width: 900px;
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
        .form-input {
          width: 100%;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
        }
        .form-textarea {
          width: 100%;
          min-height: 400px;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 13px;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono',
            'Courier New', monospace;
          resize: vertical;
          white-space: pre-wrap;
        }
        .modal-actions {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
          margin-top: 20px;
        }
      `}</style>

      <div className="admin-header">
        <h1 className="admin-title">Static Pages Management</h1>
        <a className="btn btn-secondary" href="/admin">
          Back to Admin
        </a>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="pages-grid">
        {staticPages.map((pageInfo) => {
          const existing = pages.find((p) => p.id === pageInfo.id);
          return (
            <div key={pageInfo.id} className="page-card">
              <div className="page-header">
                <div>
                  <h3 className="page-title">{pageInfo.title}</h3>
                  <div className="page-path">{pageInfo.path}</div>
                  {existing && (
                    <div style={{ fontSize: '0.8rem', color: '#666', marginTop: 5 }}>
                      Last updated: {new Date(existing.updatedAt).toLocaleString()}
                    </div>
                  )}
                </div>
                <div className="page-status">{existing ? 'Customized' : 'Default'}</div>
              </div>
              <div>
                <button className="btn btn-primary" onClick={() => handleEditPage(pageInfo)}>
                  Edit Content
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {editingPage && (
        <div className="modal-overlay" onClick={() => setEditingPage(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Edit {editingPage.title}</h2>

            <div className="form-group">
              <label>Title</label>
              <input
                type="text"
                className="form-input"
                value={editingPage.title}
                onChange={(e) => setEditingPage({ ...editingPage, title: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Path</label>
              <input
                type="text"
                className="form-input"
                value={editingPage.path}
                onChange={(e) => setEditingPage({ ...editingPage, path: e.target.value })}
                placeholder="/impressum"
              />
            </div>

            <div className="form-group">
              <label>Content (HTML)</label>
              <textarea
                className="form-textarea"
                value={editingPage.content || ''}
                onChange={(e) => setEditingPage({ ...editingPage, content: e.target.value })}
                placeholder="Enter HTML content for this page..."
              />
            </div>

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={handleCancel} disabled={saving}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSavePage} disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
