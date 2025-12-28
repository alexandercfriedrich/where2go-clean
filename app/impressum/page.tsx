import ThemeAwareStaticPage from '../components/ThemeAwareStaticPage';

export default function Impressum() {
  return (
    <ThemeAwareStaticPage
      pageId="impressum"
      fallbackTitle="Impressum"
      fallbackContent={
        <>
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ marginBottom: '1rem', fontSize: '1.5rem', fontWeight: '600' }}>Angaben gemäß § 5 TMG</h3>
            <p style={{ marginBottom: '0.5rem' }}><strong>Where2Go</strong></p>
            <p style={{ marginBottom: '0.5rem' }}>Musterstraße 1</p>
            <p style={{ marginBottom: '0.5rem' }}>12345 Musterstadt</p>
            <p style={{ marginBottom: '0.5rem' }}>Deutschland</p>
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ marginBottom: '1rem', fontSize: '1.5rem', fontWeight: '600' }}>Kontakt</h3>
            <p style={{ marginBottom: '0.5rem' }}>Telefon: +49 (0) 123 456789</p>
            <p style={{ marginBottom: '0.5rem' }}>E-Mail: kontakt@www.where2go.at</p>
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ marginBottom: '1rem', fontSize: '1.5rem', fontWeight: '600' }}>Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV</h3>
            <p style={{ marginBottom: '0.5rem' }}>Max Mustermann</p>
            <p style={{ marginBottom: '0.5rem' }}>Musterstraße 1</p>
            <p style={{ marginBottom: '0.5rem' }}>12345 Musterstadt</p>
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ marginBottom: '1rem', fontSize: '1.5rem', fontWeight: '600' }}>Haftungsausschluss</h3>
            <h4 style={{ marginBottom: '0.5rem', fontSize: '1.125rem', fontWeight: '500' }}>Haftung für Inhalte</h4>
            <p style={{ marginBottom: '1rem', lineHeight: '1.6' }}>
              Als Diensteanbieter sind wir gemäß § 7 Abs.1 TMG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir als Diensteanbieter jedoch nicht unter der Verpflichtung, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen.
            </p>
            
            <h4 style={{ marginBottom: '0.5rem', fontSize: '1.125rem', fontWeight: '500' }}>Haftung für Links</h4>
            <p style={{ marginBottom: '1rem', lineHeight: '1.6' }}>
              Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich.
            </p>
          </div>
        </>
      }
    />
  );
}