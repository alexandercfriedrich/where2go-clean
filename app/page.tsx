'use client';
import { useState, useRef, useEffect } from 'react';

interface EventData {
  title: string;
  category: string;
  date: string;
  time: string;
  venue: string;
  price: string;
  website: string;
  // New optional fields for enhanced UI
  endTime?: string;
  address?: string;
  ticketPrice?: string;
  eventType?: string;
  description?: string;
  bookingLink?: string;
  ageRestrictions?: string;
}

// Categories matching backend DEFAULT_CATEGORIES
const ALL_CATEGORIES = [
  
'DJ Sets/Electronic: DJ Sets/Electronic, Techno/House/EDM, Drum & Bass, Trance/Progressive, Ambient/Downtempo, Experimental Electronic, Disco/Nu-Disco, Minimal/Deep House, Hardstyle/Hardcore, Breakbeat/Breaks, Dubstep/Bass Music, Industrial/EBM, Synthwave/Retro, Acid/Acid House, Psytrance/Goa, Future Bass, Garage/UK Garage',

'Clubs/Discos: Clubs/Discos, Nightclubs, Dance Clubs, Underground Venues, Rooftop Parties, Beach Clubs, After-Hours, Club Nights, Party Events, Rave Culture, Social Dancing, Singles Events, VIP Events, Themed Parties, Cocktail Lounges',

'Live-Konzerte: Live-Konzerte, Klassische Musik/Classical, Rock/Pop/Alternative, Jazz/Blues, Folk/Singer-Songwriter, Hip-Hop/Rap, Metal/Hardcore, Indie/Alternative, World Music, Country/Americana, R&B/Soul, Experimental/Avant-garde, Chamber Music, Orchestra/Symphony, Band Performances, Solo Artists, Album Release Shows, Tribute Bands, Open Mic Nights, Acoustic Sessions, Choral Music, New Age/Ambient',

'Open Air: Open Air, Music Festivals, Outdoor Concerts, Beach Events, Park Gatherings, Rooftop Events, Garden Parties, Street Festivals, Market Events, Outdoor Cinema, Picnic Events, Nature Events, Camping/Glamping Events, Adventure Tours, Food Truck Festivals, Craft Fairs (Outdoor), Sports Festivals',

'Museen: Museen, Kunstgalerien/Art Galleries, Ausstellungen/Exhibitions, Kulturelle Institutionen, Historische Stätten, Architektur Tours, Science Museums, Interactive Exhibitions, Private Collections, Art Fairs, Museum Nights, Educational Tours, Virtual Reality Experiences, Photography Exhibitions, Natural History, Technology Museums, Local History',

'LGBTQ+: LGBTQ+, Pride Events, Queer Parties, Drag Shows, LGBTQ+ Clubs, Community Events, Support Groups, Diversity Celebrations, Inclusive Events, Rainbow Events, Trans Events, Lesbian Events, Gay Events, Bisexual Events, Non-binary Events, Coming Out Support, LGBTQ+ Film Screenings',

'Comedy/Kabarett: Comedy/Kabarett, Stand-up Comedy, Improvisational Theater, Satirical Shows, Variety Shows, Comedy Clubs, Humor Events, Roast Shows, Open Mic Comedy, Political Satire, Musical Comedy, Sketch Shows, Comedy Festivals, Story Slam, Comedy Workshops',

'Theater/Performance: Theater/Performance, Drama/Schauspiel, Musicals, Opera/Operette, Ballet/Dance, Contemporary Dance, Performance Art, Experimental Theater, Children Theater, Street Performance, Mime/Physical Theater, Puppet Theater, Immersive Theater, Site-specific Performance, Cabaret Shows, Burlesque, Circus Arts, Storytelling, Poetry Slams, Spoken Word',

'Film: Film, Cinema/Movie Screenings, Film Festivals, Documentary Screenings, Independent Films, Foreign Films, Classic Cinema, Outdoor Cinema, Silent Films, Animation/Animated Films, Short Films, Film Premieres, Director Q&As, Film Discussions, Video Art, Experimental Film, Horror Film Nights, Cult Cinema',

'Food/Culinary: Food/Culinary, Wine Tasting, Beer Events/Beer Festivals, Cooking Classes, Food Markets, Restaurant Events, Culinary Festivals, Food Tours, Pop-up Restaurants, Cocktail Events, Coffee Culture, Whiskey/Spirits Tastings, Vegan/Vegetarian Events, International Cuisine, Local Specialties, Food & Music Pairings, Farmers Markets, Gourmet Events, Street Food, Chef Demonstrations',

'Sport: Sport, Football/Soccer, Basketball, Tennis, Fitness Events, Running/Marathon, Cycling Events, Swimming, Martial Arts, Yoga/Pilates, Extreme Sports, Winter Sports, Team Building Sports, Amateur Leagues, Sports Viewing Parties, Health & Wellness, Outdoor Sports, Indoor Sports, E-Sports, Adventure Racing',

'Familien/Kids: Familien/Kids, Children Events, Family Festivals, Kids Workshops, Educational Activities, Interactive Shows, Children Theater, Puppet Shows, Magic Shows, Storytelling for Kids, Arts & Crafts, Science for Kids, Music for Families, Outdoor Adventures, Birthday Parties, Holiday Events, Baby/Toddler Events, Teen Programs',

'Kunst/Design: Kunst/Design, Art Exhibitions, Design Markets, Craft Fairs, Artist Studios, Creative Workshops, Fashion Shows, Photography, Sculpture, Painting, Digital Art, Street Art, Installation Art, Textile Arts, Ceramics/Pottery, Jewelry Making, Architecture Events, Interior Design, Graphic Design, Art Auctions',

'Wellness/Spirituell: Wellness/Spirituell, Meditation Events, Yoga Classes, Spa Events, Mindfulness Workshops, Spiritual Retreats, Healing Sessions, Wellness Festivals, Breathwork, Sound Healing, Crystal Healing, Reiki Sessions, Holistic Health, Mental Health Support, Self-Care Events, Nature Therapy, Life Coaching, Nutrition Workshops',

'Networking/Business: Networking/Business, Business Meetups, Professional Development, Industry Conferences, Startup Events, Entrepreneurship, Career Fairs, Leadership Events, Trade Shows, B2B Events, Corporate Events, Innovation Hubs, Tech Meetups, Skills Workshops, Mentorship Programs, Investment Events, Coworking Events, Industry Mixers',

'Natur/Outdoor: Natur/Outdoor, Hiking/Walking Tours, Nature Tours, Wildlife Watching, Botanical Gardens, Park Events, Outdoor Adventures, Camping Events, Environmental Education, Eco-Tours, Outdoor Yoga, Nature Photography, Geocaching, Bird Watching, Gardening Workshops, Sustainability Events, Green Living, Conservation Events, Outdoor Fitness, Stargazing',

'Kultur/Traditionen: Lokale Traditionen, Kulturelle Feste, Historische Reenactments, Volksfeste, Religiöse Feiern, Seasonal Celebrations, Cultural Heritage, Traditional Crafts, Folk Music/Dance, Local Legends Tours',

'Märkte/Shopping: Flohmarkt/Flea Markets, Vintage Markets, Handmade Markets, Antique Fairs, Shopping Events, Pop-up Shops, Designer Markets, Book Markets, Record Fairs, Seasonal Markets',

'Bildung/Lernen: Workshops, Kurse/Classes, Seminare/Seminars, Lectures/Vorträge, Language Exchange, Book Clubs, Study Groups, Academic Conferences, Skill Sharing, DIY Workshops',

'Soziales/Community: Community Events, Volunteer Activities, Charity Events, Social Causes, Neighborhood Meetings, Cultural Exchange, Senior Events, Singles Meetups, Expat Events, Local Initiatives'

];

