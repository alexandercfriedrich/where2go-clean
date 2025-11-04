'use client';

import { useEffect, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';

// Dynamic import für React-Quill um SSR-Probleme zu vermeiden
const ReactQuill = dynamic(() => import('react-quill'), { 
  ssr: false,
  loading: () => <div className="form-textarea" style={{ minHeight: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #ddd' }}>Editor wird geladen...</div>
});

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
  const [isClient, setIsClient] = useState(false);

  const staticPages = [
    { id: 'seo-footer', title: 'SEO Footer (Homepage)', path: '/' },
    { id: 'datenschutz', title: 'Datenschutzerklärung', path: '/datenschutz' },
    { id: 'agb', title: 'Allgemeine Geschäftsbedingungen', path: '/agb' },
    { id: 'impressum', title: 'Impressum', path: '/impressum' },
    { id: 'ueber-uns', title: 'Über uns', path: '/ueber-uns' },
    { id: 'kontakt', title: 'Kontakt', path: '/kontakt' },
    { id: 'premium', title: 'Premium', path: '/premium' },
  ];

  // React-Quill Konfiguration
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
    loadPages();
  }, []);

  async function loadPages() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/admin/static-pages', { cache: 'no-store' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({} as any));
        throw new Error(err?.error || 'Failed to load pages');
      }
      const data = await res.json();
      setPages(data.pages || []);
    } catch (e: any) {
      setError(e.message || 'Unknown error');
      console.error('Error loading pages:', e);
    } finally {
      setLoading(false);
    }
  }

  function handleEditPage(pageInfo: { id: string; title: string; path: string }) {
    const existing = pages.find(p => p.id === pageInfo.id);
    if (existing) {
      setEditingPage(existing);
    } else {
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

    // Validierung
    if (!editingPage.id?.trim() || !editingPage.title?.trim()) {
      setError('Bitte ID und Titel ausfüllen.');
      return;
    }
    if (!editingPage.path?.startsWith('/')) {
      setError('Pfad ist ungültig. Er muss mit / beginnen, z. B. /impressum');
      return;
    }
    
    // Content als String validieren und bereinigen
    let content = editingPage.content || '';
    if (typeof content !== 'string') {
      console.warn('Content is not a string, converting:', typeof content, content);
      content = String(content);
    }
    
    // Leeren Quill-Content bereinigen
    if (content === '<p><br></p>' || content === '<p></p>') {
      content = '';
    }

    try {
      setSaving(true);
      setError(null);
      
      console.log('Saving page data:', {
        id: editingPage.id,
        title: editingPage.title,
        content: content,
        path: editingPage.path,
      });
      
      const res = await fetch('/api/admin/static-pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingPage.id,
          title: editingPage.title,
          content: content,
          path: editingPage.path,
        }),
      });
      
      if (!res.ok) {
        const err = await res.json().catch(() => ({} as any));
        console.error('API Error:', err);
        throw new Error(err?.error || 'Failed to save page');
      }
      
      const result = await res.json();
      console.log('Save successful:', result);
      
      await loadPages();
      setEditingPage(null);
    } catch (e: any) {
      console.error('Save error:', e);
      setError(e.message || 'Unknown error');
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setEditingPage(null);
    setError(null);
  }

  function handleContentChange(value: string) {
    if (editingPage) {
      setEditingPage({ ...editingPage, content: value });
    }
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
        .success {
          background: #d4edda;
          color: #155724;
          border: 1px solid #c3e6cb;
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
          overflow-y: auto;
        }
        .modal {
          background: white;
          border-radius: 8px;
          padding: 30px;
          max-width: 1000px;
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
        .form-input {
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
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono',
            'Courier New', monospace;
          resize: vertical;
          white-space: pre-wrap;
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
        .editor-container :global(.ql-toolbar) {
          border-bottom: 1px solid #ddd;
        }
        .editor-container :global(.ql-editor) {
          min-height: 300px;
        }
        .editor-container :global(.ql-editor.ql-blank::before) {
          font-style: italic;
          color: #999;
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
              <label>Content (Rich Text Editor)</label>
              {isClient ? (
                <div className="editor-container">
                  <ReactQuill
                    theme="snow"
                    value={editingPage.content}
                    onChange={handleContentChange}
                    modules={quillModules}
                    formats={quillFormats}
                    placeholder="Geben Sie hier Ihren Content ein. Sie können Text formatieren, Links hinzufügen und vieles mehr..."
                  />
                </div>
              ) : (
                <div className="form-textarea" style={{ minHeight: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  Editor wird geladen...
                </div>
              )}
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