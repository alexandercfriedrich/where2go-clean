'use client';
import { useEffect } from 'react';

export default function Impressum() {
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
            <h1 className="event-title" style={{ fontSize: '2rem', marginBottom: '2rem' }}>Impressum</h1>
            
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ marginBottom: '1rem', color: '#404040' }}>Angaben gemäß § 5 TMG</h3>
              <p style={{ marginBottom: '0.5rem' }}><strong>Where2Go</strong></p>
              <p style={{ marginBottom: '0.5rem' }}>Musterstraße 1</p>
              <p style={{ marginBottom: '0.5rem' }}>12345 Musterstadt</p>
              <p style={{ marginBottom: '0.5rem' }}>Deutschland</p>
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ marginBottom: '1rem', color: '#404040' }}>Kontakt</h3>
              <p style={{ marginBottom: '0.5rem' }}>Telefon: +49 (0) 123 456789</p>
              <p style={{ marginBottom: '0.5rem' }}>E-Mail: kontakt@where2go.example.com</p>
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ marginBottom: '1rem', color: '#404040' }}>Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV</h3>
              <p style={{ marginBottom: '0.5rem' }}>Max Mustermann</p>
              <p style={{ marginBottom: '0.5rem' }}>Musterstraße 1</p>
              <p style={{ marginBottom: '0.5rem' }}>12345 Musterstadt</p>
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ marginBottom: '1rem', color: '#404040' }}>Haftungsausschluss</h3>
              <h4 style={{ marginBottom: '0.5rem', fontSize: '1rem' }}>Haftung für Inhalte</h4>
              <p style={{ marginBottom: '1rem', lineHeight: '1.6' }}>
                Als Diensteanbieter sind wir gemäß § 7 Abs.1 TMG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir als Diensteanbieter jedoch nicht unter der Verpflichtung, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen.
              </p>
              
              <h4 style={{ marginBottom: '0.5rem', fontSize: '1rem' }}>Haftung für Links</h4>
              <p style={{ marginBottom: '1rem', lineHeight: '1.6' }}>
                Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich.
              </p>
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