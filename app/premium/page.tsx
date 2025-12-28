import StaticPageRenderer from '../components/StaticPageRenderer';

export default function Premium() {
  return (
    <StaticPageRenderer
      pageId="premium"
      fallbackTitle="Where2Go Premium"
      fallbackContent={
        <>
          <h1 className="event-title" style={{ fontSize: '2rem', marginBottom: '2rem' }}>Where2Go Premium</h1>
          
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ marginBottom: '1rem', color: '#404040' }}>Entdecke Events wie nie zuvor</h3>
            <p style={{ marginBottom: '1rem', lineHeight: '1.6' }}>
              Mit Where2Go Premium erhältst du Zugang zu exklusiven Features.
            </p>
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ marginBottom: '1rem', color: '#404040' }}>Premium Features</h3>
            <ul style={{ paddingLeft: '1.5rem', marginBottom: '1rem', lineHeight: '1.8' }}>
              <li><strong>🎯 Priority Access:</strong> Erster Zugang zu limitierten Events</li>
              <li><strong>📧 Smart Notifications:</strong> Personalisierte Event-Empfehlungen</li>
              <li><strong>💰 Exclusive Discounts:</strong> Spezielle Preisnachlässe</li>
              <li><strong>🔍 Advanced Search:</strong> Erweiterte Suchfilter</li>
            </ul>
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ marginBottom: '1rem', color: '#404040' }}>Preise</h3>
            <p><strong>Premium Monthly:</strong> €9.99/Monat</p>
            <p><strong>Premium Yearly:</strong> €99.99/Jahr (2 Monate gratis!)</p>
          </div>
        </>
      }
    />
  );
}
