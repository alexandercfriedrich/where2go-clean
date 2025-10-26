import { notFound } from 'next/navigation';
import Link from 'next/link';
import { TLDRBox } from '@/components/TLDRBox';
import { FAQSection } from '@/components/FAQSection';
import { VenueCard } from '@/components/VenueCard';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { EventCard } from '@/components/EventCard';
import { getGuideContentByCity, getAllGuides } from '@/data/guideContent';
import { loadHotCities } from '@/lib/hotCityStore';
import { getDayEvents } from '@/lib/dayCache';
import { normalizeCategory } from '@/lib/eventCategories';
import type { EventData, HotCityVenue } from '@/lib/types';

// ISR: Revalidate every hour
export const revalidate = 3600;

// Helper to format date in German
function formatEventDate(date: string): string {
  const d = new Date(date + 'T12:00:00');
  return d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });
}

// Helper to normalize city name from URL param
function normalizeCityParam(cityParam: string): string {
  return cityParam.toLowerCase().trim();
}

// Helper to get display name for city
function getCityDisplayName(cityParam: string): string {
  const normalized = normalizeCityParam(cityParam);
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

// Helper to map guide category to event categories
function mapGuideCategoryToEventCategories(categorySlug: string): string[] {
  const mapping: Record<string, string[]> = {
    'live-konzerte': ['Musik & Nachtleben', 'Konzerte'],
    'theater': ['Theater & Performance', 'Theater'],
    'festivals': ['Festivals', 'Outdoor & Natur'],
    // Add more mappings as needed
  };
  return mapping[categorySlug] || [categorySlug];
}

// Fetch Hot City venues filtered by category
async function getHotCityVenuesForCategory(
  city: string,
  categorySlug: string
): Promise<HotCityVenue[]> {
  try {
    const hotCities = await loadHotCities();
    const hotCity = hotCities.find(
      hc => hc.name.toLowerCase() === city.toLowerCase() && hc.isActive
    );
    
    if (!hotCity?.venues) {
      return [];
    }

    // Map guide category to event categories for filtering
    const eventCategories = mapGuideCategoryToEventCategories(categorySlug);
    const normalizedEventCategories = eventCategories.map(ec => normalizeCategory(ec));
    // Filter venues by category and active status
    return hotCity.venues.filter((venue: HotCityVenue) => 
      venue.isActive &&
      venue.categories && 
      venue.categories.some((cat: string) => 
        normalizedEventCategories.includes(normalizeCategory(cat))
      )
    );
  } catch (error) {
    console.error('[getHotCityVenuesForCategory] Error:', error);
    return [];
  }
}

// Fetch latest events for a specific venue
async function getVenueEvents(
  city: string, 
  venueName: string, 
  limit: number = 3
): Promise<EventData[]> {
  try {
    // Get today's date
    const today = new Date().toISOString().split('T')[0];
    
    // Fetch events from day cache
    const dayBucket = await getDayEvents(city, today);
    
    if (!dayBucket || !dayBucket.events) {
      return [];
    }

    // Filter events by venue name (case-insensitive partial match)
    const venueEvents = dayBucket.events
      .filter(event => 
        event.venue && 
        event.venue.toLowerCase().includes(venueName.toLowerCase())
      )
      .sort((a, b) => {
        // Sort by date and time
        const dateTimeA = `${a.date} ${a.time}`;
        const dateTimeB = `${b.date} ${b.time}`;
        return dateTimeA.localeCompare(dateTimeB);
      })
      .slice(0, limit);

    return venueEvents;
  } catch (error) {
    console.error('[getVenueEvents] Error:', error);
    return [];
  }
}

// Generate static params for all available city/category combinations
export async function generateStaticParams() {
  const allGuides = getAllGuides();
  
  return allGuides.map((guide) => {
    const citySlug = guide.city.toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-');
    
    return {
      city: citySlug,
      category: guide.categorySlug,
    };
  });
}

// Generate metadata for the guide page
export async function generateMetadata({ 
  params 
}: { 
  params: { city: string; category: string } 
}) {
  const cityName = normalizeCityParam(params.city);
  const guide = getGuideContentByCity(cityName, params.category);
  
  if (!guide) {
    return {
      title: 'Guide nicht gefunden | Where2Go',
      description: 'Der gewünschte Guide konnte nicht gefunden werden.',
    };
  }

  const url = `https://www.where2go.at/${params.city}/guides/${params.category}`;

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

export default async function GuidePage({ 
  params 
}: { 
  params: { city: string; category: string } 
}) {
  const cityName = normalizeCityParam(params.city);
  const guide = getGuideContentByCity(cityName, params.category);

  if (!guide) {
    notFound();
  }

  const cityDisplayName = getCityDisplayName(params.city);

  // Fetch Hot City venues for this category
  const hotCityVenues = await getHotCityVenuesForCategory(cityName, params.category);
  
  // Merge static guide venues with Hot City venues
  const allVenues = [
    ...guide.venues,
    ...hotCityVenues.map((v: HotCityVenue) => ({
      name: v.name,
      description: v.description || `${v.name} in ${cityDisplayName}`,
      address: v.address?.full || v.address?.street,
      priceRange: undefined, // Hot City venues don't have priceRange
      insiderTip: undefined, // Hot City venues don't have this field
    }))
  ];

  // Fetch events for each venue
  const venuesWithEvents = await Promise.all(
    allVenues.map(async (venue) => {
      const events = await getVenueEvents(cityName, venue.name, 3);
      return { ...venue, events };
    })
  );

  const breadcrumbItems = [
    { label: cityDisplayName, href: `/${params.city}` },
    { label: 'Guides', href: `/${params.city}/guides` },
    { label: guide.category, href: `/${params.city}/guides/${params.category}` },
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

        {/* Venue Deep Dive Section with Events */}
        {venuesWithEvents.length > 0 && (
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
              {venuesWithEvents.map((venue, idx) => (
                <div key={idx} style={{ 
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '16px',
                  padding: '32px',
                }}>
                  {/* Venue Info */}
                  <VenueCard
                    name={venue.name}
                    description={venue.description}
                    address={venue.address}
                    priceRange={venue.priceRange}
                    insiderTip={venue.insiderTip}
                  />
                  
                  {/* Events at this venue */}
                  {venue.events && venue.events.length > 0 && (
                    <div style={{ marginTop: '24px' }}>
                      <h3 style={{
                        fontSize: '20px',
                        fontWeight: 600,
                        color: '#FFFFFF',
                        marginBottom: '16px',
                      }}>
                        🎫 Aktuelle Events
                      </h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {venue.events.map((event, eventIdx) => (
                          <EventCard 
                            key={eventIdx}
                            event={event}
                            city={cityName}
                            formatEventDate={formatEventDate}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {venue.events && venue.events.length === 0 && (
                    <div style={{ 
                      marginTop: '24px',
                      padding: '16px',
                      background: 'rgba(255, 255, 255, 0.03)',
                      borderRadius: '8px',
                      color: 'rgba(255, 255, 255, 0.6)',
                      fontSize: '14px',
                    }}>
                      Aktuell keine Events für heute verfügbar. Schau später wieder vorbei!
                    </div>
                  )}
                </div>
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
