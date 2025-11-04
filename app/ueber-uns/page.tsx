import StaticPageTemplate from '@/components/StaticPageTemplate';

export default function UeberUns() {
  const defaultContent = `
    <div>
      <h2>Über uns</h2>
      
      <p style="margin-bottom: 1.5rem; line-height: 1.6; font-size: 1.1rem;">
        Where2Go hilft dir dabei, die besten Events in deiner Stadt zu finden.
      </p>
      
      <h3 style="margin: 2rem 0 1rem; color: #404040;">Unsere Mission</h3>
      <p style="margin-bottom: 1rem; line-height: 1.6;">
        Wir möchten es dir so einfach wie möglich machen, spannende Events und Veranstaltungen in deiner Nähe zu entdecken. Egal ob Konzerte, Theater, Festivals oder Clubevents - bei uns findest du alles an einem Ort.
      </p>
      
      <h3 style="margin: 2rem 0 1rem; color: #404040;">Was wir bieten</h3>
      <ul style="margin-bottom: 1rem; line-height: 1.6; padding-left: 2rem;">
        <li style="margin-bottom: 0.5rem;">Umfassende Event-Suche für Wien und weitere Städte</li>
        <li style="margin-bottom: 0.5rem;">Kategoriefilter für verschiedene Event-Typen</li>
        <li style="margin-bottom: 0.5rem;">Aktuelle Informationen direkt von den Veranstaltern</li>
        <li style="margin-bottom: 0.5rem;">Benutzerfreundliche Suchfunktionen</li>
      </ul>
      
      <h3 style="margin: 2rem 0 1rem; color: #404040;">Kontakt</h3>
      <p style="margin-bottom: 1rem; line-height: 1.6;">
        Haben Sie Fragen oder Anregungen? Wir freuen uns über Ihr Feedback!
        <br><br>
        <strong>E-Mail:</strong> info@where2go.at
      </p>
    </div>
  `;

  return (
    <StaticPageTemplate
      pageId="ueber-uns"
      defaultTitle="Über uns"
      defaultContent={defaultContent}
    />
  );
}
