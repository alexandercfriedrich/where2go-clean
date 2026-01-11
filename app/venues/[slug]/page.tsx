import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { EventCard } from '@/components/EventCard';
import { transformVenueEventToEventData } from '@/lib/utils';
import SchemaOrg from '@/components/SchemaOrg';
import { generateLocalBusinessSchema } from '@/lib/schemaOrg';

interface VenuePageProps {
  params: {
    slug: string;
  };
}

// Generate metadata for SEO
export async function generateMetadata({
  params,
}: VenuePageProps): Promise<Metadata> {
  try {
    // Type assertion needed: Supabase RPC functions are not in the generated types
    const { data } = await (supabase as any)
      .rpc('get_venue_with_events', { p_venue_slug: params.slug })
      .single();

    const venueData = data as any;
    if (!venueData || !venueData.venue) {
      return { title: 'Venue nicht gefunden | Where2Go Wien' };
    }

    const { venue, stats } = venueData;

    return {
      title: `${venue.name} - ${stats.upcoming_events || 0} Events | Where2Go Wien`,
      description: `${venue.name} in Wien: ${stats.upcoming_events || 0} kommende Events. ${venue.full_address}`,
      openGraph: {
        title: `${venue.name} - ${stats.upcoming_events || 0} Events`,
        description: `Entdecke alle Events bei ${venue.name} in Wien`,
      },
    };
  } catch (error) {
    console.error('Error generating metadata:', error);
    return { title: 'Venue | Where2Go Wien' };
  }
}

// Generate static params for top venues
export async function generateStaticParams() {
  try {
    // Use get_top_venues RPC to get venues sorted by event count
    const { data } = await (supabase as any)
      .rpc('get_top_venues', { p_city: 'Wien', p_limit: 30 });

    return (data as any)?.map((v: any) => ({ slug: v.venue_slug })) || [];
  } catch (error) {
    console.error('Error generating static params:', error);
    return [];
  }
}

export default async function VenuePage({ params }: VenuePageProps) {
  let venueData: any;

  try {
    // Type assertion needed: Supabase RPC functions are not in the generated types
    const { data, error } = await (supabase as any)
      .rpc('get_venue_with_events', {
        p_venue_slug: params.slug
      })
      .single();

    if (error) throw error;
    
    venueData = data as any;
    if (!venueData || !venueData.venue) return notFound();
  } catch (error) {
    console.error('Error fetching venue:', error);
    return notFound();
  }

  const { venue, stats, upcoming_events } = venueData;

  // Generate LocalBusiness Schema for venue
  const venueSchema = generateLocalBusinessSchema({
    name: venue.name,
    address: venue.full_address,
    latitude: venue.latitude,
    longitude: venue.longitude,
    url: venue.website,
    description: `${venue.name} in Wien - ${stats.upcoming_events || 0} kommende Events`
  });

  return (
    <>
      <SchemaOrg schema={venueSchema} />
      <div className="min-h-screen text-white" style={{ backgroundColor: '#091717' }}> {/* Offblack */}
      {/* Navigation */}
      <div className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Zurück zur Übersicht
          </Link>
        </div>
      </div>

      {/* Hero Section */}
      <div style={{ background: 'linear-gradient(to bottom, #13343B, #091717)' }}> {/* Teal Dark to Offblack */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">{venue.name}</h1>

          {/* Address */}
          <div className="flex items-center gap-2 text-gray-300 text-lg mb-4">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span>{venue.full_address}</span>
          </div>

          {/* Contact Info */}
          <div className="flex flex-wrap gap-6 text-sm">
            {venue.phone && (
              <a
                href={`tel:${venue.phone}`}
                className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
              >
                <span>📞</span>
                <span>{venue.phone}</span>
              </a>
            )}
            {venue.website && (
              <a
                href={venue.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
              >
                <span>🌐</span>
                <span>Website</span>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
              </a>
            )}
            {venue.email && (
              <a
                href={`mailto:${venue.email}`}
                className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
              >
                <span>✉️</span>
                <span>Email</span>
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          <StatCard value={stats.upcoming_events || 0} label="Kommende Events" />
          <StatCard value={stats.total_events || 0} label="Gesamt Events" />
          <StatCard value={stats.categories?.length || 0} label="Kategorien" />
          <StatCard value={stats.sources?.length || 0} label="Quellen" />
        </div>

        {/* Data Sources */}
        {stats.sources && Array.isArray(stats.sources) && stats.sources.length > 0 && (
          <div className="mb-12">
            <h2 className="text-xl font-bold mb-4">Datenquellen</h2>
            <div className="flex flex-wrap gap-3">
              {stats.sources.map((source: string) => (
                <span
                  key={source}
                  className="px-4 py-2 rounded-lg text-sm font-medium"
                  style={{
                    background: 'rgba(32, 184, 205, 0.2)',
                    color: '#20B8CD',
                  }}
                >
                  {source}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Categories */}
        {stats.categories && Array.isArray(stats.categories) && stats.categories.length > 0 && (
          <div className="mb-12">
            <h2 className="text-xl font-bold mb-4">Event-Kategorien</h2>
            <div className="flex flex-wrap gap-3">
              {stats.categories.map((cat: string) => (
                <span
                  key={cat}
                  className="px-4 py-2 rounded-lg text-sm"
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: 'rgba(255, 255, 255, 0.8)',
                  }}
                >
                  {cat}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Map */}
        {venue.latitude && venue.longitude && (
          <div className="mb-12">
            <h2 className="text-xl font-bold mb-4">Standort</h2>
            <div
              className="rounded-lg overflow-hidden"
              style={{
                height: '400px',
                background: 'rgba(255, 255, 255, 0.05)',
              }}
            >
              <iframe
                width="100%"
                height="100%"
                frameBorder="0"
                scrolling="no"
                marginHeight={0}
                marginWidth={0}
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${venue.longitude - 0.01},${venue.latitude - 0.01},${venue.longitude + 0.01},${venue.latitude + 0.01}&layer=mapnik&marker=${venue.latitude},${venue.longitude}`}
                style={{ border: 0 }}
              />
            </div>
            <div className="mt-2 text-sm text-gray-400">
              <a
                href={`https://www.openstreetmap.org/?mlat=${venue.latitude}&mlon=${venue.longitude}#map=15/${venue.latitude}/${venue.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors"
              >
                Größere Karte anzeigen
              </a>
            </div>
          </div>
        )}

        {/* Upcoming Events */}
        <div>
          <h2 className="text-2xl font-bold mb-6">
            Kommende Events ({upcoming_events?.length || 0})
          </h2>

          {upcoming_events && Array.isArray(upcoming_events) && upcoming_events.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {upcoming_events.map((event: any) => (
                <EventCard
                  key={event.id}
                  event={transformVenueEventToEventData(event, venue)}
                  city={venue.city}
                />
              ))}
            </div>
          ) : (
            <div
              className="text-center py-12 rounded-lg"
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              <p className="text-gray-400">Keine kommenden Events gefunden.</p>
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
}

function StatCard({ value, label }: { value: number; label: string }) {
  return (
    <div
      className="p-6 rounded-lg text-center"
      style={{
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
      }}
    >
      <div
        className="text-3xl md:text-4xl font-bold mb-2"
        style={{ color: '#20B8CD' }}
      >
        {value}
      </div>
      <div className="text-sm text-gray-400">{label}</div>
    </div>
  );
}
