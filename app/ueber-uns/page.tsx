import StaticPageRenderer from '../components/StaticPageRenderer';

export default function UeberUns() {
  return (
    <StaticPageRenderer
      pageId="ueber-uns"
      fallbackTitle="Über uns"
      fallbackContent={
        <>
          <h1 className="event-title" style={{ fontSize: '2rem', marginBottom: '2rem' }}>Über uns</h1>
          
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ marginBottom: '1rem', color: '#404040' }}>Where2Go - Alle Events. Weltweit. Eine Plattform.</h3>
            <p style={{ marginBottom: '1rem', lineHeight: '1.6' }}>
              Where2Go ist die intelligente Event-Suchplattform, die es dir ermöglicht, spannende Veranstaltungen in deiner Stadt und weltweit zu entdecken.
            </p>
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ marginBottom: '1rem', color: '#404040' }}>Unsere Mission</h3>
            <p style={{ marginBottom: '1rem', lineHeight: '1.6' }}>
              Wir glauben, dass großartige Events das Leben bereichern und Menschen zusammenbringen.
            </p>
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ marginBottom: '1rem', color: '#404040' }}>Was macht uns besonders?</h3>
            <ul style={{ paddingLeft: '1.5rem', marginBottom: '1rem', lineHeight: '1.8' }}>
              <li><strong>KI-powered Search:</strong> Intelligente Suchfunktion</li>
              <li><strong>Globale Abdeckung:</strong> Events überall finden</li>
              <li><strong>Real-time Updates:</strong> Immer aktuelle Informationen</li>
            </ul>
          </div>
        </>
      }
    />
  );
}
