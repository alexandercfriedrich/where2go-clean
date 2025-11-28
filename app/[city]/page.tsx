import Link from 'next/link';
import SchemaOrg from '@/components/SchemaOrg';
import Breadcrumb from '@/components/Breadcrumb';
import { TLDRBox } from '@/components/TLDRBox';
import { FAQSection } from '@/components/FAQSection';
import { SectionHeader } from '@/components/discovery/SectionHeader';
import { CategoryBrowser } from '@/components/discovery/CategoryBrowser';
import { EventCard } from '@/components/EventCard';
import { generateEventListSchema } from '@/lib/schemaOrg';
import { resolveCityFromParam, dateTokenToISO, formatGermanDate } from '@/lib/city';
import { EventRepository } from '@/lib/repositories/EventRepository';
import { normalizeCategory, EVENT_CATEGORY_SUBCATEGORIES } from '@/lib/eventCategories';
import { generateCitySEO } from '@/lib/seoContent';
import { getCityContent } from '@/data/cityContent';
import type { EventData } from '@/lib/types';

// Mark as dynamic for fresh data on each request
export const dynamic = 'force-dynamic';

/**
 * Fetch events directly from Supabase (single source of truth)
 * This replaces the previous Upstash cache-based approach for better consistency
 */
async function fetchEvents(city: string, dateISO: string, category: string | null = null): Promise<EventData[]> {
  try {
    console.log(`[fetchEvents] Supabase direct: city=${city}, date=${dateISO}, category=${category}`);
    
    // Parse requested categories
    const requestedCategories = category
      ? Array.from(new Set(
          category.split(',')
            .map(c => c.trim())
            .filter(Boolean)
            .map(c => normalizeCategory(c))
        ))
      : null;

    // Fetch events directly from Supabase
    // If category is specified, fetch only that category; otherwise fetch all
    const singleCategory = requestedCategories && requestedCategories.length === 1 
      ? requestedCategories[0] 
      : undefined;

    const allEvents = await EventRepository.getEvents({
      city,
      date: dateISO,
      category: singleCategory,
      limit: 500 // Reasonable limit for a day's events
    });

    // Filter by multiple requested categories if more than one
    let filteredEvents = allEvents;
    if (requestedCategories && requestedCategories.length > 1) {
      filteredEvents = allEvents.filter(event => {
        if (!event.category) return false;
        const normalizedEventCategory = normalizeCategory(event.category);
        return requestedCategories.includes(normalizedEventCategory);
      });
    }

    console.log(`[fetchEvents] Events count: ${filteredEvents.length}`);
    
    return filteredEvents;
  } catch (error) {
    console.error(`[fetchEvents] Exception:`, error);
    return [];
  }
}

/**
 * Convert EventData to the format expected by Discovery EventCard
 * Note: slug is now included from the database to ensure proper event linking
 */
function toDiscoveryEvent(ev: EventData, index: number) {
  return {
    id: `${ev.title}-${ev.venue}-${ev.date}-${index}`,
    title: ev.title,
    category: ev.category,
    date: ev.date,
    time: ev.time,
    venue: ev.venue,
    address: ev.address,
    description: ev.description,
    price: ev.price,
    imageUrl: ev.imageUrl,
    source: ev.source,
    website: ev.website,
    bookingLink: ev.bookingLink,
    custom_venue_name: ev.venue,
    slug: ev.slug // Include slug from database for proper event linking
  };
}

