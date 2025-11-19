import Link from 'next/link';
import { generateEventMicrodata, generateCanonicalUrl } from '@/lib/schemaOrg';
import { generateEventSlug, normalizeCitySlug } from '@/lib/slugGenerator';
import { EVENT_CATEGORY_SUBCATEGORIES } from '@/lib/eventCategories';
import type { EventData } from '@/lib/types';

interface EventCardProps {
  event: EventData;
  city?: string;
  formatEventDate: (date: string) => string;
}

const ALL_SUPER_CATEGORIES = Object.keys(EVENT_CATEGORY_SUBCATEGORIES);

function formatEventDateTime(date: string, time: string, endTime?: string) {
  // Format time display
  const formattedTime = time && time !== '00:00' ? time : '';
  const formattedDate = date;
  
  return { date: formattedDate, time: formattedTime };
}

export function EventCard({ event: ev, city = 'wien', formatEventDate }: EventCardProps) {
  const superCat =
    ALL_SUPER_CATEGORIES.find(c => EVENT_CATEGORY_SUBCATEGORIES[c]?.includes(ev.category)) ||
    ev.category;

  const { date: formattedDate, time: formattedTime } =
    formatEventDateTime(ev.date, ev.time, ev.endTime);

  // Generate microdata attributes for Schema.org
  const microdataAttrs = generateEventMicrodata(ev);
  const canonicalUrl = generateCanonicalUrl(ev);
  
  const citySlug = normalizeCitySlug(city);
  const categorySlug = superCat.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/\//g, '-').replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
  
  // Event detail page URL: Use database slug if available, otherwise generate from event data
  const eventSlug = ev.slug || generateEventSlug({
    title: ev.title,
    venue: ev.venue,
    date: ev.date
  });
  const eventDetailUrl = ev.slug ? `/events/${citySlug}/${ev.slug}` : (ev.website || '#');
  const isInternalLink = !!ev.slug;

  return (
    <Link 
      href={eventDetailUrl}
      style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
    >
      <div 
        className={`event-card ${ev.imageUrl ? 'event-card-with-image' : ''}`}
        {...microdataAttrs}
        style={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '16px',
          transition: 'all 0.3s ease',
          cursor: 'pointer',
        }}
      >
        <link itemProp="url" href={canonicalUrl} />
      <meta itemProp="eventStatus" content="https://schema.org/EventScheduled" />
      <meta itemProp="eventAttendanceMode" content="https://schema.org/OfflineEventAttendanceMode" />
      
      {ev.imageUrl && (
        <>
          <meta itemProp="image" content={ev.imageUrl} />
          <div 
            className="event-card-image"
            style={{
              backgroundImage: `url(${ev.imageUrl})`,
              height: '200px',
              borderRadius: '8px',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              marginBottom: '16px',
            }}
          />
        </>
      )}
      
      <div className="event-content">
        {superCat && (
          <Link 
            href={`/${citySlug}/${categorySlug}/heute`}
            className="event-category-badge"
            style={{
              display: 'inline-block',
              padding: '4px 12px',
              background: 'rgba(255, 107, 53, 0.2)',
              color: '#FF6B35',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
              marginBottom: '12px',
              textDecoration: 'none',
            }}
          >
            {superCat}
          </Link>
        )}
        
        <h3 className="event-title" itemProp="name" style={{
          fontSize: '20px',
          fontWeight: 600,
          color: '#FFFFFF',
          marginBottom: '12px',
        }}>
          {ev.title}
        </h3>

        <div className="event-meta-line" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          color: 'rgba(255, 255, 255, 0.7)',
          fontSize: '14px',
          marginBottom: '8px',
        }}>
          <meta itemProp="startDate" content={`${ev.date}T${ev.time || '00:00'}:00`} />
          {ev.endTime && <meta itemProp="endDate" content={`${ev.date}T${ev.endTime}:00`} />}
          <svg width="16" height="16" strokeWidth={2} viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          <span className="event-date">{formatEventDate(ev.date)}</span>
          {formattedTime && (
            <>
              <svg width="16" height="16" strokeWidth={2} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/>
              </svg>
              <span className="event-time">{formattedTime}</span>
            </>
          )}
        </div>

        <div className="event-meta-line" itemProp="location" itemScope itemType="https://schema.org/Place" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: 'rgba(255, 255, 255, 0.7)',
          fontSize: '14px',
          marginBottom: '8px',
        }}>
          <svg width="16" height="16" strokeWidth={2} viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
          </svg>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((ev.venue || '') + (ev.address ? ', ' + ev.address : ''))}`}
            target="_blank"
            rel="noopener noreferrer"
            className="venue-link"
            itemProp="name"
            style={{
              color: 'rgba(255, 255, 255, 0.85)',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            {ev.venue}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: 0.6 }}>
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
              <polyline points="15 3 21 3 21 9"></polyline>
              <line x1="10" y1="14" x2="21" y2="3"></line>
            </svg>
          </a>
          {ev.address && (
            <meta itemProp="address" content={ev.address} />
          )}
        </div>

        {ev.price && (
          <div className="event-meta-line" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: 'rgba(255, 255, 255, 0.7)',
            fontSize: '14px',
            marginBottom: '8px',
          }}>
            <svg width="16" height="16" strokeWidth={2} viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
            </svg>
            <span>{ev.price}</span>
          </div>
        )}

        {ev.source && (
          <div style={{ marginTop: '12px', fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)' }}>
            Quelle: {ev.source}
          </div>
        )}
      </div>
    </div>
    </Link>
  );
}
