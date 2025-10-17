import Link from 'next/link';
import SchemaOrg from '@/components/SchemaOrg';
import { generateEventListSchema, generateEventMicrodata, generateCanonicalUrl } from '@/lib/schemaOrg';
import { resolveCityFromParam, dateTokenToISO, formatGermanDate } from '@/lib/city';
import { getRevalidateFor } from '@/lib/isr';
import type { EventData } from '@/lib/types';

// Mark as dynamic since we use Redis for HotCities
export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function fetchEvents(city: string, dateISO: string, revalidate: number): Promise<EventData[]> {
  // For server-side rendering, use relative URL or construct based on runtime environment
  const baseUrl = process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}`
    : process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  
  const res = await fetch(
    `${baseUrl}/api/events/cache-day?city=${encodeURIComponent(city)}&date=${encodeURIComponent(dateISO)}`,
    { next: { revalidate } }
  );
  if (!res.ok) return [];
  const json = await res.json();
  return Array.isArray(json?.events) ? json.events : [];
}

export default async function CityPage({ params }: { params: { city: string } }) {
  const resolved = await resolveCityFromParam(params.city);
  if (!resolved) {
    return <div style={{ padding: 24 }}>Unbekannte Stadt.</div>;
  }

  const dateISO = dateTokenToISO('heute');
  const revalidate = await getRevalidateFor(resolved.name, 'heute');
  const events = await fetchEvents(resolved.name, dateISO, revalidate);
  const listSchema = generateEventListSchema(events, resolved.name, dateISO, 'https://www.where2go.at');

  return (
    <div className="container" style={{ padding: '24px 16px' }}>
      <SchemaOrg schema={listSchema} />

      <h1 className="text-3xl font-bold mb-6">Events in {resolved.name}</h1>

      <nav className="mb-6" aria-label="Zeitraum">
        <ul style={{ display: 'flex', gap: 12, listStyle: 'none', padding: 0, margin: 0 }}>
          <li><Link href={`/${resolved.slug}/heute`} className="btn-outline">Heute</Link></li>
          <li><Link href={`/${resolved.slug}/morgen`} className="btn-outline">Morgen</Link></li>
          <li><Link href={`/${resolved.slug}/wochenende`} className="btn-outline">Wochenende</Link></li>
        </ul>
      </nav>

      <p className="mb-4" style={{ color: '#555' }}>Auswahl für {formatGermanDate(dateISO)}</p>

      <div className="events-grid">
        {events.length === 0 && (
          <div className="col-span-full text-center py-10">
            <p className="text-gray-500">Für heute sind keine Events verfügbar.</p>
          </div>
        )}

        {events.map((ev, i) => {
          const key = `${ev.title}-${ev.venue}-${ev.date}-${i}`;
          const microdata = generateEventMicrodata(ev);
          const canonicalUrl = generateCanonicalUrl(ev, 'https://www.where2go.at');

          return (
            <div key={key} className="event-card" {...microdata}>
              <link itemProp="url" href={canonicalUrl} />
              <meta itemProp="eventStatus" content="https://schema.org/EventScheduled" />
              <meta itemProp="eventAttendanceMode" content="https://schema.org/OfflineEventAttendanceMode" />
              {ev.imageUrl && <meta itemProp="image" content={ev.imageUrl} />}

              <div className="event-card-body">
                <h3 className="event-card-title" itemProp="name">{ev.title}</h3>
                <div className="event-card-details">
                  <span className="event-card-date" itemProp="startDate" content={`${ev.date}T${(ev.time || '19:00')}:00`}>
                    {formatGermanDate(ev.date)}{ev.time ? `, ${ev.time} Uhr` : ''}
                  </span>
                  <span className="event-card-venue" itemProp="location" itemScope itemType="https://schema.org/Place">
                    <span itemProp="name">{ev.venue}</span>
                    {ev.address && (
                      <meta itemProp="address" content={ev.address} />
                    )}
                  </span>
                </div>
                {ev.price && <div className="event-card-price">{ev.price}</div>}
                {ev.description && <p className="event-card-desc" itemProp="description">{ev.description}</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
