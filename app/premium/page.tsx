'use client';
import { useEffect } from 'react';

export default function Premium() {
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
            <h1 className="event-title" style={{ fontSize: '2rem', marginBottom: '2rem' }}>Where2Go Premium</h1>
            
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ marginBottom: '1rem', color: '#404040' }}>Entdecke Events wie nie zuvor</h3>
              <p style={{ marginBottom: '1rem', lineHeight: '1.6' }}>
                Mit Where2Go Premium erhältst du Zugang zu exklusiven Features und privilegierten Event-Informationen, die dein Event-Erlebnis auf das nächste Level heben.
              </p>
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ marginBottom: '1rem', color: '#404040' }}>Premium Features</h3>
              
              <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '0.5rem', border: '1px solid #e5e5e5' }}>
                <h4 style={{ marginBottom: '0.5rem', fontSize: '1.1rem', color: '#2563eb' }}>🎯 Priority Access</h4>
                <p style={{ marginBottom: '0.5rem', lineHeight: '1.6', fontSize: '0.9rem' }}>
                  Erhalte als Erster Zugang zu limitierten Events und exklusiven Veranstaltungen.
                </p>
              </div>

              <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '0.5rem', border: '1px solid #e5e5e5' }}>
                <h4 style={{ marginBottom: '0.5rem', fontSize: '1.1rem', color: '#2563eb' }}>📧 Smart Notifications</h4>
                <p style={{ marginBottom: '0.5rem', lineHeight: '1.6', fontSize: '0.9rem' }}>
                  Personalisierte Event-Empfehlungen und Benachrichtigungen für deine Lieblings-Venues und -Artists.
                </p>
              </div>

              <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '0.5rem', border: '1px solid #e5e5e5' }}>
                <h4 style={{ marginBottom: '0.5rem', fontSize: '1.1rem', color: '#2563eb' }}>💰 Exclusive Discounts</h4>
                <p style={{ marginBottom: '0.5rem', lineHeight: '1.6', fontSize: '0.9rem' }}>
                  Zugang zu speziellen Preisnachlässen und VIP-Angeboten unserer Partner-Venues.
                </p>
              </div>

              <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '0.5rem', border: '1px solid #e5e5e5' }}>
                <h4 style={{ marginBottom: '0.5rem', fontSize: '1.1rem', color: '#2563eb' }}>🔍 Advanced Search</h4>
                <p style={{ marginBottom: '0.5rem', lineHeight: '1.6', fontSize: '0.9rem' }}>
                  Erweiterte Suchfilter, gespeicherte Suchen und personalisierte Event-Empfehlungen basierend auf deinen Vorlieben.
                </p>
              </div>

              <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '0.5rem', border: '1px solid #e5e5e5' }}>
                <h4 style={{ marginBottom: '0.5rem', fontSize: '1.1rem', color: '#2563eb' }}>📱 Premium Mobile App</h4>
                <p style={{ marginBottom: '0.5rem', lineHeight: '1.6', fontSize: '0.9rem' }}>
                  Zugang zur Premium Mobile App mit Offline-Funktionen und erweiterten Features.
                </p>
              </div>
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ marginBottom: '1rem', color: '#404040' }}>Preise</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                <div style={{ padding: '1.5rem', backgroundColor: '#ffffff', borderRadius: '0.5rem', border: '2px solid #e5e5e5' }}>
                  <h4 style={{ marginBottom: '0.5rem', fontSize: '1.2rem', color: '#404040' }}>Premium Monthly</h4>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#2563eb', marginBottom: '1rem' }}>€9.99</div>
                  <p style={{ fontSize: '0.9rem', color: '#737373' }}>pro Monat</p>
                </div>
                
                <div style={{ padding: '1.5rem', backgroundColor: '#ffffff', borderRadius: '0.5rem', border: '2px solid #2563eb' }}>
                  <h4 style={{ marginBottom: '0.5rem', fontSize: '1.2rem', color: '#404040' }}>Premium Yearly</h4>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#2563eb', marginBottom: '0.5rem' }}>€99.99</div>
                  <div style={{ fontSize: '0.8rem', color: '#059669', marginBottom: '0.5rem' }}>2 Monate gratis!</div>
                  <p style={{ fontSize: '0.9rem', color: '#737373' }}>pro Jahr</p>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ marginBottom: '1rem', color: '#404040' }}>Business & Venue Partners</h3>
              <p style={{ marginBottom: '1rem', lineHeight: '1.6' }}>
                Für Veranstalter, Venues und Event-Unternehmen bieten wir maßgeschneiderte Premium-Lösungen mit erweiterten Marketing-Tools und Analytics.
              </p>
              <p style={{ fontSize: '0.9rem', color: '#737373' }}>
                Kontaktieren Sie uns für ein individuelles Angebot: <strong>business@where2go.example.com</strong>
              </p>
            </div>

            <div className="event-actions" style={{ justifyContent: 'center', marginTop: '2rem', gap: '1rem' }}>
              <a href="#" className="event-action-btn" style={{ background: '#2563eb', color: 'white', border: '1px solid #2563eb' }}>
                <svg className="icon-tickets" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v5h18z"/>
                  <path d="M3 12v5a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-5"/>
                  <path d="M8 12v6"/>
                  <path d="M16 12v6"/>
                </svg>
                Premium starten
              </a>
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