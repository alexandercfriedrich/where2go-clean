'use client';

export default function UeberUns() {
  return (
    <div className="container" style={{ minHeight: '100vh', padding: '2rem 0' }}>
      <div className="events-grid" style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div className="event-card">
          <div className="event-content">
            <h1 className="event-title" style={{ fontSize: '2rem', marginBottom: '2rem' }}>Über uns</h1>
            
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ marginBottom: '1rem', color: '#404040' }}>Where2Go - Alle Events. Weltweit. Eine Plattform.</h3>
              <p style={{ marginBottom: '1rem', lineHeight: '1.6' }}>
                Where2Go ist die intelligente Event-Suchplattform, die es dir ermöglicht, spannende Veranstaltungen in deiner Stadt und weltweit zu entdecken. Egal ob Konzerte, Clubs, kulturelle Events oder einzigartige Erlebnisse – wir bringen dich zu den besten Events.
              </p>
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ marginBottom: '1rem', color: '#404040' }}>Unsere Mission</h3>
              <p style={{ marginBottom: '1rem', lineHeight: '1.6' }}>
                Wir glauben, dass großartige Events das Leben bereichern und Menschen zusammenbringen. Unsere Mission ist es, diese Erlebnisse für jeden zugänglich zu machen, indem wir die umfassendste und benutzerfreundlichste Event-Plattform schaffen.
              </p>
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ marginBottom: '1rem', color: '#404040' }}>Was macht uns besonders?</h3>
              <div style={{ marginBottom: '1rem' }}>
                <h4 style={{ marginBottom: '0.5rem', fontSize: '1rem', color: '#525252' }}>🔍 KI-powered Search</h4>
                <p style={{ marginBottom: '1rem', lineHeight: '1.6', fontSize: '0.9rem' }}>
                  Unsere intelligente Suchfunktion durchforstet das gesamte Web nach Events und filtert die besten Veranstaltungen für dich heraus.
                </p>
              </div>
              
              <div style={{ marginBottom: '1rem' }}>
                <h4 style={{ marginBottom: '0.5rem', fontSize: '1rem', color: '#525252' }}>🌍 Globale Abdeckung</h4>
                <p style={{ marginBottom: '1rem', lineHeight: '1.6', fontSize: '0.9rem' }}>
                  Von Hotspots wie Wien, Berlin und Hamburg bis zu versteckten Perlen weltweit – wir finden Events überall.
                </p>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <h4 style={{ marginBottom: '0.5rem', fontSize: '1rem', color: '#525252' }}>⚡ Real-time Updates</h4>
                <p style={{ marginBottom: '1rem', lineHeight: '1.6', fontSize: '0.9rem' }}>
                  Unsere Plattform aktualisiert sich kontinuierlich und zeigt dir immer die neuesten Events und Verfügbarkeiten.
                </p>
              </div>
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ marginBottom: '1rem', color: '#404040' }}>Unser Team</h3>
              <p style={{ marginBottom: '1rem', lineHeight: '1.6' }}>
                Wir sind ein leidenschaftliches Team aus Entwicklern, Event-Enthusiasten und Kulturliebhabern, die sich der Vision verschrieben haben, Event-Discovery zu revolutionieren. Unser Ziel ist es, jedem Menschen dabei zu helfen, unvergessliche Erlebnisse zu finden.
              </p>
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ marginBottom: '1rem', color: '#404040' }}>Unsere Werte</h3>
              <ul style={{ paddingLeft: '1.5rem', marginBottom: '1rem', lineHeight: '1.8' }}>
                <li><strong>Zugänglichkeit:</strong> Events für jeden, überall verfügbar</li>
                <li><strong>Qualität:</strong> Nur die besten und verifizierten Veranstaltungen</li>
                <li><strong>Innovation:</strong> Ständige Weiterentwicklung unserer Technologie</li>
                <li><strong>Community:</strong> Menschen durch gemeinsame Erlebnisse verbinden</li>
              </ul>
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