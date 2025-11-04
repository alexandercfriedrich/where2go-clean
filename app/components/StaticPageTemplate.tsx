'use client';
import { useEffect, useState } from 'react';

interface StaticPage {
  id: string;
  title: string;
  content: string;
  path: string;
  updatedAt: string;
}

interface StaticPageTemplateProps {
  pageId: string;
  defaultTitle: string;
  defaultContent: string;
}

export default function StaticPageTemplate({ pageId, defaultTitle, defaultContent }: StaticPageTemplateProps) {
  const [page, setPage] = useState<StaticPage | null>(null);
  const [loading, setLoading] = useState(true);

  // Apply design1.css by default
  useEffect(() => {
    const id = 'w2g-design-css';
    const existing = document.getElementById(id) as HTMLLinkElement | null;
    const href = `/designs/design1.css`;
    
    if (existing) {
      if (existing.getAttribute('href') !== href) existing.setAttribute('href', href);
    } else {
      const link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      link.href = href;
      document.head.appendChild(link);
    }

    // Load page content
    loadPageContent();
  }, [pageId]);

  async function loadPageContent() {
    try {
      console.log(`Loading static page content for: ${pageId}`);
      const res = await fetch(`/api/static-pages/${pageId}`, { 
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      if (res.ok) {
        const data = await res.json();
        console.log(`Loaded page data:`, data.page?.title, `(${data.page?.content?.length || 0} chars)`);
        setPage(data.page);
      } else {
        console.error(`Failed to load ${pageId}:`, res.status, res.statusText);
      }
    } catch (error) {
      console.error(`Error loading ${pageId} content:`, error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="container" style={{ minHeight: '100vh', padding: '2rem 0' }}>
        <div className="events-grid" style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div className="event-card">
            <div className="event-content">
              <h1 className="event-title" style={{ fontSize: '2rem', marginBottom: '2rem' }}>
                {defaultTitle}
              </h1>
              <p>Inhalt wird geladen...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ minHeight: '100vh', padding: '2rem 0' }}>
      <div className="events-grid" style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div className="event-card">
          <div className="event-content">
            <h1 className="event-title" style={{ fontSize: '2rem', marginBottom: '2rem' }}>
              {page?.title || defaultTitle}
            </h1>
            
            <div 
              style={{ lineHeight: '1.6' }}
              dangerouslySetInnerHTML={{ 
                __html: page?.content || defaultContent
              }} 
            />
            
            {/* Debug Info (nur in Development) */}
            {process.env.NODE_ENV === 'development' && (
              <div style={{ 
                marginTop: '2rem', 
                padding: '1rem', 
                background: '#f8f9fa', 
                border: '1px solid #dee2e6',
                borderRadius: '4px',
                fontSize: '12px',
                color: '#6c757d'
              }}>
                <strong>Debug Info:</strong><br/>
                Page ID: {pageId}<br/>
                Source: {page ? 'Redis (Custom)' : 'Default Fallback'}<br/>
                Content Length: {page?.content?.length || defaultContent.length} chars<br/>
                Last Updated: {page ? new Date(page.updatedAt).toLocaleString() : 'Default'}
              </div>
            )}

            <div className="event-actions" style={{ justifyContent: 'center', marginTop: '2rem' }}>
              <a href="/" className="event-action-btn event-info-btn">
                <svg className="icon-info" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                  <polyline points="9,22 9,12 15,12 15,22"/>
                </svg>
                Zurück zur Startseite
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}