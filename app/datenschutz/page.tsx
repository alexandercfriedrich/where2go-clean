import StaticPageRenderer from '../components/StaticPageRenderer';

export default function Datenschutz() {
  return (
    <StaticPageRenderer
      pageId="datenschutz"
      fallbackTitle="Datenschutzerklärung"
      fallbackContent={
        <>
          <h1 className="event-title" style={{ fontSize: '2rem', marginBottom: '2rem' }}>Datenschutzerklärung</h1>
          
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ marginBottom: '1rem', color: '#404040' }}>1. Datenschutz auf einen Blick</h3>
            <h4 style={{ marginBottom: '0.5rem', fontSize: '1rem' }}>Allgemeine Hinweise</h4>
            <p style={{ marginBottom: '1rem', lineHeight: '1.6' }}>
              Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren personenbezogenen Daten passiert, wenn Sie unsere Website besuchen. Personenbezogene Daten sind alle Daten, mit denen Sie persönlich identifiziert werden können.
            </p>
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ marginBottom: '1rem', color: '#404040' }}>2. Allgemeine Hinweise und Pflichtinformationen</h3>
            <h4 style={{ marginBottom: '0.5rem', fontSize: '1rem' }}>Datenschutz</h4>
            <p style={{ marginBottom: '1rem', lineHeight: '1.6' }}>
              Die Betreiber dieser Seiten nehmen den Schutz Ihrer persönlichen Daten sehr ernst. Wir behandeln Ihre personenbezogenen Daten vertraulich und entsprechend der gesetzlichen Datenschutzvorschriften sowie dieser Datenschutzerklärung.
            </p>
            
            <h4 style={{ marginBottom: '0.5rem', fontSize: '1rem' }}>Hinweis zur verantwortlichen Stelle</h4>
            <p style={{ marginBottom: '1rem', lineHeight: '1.6' }}>
              Die verantwortliche Stelle für die Datenverarbeitung auf dieser Website ist:
            </p>
            <p style={{ marginBottom: '0.5rem' }}><strong>Where2Go</strong></p>
            <p style={{ marginBottom: '0.5rem' }}>Musterstraße 1</p>
            <p style={{ marginBottom: '0.5rem' }}>12345 Musterstadt</p>
            <p style={{ marginBottom: '1rem' }}>E-Mail: datenschutz@where2go.at</p>
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ marginBottom: '1rem', color: '#404040' }}>3. Datenerfassung auf unserer Website</h3>
            <h4 style={{ marginBottom: '0.5rem', fontSize: '1rem' }}>Server-Log-Dateien</h4>
            <p style={{ marginBottom: '1rem', lineHeight: '1.6' }}>
              Der Provider der Seiten erhebt und speichert automatisch Informationen in so genannten Server-Log-Dateien, die Ihr Browser automatisch an uns übermittelt. Dies sind: Browsertyp und Browserversion, verwendetes Betriebssystem, Referrer URL, Hostname des zugreifenden Rechners, Uhrzeit der Serveranfrage und IP-Adresse.
            </p>
            
            <h4 style={{ marginBottom: '0.5rem', fontSize: '1rem' }}>Cookies</h4>
            <p style={{ marginBottom: '1rem', lineHeight: '1.6' }}>
              Die Internetseiten verwenden teilweise so genannte Cookies. Cookies richten auf Ihrem Rechner keinen Schaden an und enthalten keine Viren. Cookies dienen dazu, unser Angebot nutzerfreundlicher, effektiver und sicherer zu machen.
            </p>
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ marginBottom: '1rem', color: '#404040' }}>4. Ihre Rechte</h3>
            <p style={{ marginBottom: '1rem', lineHeight: '1.6' }}>
              Sie haben jederzeit das Recht unentgeltlich Auskunft über Herkunft, Empfänger und Zweck Ihrer gespeicherten personenbezogenen Daten zu erhalten. Sie haben außerdem ein Recht, die Berichtigung, Sperrung oder Löschung dieser Daten zu verlangen.
            </p>
          </div>
        </>
      }
    />
  );
}