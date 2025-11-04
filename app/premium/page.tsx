import StaticPageTemplate from '@/components/StaticPageTemplate';

export default function Premium() {
  const defaultContent = `
    <div>
      <h2>Premium Features</h2>
      
      <p style="margin-bottom: 2rem; line-height: 1.6; font-size: 1.1rem;">
        Entdecken Sie unsere Premium-Features für noch bessere Event-Empfehlungen.
      </p>
      
      <div style="display: grid; gap: 2rem; margin: 2rem 0;">
        <div style="background: #f8f9fa; padding: 2rem; border-radius: 8px; border-left: 4px solid #007bff;">
          <h3 style="margin: 0 0 1rem; color: #007bff;">🎯 Personalisierte Empfehlungen</h3>
          <p style="line-height: 1.6;">
            Erhalten Sie Event-Empfehlungen basierend auf Ihren Vorlieben und Ihrem Veranstaltungshistorie.
          </p>
        </div>
        
        <div style="background: #f8f9fa; padding: 2rem; border-radius: 8px; border-left: 4px solid #28a745;">
          <h3 style="margin: 0 0 1rem; color: #28a745;">⚡ Frühzeitige Benachrichtigungen</h3>
          <p style="line-height: 1.6;">
            Seien Sie die Ersten, die über neue Events in Ihren Lieblingskategorien erfahren.
          </p>
        </div>
        
        <div style="background: #f8f9fa; padding: 2rem; border-radius: 8px; border-left: 4px solid #ffc107;">
          <h3 style="margin: 0 0 1rem; color: #e67e22;">🔍 Erweiterte Suchfilter</h3>
          <p style="line-height: 1.6;">
            Nutzen Sie erweiterte Filter für Preisbereich, Veranstaltungsort, Kapazität und mehr.
          </p>
        </div>
        
        <div style="background: #f8f9fa; padding: 2rem; border-radius: 8px; border-left: 4px solid #e74c3c;">
          <h3 style="margin: 0 0 1rem; color: #e74c3c;">📅 Kalender-Integration</h3>
          <p style="line-height: 1.6;">
            Synchronisieren Sie interessante Events direkt mit Ihrem persönlichen Kalender.
          </p>
        </div>
      </div>
      
      <div style="text-align: center; margin: 3rem 0;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 2rem; border-radius: 12px;">
          <h3 style="margin: 0 0 1rem;">Premium-Mitgliedschaft</h3>
          <p style="margin: 0 0 1.5rem; opacity: 0.9;">Alle Premium-Features für nur</p>
          <div style="font-size: 2.5rem; font-weight: bold; margin-bottom: 1rem;">€9,99<span style="font-size: 1rem; font-weight: normal;">/Monat</span></div>
          <a href="mailto:premium@where2go.at" style="background: rgba(255,255,255,0.2); color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; transition: all 0.3s;">
            Jetzt Premium werden
          </a>
        </div>
      </div>
    </div>
  `;

  return (
    <StaticPageTemplate
      pageId="premium"
      defaultTitle="Premium Features"
      defaultContent={defaultContent}
    />
  );
}
