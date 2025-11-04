import StaticPageTemplate from '@/components/StaticPageTemplate';

export default function AGB() {
  const defaultContent = `
    <div>
      <h2>Allgemeine Geschäftsbedingungen</h2>
      
      <h3 style="margin: 2rem 0 1rem; color: #404040;">§ 1 Geltungsbereich</h3>
      <p style="margin-bottom: 1rem; line-height: 1.6;">
        Diese Allgemeinen Geschäftsbedingungen gelten für die Nutzung der Website www.where2go.at und der damit verbundenen Dienstleistungen.
      </p>
      
      <h3 style="margin: 2rem 0 1rem; color: #404040;">§ 2 Leistungen</h3>
      <p style="margin-bottom: 1rem; line-height: 1.6;">
        Where2Go ist eine Plattform zur Suche und Information über Events und Veranstaltungen in verschiedenen Städten.
      </p>
      
      <h3 style="margin: 2rem 0 1rem; color: #404040;">§ 3 Nutzung</h3>
      <p style="margin-bottom: 1rem; line-height: 1.6;">
        Die Nutzung unserer Plattform ist kostenlos. Premium-Features können kostenpflichtig sein.
      </p>
      
      <h3 style="margin: 2rem 0 1rem; color: #404040;">§ 4 Haftungsausschluss</h3>
      <p style="margin-bottom: 1rem; line-height: 1.6;">
        Where2Go übernimmt keine Gewähr für die Richtigkeit, Vollständigkeit und Aktualität der bereitgestellten Event-Informationen.
      </p>
    </div>
  `;

  return (
    <StaticPageTemplate
      pageId="agb"
      defaultTitle="Allgemeine Geschäftsbedingungen"
      defaultContent={defaultContent}
    />
  );
}