export default async function CityPage({ params }: { params: { city: string } }) {
  // Disable strict mode by default - allow any city name (filtered by middleware)
  const strictMode = process.env.CITY_STRICT_MODE === 'true'; // Default to non-strict
  const resolved = await resolveCityFromParam(params.city, strictMode);
  if (!resolved) {
    return <div style={{ padding: 24 }}>Unbekannte Stadt.</div>;
  }

  const dateISO = dateTokenToISO('heute');
  const events = await fetchEvents(resolved.name, dateISO);
  const listSchema = generateEventListSchema(events, resolved.name, dateISO, 'https://www.where2go.at');
  const seoContent = generateCitySEO(resolved.name);
  const cityContent = getCityContent(resolved.name);

  const breadcrumbItems = [
    { label: resolved.name, href: `/${resolved.slug}` }
  ];

  // Convert events to discovery format
  const discoveryEvents = events.map((ev, i) => toDiscoveryEvent(ev, i));

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <SchemaOrg schema={listSchema} />
      
      {/* Hero Section - Discovery Style */}
      <div className="bg-[#1a2332] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
          <Breadcrumb items={breadcrumbItems} />
          <h1 className="text-3xl md:text-5xl font-bold mb-4 mt-4">
            Events in {resolved.name}
          </h1>
          <p className="text-lg md:text-xl text-gray-300 mb-6">
            {formatGermanDate(dateISO)} • {events.length} Events gefunden
          </p>
          
          {/* Time Period Navigation */}
          <nav className="flex flex-wrap gap-3" aria-label="Zeitraum">
            <Link 
              href={`/${resolved.slug}/heute`} 
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold text-sm transition-colors"
            >
              Heute
            </Link>
            <Link 
              href={`/${resolved.slug}/morgen`}
              className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-lg font-semibold text-sm transition-colors"
            >
              Morgen
            </Link>
            <Link 
              href={`/${resolved.slug}/wochenende`}
              className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-lg font-semibold text-sm transition-colors"
            >
              Wochenende
            </Link>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Category Browser */}
        <section className="mb-12" aria-label="Browse events by category">
          <SectionHeader
            title="Nach Kategorie filtern"
            subtitle="Finde Events die zu deinen Interessen passen"
          />
          <div className="mt-4 flex flex-wrap gap-3">
            {/* All Events Button */}
            <Link
              href={`/${resolved.slug}/heute`}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium text-sm hover:bg-indigo-700 transition-colors flex items-center gap-2"
            >
              Alle Events
              <span className="text-xs opacity-80">({events.length})</span>
            </Link>
            
            {/* Category Buttons */}
            {Object.keys(EVENT_CATEGORY_SUBCATEGORIES).map(cat => {
              const catSlug = cat.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/\//g, '-').replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
              const count = events.filter(e => normalizeCategory(e.category) === cat).length;
              const isDisabled = count === 0;
              
              return (
                <Link
                  key={cat}
                  href={isDisabled ? '#' : `/${resolved.slug}/${catSlug}/heute`}
                  className={`px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors ${
                    isDisabled 
                      ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed pointer-events-none' 
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600'
                  }`}
                >
                  {cat}
                  <span className="text-xs opacity-70">({count})</span>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Events Grid - Discovery Style */}
        {discoveryEvents.length > 0 ? (
          <section className="mb-16" aria-label="Event listings">
            <SectionHeader
              title={`Events heute in ${resolved.name}`}
              subtitle={`${events.length} Veranstaltungen gefunden`}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-6">
              {discoveryEvents.map((event) => (
                <EventCard key={event.id} event={event} city={resolved.name} />
              ))}
            </div>
          </section>
        ) : (
          <div className="text-center py-16">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Keine Events gefunden
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Für heute sind keine Events in {resolved.name} verfügbar. Schau morgen wieder vorbei!
            </p>
          </div>
        )}

        {/* City Content Section */}
        <div className="mt-12 mb-12 bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Was macht {resolved.name} besonders für Events?
          </h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-8">
            {cityContent.intro}
          </p>

          <TLDRBox
            title={`${resolved.name} Event-Highlights`}
            items={cityContent.highlights}
          />
        </div>

        {/* FAQ Section */}
        <div className="max-w-4xl mx-auto">
          <FAQSection 
            faqs={cityContent.faqs} 
            title={`Häufige Fragen zu Events in ${resolved.name}`}
          />
        </div>

        {/* SEO Content Section */}
        <div className="mt-12 bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{seoContent.title}</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">{seoContent.description}</p>

          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Warum {resolved.name}?</h3>
          <p className="text-gray-600 dark:text-gray-300 mb-6">{seoContent.whyVisit}</p>

          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Beliebte Event-Kategorien</h3>
          <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 mb-6 space-y-1">
            {seoContent.popularCategories.map((cat, i) => (
              <li key={i}>{cat}</li>
            ))}
          </ul>

          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Häufig gestellte Fragen</h3>
          <div className="space-y-4">
            {seoContent.faq.map((item, i) => (
              <div key={i} className="border-b border-gray-200 dark:border-gray-700 pb-4" itemScope itemType="https://schema.org/Question">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2" itemProp="name">{item.question}</h4>
                <div itemScope itemType="https://schema.org/Answer" itemProp="acceptedAnswer">
                  <p className="text-gray-600 dark:text-gray-300" itemProp="text">{item.answer}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
