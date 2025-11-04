'use client';
import { useEffect, useState } from 'react';

interface StaticPage {
  id: string;
  title: string;
  content: string;
  path: string;
  updatedAt: string;
}

export default function Impressum() {
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
  }, []);

  async function loadPageContent() {
    try {
      const res = await fetch('/api/static-pages/impressum', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setPage(data.page);
      }
    } catch (error) {
      console.error('Error loading impressum content:', error);
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
              <p>Lädt...</p>
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
              {page?.title || 'Impressum'}
            </h1>
            
            <div 
              style={{ lineHeight: '1.6' }}
              dangerouslySetInnerHTML={{ 
                __html: page?.content || `
                  <div>
                    <h3 style="margin-bottom: 1rem; color: #404040;">Angaben gemäß § 5 TMG</h3>
                    <p><strong>Where2Go</strong></p>
                    <p>Musterstraße 1</p>
                    <p>12345 Musterstadt</p>
                    <p>Deutschland</p>
                    
                    <h3 style="margin: 2rem 0 1rem; color: #404040;">Kontakt</h3>
                    <p>Telefon: +49 (0) 123 456789</p>
                    <p>E-Mail: kontakt@www.where2go.at</p>
                    
                    <h3 style="margin: 2rem 0 1rem; color: #404040;">Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV</h3>
                    <p>Max Mustermann</p>
                    <p>Musterstraße 1</p>
                    <p>12345 Musterstadt</p>
                  </div>
                `
              }} 
            />

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