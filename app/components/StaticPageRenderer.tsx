'use client';
import { useEffect, useState } from 'react';
import DOMPurify from 'isomorphic-dompurify';

interface StaticPageRendererProps {
  pageId: string;
  fallbackTitle?: string;
  fallbackContent?: React.ReactNode;
}

export default function StaticPageRenderer({ 
  pageId, 
  fallbackTitle = 'Loading...', 
  fallbackContent 
}: StaticPageRendererProps) {
  const [content, setContent] = useState<string | null>(null);
  const [title, setTitle] = useState<string>(fallbackTitle);
  const [loading, setLoading] = useState(true);
  const [useFallback, setUseFallback] = useState(false);

  // Apply design1.css
  useEffect(() => {
    const id = 'w2g-design-css';
    const href = `/designs/design1.css`;
    const existing = document.getElementById(id) as HTMLLinkElement | null;
    let created = false;

    if (existing) {
      if (existing.getAttribute('href') !== href) {
        existing.setAttribute('href', href);
      }
    } else {
      const link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      link.href = href;
      document.head.appendChild(link);
      created = true;
    }

    return () => {
      if (created) {
        const link = document.getElementById(id);
        if (link && link.parentNode) {
          link.parentNode.removeChild(link);
        }
      }
    };
  }, []);

  useEffect(() => {
    async function loadContent() {
      try {
        setLoading(true);
        const res = await fetch(`/api/static-pages/${pageId}`, { 
          next: { revalidate: 3600 } 
        });
        
        if (!res.ok) {
          // Page not found in database, use fallback
          if (res.status === 404) {
            setContent(null);
            setUseFallback(true);
          } else {
            throw new Error('Failed to load page');
          }
        } else {
          const data = await res.json();
          if (data.page) {
            setTitle(data.page.title);
            setContent(data.page.content);
            setUseFallback(false);
          }
        }
      } catch (err) {
        console.error('Error loading static page:', err);
        setUseFallback(true);
      } finally {
        setLoading(false);
      }
    }

    loadContent();
  }, [pageId]);

  // Show fallback content if database content is not available
  if (loading) {
    return (
      <div className="container" style={{ minHeight: '100vh', padding: '2rem 0' }}>
        <div className="events-grid" style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div className="event-card">
            <div className="event-content">
              <p>Loading...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If no content from database and no fallback, show message
  if (useFallback && !fallbackContent) {
    return (
      <div className="container" style={{ minHeight: '100vh', padding: '2rem 0' }}>
        <div className="events-grid" style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div className="event-card">
            <div className="event-content">
              <h1 className="event-title" style={{ fontSize: '2rem', marginBottom: '2rem' }}>{fallbackTitle}</h1>
              <p>Content not available. Please contact the administrator.</p>
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

  return (
    <div className="container" style={{ minHeight: '100vh', padding: '2rem 0' }}>
      <div className="events-grid" style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div className="event-card">
          <div className="event-content">
            {useFallback ? (
              fallbackContent
            ) : (
              <>
                <h1 className="event-title" style={{ fontSize: '2rem', marginBottom: '2rem' }}>{title}</h1>
                <div 
                  dangerouslySetInnerHTML={{ 
                    __html: DOMPurify.sanitize(content || '', {
                      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'a', 'blockquote', 'code', 'pre', 'div', 'span'],
                      ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'style']
                    })
                  }} 
                />
              </>
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