export default function Home() {
  const [city, setCity] = useState('');
  const [timePeriod, setTimePeriod] = useState('heute');
  const [customDate, setCustomDate] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>(ALL_CATEGORIES);
  const [events, setEvents] = useState<EventData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<'idle' | 'pending' | 'done' | 'error'>('idle');
  const [pollCount, setPollCount] = useState(0);
  const [progress, setProgress] = useState<{completedCategories: number, totalCategories: number} | null>(null);
  const [newEvents, setNewEvents] = useState<Set<string>>(new Set());
  const [debugMode, setDebugMode] = useState(false);
  const [debugData, setDebugData] = useState<any>(null);
  const [toast, setToast] = useState<{show: boolean, message: string}>({show: false, message: ''});
  
  // To store polling interval id persistently - browser-safe type
  const pollInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // To store latest events for polling comparison (fixes stale closure issue)
  const eventsRef = useRef<EventData[]>([]);

  // To store poll count persistently to avoid closure resets
  const pollCountRef = useRef<number>(0);

  
  // app/page.tsx – ADD this useEffect near your other useEffects
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const design = params.get('design');
  const id = 'w2g-design-css';
  const existing = document.getElementById(id) as HTMLLinkElement | null;

  const isValid = design === '1' || design === '2' || design === '3';
  if (isValid) {
    const href = `/designs/design${design}.css`;
    if (existing) {
      if (existing.getAttribute('href') !== href) existing.setAttribute('href', href);
    } else {
      const link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      link.href = href;
      document.head.appendChild(link);
    }
  } else {
    if (existing) existing.remove(); // fall back to globals.css
  }
}, []);

  
  // Check for debug mode from URL on component mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    setDebugMode(urlParams.get('debug') === '1');
  }, []);

  // Keep eventsRef in sync with events state to fix stale closure issue
  useEffect(() => {
    eventsRef.current = events;
  }, [events]);

  // Cleanup polling interval/timeout on component unmount
  useEffect(() => {
    return () => {
      if (pollInterval.current) {
        // Handle both setInterval and setTimeout cleanup
        clearInterval(pollInterval.current);
        clearTimeout(pollInterval.current);
        pollInterval.current = null;
      }
    };
  }, []);

  // Helper function to create event key for deduplication
  const createEventKey = (event: EventData): string => {
    return `${event.title}_${event.date}_${event.venue}`;
  };

  const formatDateForAPI = (): string => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (timePeriod === 'heute') return today.toISOString().split('T')[0];
    else if (timePeriod === 'morgen') return tomorrow.toISOString().split('T')[0];
    else return customDate || today.toISOString().split('T')[0];
  };

  // Toggle category selection
  const toggleCategory = (category: string) => {
    setSelectedCategories(prev => 
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

// ...imports and component boilerplate unchanged...

  const searchEvents = async () => {
    if (!city.trim()) {
      setError('Bitte gib eine Stadt ein.');
      return;
    }

    setLoading(true);
    setError(null);
    setEvents([]);
    setNewEvents(new Set());
    setJobId(null);
    setJobStatus('pending');
    setPollCount(0);
    setProgress(null);
    setDebugData(null);

    // Job starten
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          city: city.trim(), 
          date: formatDateForAPI(),
          categories: selectedCategories,
          options: { 
            temperature: 0.2, 
            max_tokens: 10000,
            debug: debugMode,
            disableCache: debugMode,
            categoryConcurrency: 5,
            categoryTimeoutMs: 90000, // Increased from 45s to 90s per category
            overallTimeoutMs: 240000, // 4 minutes overall timeout
            maxAttempts: 5
          }
        }),
      });

      // New: handle non-OK before parsing
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Serverfehler (${res.status})`);
      }

      const { jobId } = await res.json();
      if (!jobId) {
        throw new Error('Kein Job ID erhalten.');
      }

      setJobId(jobId);
      // Poll starten
      startPolling(jobId);
    } catch (err: any) {
      setError(err?.message || 'Fehler beim Starten der Eventsuche.');
      setLoading(false);
      setJobStatus('idle');
    }
  };

  // Polling-Funktion with progressive updates and adaptive intervals
  const startPolling = (jobId: string) => {
    if (pollInterval.current) {
      clearInterval(pollInterval.current);
      clearTimeout(pollInterval.current);
    }
    
    // Reset poll count using ref to avoid closure issues
    pollCountRef.current = 0;
    
    // Calculate maxPolls for ~8 minutes total:
    // First 20 polls at 3s = 60s, remaining polls at 5s
    // For 8 minutes (480s): 60s + (420s / 5s) = 20 + 84 = 104 total polls
    const maxPolls = 104;
    
    // Define polling function to avoid duplication
    const performPoll = async (): Promise<void> => {
      pollCountRef.current++;
      setPollCount(pollCountRef.current);
      
      console.log(`Poll tick #${pollCountRef.current} for job ${jobId}`);
      
      if (pollCountRef.current > maxPolls) { // nach 8 Minuten abbrechen
        if (pollInterval.current) {
          clearInterval(pollInterval.current);
          clearTimeout(pollInterval.current);
        }
        setLoading(false);
        setJobStatus('error');
        setError('Die Suche dauert zu lange (Timeout nach 8 Minuten). Bitte versuche es später erneut.');
        return;
      }

      try {
        const debugParam = debugMode ? '?debug=1' : '';
        const res = await fetch(`/api/jobs/${jobId}${debugParam}`);
        if (!res.ok) throw new Error(`Status ${res.status}`);
        
        const job = await res.json();
        
        // Update progress if available
        if (job.progress) {
          setProgress(job.progress);
        }
        
        // Handle progressive updates - show events even if still pending
        if (job.status === 'pending' && job.events && job.events.length > 0) {
          const currentEventKeys = new Set(eventsRef.current.map(createEventKey));
          const incomingEvents = job.events;
          const newEventKeys = new Set<string>();
          
          // Find actually new events
          incomingEvents.forEach((event: EventData) => {
            const key = createEventKey(event);
            if (!currentEventKeys.has(key)) {
              newEventKeys.add(key);
            }
          });
          
          // Update events with spread operator to force rerenders
          setEvents([...incomingEvents]);
          
          // Show toast for new events
          if (newEventKeys.size > 0) {
            setNewEvents(newEventKeys);
            setToast({
              show: true,
              message: `${newEventKeys.size} neue Event${newEventKeys.size !== 1 ? 's' : ''} gefunden`
            });
            
            // Hide toast after 3 seconds
            setTimeout(() => {
              setToast({show: false, message: ''});
              setNewEvents(new Set()); // Clear new event markers after a delay
            }, 3000);
          }
          
          // Update debug data if available
          if (job.debug) {
            setDebugData(job.debug);
          }
          
          // Set up next poll with adaptive interval
          if (pollInterval.current) {
            clearInterval(pollInterval.current);
            clearTimeout(pollInterval.current);
          }
          const nextIntervalMs = pollCountRef.current < 20 ? 3000 : 5000;
          console.log(`Next poll in ${nextIntervalMs}ms (adaptive interval based on poll count: ${pollCountRef.current})`);
          pollInterval.current = setTimeout(performPoll, nextIntervalMs);
          
          return; // Continue polling
        }
        
        // Handle completion
        if (job.status !== 'pending') {
          if (pollInterval.current) {
            clearInterval(pollInterval.current);
            clearTimeout(pollInterval.current);
          }
          setLoading(false);
          
          if (job.status === 'done') {
            const incomingEvents: EventData[] = job.events || [];
            
            // If this is the first set of results (no prior events), mark all as new
            if (eventsRef.current.length === 0 && incomingEvents.length > 0) {
              const allNewEventKeys = new Set(incomingEvents.map(createEventKey));
              setNewEvents(allNewEventKeys);
              setToast({
                show: true,
                message: `${incomingEvents.length} Event${incomingEvents.length !== 1 ? 's' : ''} gefunden`
              });
              
              // Hide toast and clear "Neu" markers after 3 seconds
              setTimeout(() => {
                setToast({show: false, message: ''});
                setNewEvents(new Set());
              }, 3000);
            }
            
            // Update events with spread operator to force rerenders
            setEvents([...incomingEvents]);
            setJobStatus('done');
            
            // Update debug data if available
            if (job.debug) {
              setDebugData(job.debug);
            }
          } else {
            setJobStatus('error');
            setError(job.error || 'Fehler bei der Eventsuche.');
          }
        } else {
          // Still pending but no events yet - continue polling with adaptive interval
          if (pollInterval.current) {
            clearInterval(pollInterval.current);
            clearTimeout(pollInterval.current);
          }
          const nextIntervalMs = pollCountRef.current < 20 ? 3000 : 5000;
          console.log(`Still pending, next poll in ${nextIntervalMs}ms (adaptive interval based on poll count: ${pollCountRef.current})`);
          pollInterval.current = setTimeout(performPoll, nextIntervalMs);
        }
      } catch (err) {
        // Show non-blocking toast for transient errors, continue polling
        console.warn(`Polling attempt ${pollCountRef.current} failed:`, err);
        setToast({
          show: true,
          message: `Netzwerkfehler (Versuch ${pollCountRef.current}) - Suche läuft weiter...`
        });
        
        // Hide toast after 3 seconds but don't stop polling
        setTimeout(() => {
          setToast({show: false, message: ''});
        }, 3000);
        
        // Continue polling with adaptive interval after error
        if (pollInterval.current) {
          clearInterval(pollInterval.current);
          clearTimeout(pollInterval.current);
        }
        const nextIntervalMs = pollCountRef.current < 20 ? 3000 : 5000;
        console.log(`Error occurred, retrying in ${nextIntervalMs}ms (adaptive interval based on poll count: ${pollCountRef.current})`);
        pollInterval.current = setTimeout(performPoll, nextIntervalMs);
      }
    };
    
    // Perform first poll immediately
    performPoll();
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="hero">
        <div className="container">
          <h1>Where2Go</h1>
          <p>Entdecke die besten Events in deiner Stadt – KI-gestützte Suche für unvergessliche Erlebnisse</p>
        </div>
      </section>

      {/* Search Section */}
      <section className="search-section">
        <div className="container">
          <form 
            className="search-form"
            onSubmit={e => {
              e.preventDefault();
              searchEvents();
            }}
          >
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="city">Stadt</label>
                <input
                  className="form-input"
                  type="text"
                  id="city"
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  placeholder="z.B. Linz, Berlin, Hamburg ..."
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="timePeriod">Zeitraum</label>
                <select
                  className="form-input"
                  id="timePeriod"
                  value={timePeriod}
                  onChange={e => setTimePeriod(e.target.value)}
                >
                  <option value="heute">Heute</option>
                  <option value="morgen">Morgen</option>
                  <option value="benutzerdefiniert">Benutzerdefiniert</option>
                </select>
              </div>
            </div>

            {timePeriod === 'benutzerdefiniert' && (
              <div className="form-group">
                <label htmlFor="customDate">Datum</label>
                <input
                  className="form-input"
                  type="date"
                  id="customDate"
                  value={customDate}
                  onChange={e => setCustomDate(e.target.value)}
                />
              </div>
            )}

            {/* Categories Section */}
            <div className="categories-section">
              <label className="categories-label">Kategorien</label>
              <div className="categories-grid">
                {ALL_CATEGORIES.map((category) => (
                  <label key={category} className="category-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedCategories.includes(category)}
                      onChange={() => toggleCategory(category)}
                    />
                    <span className="category-name">{category}</span>
                  </label>
                ))}
              </div>
              <div className="categories-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setSelectedCategories(ALL_CATEGORIES)}
                >
                  Alle auswählen
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setSelectedCategories([])}
                >
                  Alle abwählen
                </button>
              </div>
            </div>

            <button type="submit" className="btn-search">
              Events suchen
            </button>
          </form>
        </div>
      </section>

      {/* Main Content */}
      <main className="container">
        {/* Error Message */}
        {error && (
          <div className="error">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="loading">
            <div className="loading-spinner"></div>
            <p>
              {jobStatus === 'pending' && events.length > 0 
                ? 'Suche läuft – Ergebnisse werden ergänzt' 
                : 'Suche läuft … bitte habe etwas Geduld.'
              }
            </p>
            <p>Abfrage <span className="font-mono">{pollCount}/48</span> (max. 480 sec / 8min)</p>
            {jobStatus === 'pending' && progress && (
              <p>Kategorien: <span className="font-mono">{progress.completedCategories}/{progress.totalCategories}</span> abgeschlossen</p>
            )}
            <p>KI-Auswertung kann länger dauern!</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && !events.length && !error && (
          <div className="empty-state">
            <h3>Bereit für dein nächstes Abenteuer?</h3>
            <p>Starte eine Suche, um die besten Events in deiner Stadt zu entdecken.</p>
          </div>
        )}

        {/* Events Grid */}
        {!!events.length && (
          <div className="events-grid">
            {events.map((event) => {
              const eventKey = createEventKey(event);
              const isNew = newEvents.has(eventKey);
              
              return (
                <div key={eventKey} className={`event-card ${isNew ? 'event-card-new' : ''}`}>
                  {isNew && <div className="badge-new">Neu</div>}
                  <div className="event-content">
                    <h3 className="event-title">{event.title}</h3>
                    
                    {/* Date and Time */}
                    <div className="event-date">
                      {event.date}
                      {event.time && ` • ${event.time}`}
                      {event.endTime && ` - ${event.endTime}`}
                    </div>
                    
                    {/* Venue and Address */}
                    <div className="event-location">
                      📍 {event.venue}
                      {event.address ? (
                        <a 
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.address)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="event-address-link"
                          title="Adresse in Google Maps öffnen"
                        >
                          <br />📍 {event.address}
                        </a>
                      ) : (
                        <a 
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${event.venue}, ${city}`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="event-address-link"
                          title="Venue in Google Maps öffnen"
                        >
                          <br />🗺️ In Maps öffnen
                        </a>
                      )}
                    </div>
                    
                    {/* Category */}
                    {event.category && (
                      <div className="event-category">🏷️ {event.category}</div>
                    )}
                    
                    {/* Event Type */}
                    {event.eventType && (
                      <div className="event-type">🎭 {event.eventType}</div>
                    )}
                    
                    {/* Price Information */}
                    {(event.price || event.ticketPrice) && (
                      <div className="event-price">
                        💰 {event.ticketPrice || event.price}
                      </div>
                    )}
                    
                    {/* Age Restrictions */}
                    {event.ageRestrictions && (
                      <div className="event-age">🔞 {event.ageRestrictions}</div>
                    )}
                    
                    {/* Description */}
                    {event.description && (
                      <div className="event-description">{event.description}</div>
                    )}
                    
                    {/* Links */}
                    <div className="event-links">
                      {event.website && (
                        <a 
                          href={event.website} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="event-link"
                        >
                          Website →
                        </a>
                      )}
                      {event.bookingLink && (
                        <a 
                          href={event.bookingLink} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="event-link event-booking-link"
                        >
                          Tickets →
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Toast Notification */}
      {toast.show && (
        <div className="toast-container">
          <div className="toast">
            {toast.message}
          </div>
        </div>
      )}

      {/* Debug Panel */}
      {debugMode && debugData && (
        <div className="debug-panel">
          <div className="debug-header">
            <h3>Debug Information</h3>
            <button 
              className="debug-toggle"
              onClick={() => setDebugData(null)}
            >
              ✕
            </button>
          </div>
          <div className="debug-content">
            <div className="debug-summary">
              <p><strong>Stadt:</strong> {debugData.city}</p>
              <p><strong>Datum:</strong> {debugData.date}</p>
              <p><strong>Kategorien:</strong> {debugData.categories?.join(', ')}</p>
              <p><strong>Erstellt:</strong> {new Date(debugData.createdAt).toLocaleString()}</p>
              <p><strong>Schritte:</strong> {debugData.steps?.length || 0}</p>
            </div>
            
            {debugData.steps && debugData.steps.map((step: any, index: number) => (
              <div key={index} className="debug-step">
                <h4>Schritt {index + 1}: {step.category}</h4>
                <div className="debug-query">
                  <strong>Query:</strong> {step.query}
                </div>
                <div className="debug-metrics">
                  <strong>Parsed Events:</strong> {step.parsedCount || 0} | 
                  <strong> Added to Total:</strong> {step.addedCount || 0} | 
                  <strong> Total After:</strong> {step.totalAfter || 0}
                </div>
                <details className="debug-response">
                  <summary>Rohdaten anzeigen</summary>
                  <pre>{step.response}</pre>
                </details>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <p>© 2025 Where2Go - Entdecke deine Stadt neu</p>
        </div>
      </footer>
    </div>
  );
}
