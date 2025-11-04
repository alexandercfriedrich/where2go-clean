import StaticPageTemplate from '@/components/StaticPageTemplate';

export default function Impressum() {
  const defaultContent = `
    <div>
      <h3 style="margin-bottom: 1rem; color: #404040;">Angaben gemäß § 5 TMG</h3>
      <p><strong>Where2Go</strong></p>
      <p>Musterstraße 1</p>
      <p>12345 Musterstadt</p>
      <p>Deutschland</p>
      
      <h3 style="margin: 2rem 0 1rem; color: #404040;">Kontakt</h3>
      <p>Telefon: +49 (0) 123 456789</p>
      <p>E-Mail: kontakt@www.where2go.at</p>
      
      <h3 style="margin: 2rem 0 1rem; color: #404040;">Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV</h3>
      <p>Max Mustermann</p>
      <p>Musterstraße 1</p>
      <p>12345 Musterstadt</p>
      
      <h3 style="margin: 2rem 0 1rem; color: #404040;">Haftungsausschluss</h3>
      <h4 style="margin-bottom: 0.5rem; font-size: 1rem;">Haftung für Inhalte</h4>
      <p style="margin-bottom: 1rem; line-height: 1.6;">
        Als Diensteanbieter sind wir gemäß § 7 Abs.1 TMG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich.
      </p>
      
      <h4 style="margin-bottom: 0.5rem; font-size: 1rem;">Haftung für Links</h4>
      <p style="margin-bottom: 1rem; line-height: 1.6;">
        Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben.
      </p>
    </div>
  `;

  return (
    <StaticPageTemplate
      pageId="impressum"
      defaultTitle="Impressum"
      defaultContent={defaultContent}
    />
  );
}
