'use client';
import { useEffect } from 'react';

export default function AGB() {
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
            <h1 className="event-title" style={{ fontSize: '2rem', marginBottom: '2rem' }}>Allgemeine Geschäftsbedingungen</h1>
            
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ marginBottom: '1rem', color: '#404040' }}>§ 1 Geltungsbereich</h3>
              <p style={{ marginBottom: '1rem', lineHeight: '1.6' }}>
                Diese Allgemeinen Geschäftsbedingungen (nachfolgend &quot;AGB&quot;) gelten für alle Verträge zwischen Where2Go und den Nutzern der Website www.where2go.at.
              </p>
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ marginBottom: '1rem', color: '#404040' }}>§ 2 Vertragspartner</h3>
              <p style={{ marginBottom: '1rem', lineHeight: '1.6' }}>
                Vertragspartner des Nutzers ist:
              </p>
              <p style={{ marginBottom: '0.5rem' }}><strong>Where2Go</strong></p>
              <p style={{ marginBottom: '0.5rem' }}>Musterstraße 1</p>
              <p style={{ marginBottom: '0.5rem' }}>12345 Musterstadt</p>
              <p style={{ marginBottom: '1rem' }}>E-Mail: kontakt@where2go.at</p>
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ marginBottom: '1rem', color: '#404040' }}>§ 3 Leistungen</h3>
              <p style={{ marginBottom: '1rem', lineHeight: '1.6' }}>
                Where2Go stellt eine Plattform zur Verfügung, über die Nutzer Informationen über Events und Veranstaltungen abrufen können. Die Nutzung der Basisfunktionen ist kostenlos.
              </p>
              <p style={{ marginBottom: '1rem', lineHeight: '1.6' }}>
                Für erweiterte Funktionen können Premium-Services gegen Entgelt angeboten werden.
              </p>
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ marginBottom: '1rem', color: '#404040' }}>§ 4 Nutzungsrechte und -pflichten</h3>
              <p style={{ marginBottom: '1rem', lineHeight: '1.6' }}>
                Der Nutzer ist berechtigt, die Plattform entsprechend ihrer Bestimmung zu nutzen. Eine missbräuchliche Nutzung ist untersagt.
              </p>
              <p style={{ marginBottom: '1rem', lineHeight: '1.6' }}>
                Der Nutzer verpflichtet sich, keine Inhalte zu übermitteln, die gegen geltendes Recht verstoßen oder die Rechte Dritter verletzen.
              </p>
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ marginBottom: '1rem', color: '#404040' }}>§ 5 Haftung</h3>
              <p style={{ marginBottom: '1rem', lineHeight: '1.6' }}>
                Where2Go haftet nur bei Vorsatz und grober Fahrlässigkeit. Die Haftung für mittelbare Schäden, entgangenen Gewinn und Folgeschäden ist ausgeschlossen.
              </p>
              <p style={{ marginBottom: '1rem', lineHeight: '1.6' }}>
                Die Inhalte der Events stammen von Dritten. Where2Go übernimmt keine Gewähr für die Richtigkeit, Vollständigkeit oder Aktualität dieser Informationen.
              </p>
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ marginBottom: '1rem', color: '#404040' }}>§ 6 Schlussbestimmungen</h3>
              <p style={{ marginBottom: '1rem', lineHeight: '1.6' }}>
                Es gilt deutsches Recht. Gerichtsstand ist Musterstadt.
              </p>
              <p style={{ marginBottom: '1rem', lineHeight: '1.6' }}>
                Sollten einzelne Bestimmungen dieser AGB unwirksam sein, bleibt die Wirksamkeit der übrigen Bestimmungen unberührt.
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
