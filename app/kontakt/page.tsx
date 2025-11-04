import StaticPageTemplate from '@/components/StaticPageTemplate';

export default function Kontakt() {
  const defaultContent = `
    <div>
      <h2>Kontakt</h2>
      
      <p style="margin-bottom: 2rem; line-height: 1.6; font-size: 1.1rem;">
        Haben Sie Fragen oder Anregungen? Kontaktieren Sie uns!
      </p>
      
      <div style="background: #f8f9fa; padding: 2rem; border-radius: 8px; margin-bottom: 2rem;">
        <h3 style="margin: 0 0 1rem; color: #404040;">Kontaktdaten</h3>
        <p style="margin-bottom: 0.5rem;"><strong>Where2Go</strong></p>
        <p style="margin-bottom: 0.5rem;">Musterstraße 1</p>
        <p style="margin-bottom: 0.5rem;">12345 Musterstadt</p>
        <p style="margin-bottom: 1rem;">Deutschland</p>
        
        <p style="margin-bottom: 0.5rem;"><strong>E-Mail:</strong> info@where2go.at</p>
        <p style="margin-bottom: 0.5rem;"><strong>Telefon:</strong> +49 (0) 123 456789</p>
      </div>
      
      <h3 style="margin: 2rem 0 1rem; color: #404040;">Support</h3>
      <p style="margin-bottom: 1rem; line-height: 1.6;">
        Bei technischen Problemen oder Fragen zur Nutzung unserer Plattform helfen wir Ihnen gerne weiter.
      </p>
      
      <h3 style="margin: 2rem 0 1rem; color: #404040;">Feedback</h3>
      <p style="margin-bottom: 1rem; line-height: 1.6;">
        Ihr Feedback ist uns wichtig! Teilen Sie uns mit, wie wir Where2Go noch besser machen können.
      </p>
    </div>
  `;

  return (
    <StaticPageTemplate
      pageId="kontakt"
      defaultTitle="Kontakt"
      defaultContent={defaultContent}
    />
  );
}
