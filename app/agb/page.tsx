import StaticPageRenderer from '../components/StaticPageRenderer';

export default function AGB() {
  return (
    <StaticPageRenderer
      pageId="agb"
      fallbackTitle="Allgemeine Geschäftsbedingungen"
      fallbackContent={
        <>
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
        </>
      }
    />
  );
}
