import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { generateEventSchema, generateBreadcrumbSchema } from '@/lib/schemaOrg';
import SchemaOrg from '@/components/SchemaOrg';
import type { Database } from '@/lib/supabase/types';

type DbEvent = Database['public']['Tables']['events']['Row'];

interface EventPageProps {
  params: {
    city: string;
    slug: string;
  };
}

// SEO Metadata Generation
export async function generateMetadata({ params }: EventPageProps): Promise<Metadata> {
  try {
    // Fetch event from database by slug
    const { data: event, error } = await supabase
      .from('events')
      .select('*')
      .eq('slug', params.slug)
      .single();

    if (error || !event) {
      return {
        title: 'Event nicht gefunden | Where2Go',
        description: 'Das gesuchte Event konnte nicht gefunden werden.'
      };
    }

    const dbEvent = event as DbEvent;
    const eventDate = new Date(dbEvent.start_date_time).toLocaleDateString('de-AT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    const venue = dbEvent.custom_venue_name || 'Veranstaltungsort';
    const price = dbEvent.is_free ? 'Gratis' : (dbEvent.price_info || 'Preis auf Anfrage');

    return {
      title: `${dbEvent.title} - ${venue} | Where2Go`,
      description: dbEvent.short_description || dbEvent.description || `${dbEvent.title} am ${eventDate} in ${dbEvent.city}. ${price}`,
      openGraph: {
        title: dbEvent.title,
        description: dbEvent.short_description || dbEvent.description || `${dbEvent.title} am ${eventDate}`,
        type: 'website',
        locale: 'de_AT',
        siteName: 'Where2Go',
        images: dbEvent.image_urls && dbEvent.image_urls.length > 0 ? [
          {
            url: dbEvent.image_urls[0],
            alt: dbEvent.title
          }
        ] : []
      },
      alternates: {
        canonical: `https://www.where2go.at/events/${params.city}/${params.slug}`
      }
    };
  } catch (error) {
    console.error('Error generating metadata:', error);
    return {
      title: 'Event | Where2Go',
      description: 'Entdecke Events in deiner Stadt'
    };
  }
}

// Generate static params for top events (optional - can be removed for fully dynamic)
export async function generateStaticParams() {
  try {
    // Pre-render only upcoming featured events for faster initial load
    const { data: events } = await supabase
      .from('events')
      .select('slug, city')
      .gte('start_date_time', new Date().toISOString())
      .eq('is_featured', true)
      .limit(50);

    if (!events) return [];

    return events.map((event: { city: string; slug: string | null }) => ({
      city: event.city.toLowerCase(),
      slug: event.slug || ''
    }));
  } catch (error) {
    console.error('Error generating static params:', error);
    return [];
  }
}

// Transform database event to EventData format
function transformToEventData(dbEvent: DbEvent) {
  const startDate = new Date(dbEvent.start_date_time);
  const endDate = dbEvent.end_date_time ? new Date(dbEvent.end_date_time) : null;

  return {
    title: dbEvent.title,
    category: dbEvent.category,
    date: startDate.toISOString().split('T')[0], // YYYY-MM-DD
    time: startDate.toTimeString().slice(0, 5), // HH:mm
    venue: dbEvent.custom_venue_name || 'Veranstaltungsort',
    price: dbEvent.price_info || (dbEvent.is_free ? 'Gratis' : ''),
    website: dbEvent.website_url || '',
    endTime: endDate ? endDate.toTimeString().slice(0, 5) : undefined,
    address: dbEvent.custom_venue_address || undefined,
    description: dbEvent.description || undefined,
    bookingLink: dbEvent.booking_url || dbEvent.ticket_url || undefined,
    city: dbEvent.city,
    source: dbEvent.source,
    imageUrl: dbEvent.image_urls && dbEvent.image_urls.length > 0 ? dbEvent.image_urls[0] : undefined,
    latitude: dbEvent.latitude ? Number(dbEvent.latitude) : undefined,
    longitude: dbEvent.longitude ? Number(dbEvent.longitude) : undefined,
  };
}

export default async function EventDetailPage({ params }: EventPageProps) {
  const baseUrl = 'https://www.where2go.at';

  // Fetch event from database by slug
  const { data: event, error } = await supabase
    .from('events')
    .select('*')
    .eq('slug', params.slug)
    .single();

  if (error || !event) {
    console.error('[EventDetailPage] Event not found:', params.slug, error);
    notFound();
  }

  const dbEvent = event as DbEvent;

  // Transform to EventData format for schema generation
  const eventData = transformToEventData(dbEvent);

  // Generate Schema.org structured data
  const eventSchema = generateEventSchema(eventData, baseUrl);
  const breadcrumbs = [
    { name: 'Home', url: '/' },
    { name: dbEvent.city, url: `/${params.city}` },
    { name: dbEvent.title, url: `/events/${params.city}/${params.slug}` }
  ];
  const breadcrumbSchema = generateBreadcrumbSchema(breadcrumbs, baseUrl);

  const startDate = new Date(dbEvent.start_date_time);
  const endDate = dbEvent.end_date_time ? new Date(dbEvent.end_date_time) : null;

  const formattedDate = startDate.toLocaleDateString('de-AT', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  const formattedTime = startDate.toLocaleTimeString('de-AT', {
    hour: '2-digit',
    minute: '2-digit'
  });

  const formattedEndTime = endDate ? endDate.toLocaleTimeString('de-AT', {
    hour: '2-digit',
    minute: '2-digit'
  }) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Schema.org structured data */}
      <SchemaOrg schema={eventSchema} />
      <SchemaOrg schema={breadcrumbSchema} />

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Breadcrumb Navigation */}
        <nav className="mb-6 text-sm">
          <ol className="flex items-center space-x-2 text-gray-400">
            <li>
              <Link href="/" className="hover:text-white transition-colors">
                Home
              </Link>
            </li>
            <li>/</li>
            <li>
              <Link href={`/${params.city}`} className="hover:text-white transition-colors">
                {dbEvent.city}
              </Link>
            </li>
            <li>/</li>
            <li className="text-gray-500">{dbEvent.title}</li>
          </ol>
        </nav>

        {/* Hero Section with Image */}
        {dbEvent.image_urls && dbEvent.image_urls.length > 0 && (
          <div className="mb-8 rounded-lg overflow-hidden">
            <img
              src={dbEvent.image_urls[0]}
              alt={dbEvent.title}
              className="w-full h-64 md:h-96 object-cover"
            />
          </div>
        )}

        {/* Event Header */}
        <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                {dbEvent.title}
              </h1>
              {dbEvent.subcategory && (
                <p className="text-gray-400 mb-2">{dbEvent.subcategory}</p>
              )}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-block px-3 py-1 bg-orange-500/20 text-orange-400 rounded-full text-sm">
                  {dbEvent.category}
                </span>
                {dbEvent.is_featured && (
                  <span className="inline-block px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-sm">
                    ⭐ Featured
                  </span>
                )}
                {dbEvent.is_free && (
                  <span className="inline-block px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm">
                    Gratis
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Event Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            {/* Date & Time */}
            <div className="bg-white/5 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-400 mb-2">📅 Datum & Uhrzeit</h3>
              <p className="text-white">{formattedDate}</p>
              <p className="text-gray-300">
                {formattedTime}
                {formattedEndTime && ` - ${formattedEndTime}`}
              </p>
            </div>

            {/* Venue */}
            <div className="bg-white/5 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-400 mb-2">📍 Veranstaltungsort</h3>
              <p className="text-white">{dbEvent.custom_venue_name || 'Veranstaltungsort'}</p>
              {dbEvent.custom_venue_address && (
                <p className="text-gray-300 text-sm">{dbEvent.custom_venue_address}</p>
              )}
            </div>

            {/* Price */}
            {(dbEvent.price_info || dbEvent.is_free) && (
              <div className="bg-white/5 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-400 mb-2">💰 Preis</h3>
                <p className="text-white">
                  {dbEvent.is_free ? 'Gratis' : dbEvent.price_info}
                </p>
              </div>
            )}

            {/* Category & Tags */}
            <div className="bg-white/5 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-400 mb-2">🏷️ Kategorie</h3>
              <p className="text-white">{dbEvent.category}</p>
              {dbEvent.tags && dbEvent.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {dbEvent.tags.map((tag: string, idx: number) => (
                    <span key={idx} className="text-xs px-2 py-1 bg-white/10 rounded text-gray-300">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Description */}
        {(dbEvent.description || dbEvent.short_description) && (
          <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6 mb-6">
            <h2 className="text-2xl font-bold text-white mb-4">Über das Event</h2>
            <div className="text-gray-300 whitespace-pre-line">
              {dbEvent.description || dbEvent.short_description}
            </div>
          </div>
        )}

        {/* Map (if coordinates available) */}
        {dbEvent.latitude && dbEvent.longitude && (
          <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6 mb-6">
            <h2 className="text-2xl font-bold text-white mb-4">Standort</h2>
            <div className="aspect-video rounded-lg overflow-hidden">
              <iframe
                width="100%"
                height="100%"
                frameBorder="0"
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${dbEvent.longitude - 0.01},${dbEvent.latitude - 0.01},${dbEvent.longitude + 0.01},${dbEvent.latitude + 0.01}&layer=mapnik&marker=${dbEvent.latitude},${dbEvent.longitude}`}
                style={{ border: 0 }}
              ></iframe>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4 mb-8">
          {dbEvent.website_url && (
            <a
              href={dbEvent.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors text-center"
            >
              🌐 Website besuchen
            </a>
          )}
          {(dbEvent.booking_url || dbEvent.ticket_url) && (
            <a
              href={(dbEvent.booking_url || dbEvent.ticket_url) || ''}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors text-center"
            >
              🎫 Tickets kaufen
            </a>
          )}
        </div>

        {/* Back Link */}
        <div className="text-center">
          <Link
            href={`/${params.city}`}
            className="inline-block text-gray-400 hover:text-white transition-colors"
          >
            ← Zurück zu allen Events in {dbEvent.city}
          </Link>
        </div>
      </div>
    </div>
  );
}
