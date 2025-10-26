import { notFound } from 'next/navigation';
import Link from 'next/link';
import { TLDRBox } from '@/components/TLDRBox';
import { FAQSection } from '@/components/FAQSection';
import { VenueCard } from '@/components/VenueCard';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { getGuideContent, getAllGuideSlugs } from '@/data/guideContent';

// Generate static params for all available guides
export async function generateStaticParams() {
  const slugs = getAllGuideSlugs();
  return slugs.map((slug) => {
    // Parse slug format: [category]-[city]
    // For "live-konzerte-wien", we return slug as is
    return { slug };
  });
}

// Generate metadata for the guide page
export async function generateMetadata({ params }: { params: { slug: string } }) {
  const guide = getGuideContent(params.slug);
  
  if (!guide) {
    return {
      title: 'Guide nicht gefunden | Where2Go',
      description: 'Der gewünschte Guide konnte nicht gefunden werden.',
    };
  }

  const url = `https://www.where2go.at/guide/${params.slug}`;

  return {
    title: guide.title,
    description: guide.description,
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      url,
      siteName: 'Where2Go',
      title: guide.title,
      description: guide.description,
    },
  };
}

export default async function GuidePage({ params }: { params: { slug: string } }) {
  const guide = getGuideContent(params.slug);

  if (!guide) {
    notFound();
  }

  const breadcrumbItems = [
    { label: 'Guides', href: '/guides' },
    { label: guide.category, href: `/guide/${params.slug}` },
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

        {/* Hero Section */}
        <header style={{ marginBottom: '48px' }}>
          <h1
            style={{
              fontSize: '42px',
              fontWeight: 700,
              color: '#FFFFFF',
              marginBottom: '20px',
              lineHeight: '1.2',
            }}
          >
            {guide.title}
          </h1>
          <p
            style={{
              fontSize: '18px',
              lineHeight: '1.8',
              color: 'rgba(255, 255, 255, 0.85)',
              maxWidth: '800px',
            }}
          >
            {guide.heroText}
          </p>
        </header>

        {/* TL;DR Box */}
        <TLDRBox items={guide.tldrItems} />

        {/* Main Content Sections */}
        {guide.sections.map((section, idx) => (
          <section key={idx} style={{ marginTop: '48px', marginBottom: '48px' }}>
            <h2
              style={{
                fontSize: '32px',
                fontWeight: 700,
                color: '#FFFFFF',
                marginBottom: '20px',
              }}
            >
              {section.title}
            </h2>
            <p
              style={{
                fontSize: '16px',
                lineHeight: '1.8',
                color: 'rgba(255, 255, 255, 0.85)',
              }}
            >
              {section.content}
            </p>
          </section>
        ))}

        {/* Venue Deep Dive Section */}
        {guide.venues.length > 0 && (
          <section style={{ marginTop: '48px', marginBottom: '48px' }}>
            <h2
              style={{
                fontSize: '32px',
                fontWeight: 700,
                color: '#FFFFFF',
                marginBottom: '24px',
              }}
            >
              Die besten Locations im Detail
            </h2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: '24px',
              }}
            >
              {guide.venues.map((venue, idx) => (
                <VenueCard
                  key={idx}
                  name={venue.name}
                  description={venue.description}
                  address={venue.address}
                  priceRange={venue.priceRange}
                  insiderTip={venue.insiderTip}
                />
              ))}
            </div>
          </section>
        )}

        {/* FAQ Section */}
        <FAQSection faqs={guide.faqs} title="Häufig gestellte Fragen" />

        {/* Call-to-Action */}
        <div
          style={{
            marginTop: '64px',
            padding: '32px',
            background: 'linear-gradient(135deg, #FF6B35 0%, #E85D2B 100%)',
            borderRadius: '16px',
            textAlign: 'center',
          }}
        >
          <h2
            style={{
              fontSize: '28px',
              fontWeight: 700,
              color: '#FFFFFF',
              marginBottom: '16px',
            }}
          >
            {guide.ctaText}
          </h2>
          <Link
            href={guide.ctaLink}
            style={{
              display: 'inline-block',
              padding: '14px 32px',
              background: '#FFFFFF',
              color: '#E85D2B',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: 700,
              fontSize: '16px',
              transition: 'transform 0.2s ease',
            }}
          >
            Zu den aktuellen Events →
          </Link>
        </div>
      </div>
    </div>
  );
}
