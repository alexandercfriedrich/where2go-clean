import StaticPageTemplate from '@/components/StaticPageTemplate';

export default function Datenschutz() {
  const defaultContent = `
    <div>
      <h3 style="margin-bottom: 1rem; color: #404040;">1. Datenschutz auf einen Blick</h3>
      <h4 style="margin-bottom: 0.5rem; font-size: 1rem;">Allgemeine Hinweise</h4>
      <p style="margin-bottom: 1rem; line-height: 1.6;">
        Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren personenbezogenen Daten passiert, wenn Sie unsere Website besuchen. Personenbezogene Daten sind alle Daten, mit denen Sie persönlich identifiziert werden können.
      </p>
      
      <h3 style="margin: 2rem 0 1rem; color: #404040;">2. Allgemeine Hinweise und Pflichtinformationen</h3>
      <h4 style="margin-bottom: 0.5rem; font-size: 1rem;">Datenschutz</h4>
      <p style="margin-bottom: 1rem; line-height: 1.6;">
        Die Betreiber dieser Seiten nehmen den Schutz Ihrer persönlichen Daten sehr ernst. Wir behandeln Ihre personenbezogenen Daten vertraulich und entsprechend der gesetzlichen Datenschutzvorschriften sowie dieser Datenschutzerklärung.
      </p>
      
      <h4 style="margin-bottom: 0.5rem; font-size: 1rem;">Hinweis zur verantwortlichen Stelle</h4>
      <p style="margin-bottom: 1rem; line-height: 1.6;">
        Die verantwortliche Stelle für die Datenverarbeitung auf dieser Website ist:
      </p>
      <p style="margin-bottom: 0.5rem;"><strong>Where2Go</strong></p>
      <p style="margin-bottom: 0.5rem;">Musterstraße 1</p>
      <p style="margin-bottom: 0.5rem;">12345 Musterstadt</p>
      <p style="margin-bottom: 1rem;">E-Mail: datenschutz@where2go.at</p>
      
      <h3 style="margin: 2rem 0 1rem; color: #404040;">3. Datenerfassung auf unserer Website</h3>
      <h4 style="margin-bottom: 0.5rem; font-size: 1rem;">Server-Log-Dateien</h4>
      <p style="margin-bottom: 1rem; line-height: 1.6;">
        Der Provider der Seiten erhebt und speichert automatisch Informationen in so genannten Server-Log-Dateien, die Ihr Browser automatisch an uns übermittelt.
      </p>
      
      <h4 style="margin-bottom: 0.5rem; font-size: 1rem;">Cookies</h4>
      <p style="margin-bottom: 1rem; line-height: 1.6;">
        Die Internetseiten verwenden teilweise so genannte Cookies. Cookies richten auf Ihrem Rechner keinen Schaden an und enthalten keine Viren.
      </p>
      
      <h3 style="margin: 2rem 0 1rem; color: #404040;">4. Ihre Rechte</h3>
      <p style="margin-bottom: 1rem; line-height: 1.6;">
        Sie haben jederzeit das Recht unentgeltlich Auskunft über Herkunft, Empfänger und Zweck Ihrer gespeicherten personenbezogenen Daten zu erhalten.
      </p>
    </div>
  `;

  return (
    <StaticPageTemplate
      pageId="datenschutz"
      defaultTitle="Datenschutzerklärung"
      defaultContent={defaultContent}
    />
  );
}
