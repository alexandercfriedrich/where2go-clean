'use client';
import { useEffect } from 'react';

export default function Kontakt() {
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
  }, []);

  return (
    <div className="container" style={{ minHeight: '100vh', padding: '2rem 0' }}>
      <div className="events-grid" style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div className="event-card">
          <div className="event-content">
            <h1 className="event-title" style={{ fontSize: '2rem', marginBottom: '2rem' }}>Kontakt</h1>
            
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ marginBottom: '1rem', color: '#404040' }}>Wir freuen uns auf Ihre Nachricht!</h3>
              <p style={{ marginBottom: '1rem', lineHeight: '1.6' }}>
                Sie haben Fragen zu Where2Go? Möchten ein Event hinzufügen oder haben Feedback für uns? Kontaktieren Sie uns gerne über die folgenden Kanäle.
              </p>
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ marginBottom: '1rem', color: '#404040' }}>Kontaktdaten</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
                <span>kontakt@where2go.example.com</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                </svg>
                <span>+49 (0) 123 456789</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
                <span>Musterstraße 1, 12345 Musterstadt, Deutschland</span>
              </div>
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ marginBottom: '1rem', color: '#404040' }}>Event Partner werden</h3>
              <p style={{ marginBottom: '1rem', lineHeight: '1.6' }}>
                Sie sind Veranstalter oder betreiben eine Location? Sprechen Sie uns an, um Ihre Events prominent auf Where2Go zu präsentieren und neue Zielgruppen zu erreichen.
              </p>
              <p style={{ marginBottom: '0.5rem' }}><strong>Partnership:</strong> partner@where2go.example.com</p>
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ marginBottom: '1rem', color: '#404040' }}>Support & Feedback</h3>
              <p style={{ marginBottom: '1rem', lineHeight: '1.6' }}>
                Haben Sie technische Probleme oder Verbesserungsvorschläge? Unser Support-Team hilft Ihnen gerne weiter.
              </p>
              <p style={{ marginBottom: '0.5rem' }}><strong>Support:</strong> support@where2go.example.com</p>
            </div>

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