'use client';

import { useEffect, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';

// Dynamic import für React-Quill um SSR-Probleme zu vermeiden
const ReactQuill = dynamic(() => import('react-quill-new'), { 
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

type EditorMode = 'rich' | 'html';

export default function StaticPagesAdmin() {
  const [pages, setPages] = useState<StaticPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingPage, setEditingPage] = useState<StaticPage | null>(null);
  const [saving, setSaving] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [editorMode, setEditorMode] = useState<EditorMode>('rich');
  const [showCreateForm, setShowCreateForm] = useState(false);

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
    setEditorMode('rich'); // Start with rich text editor
    setShowCreateForm(false);
  }

  function handleCreateNewPage() {
    setEditingPage({
      id: 'neue-seite', // Default ID to prevent empty validation error
      title: 'Neue Seite',
      content: '',
      path: '/neue-seite',
      updatedAt: new Date().toISOString(),
    });
    setEditorMode('rich');
    setShowCreateForm(true);
  }

  // Simplified editor mode switching - no conversion needed as Quill handles HTML
  function switchEditorMode(newMode: EditorMode) {
    setEditorMode(newMode);
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
    
    // Check if ID already exists when creating new page
    if (showCreateForm && pages.find(p => p.id === editingPage.id)) {
      setError(`Eine Seite mit der ID "${editingPage.id}" existiert bereits. Bitte wählen Sie eine andere ID.`);
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
      setSuccess(null);
      
      console.log('Saving page data:', {
        id: editingPage.id,
        title: editingPage.title,
        content: content,
        path: editingPage.path,
        editorMode
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
      
      setSuccess(`Seite "${editingPage.title}" erfolgreich gespeichert!`);
      await loadPages();
      setEditingPage(null);
      setShowCreateForm(false);
    } catch (e: any) {
      console.error('Save error:', e);
      setError(e.message || 'Unknown error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeletePage(pageId: string) {
    if (!confirm(`Möchten Sie die Seite "${pageId}" wirklich löschen?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/static-pages?id=${pageId}`, {
        method: 'DELETE',
      });
      
      if (!res.ok) {
        const err = await res.json().catch(() => ({} as any));
        throw new Error(err?.error || 'Failed to delete page');
      }
      
      setSuccess(`Seite "${pageId}" erfolgreich gelöscht!`);
      await loadPages();
    } catch (e: any) {
      setError(e.message || 'Unknown error');
    }
  }

  function handleCancel() {
    setEditingPage(null);
    setShowCreateForm(false);
    setError(null);
    setSuccess(null);
  }

  function handleContentChange(value: string) {
    if (editingPage) {
      setEditingPage({ ...editingPage, content: value });
    }
  }

  // Clear success message after 5 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

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
          margin-right: 10px;
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
        .btn-success {
          background-color: #28a745;
          color: white;
        }
        .btn-success:hover:not(:disabled) {
          background-color: #1e7e34;
        }
        .btn-secondary {
          background-color: #6c757d;
          color: white;
        }
        .btn-secondary:hover:not(:disabled) {
          background-color: #545b62;
        }
        .btn-danger {
          background-color: #dc3545;
          color: white;
        }
        .btn-danger:hover:not(:disabled) {
          background-color: #c82333;
        }
        .btn-small {
          padding: 5px 10px;
          font-size: 12px;
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
        .page-actions {
          display: flex;
          gap: 8px;
          margin-top: 15px;
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
        .form-group .field-hint {
          font-size: 12px;
          color: #666;
          font-weight: normal;
          margin-left: 8px;
        }
        .form-input {
          width: 100%;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
          box-sizing: border-box;
        }
        .form-input.required {
          border-left: 3px solid #007bff;
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
        .editor-mode-toggle {
          display: flex;
          gap: 0;
          margin-bottom: 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          overflow: hidden;
        }
        .editor-mode-btn {
          padding: 8px 16px;
          border: none;
          background: #f8f9fa;
          cursor: pointer;
          font-size: 12px;
          text-transform: uppercase;
          font-weight: bold;
          transition: all 0.2s;
        }
        .editor-mode-btn.active {
          background: #007bff;
          color: white;
        }
        .editor-mode-btn:hover:not(.active) {
          background: #e9ecef;
        }
        .create-section {
          margin-bottom: 30px;
          padding: 20px;
          border: 2px dashed #ddd;
          border-radius: 8px;
          text-align: center;
        }
      `}</style>

      <div className="admin-header">
        <h1 className="admin-title">Static Pages Management</h1>
        <a className="btn btn-secondary" href="/admin">
          Back to Admin
        </a>
      </div>

      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      {/* Create New Page Section */}
      <div className="create-section">
        <h3>Neue Seite erstellen</h3>
        <p>Erstellen Sie eine neue statische Seite mit eigenem Inhalt.</p>
        <button className="btn btn-success" onClick={handleCreateNewPage}>
          ➕ Neue Seite erstellen
        </button>
      </div>

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
              <div className="page-actions">
                <button className="btn btn-primary btn-small" onClick={() => handleEditPage(pageInfo)}>
                  ✏️ Edit
                </button>
                {existing && (
                  <button 
                    className="btn btn-danger btn-small" 
                    onClick={() => handleDeletePage(pageInfo.id)}
                  >
                    🗑️ Delete
                  </button>
                )}
              </div>
            </div>
          );
        })}
        
        {/* Custom pages (not in default list) */}
        {pages.filter(p => !staticPages.find(sp => sp.id === p.id)).map((page) => (
          <div key={page.id} className="page-card">
            <div className="page-header">
              <div>
                <h3 className="page-title">{page.title}</h3>
                <div className="page-path">{page.path}</div>
                <div style={{ fontSize: '0.8rem', color: '#666', marginTop: 5 }}>  
                  Last updated: {new Date(page.updatedAt).toLocaleString()}
                </div>
              </div>
              <div className="page-status">Custom</div>
            </div>
            <div className="page-actions">
              <button className="btn btn-primary btn-small" onClick={() => handleEditPage(page)}>
                ✏️ Edit
              </button>
              <button 
                className="btn btn-danger btn-small" 
                onClick={() => handleDeletePage(page.id)}
              >
                🗑️ Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {editingPage && (
        <div className="modal-overlay" onClick={handleCancel}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{showCreateForm ? 'Neue Seite erstellen' : `Edit ${editingPage.title}`}</h2>

            <div className="form-group">
              <label>ID <span className="field-hint">{showCreateForm ? '(eindeutig, nur Kleinbuchstaben und Bindestriche)' : '(nicht änderbar)'}</span></label>
              <input
                type="text"
                className={`form-input ${showCreateForm ? 'required' : ''}`}
                value={editingPage.id}
                onChange={(e) => setEditingPage({ ...editingPage, id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                disabled={!showCreateForm} // ID nur bei neuen Seiten änderbar
                placeholder="meine-neue-seite"
              />
            </div>

            <div className="form-group">
              <label>Title <span className="field-hint">(erforderlich)</span></label>
              <input
                type="text"
                className="form-input required"
                value={editingPage.title}
                onChange={(e) => setEditingPage({ ...editingPage, title: e.target.value })}
                placeholder="Meine neue Seite"
              />
            </div>

            <div className="form-group">
              <label>Path <span className="field-hint">(URL-Pfad, z.B. /meine-seite)</span></label>
              <input
                type="text"
                className="form-input required"
                value={editingPage.path}
                onChange={(e) => setEditingPage({ ...editingPage, path: e.target.value })}
                placeholder="/meine-neue-seite"
              />
            </div>

            <div className="form-group">
              <label>Content Editor</label>
              
              {/* Editor Mode Toggle */}
              <div className="editor-mode-toggle">
                <button 
                  className={`editor-mode-btn ${editorMode === 'rich' ? 'active' : ''}`}
                  onClick={() => switchEditorMode('rich')}
                  type="button"
                >
                  🎨 Rich Text
                </button>
                <button 
                  className={`editor-mode-btn ${editorMode === 'html' ? 'active' : ''}`}
                  onClick={() => switchEditorMode('html')}
                  type="button"
                >
                  📝 HTML Code
                </button>
              </div>
              
              {/* Rich Text Editor */}
              {editorMode === 'rich' && isClient ? (
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
              ) : editorMode === 'rich' && !isClient ? (
                <div className="form-textarea" style={{ minHeight: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  Editor wird geladen...
                </div>
              ) : (
                /* HTML Editor */
                <textarea
                  className="form-textarea"
                  value={editingPage.content}
                  onChange={(e) => handleContentChange(e.target.value)}
                  placeholder="<h2>Ihr HTML Code hier</h2>&#10;<p>Sie können direkt HTML eingeben und bearbeiten.</p>"
                  style={{ fontFamily: 'monospace', fontSize: '13px' }}
                />
              )}
              
              <div style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
                {editorMode === 'rich' 
                  ? '🎨 Rich Text Editor: Verwenden Sie die Toolbar für Formatierungen'
                  : '📝 HTML Editor: Direkter HTML-Code Input'}
              </div>
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