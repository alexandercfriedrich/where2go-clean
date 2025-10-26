import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { getAllGuidesForCity } from '@/data/guideContent';

// ISR: Revalidate every hour
export const revalidate = 3600;

// Helper to normalize city name from URL param
function normalizeCityParam(cityParam: string): string {
  return cityParam.toLowerCase().trim();
}

// Helper to get display name for city
function getCityDisplayName(cityParam: string): string {
  const normalized = normalizeCityParam(cityParam);
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

// Generate metadata
export async function generateMetadata({ 
  params 
}: { 
  params: { city: string } 
}) {
  const cityDisplayName = getCityDisplayName(params.city);
  const url = `https://www.where2go.at/${params.city}/guides`;

  return {
    title: `Event-Guides für ${cityDisplayName} | Where2Go`,
    description: `Entdecke unsere detaillierten Event-Guides für ${cityDisplayName}. Von Live-Konzerten bis Festivals - dein kompletter Guide für unvergessliche Erlebnisse.`,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      url,
      siteName: 'Where2Go',
      title: `Event-Guides für ${cityDisplayName}`,
      description: `Entdecke unsere detaillierten Event-Guides für ${cityDisplayName}.`,
    },
  };
}

export default async function GuidesOverviewPage({ 
  params 
}: { 
  params: { city: string } 
}) {
  const cityName = normalizeCityParam(params.city);
  const cityDisplayName = getCityDisplayName(params.city);
  
  // Get all guides for this city
  const guides = getAllGuidesForCity(cityName);

  if (guides.length === 0) {
    notFound();
  }

  const breadcrumbItems = [
    { label: cityDisplayName, href: `/${params.city}` },
    { label: 'Guides', href: `/${params.city}/guides` },
  ];

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #1A1A1A 0%, #2A2A2A 100%)',
        minHeight: '100vh',
        padding: '24px 16px',
      }}
    >
      <div className="container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <Breadcrumbs items={breadcrumbItems} />

        {/* Header */}
        <header style={{ marginBottom: '48px', marginTop: '32px' }}>
          <h1
            style={{
              fontSize: '42px',
              fontWeight: 700,
              color: '#FFFFFF',
              marginBottom: '16px',
              lineHeight: '1.2',
            }}
          >
            Event-Guides für {cityDisplayName}
          </h1>
          <p
            style={{
              fontSize: '18px',
              lineHeight: '1.6',
              color: 'rgba(255, 255, 255, 0.8)',
              maxWidth: '800px',
            }}
          >
            Entdecke unsere detaillierten Guides zu den besten Events in {cityDisplayName}. 
            Von Insider-Tipps bis zu den Top-Locations - alles was du für unvergessliche 
            Erlebnisse brauchst.
          </p>
        </header>

        {/* Guides Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
            gap: '24px',
            marginBottom: '48px',
          }}
        >
          {guides.map((guide) => (
            <Link
              key={guide.slug}
              href={`/${params.city}/guides/${guide.categorySlug}`}
              style={{
                display: 'block',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '16px',
                padding: '32px',
                textDecoration: 'none',
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                e.currentTarget.style.borderColor = 'rgba(255, 107, 53, 0.5)';
                e.currentTarget.style.transform = 'translateY(-4px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <h2
                style={{
                  fontSize: '24px',
                  fontWeight: 700,
                  color: '#FFFFFF',
                  marginBottom: '12px',
                }}
              >
                {guide.category}
              </h2>
              
              <p
                style={{
                  fontSize: '16px',
                  lineHeight: '1.6',
                  color: 'rgba(255, 255, 255, 0.7)',
                  marginBottom: '20px',
                }}
              >
                {guide.description.slice(0, 150)}...
              </p>

              {/* TL;DR Preview */}
              {guide.tldrItems && guide.tldrItems.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#FF6B35',
                    marginBottom: '8px',
                  }}>
                    ⚡ Highlights:
                  </div>
                  <ul style={{
                    listStyle: 'none',
                    padding: 0,
                    margin: 0,
                  }}>
                    {guide.tldrItems.slice(0, 3).map((item, idx) => (
                      <li
                        key={idx}
                        style={{
                          fontSize: '13px',
                          color: 'rgba(255, 255, 255, 0.6)',
                          marginBottom: '4px',
                          paddingLeft: '16px',
                          position: 'relative',
                        }}
                      >
                        <span style={{
                          position: 'absolute',
                          left: 0,
                          color: '#FF6B35',
                        }}>•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  color: '#FF6B35',
                  fontSize: '14px',
                  fontWeight: 600,
                }}
              >
                Guide lesen
                <span style={{ marginLeft: '8px' }}>→</span>
              </div>
            </Link>
          ))}
        </div>

        {/* Back to City Link */}
        <div style={{ marginTop: '48px', textAlign: 'center' }}>
          <Link
            href={`/${params.city}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 24px',
              background: 'rgba(255, 255, 255, 0.1)',
              color: '#FFFFFF',
              borderRadius: '8px',
              textDecoration: 'none',
              fontSize: '16px',
              fontWeight: 600,
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
            }}
          >
            ← Zurück zu {cityDisplayName}
          </Link>
        </div>
      </div>
    </div>
  );
}
