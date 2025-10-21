'use client';
import { useEffect, useRef, useState, CSSProperties } from 'react';
import { EVENT_CATEGORY_SUBCATEGORIES, normalizeCategory } from './lib/eventCategories';
import { useTranslation } from './lib/useTranslation';
import { startJobPolling, deduplicateEvents as dedupFront } from './lib/polling';
import SchemaOrg from './components/SchemaOrg';
import SEOFooter from './components/SEOFooter';
import EventCardSkeleton from './components/EventCardSkeleton';
import OptimizedSearch from './components/OptimizedSearch';
import { generateEventListSchema, generateEventMicrodata, generateCanonicalUrl } from './lib/schemaOrg';

interface EventData {
  title: string;
  category: string;
  date: string;     // YYYY-MM-DD
  time: string;     // "HH:mm"
  venue: string;
  price: string;
  website: string;
  endTime?: string;
  address?: string;
  ticketPrice?: string;
  eventType?: string;
  description?: string;
  bookingLink?: string;
  ageRestrictions?: string;
  source?: 'cache' | 'ai' | 'rss' | 'ra' | string;
  imageUrl?: string;
}

const ALL_SUPER_CATEGORIES = Object.keys(EVENT_CATEGORY_SUBCATEGORIES);
const MAX_CATEGORY_SELECTION = 3;

// Polling config
const POLL_INTERVAL_MS = 2000;
const MAX_POLLS = 48;

// City name validation - blocks malicious patterns
const BLOCKED_EXTENSIONS = [
  '.php', '.asp', '.aspx', '.jsp', '.cgi', '.pl', '.py',
  '.sh', '.bat', '.cmd', '.exe', '.dll', '.so',
  '.env', '.git', '.htaccess', '.config', '.bak', '.sql'
];

const SUSPICIOUS_KEYWORDS = ['admin', 'config', 'backup', 'test', 'debug', 'phpinfo', 'shell', 'root'];

function validateCityName(cityInput: string): { valid: boolean; error?: string } {
  if (!cityInput || !cityInput.trim()) {
    return { valid: false, error: 'Bitte gib eine Stadt ein.' };
  }

  const city = cityInput.trim().toLowerCase();
  
  // Block if contains file extensions
  if (BLOCKED_EXTENSIONS.some(ext => city.includes(ext))) {
    return { valid: false, error: 'Ungültige Eingabe erkannt. Bitte gib einen gültigen Städtenamen ein.' };
  }
  
  // Block if looks like a path traversal
  if (city.includes('../') || city.includes('..\\') || city.includes('/') || city.includes('\\')) {
    return { valid: false, error: 'Ungültige Zeichen in der Stadt-Eingabe.' };
  }
  
  // Block if starts with a dot (hidden files)
  if (city.startsWith('.')) {
    return { valid: false, error: 'Ungültige Eingabe. Stadt darf nicht mit einem Punkt beginnen.' };
  }
  
  // Block suspicious keywords used alone
  if (SUSPICIOUS_KEYWORDS.some(keyword => city === keyword)) {
    return { valid: false, error: 'Ungültige Stadt-Eingabe erkannt.' };
  }
  
  // Block if contains HTML/script tags
  if (/<script|<\/script|javascript:|onerror=/i.test(city)) {
    return { valid: false, error: 'Ungültige Eingabe erkannt.' };
  }
  
  return { valid: true };
}

export default function Home() {
  const { t, formatEventDate } = useTranslation();
  // Default: Wien + heute
  const [city, setCity] = useState('Wien');
  const [timePeriod, setTimePeriod] = useState('heute');
  const [customDate, setCustomDate] = useState('');
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  const [selectedSuperCategories, setSelectedSuperCategories] = useState<string[]>([]);
  const [categoryLimitError, setCategoryLimitError] = useState<string | null>(null);

  const [events, setEvents] = useState<EventData[]>([]);
  const [loading, setLoading] = useState(false);
  const [stepLoading, setStepLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [searchSubmitted, setSearchSubmitted] = useState(false);
  const [searchedSuperCategories, setSearchedSuperCategories] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState('Alle');
  
  // Optimized search toggle
  const [useOptimizedSearch, setUseOptimizedSearch] = useState(false);
  
  // New multi-select filters
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedVenues, setSelectedVenues] = useState<string[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  // Mobile: Sidebar Toggle
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  
  // Category filter for results page
  const [resultsPageCategoryFilter, setResultsPageCategoryFilter] = useState<string[]>([]);

  const [cacheInfo, setCacheInfo] = useState<{fromCache: boolean; totalEvents: number; cachedEvents: number} | null>(null);
  const [toast, setToast] = useState<{show:boolean; message:string}>({show:false,message:''});

  const pollInstanceRef = useRef(0);
  const [activePolling, setActivePolling] = useState<{ jobId: string; cleanup: () => void; pollInstanceId: number } | null>(null);

  const [debugLogs, setDebugLogs] = useState<{
    apiCalls: Array<{
      timestamp: string;
      url: string;
      method: string;
      body?: any;
      response?: any;
      status?: number;
    }>;
    aiRequests: Array<{
      timestamp: string;
      query: string;
      response: string;
      category?: string;
      parsedCount?: number;
    }>;
    wienInfoData: Array<{
      timestamp: string;
      url: string;
      query?: string;
      response?: string;
      parsedEvents?: number;
      filteredEvents?: number;
      rawCategoryCounts?: Record<string, number>;
      mappedCategoryCounts?: Record<string, number>;
      unknownRawCategories?: string[];
      scrapedContent?: string;
      events?: any[];
      error?: string;
    }>;
  }>({
    apiCalls: [],
    aiRequests: [],
    wienInfoData: []
  });

  const resultsAnchorRef = useRef<HTMLDivElement | null>(null);
  const timeSelectWrapperRef = useRef<HTMLDivElement | null>(null);
  const cancelRef = useRef<{cancel:boolean}>({cancel:false});

  // Flag für initialen Cache-Preload (ohne neue Suche)
  const [initialPreloadDone, setInitialPreloadDone] = useState(false);

  // Design CSS handled elsewhere (no manual overrides)
  useEffect(() => {}, []);

  // Close dropdown on outside click / Escape
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!showDateDropdown) return;
      if (timeSelectWrapperRef.current && !timeSelectWrapperRef.current.contains(e.target as Node)) {
        setShowDateDropdown(false);
      }
    }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setShowDateDropdown(false); }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [showDateDropdown]);

  // Mobile filters: close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setShowMobileFilters(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const toggleSuperCategory = (cat: string) => {
    setCategoryLimitError(null);
    setSelectedSuperCategories(prev => {
      if (prev.includes(cat)) return prev.filter(c => c !== cat);
      if (prev.length >= MAX_CATEGORY_SELECTION) {
        setCategoryLimitError(`Du kannst maximal ${MAX_CATEGORY_SELECTION} Kategorien auswählen.`);
        return prev;
      }
      return [...prev, cat];
    });
  };

  const getSelectedSubcategories = (superCats: string[]): string[] => {
    // Return main categories, not subcategories, for proper filtering
    // The backend will handle subcategory expansion
    return superCats;
  };

  // Date helpers
  function toISODate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  function todayISO() { return toISODate(new Date()); }
  function tomorrowISO() { const d = new Date(); d.setDate(d.getDate()+1); return toISODate(d); }
  function nextWeekendDatesISO(): string[] {
    const t = new Date();
    const day = t.getDay(); // 0 So ... 6 Sa
    const offset = (5 - day + 7) % 7; // next Friday
    const fri = new Date(t); fri.setDate(t.getDate() + offset);
    const sat = new Date(fri); sat.setDate(fri.getDate() + 1);
    const sun = new Date(fri); sun.setDate(fri.getDate() + 2);
    return [toISODate(fri), toISODate(sat), toISODate(sun)];
  }
  function formatLabelDE(iso: string) {
    if (!iso) return 'Benutzerdefiniert';
    const [y,m,d] = iso.split('-');
    return `${d}.${m}.${y}`;
  }

  function formatDateForAPI(): string {
    if (timePeriod === 'heute') return todayISO();
    if (timePeriod === 'morgen') return tomorrowISO();
    if (timePeriod === 'kommendes-wochenende') return nextWeekendDatesISO()[0];
    return customDate || todayISO();
  }

  function matchesSelectedDate(ev: EventData): boolean {
    const evDate = ev.date?.slice(0,10);
    if (!evDate) return true;
    if (timePeriod === 'heute') return evDate === todayISO();
    if (timePeriod === 'morgen') return evDate === tomorrowISO();
    if (timePeriod === 'kommendes-wochenende') {
      const wk = nextWeekendDatesISO();
      return wk.includes(evDate);
    }
    if (customDate) return evDate === customDate;
    return true;
  }

  function getPageTitle(): string {
    const cityName = city || 'Vienna';
    
    if (timePeriod === 'heute') {
      return `Today's Events in ${cityName}`;
    }
    if (timePeriod === 'morgen') {
      return `Tomorrow's Events in ${cityName}`;
    }
    if (timePeriod === 'kommendes-wochenende') {
      return `Weekend Events in ${cityName}`;
    }
    if (customDate) {
      const date = new Date(customDate);
      const options: Intl.DateTimeFormatOptions = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      };
      const formattedDate = date.toLocaleDateString('en-US', options);
      return `Events in ${cityName} on ${formattedDate}`;
    }
    return `Events in ${cityName}`;
  }

  function formatEventDateTime(dateStr: string, startTime?: string, endTime?: string) {
    const dateObj = new Date(dateStr);
    if (isNaN(dateObj.getTime())) return { date: dateStr, time: startTime || '' };

    const weekday = dateObj.toLocaleDateString('en-GB', { weekday: 'short' });
    const day = dateObj.getDate();
    const monthLabel = dateObj.toLocaleDateString('en-GB', { month: 'short' });
    const year = dateObj.getFullYear();
    const ordinal = (d: number) => {
      if (d === 1 || d === 21 || d === 31) return `${d}st`;
      if (d === 2 || d === 22) return `${d}nd`;
      if (d === 3 || d === 23) return `${d}rd`;
      return `${d}th`;
    };
    const dateFormatted = `${weekday}. ${ordinal(day)} ${monthLabel} ${year}`;

    const fmtTime = (val?: string) => {
      if (!val) return '';
      const m = val.match(/^(\d{1,2}):(\d{2})/);
      if (!m) return val;
      let h = parseInt(m[1], 10);
      const min = m[2];
      const ampm = h >= 12 ? 'pm' : 'am';
      h = h % 12;
      if (h === 0) h = 12;
      return `${h}:${min} ${ampm}`;
    };

    let timeLabel = '';
    if (startTime && endTime) timeLabel = `${fmtTime(startTime)} - ${fmtTime(endTime)}`;
    else if (startTime) timeLabel = fmtTime(startTime);
    return { date: dateFormatted, time: timeLabel };
  }

  function guessCurrencyByCity(c: string) {
    const cityLC = c.toLowerCase();
    if (/miami|new york|los angeles|san francisco|usa|united states|orlando/.test(cityLC)) return { symbol: '$', code: 'USD' };
    if (/london|uk|united kingdom|manchester|edinburgh/.test(cityLC)) return { symbol: '£', code: 'GBP' };
    if (/zurich|zürich|geneva|genf|basel|bern|switzerland|schweiz/.test(cityLC)) return { symbol: 'CHF', code: 'CHF' };
    return { symbol: '€', code: 'EUR' };
  }
  function normalizePriceString(p: string) { return p.replace(/\s+/g, ' ').trim(); }
  function formatPriceDisplay(p: string): string {
    if (!p) return 'Keine Preisinfos';
    const str = normalizePriceString(p);
    if (/[€$£]|EUR|USD|GBP|CHF|PLN|CZK|HUF|DKK|SEK|NOK|CAD|AUD/i.test(str)) return str.replace(/(\d)\s*€/, '$1 €');
    if (/anfrage/i.test(str)) return 'Preis auf Anfrage';
    const cur = guessCurrencyByCity(city);
    const range = str.match(/^(\d+)\s*[-–]\s*(\d+)$/);
    if (range) return `${range[1]}–${range[2]} ${cur.symbol}`;
    const single = str.match(/^(\d+)(?:[.,](\d{1,2}))?$/);
    if (single) return `${single[1]}${single[2] ? ','+single[2] : ''} ${cur.symbol}`;
    return str;
  }

  function dedupMerge(current: EventData[], incoming: EventData[]) {
    return dedupFront(current, incoming);
  }

  // Initial: Cache-only für Wien (heute) laden – keine neue Suche
  // Uses new cache-day endpoint for better performance and validity filtering
  // Falls back to legacy /api/events/cache if cache-day fails
  async function preloadDefaultEventsFromCache() {
    try {
      const today = todayISO();
      const url = `/api/events/cache-day?city=${encodeURIComponent('Wien')}&date=${encodeURIComponent(today)}`;
      const res = await fetch(url, { cache: 'no-store' });
      const json = await res.json().catch(() => ({} as any));
      
      if (!res.ok) {
        console.warn('Initial cache-day preload failed, trying legacy cache:', json?.error || res.status);
        
        // Fallback to legacy /api/events/cache
        try {
          const legacyUrl = `/api/events/cache?city=${encodeURIComponent('Wien')}&date=${encodeURIComponent(today)}`;
          const legacyRes = await fetch(legacyUrl, { cache: 'no-store' });
          const legacyJson = await legacyRes.json().catch(() => ({} as any));
          
          if (legacyRes.ok) {
            const incoming: EventData[] = Array.isArray(legacyJson.events) ? legacyJson.events : [];
            setEvents(incoming);
            
            // Derive cacheInfo from legacy response
            if (legacyJson.cacheInfo) {
              setCacheInfo(legacyJson.cacheInfo);
            } else if (legacyJson.cached !== undefined) {
              setCacheInfo({
                fromCache: legacyJson.cached,
                totalEvents: incoming.length,
                cachedEvents: incoming.length
              });
            }
            setInitialPreloadDone(true);
            return;
          }
        } catch (fallbackError) {
          console.warn('Legacy cache fallback also failed:', fallbackError);
        }
        
        setInitialPreloadDone(true);
        return;
      }
      
      const incoming: EventData[] = Array.isArray(json.events) ? json.events : [];
      setEvents(incoming);
      
      // Map cache-day response to cacheInfo format
      if (json.cached !== undefined) {
        setCacheInfo({
          fromCache: json.cached,
          totalEvents: incoming.length,
          cachedEvents: incoming.length
        });
      }
    } catch (e) {
      console.warn('Initial cache preload error:', e);
    } finally {
      setInitialPreloadDone(true);
    }
  }

  useEffect(() => {
    void preloadDefaultEventsFromCache();
  }, []);

  async function fetchForSuperCategory(superCat: string) {
    const subs = EVENT_CATEGORY_SUBCATEGORIES[superCat] || [];
    if (subs.length === 0) return;
    setStepLoading(superCat);
    try {
      const reqBody = {
        city: city.trim(),
        date: formatDateForAPI(),
        categories: subs,
        options: {
          temperature: 0.2,
          max_tokens: 12000,
          expandedSubcategories: true,
          debug: true,
          categoryConcurrency: 10
        }
      };

      setDebugLogs(prev => ({
        ...prev,
        apiCalls: [...prev.apiCalls, {
          timestamp: new Date().toISOString(),
          url: '/api/events',
          method: 'POST',
          body: reqBody
        }]
      }));

      const res = await fetch('/api/events', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify(reqBody)
      });
      const data = await res.json().catch(()=> ({}));

      setDebugLogs(prev => ({
        ...prev,
        apiCalls: prev.apiCalls.map((call, idx) =>
          idx === prev.apiCalls.length - 1 ? { ...call, status: res.status, response: data } : call
        )
      }));

      if (!res.ok) throw new Error(data.error || `Serverfehler ${res.status}`);

      const incoming: EventData[] = data.events || [];
      setEvents(prev => dedupMerge(prev, incoming));
      if (data.cacheInfo) setCacheInfo(data.cacheInfo);
    } finally {
      setStepLoading(null);
    }
  }

  async function progressiveSearchEvents() {
    // Validate city name first
    const validation = validateCityName(city);
    if (!validation.valid) {
      setError(validation.error || 'Ungültige Stadt-Eingabe.');
      return;
    }
    
    if (selectedSuperCategories.length === 0) {
      setCategoryLimitError('Bitte wähle mindestens eine Kategorie aus.');
      return;
    }
    
    // If optimized search is enabled, just set search submitted and return
    // The OptimizedSearch component will handle the actual search
    if (useOptimizedSearch) {
      setSearchSubmitted(true);
      setSearchedSuperCategories([...selectedSuperCategories]);
      setEvents([]);
      setError(null);
      setCacheInfo(null);
      setActiveFilter('Alle');
      return;
    }
    
    // cancel running batch
    cancelRef.current.cancel = true;
    await new Promise(r => setTimeout(r, 0));
    cancelRef.current = { cancel:false };

    if (activePolling) {
      try { activePolling.cleanup(); } catch {}
      setActivePolling(null);
    }

    setDebugLogs({ apiCalls: [], aiRequests: [], wienInfoData: [] });
    setLoading(true);
    setError(null);
    setEvents([]);
    setCacheInfo(null);
    setSearchSubmitted(true);
    setSearchedSuperCategories([...selectedSuperCategories]);
    setActiveFilter('Alle');

    try {
      const reqBody = {
        city: city.trim(),
        date: formatDateForAPI(),
        categories: selectedSuperCategories.length ? getSelectedSubcategories(selectedSuperCategories) : [],
        options: {
          progressive: true,
          timePeriod: timePeriod,
          customDate: customDate,
          debug: true,
          fetchWienInfo: true,
          categoryConcurrency: 10
        }
      };

      setDebugLogs(prev => ({
        ...prev,
        apiCalls: [...prev.apiCalls, {
          timestamp: new Date().toISOString(),
          url: '/api/events',
          method: 'POST',
          body: reqBody
        }]
      }));

      const jobRes = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify(reqBody)
      });
      const data = await jobRes.json().catch(()=> ({}));

      setDebugLogs(prev => ({
        ...prev,
        apiCalls: prev.apiCalls.map((call, idx) =>
          idx === prev.apiCalls.length - 1 ? { ...call, status: jobRes.status, response: data } : call
        )
      }));

      if (!jobRes.ok) throw new Error(data.error || `Serverfehler ${jobRes.status}`);

      const initialEvents = Array.isArray(data.events) ? data.events : [];
      if (initialEvents.length) {
        setEvents(prev => dedupMerge(prev, initialEvents));
        if (data.cacheInfo) setCacheInfo(data.cacheInfo);
      }

      const onEvents = (chunk: EventData[], _getCurrent: () => EventData[]) => {
        setEvents(prev => dedupMerge(prev, chunk));
      };
      const getCurrent = () => events;
      const onDone = (_final: EventData[], _status: string) => {
        setStepLoading(null);
        setLoading(false);
        setTimeout(()=> setToast({show:false, message:''}), 2000);
        if (resultsAnchorRef.current) {
          resultsAnchorRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        if (data.jobId) fetchDebugInfo(data.jobId);
      };

      // Only start polling if we have a jobId (not all-cached response)
      if (data.jobId) {
        const cleanup = startJobPolling(data.jobId, onEvents, getCurrent, onDone, POLL_INTERVAL_MS, MAX_POLLS);
        const nextInstance = ++pollInstanceRef.current;
        setActivePolling({ jobId: data.jobId, cleanup, pollInstanceId: nextInstance });
      } else {
        // All cached, mark as done immediately
        setStepLoading(null);
        setLoading(false);
        if (resultsAnchorRef.current) {
          resultsAnchorRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }

    } catch(e:any){
      setError(e.message || 'Fehler bei der Suche');
      setLoading(false);
      setStepLoading(null);
    }
  }

  async function fetchDebugInfo(jobId: string) {
    try {
      const debugRes = await fetch(`/api/jobs/${jobId}?debug=1`);
      if (!debugRes.ok) return;
      const debugData = await debugRes.json();

      setDebugLogs(prev => ({
        ...prev,
        apiCalls: [...prev.apiCalls, {
          timestamp: new Date().toISOString(),
          url: `/api/jobs/${jobId}?debug=1`,
          method: 'GET',
          response: debugData,
          status: debugRes.status
        }]
      }));

      if (debugData.debug && debugData.debug.steps) {
        const aiRequests = debugData.debug.steps.map((step: any) => ({
          timestamp: debugData.debug.createdAt || new Date().toISOString(),
          query: step.query || '',
          response: step.response || '',
          category: step.category || '',
          parsedCount: step.parsedCount || 0
        }));

        setDebugLogs(prev => ({ ...prev, aiRequests: [...prev.aiRequests, ...aiRequests] }));
      }

      if (debugData.debug && debugData.debug.wienInfoData) {
        const wienData = debugData.debug.wienInfoData;
        setDebugLogs(prev => ({
          ...prev,
          wienInfoData: [...prev.wienInfoData, {
            timestamp: new Date().toISOString(),
            url: wienData.url || '',
            query: wienData.query || '',
            response: wienData.response || '',
            parsedEvents: wienData.parsedEvents || 0,
            filteredEvents: wienData.filteredEvents || 0,
            rawCategoryCounts: wienData.rawCategoryCounts || {},
            mappedCategoryCounts: wienData.mappedCategoryCounts || {},
            unknownRawCategories: wienData.unknownRawCategories || [],
            scrapedContent: wienData.scrapedContent || '',
            events: wienData.events || [],
            error: wienData.error || ''
          }]
        }));
      }
    } catch (e) {
      console.warn('Failed to fetch debug info:', e);
    }
  }

  // Initialize filters when events change (also for preload, not tied to searchSubmitted)
  useEffect(() => {
    if (events.length > 0) {
      const dateFiltered = events.filter(matchesSelectedDate);
      
      // Get unique main categories from events
      const categorySet = new Set<string>();
      dateFiltered.forEach(ev => {
        const normalizedCategory = normalizeCategory(ev.category);
        if (normalizedCategory) {
          categorySet.add(normalizedCategory);
        }
      });
      
      // Get unique venues
      const venueSet = new Set<string>();
      dateFiltered.forEach(ev => {
        if (ev.venue && ev.venue.trim()) {
          venueSet.add(ev.venue);
        }
      });
      
      // Initialize all filters as selected and keep all categories expanded
      if (selectedCategories.length === 0) {
        setSelectedCategories(Array.from(categorySet));
      }
      // Always keep all categories expanded
      setExpandedCategories(Array.from(categorySet));
      
      if (selectedVenues.length === 0) {
        setSelectedVenues(Array.from(venueSet));
      }
    }
  }, [events, searchSubmitted]);

  const displayedEvents = (() => {
    const dateFiltered = events.filter(matchesSelectedDate);
    if (!searchSubmitted) return dateFiltered;
    
    // Apply category filter (from sidebar)
    let filtered = dateFiltered;
    if (selectedCategories.length > 0) {
      filtered = filtered.filter(e => {
        const normalizedCategory = normalizeCategory(e.category);
        return selectedCategories.includes(normalizedCategory);
      });
    }
    
    // Apply results page category filter (horizontal filter row)
    if (resultsPageCategoryFilter.length > 0) {
      filtered = filtered.filter(e => {
        const normalizedCategory = normalizeCategory(e.category);
        return resultsPageCategoryFilter.includes(normalizedCategory);
      });
    }
    
    // Apply venue filter
    if (selectedVenues.length > 0) {
      filtered = filtered.filter(e => selectedVenues.includes(e.venue));
    }
    
    return filtered;
  })();

  const getCategoryCounts = () => {
    const dateFiltered = events.filter(matchesSelectedDate);
    const counts: Record<string, number> = {};
    
    for (const [mainCat, subs] of Object.entries(EVENT_CATEGORY_SUBCATEGORIES)) {
      const count = dateFiltered.filter(e => normalizeCategory(e.category) === mainCat).length;
      if (count > 0) {
        counts[mainCat] = count;
      }
    }
    
    return counts;
  };
  
  const getVenueCounts = () => {
    const dateFiltered = events.filter(matchesSelectedDate);
    const counts: Record<string, number> = {};
    
    dateFiltered.forEach(e => {
      if (e.venue && e.venue.trim()) {
        counts[e.venue] = (counts[e.venue] || 0) + 1;
      }
    });
    
    return counts;
  };
  
  const getVenuesByCategory = (category: string) => {
    const dateFiltered = events.filter(matchesSelectedDate);
    const venues: Record<string, number> = {};
    
    dateFiltered
      .filter(e => normalizeCategory(e.category) === category)
      .forEach(e => {
        if (e.venue && e.venue.trim()) {
          venues[e.venue] = (venues[e.venue] || 0) + 1;
        }
      });
    
    return venues;
  };

  const eventIcon = (cat: string) => {
    const iconProps = { width:16, height:16, strokeWidth:2 };
    switch (cat) {
      case 'DJ Sets/Electronic':
      case 'Clubs/Discos':
        return (
          <svg {...iconProps as any} viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
          </svg>
        );
      case 'Live-Konzerte':
        return (
          <svg {...iconProps as any} viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M12 3v18"/><path d="M8 21l4-7 4 7"/><path d="M8 3l4 7 4-7"/>
          </svg>
        );
      default:
        return (
          <svg {...iconProps as any} viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
            <line x1="7" y1="7" x2="7.01" y2="7"/>
          </svg>
        );
    }
  };

  const renderPrice = (ev: EventData) => {
    const p = ev.ticketPrice || ev.price;
    const text = p ? formatPriceDisplay(p) : 'Keine Preisinfos';
    
    // Add microdata for offers if price is available
    if (p) {
      // Extract numeric price for schema.org
      const numericPrice = p.match(/(\d+(?:[.,]\d+)?)/)?.[1]?.replace(',', '.') || '0';
      const isFree = p.toLowerCase().includes('frei') || p.toLowerCase().includes('gratis') || p.toLowerCase() === 'free';
      
      return (
        <span className="price-chip" itemProp="offers" itemScope={true} itemType="https://schema.org/Offer">
          <meta itemProp="price" content={isFree ? '0' : numericPrice} />
          <meta itemProp="priceCurrency" content="EUR" />
          <meta itemProp="availability" content="https://schema.org/InStock" />
          {ev.bookingLink && <meta itemProp="url" content={ev.bookingLink} />}
          {text}
        </span>
      );
    }
    
    return <span className="price-chip">{text}</span>;
  };

  const renderSourceBadge = (src?: string) => {
    const label =
      src === 'rss' ? 'RSS' :
      src === 'ai'  ? 'KI'  :
      src === 'ra'  ? 'API' :
      src === 'cache' ? 'Cache' : null;
    if (!label) return null;
    return <span className={`src-badge src-${src}`}>{label}</span>;
  };

  return (
    <div className="min-h-screen">
      {/* Schema.org structured data for SEO - only when events are available */}
      {displayedEvents.length > 0 && (
        <SchemaOrg schema={generateEventListSchema(displayedEvents, city, formatDateForAPI())} />
      )}
      
      <header className="header">
        <div className="container header-inner header-centered">
          <div className="header-logo-wrapper">
            <h1 className="header-logo-text">Where2go - Entdecke alle Events in DEINER Stadt!</h1>
          </div>
          <div className="premium-box">
            <a href="#premium" className="premium-link">
              <span className="premium-icon">⭐</span> Premium
            </a>
          </div>
        </div>
      </header>

      <section className="search-section">
        <div className="container">
          <form
            className="search-form"
            onSubmit={e => { e.preventDefault(); progressiveSearchEvents(); }}
          >
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="city">Stadt</label>
                <input
                  id="city"
                  className="form-input"
                  value={city}
                  onChange={e => {
                    const newValue = e.target.value;
                    setCity(newValue);
                    
                    // Clear error when user types
                    if (error) setError(null);
                    
                    // Validate on input for immediate feedback
                    if (newValue.trim()) {
                      const validation = validateCityName(newValue);
                      if (!validation.valid) {
                        setError(validation.error || 'Ungültige Eingabe');
                      }
                    }
                  }}
                  placeholder="Wien, 1060 Wien, Mariahilf..."
                />
              </div>

              <div className="form-group select-with-dropdown" ref={timeSelectWrapperRef}>
                <label htmlFor="timePeriod">Zeitraum</label>
                <select
                  id="timePeriod"
                  className="form-input"
                  value={timePeriod}
                  onChange={e=>{
                    const val = e.target.value;
                    setTimePeriod(val);
                    if (val === 'benutzerdefiniert') {
                      if (!customDate) setCustomDate(todayISO());
                      setShowDateDropdown(true);
                    } else {
                      setShowDateDropdown(false);
                    }
                  }}
                  onClick={(e) => {
                    // If already on benutzerdefiniert and user clicks again, open dropdown
                    if (timePeriod === 'benutzerdefiniert') {
                      setShowDateDropdown(true);
                    }
                  }}
                >
                  <option value="heute">Heute</option>
                  <option value="morgen">Morgen</option>
                  <option value="kommendes-wochenende">Kommendes Wochenende</option>
                  <option value="benutzerdefiniert">{customDate ? formatLabelDE(customDate) : 'Benutzerdefiniert'}</option>
                </select>

                {showDateDropdown && (
                  <div className="date-dropdown" role="dialog" aria-label="Datum wählen">
                    <TwoMonthCalendar
                      value={customDate || todayISO()}
                      minISO={todayISO()}
                      onSelect={(iso) => { setCustomDate(iso); setShowDateDropdown(false); }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Kategorien sind immer sichtbar und ausgeklappt */}
            <div className="categories-section">
              <label className="categories-label">{t('form.categories')}</label>
              <div className="categories-grid">
                {ALL_SUPER_CATEGORIES.map(c => {
                  const active = selectedSuperCategories.includes(c);
                  return (
                    <label key={c} className="category-checkbox">
                      <input
                        type="checkbox"
                        checked={active}
                        onChange={() => toggleSuperCategory(c)}
                        disabled={!active && selectedSuperCategories.length >= MAX_CATEGORY_SELECTION}
                      />
                      <span className="category-name">{c}</span>
                    </label>
                  );
                })}
              </div>
              {categoryLimitError && <div className="cat-error">{categoryLimitError}</div>}
            </div>

            <button type="submit" className="btn-search">Events suchen</button>
            
            {/* Optimized Search Option */}
            <div className="optimized-search-toggle" style={{ marginTop: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                <input
                  type="checkbox"
                  checked={useOptimizedSearch}
                  onChange={(e) => setUseOptimizedSearch(e.target.checked)}
                />
                <span>Use optimized search (max 5 AI calls)</span>
              </label>
            </div>
          </form>
          
          {/* Optimized Search Component */}
          {useOptimizedSearch && searchSubmitted && (
            <OptimizedSearch
              city={city}
              date={formatDateForAPI()}
              categories={getSelectedSubcategories(selectedSuperCategories)}
              onEventsUpdate={(newEvents) => {
                setEvents(prev => dedupMerge(prev, newEvents));
              }}
              onLoadingChange={(isLoading) => {
                setLoading(isLoading);
                setStepLoading(isLoading ? 'Optimized search...' : null);
              }}
              onErrorChange={(err) => {
                setError(err);
              }}
              autoStart={true}
              debug={false}
            />
          )}
        </div>
      </section>

      <div className="container" ref={resultsAnchorRef}>
        {stepLoading && searchSubmitted && (
          <div className="progress-note" style={{ marginBottom: '16px' }}>Lädt Kategorie: {stepLoading} ...</div>
        )}

        {searchSubmitted && (
          <>
            <h1 className="results-page-title">
              {getPageTitle()}
            </h1>
            
            {/* Date Navigation Buttons - Feature 6 */}
            <nav className="date-nav-row" aria-label="Zeitraum wählen">
              <button 
                className={`date-nav-btn ${timePeriod === 'heute' ? 'active' : ''}`}
                onClick={() => setTimePeriod('heute')}
              >
                Heute
              </button>
              <button 
                className={`date-nav-btn ${timePeriod === 'morgen' ? 'active' : ''}`}
                onClick={() => setTimePeriod('morgen')}
              >
                Morgen
              </button>
              <button 
                className={`date-nav-btn ${timePeriod === 'kommendes-wochenende' ? 'active' : ''}`}
                onClick={() => setTimePeriod('kommendes-wochenende')}
              >
                Wochenende
              </button>
            </nav>
            
            {/* Category Filter Row - Feature 7 */}
            <div className="category-filter-row-container">
              <div className="category-filter-row">
                {/* Show All Events button */}
                <button
                  className={`category-filter-btn ${resultsPageCategoryFilter.length === 0 ? 'active' : ''}`}
                  onClick={() => setResultsPageCategoryFilter([])}
                >
                  Alle Events anzeigen
                  <span className="category-count">({events.filter(matchesSelectedDate).length})</span>
                </button>
                
                {ALL_SUPER_CATEGORIES.map(cat => {
                  const isSelected = resultsPageCategoryFilter.includes(cat);
                  const count = getCategoryCounts()[cat] || 0;
                  const isDisabled = count === 0;
                  
                  return (
                    <button
                      key={cat}
                      className={`category-filter-btn ${isSelected ? 'active' : ''} ${isDisabled ? 'disabled' : ''}`}
                      onClick={() => {
                        if (isDisabled) return;
                        if (isSelected) {
                          setResultsPageCategoryFilter(resultsPageCategoryFilter.filter(c => c !== cat));
                        } else {
                          setResultsPageCategoryFilter([...resultsPageCategoryFilter, cat]);
                        }
                      }}
                      disabled={isDisabled}
                    >
                      {cat}
                      <span className="category-count">({count})</span>
                    </button>
                  );
                })}
              </div>
            </div>
            
            {/* Event count */}
            <p className="event-count-text">
              {displayedEvents.length} {displayedEvents.length === 1 ? 'Event' : 'Events'} gefunden
            </p>
          </>
        )}

        <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
          {/* Left sidebar: Category-Venue hierarchy */}
          {searchSubmitted && Object.keys(getCategoryCounts()).length > 0 && (
            <aside className="venue-filter-sidebar">
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>{t('filter.filtersAndCategories')}</h3>
              
              {Object.entries(getCategoryCounts())
                .sort((a, b) => b[1] - a[1])
                .map(([category, categoryCount]) => {
                  const venues = getVenuesByCategory(category);
                  const categoryVenues = Object.keys(venues);
                  const isExpanded = expandedCategories.includes(category);
                  const allVenuesSelected = categoryVenues.every(v => selectedVenues.includes(v));
                  const someVenuesSelected = categoryVenues.some(v => selectedVenues.includes(v));
                  
                  return (
                    <div key={category} style={{ marginBottom: '12px' }}>
                      <div 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '8px',
                          padding: '8px',
                          background: '#f5f5f5',
                          borderRadius: '6px',
                          transition: 'background 0.2s'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={allVenuesSelected}
                          ref={(el) => {
                            if (el) el.indeterminate = someVenuesSelected && !allVenuesSelected;
                          }}
                          onChange={(e) => {
                            e.stopPropagation();
                            if (e.target.checked) {
                              setSelectedVenues(prev => [...new Set([...prev, ...categoryVenues])]);
                            } else {
                              setSelectedVenues(prev => prev.filter(v => !categoryVenues.includes(v)));
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                          style={{ cursor: 'pointer' }}
                        />
                        <svg 
                          width="16" 
                          height="16" 
                          viewBox="0 0 24 24" 
                          fill="none" 
                          stroke="currentColor" 
                          strokeWidth="2"
                          style={{ 
                            transform: 'rotate(90deg)'
                          }}
                        >
                          <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
                        <span style={{ flex: 1, fontWeight: 500, fontSize: '14px' }}>{category}</span>
                        <span style={{ fontSize: '12px', color: '#666' }}>({categoryCount})</span>
                      </div>
                      
                      <div style={{ marginLeft: '32px', marginTop: '8px' }}>
                        {Object.entries(venues)
                          .sort((a, b) => b[1] - a[1])
                          .map(([venue, count]) => (
                            <div key={venue} style={{ marginBottom: '6px' }}>
                              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', padding: '4px 0' }}>
                                <input
                                  type="checkbox"
                                  checked={selectedVenues.includes(venue)}
                                  onChange={(e) => {
                                    setSelectedVenues(prev =>
                                      e.target.checked
                                        ? [...prev, venue]
                                        : prev.filter(v => v !== venue)
                                    );
                                  }}
                                  style={{ cursor: 'pointer' }}
                                />
                                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {venue}
                                </span>
                                <span style={{ fontSize: '11px', color: '#999' }}>({count})</span>
                              </label>
                            </div>
                          ))}
                      </div>
                    </div>
                  );
                })}
            </aside>
          )}

        <main className="main-content" style={{ flex: 1 }}>
          {error && <div className="error">{error}</div>}

          {loading && events.length === 0 && (
            <div className="events-grid">
              {Array.from({ length: 9 }).map((_, i) => (
                <EventCardSkeleton key={i} />
              ))}
            </div>
          )}

          {!loading && !error && initialPreloadDone && !searchSubmitted && events.length === 0 && (
            <div className="empty-state">
              <h3>Keine Events im Cache für Wien (heute)</h3>
              <p>Um events für heute zu entdecken führe eine neue Suche durch!</p>
            </div>
          )}

          {!loading && !error && searchSubmitted && displayedEvents.length === 0 && (
            <div className="empty-state">
              <h3>Keine Events gefunden</h3>
              <p>Probiere andere Kategorien oder ein anderes Datum.</p>
            </div>
          )}

          {cacheInfo && displayedEvents.length > 0 && (
            <div className="cache-info-banner">
              {cacheInfo.fromCache
                ? `📁 ${cacheInfo.cachedEvents} Events aus Cache`
                : `🔄 ${cacheInfo.totalEvents} Events frisch geladen`}
            </div>
          )}

          {displayedEvents.length > 0 && (
            <div className="events-grid">
              {displayedEvents.map(ev => {
                const key = `${ev.title}_${ev.date}_${ev.venue}`;
                const superCat =
                  searchedSuperCategories.find(c => EVENT_CATEGORY_SUBCATEGORIES[c]?.includes(ev.category)) ||
                  ALL_SUPER_CATEGORIES.find(c => EVENT_CATEGORY_SUBCATEGORIES[c]?.includes(ev.category)) ||
                  ev.category;

                const { date: formattedDate, time: formattedTime } =
                  formatEventDateTime(ev.date, ev.time, ev.endTime);

                // Generate microdata attributes for Schema.org
                const microdataAttrs = generateEventMicrodata(ev);
                const canonicalUrl = generateCanonicalUrl(ev);

                return (
                  <div 
                    key={key} 
                    className={`event-card ${ev.imageUrl ? 'event-card-with-image' : ''}`}
                    {...microdataAttrs}
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
                            backgroundImage: `url(${ev.imageUrl})`
                          }}
                        />
                      </>
                    )}
                    <div className="event-content">
                    {superCat && (
                      <a 
                        href={`/wien/${superCat.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/\//g, '-').replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-')}/${timePeriod === 'heute' ? 'heute' : timePeriod === 'morgen' ? 'morgen' : timePeriod === 'kommendes-wochenende' ? 'wochenende' : formatDateForAPI()}`}
                        className="event-category-badge"
                      >
                        {superCat}
                      </a>
                    )}
                    
                    <h3 className="event-title" itemProp="name">
                      {ev.title}
                    </h3>

                    <div className="event-meta-line">
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

                    <div className="event-meta-line" itemProp="location" itemScope itemType="https://schema.org/Place">
                      <svg width="16" height="16" strokeWidth={2} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                      </svg>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((ev.venue || '') + (ev.address ? ', ' + ev.address : ''))}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="venue-link"
                        itemProp="name"
                      >
                        {ev.venue}
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginLeft: '4px', opacity: 0.6 }}>
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                          <polyline points="15 3 21 3 21 9"></polyline>
                          <line x1="10" y1="14" x2="21" y2="3"></line>
                        </svg>
                      </a>
                      {ev.address && (
                        <meta itemProp="address" content={ev.address} />
                      )}
                    </div>

                    {ev.eventType && (
                      <div className="event-meta-line">
                        <svg width="16" height="16" strokeWidth={2} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path d="M20 9V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v2"/>
                          <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V9s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
                          <line x1="4" y1="22" x2="4" y2="15"/>
                          <line x1="20" y1="22" x2="20" y2="15"/>
                        </svg>
                        <span>{ev.eventType}</span>
                      </div>
                    )}

                    {ev.ageRestrictions && (
                      <div className="event-meta-line">
                        <svg width="16" height="16" strokeWidth={2} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <circle cx="12" cy="12" r="10"/>
                          <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                        </svg>
                        <span>{ev.ageRestrictions}</span>
                      </div>
                    )}

                    {ev.description && (
                      <div className="event-description" itemProp="description">{ev.description}</div>
                    )}

                    <div className="event-cta-row">
                      {renderPrice(ev)}
                      {ev.website ? (
                        <a
                          href={ev.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-outline with-icon"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
                          </svg>
                          Mehr Info
                        </a>
                      ) : <span />}
                      {ev.bookingLink ? (
                        <a
                          href={ev.bookingLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-outline tickets with-icon"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2z"/>
                            <path d="M13 7v2M13 11v2M13 15v2"/>
                          </svg>
                          Tickets
                        </a>
                      ) : <span />}
                    </div>
                    
                    {/* Source Badge - bottom-right corner */}
                    {ev.source && (
                      <div className="event-source-badge">
                        {ev.source === 'rss' ? 'RSS' :
                         ev.source === 'ai' ? 'KI' :
                         ev.source === 'ra' ? 'API' :
                         ev.source === 'cache' ? 'Cache' :
                         ev.source}
                      </div>
                    )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
        </div>
      </div>

      {toast.show && (
        <div className="toast-container">
          <div className="toast">{toast.message}</div>
        </div>
      )}

      {(debugLogs.apiCalls.length > 0 || debugLogs.aiRequests.length > 0 || debugLogs.wienInfoData.length > 0) && (
        <div style={{
          margin: '40px 0',
          padding: '20px',
          background: '#f8f9fa',
          border: '1px solid #dee2e6',
          borderRadius: '8px',
          fontFamily: 'monospace',
          fontSize: '12px'
        }}>
          <h3 style={{ marginBottom: '20px', color: '#495057' }}>🔍 Debug Logs (Temporary)</h3>

          {debugLogs.apiCalls.length > 0 && (
            <div style={{ marginBottom: '30px' }}>
              <h4 style={{ color: '#007bff', marginBottom: '10px' }}>📡 API Calls ({debugLogs.apiCalls.length})</h4>
              {debugLogs.apiCalls.map((call, idx) => (
                <div key={idx} style={{
                  marginBottom: '15px',
                  padding: '10px',
                  background: '#fff',
                  border: '1px solid #e9ecef',
                  borderRadius: '4px'
                }}>
                  <div style={{ color: '#28a745', fontWeight: 'bold' }}>
                    {call.method} {call.url} {call.status && `(${call.status})`}
                  </div>
                  <div style={{ color: '#6c757d', fontSize: '10px' }}>{call.timestamp}</div>
                  {call.body && (
                    <details style={{ marginTop: '8px' }}>
                      <summary style={{ cursor: 'pointer', color: '#007bff' }}>Request Body</summary>
                      <pre style={{
                        marginTop: '5px',
                        padding: '8px',
                        background: '#f8f9fa',
                        border: '1px solid #dee2e6',
                        borderRadius: '3px',
                        overflow: 'auto',
                        maxHeight: '200px'
                      }}>
                        {JSON.stringify(call.body, null, 2)}
                      </pre>
                    </details>
                  )}
                  {call.response && (
                    <details style={{ marginTop: '8px' }}>
                      <summary style={{ cursor: 'pointer', color: '#007bff' }}>Response</summary>
                      <pre style={{
                        marginTop: '5px',
                        padding: '8px',
                        background: '#f8f9fa',
                        border: '1px solid #dee2e6',
                        borderRadius: '3px',
                        overflow: 'auto',
                        maxHeight: '200px'
                      }}>
                        {JSON.stringify(call.response, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          )}

          {debugLogs.aiRequests.length > 0 && (
            <div style={{ marginBottom: '30px' }}>
              <h4 style={{ color: '#dc3545', marginBottom: '10px' }}>🤖 AI Requests ({debugLogs.aiRequests.length})</h4>
              {debugLogs.aiRequests.map((req, idx) => (
                <div key={idx} style={{
                  marginBottom: '15px',
                  padding: '10px',
                  background: '#fff',
                  border: '1px solid #e9ecef',
                  borderRadius: '4px'
                }}>
                  <div style={{ color: '#dc3545', fontWeight: 'bold' }}>
                    AI Query {req.category && `(${req.category})`}
                  </div>
                  <div style={{ color: '#6c757d', fontSize: '10px' }}>
                    {req.timestamp} - Parsed: {req.parsedCount || 0} events
                  </div>
                  <details style={{ marginTop: '8px' }}>
                    <summary style={{ cursor: 'pointer', color: '#007bff' }}>Query</summary>
                    <pre style={{
                      marginTop: '5px',
                      padding: '8px',
                      background: '#fff3cd',
                      border: '1px solid #ffeaa7',
                      borderRadius: '3px',
                      overflow: 'auto',
                      maxHeight: '150px'
                    }}>
                      {req.query}
                    </pre>
                  </details>
                  <details style={{ marginTop: '8px' }}>
                    <summary style={{ cursor: 'pointer', color: '#007bff' }}>AI Response</summary>
                    <pre style={{
                      marginTop: '5px',
                      padding: '8px',
                      background: '#d1ecf1',
                      border: '1px solid #bee5eb',
                      borderRadius: '3px',
                      overflow: 'auto',
                      maxHeight: '300px'
                    }}>
                      {req.response}
                    </pre>
                  </details>
                </div>
              ))}
            </div>
          )}

          {debugLogs.wienInfoData.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ color: '#fd7e14', marginBottom: '10px' }}>🇦🇹 Wien.info Data ({debugLogs.wienInfoData.length})</h4>
              {debugLogs.wienInfoData.map((data, idx) => (
                <div key={idx} style={{
                  marginBottom: '15px',
                  padding: '10px',
                  background: '#fff',
                  border: '1px solid #e9ecef',
                  borderRadius: '4px'
                }}>
                  <div style={{ color: '#fd7e14', fontWeight: 'bold' }}>Wien.info JSON API</div>
                  <div style={{ color: '#6c757d', fontSize: '10px' }}>
                    {data.timestamp} - URL: {data.url}
                  </div>
                  {data.query && (
                    <div style={{ marginTop: '8px', fontSize: '11px' }}>
                      <strong>Query:</strong> {data.query}
                    </div>
                  )}
                  {(data.parsedEvents !== undefined || data.filteredEvents !== undefined) && (
                    <div style={{ marginTop: '8px', padding: '8px', background: '#e8f5e8', borderRadius: '3px' }}>
                      {data.parsedEvents !== undefined && <div><strong>Parsed Events:</strong> {data.parsedEvents}</div>}
                      {data.filteredEvents !== undefined && <div><strong>Filtered Events:</strong> {data.filteredEvents}</div>}
                    </div>
                  )}
                  {data.rawCategoryCounts && Object.keys(data.rawCategoryCounts).length > 0 && (
                    <details style={{ marginTop: '8px' }}>
                      <summary style={{ cursor: 'pointer', color: '#007bff' }}>
                        Raw Category Counts ({Object.keys(data.rawCategoryCounts).length} types)
                      </summary>
                      <pre style={{
                        marginTop: '5px',
                        padding: '8px',
                        background: '#f8f9fa',
                        border: '1px solid #dee2e6',
                        borderRadius: '3px',
                        overflow: 'auto',
                        maxHeight: '200px'
                      }}>
                        {JSON.stringify(data.rawCategoryCounts, null, 2)}
                      </pre>
                    </details>
                  )}
                  {data.mappedCategoryCounts && Object.keys(data.mappedCategoryCounts).length > 0 && (
                    <details style={{ marginTop: '8px' }}>
                      <summary style={{ cursor: 'pointer', color: '#007bff' }}>
                        Mapped Category Counts ({Object.keys(data.mappedCategoryCounts).length} types)
                      </summary>
                      <pre style={{
                        marginTop: '5px',
                        padding: '8px',
                        background: '#f8f9fa',
                        border: '1px solid #dee2e6',
                        borderRadius: '3px',
                        overflow: 'auto',
                        maxHeight: '200px'
                      }}>
                        {JSON.stringify(data.mappedCategoryCounts, null, 2)}
                      </pre>
                    </details>
                  )}
                  {data.unknownRawCategories && data.unknownRawCategories.length > 0 && (
                    <div style={{
                      marginTop: '8px',
                      padding: '8px',
                      background: '#fff3cd',
                      border: '1px solid #ffeaa7',
                      borderRadius: '3px',
                      color: '#856404'
                    }}>
                      <strong>Unknown Raw Categories ({data.unknownRawCategories.length}):</strong><br/>
                      {data.unknownRawCategories.join(', ')}
                    </div>
                  )}
                  {data.error && (
                    <div style={{
                      marginTop: '8px',
                      padding: '8px',
                      background: '#f8d7da',
                      border: '1px solid #f5c6cb',
                      borderRadius: '3px',
                      color: '#721c24'
                    }}>
                      Error: {data.error}
                    </div>
                  )}
                  {data.events && data.events.length > 0 && (
                    <details style={{ marginTop: '8px' }}>
                      <summary style={{ cursor: 'pointer', color: '#007bff' }}>
                        API Events ({data.events.length})
                      </summary>
                      <pre style={{
                        marginTop: '5px',
                        padding: '8px',
                        background: '#f8f9fa',
                        border: '1px solid #dee2e6',
                        borderRadius: '3px',
                        overflow: 'auto',
                        maxHeight: '200px'
                      }}>
                        {JSON.stringify(data.events, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SEO Footer - only on homepage */}
      <SEOFooter />

      {/* Global overrides incl. calendar fix */}
      <style jsx global>{`
        .header-inner.header-centered {
          position: relative;
          display:flex;
          align-items:center;
          justify-content:flex-start;
          min-height:64px;
        }
        .header-inner.header-centered .premium-box { position:absolute; right:0; }
        .header-logo-text {
          font-size: 28px;
          font-weight: 700;
          color: #111;
          margin: 0;
          line-height: 1.3;
          text-align: left;
        }
        @media (max-width: 768px) {
          .header-logo-text {
            font-size: 20px;
          }
        }

        /* Event Card Image Styles - Feature 1 */
        .event-card {
          height: auto;
          min-height: 300px;
        }
        .event-card-image {
          width: 100%;
          padding-top: 56.25%; /* 16:9 aspect ratio */
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
        }
        
        /* Enhanced 3D Shadow - Feature 4 */
        .event-card {
          box-shadow: 0 2px 4px rgba(0,0,0,0.1), 
                      0 8px 16px rgba(0,0,0,0.2), 
                      0 16px 32px rgba(0,0,0,0.15);
        }
        .event-card:hover {
          /* No hover effect per requirements */
          transform: none;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1), 
                      0 8px 16px rgba(0,0,0,0.2), 
                      0 16px 32px rgba(0,0,0,0.15);
        }
        
        /* Source Badge - Feature 5 */
        .event-source-badge {
          position: absolute;
          top: 0;
          right: 0;
          background: #1e3a8a;
          color: #CCCCCC;
          padding: 4px 8px;
          border-radius: 0 0 0 6px;
          font-size: 8px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          z-index: 10;
        }
        
        /* Venue Link with External Icon - Feature 3 */
        .venue-link {
          display: inline-flex;
          align-items: center;
          gap: 2px;
        }
        
        /* Ticket Button Icon - Feature 2 */
        .btn-outline.tickets {
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        
        /* Category Badge Link - Feature 8 */
        .event-category-badge {
          display: inline-block;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: #4A90E2;
          margin-bottom: 12px;
          font-weight: 600;
          text-decoration: none;
          transition: color 0.2s ease;
        }
        .event-category-badge:hover {
          color: #5BA0F2;
          text-decoration: underline;
        }
        
        /* Date Navigation Row - Feature 6 */
        .date-nav-row {
          display: flex;
          gap: 12px;
          margin: 20px 0;
          flex-wrap: wrap;
        }
        .date-nav-btn {
          padding: 10px 20px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          color: #374151;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .date-nav-btn:hover {
          background: #f3f4f6;
          border-color: #d1d5db;
        }
        .date-nav-btn.active {
          background: #4A90E2;
          color: #FFFFFF;
          border-color: #4A90E2;
        }
        
        /* Category Filter Row - Feature 7 */
        .category-filter-row-container {
          margin: 16px 0;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: thin;
        }
        .category-filter-row-container::-webkit-scrollbar {
          height: 6px;
        }
        .category-filter-row-container::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 3px;
        }
        .category-filter-row {
          display: flex;
          gap: 10px;
          padding-bottom: 8px;
          min-width: min-content;
        }
        .category-filter-btn {
          padding: 8px 16px;
          background: #f5f5f5;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          color: #374151;
          font-weight: 500;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .category-filter-btn:hover {
          background: #e5e7eb;
          border-color: #d1d5db;
        }
        .category-filter-btn.active {
          background: #404040;
          color: #ffffff;
          border-color: #404040;
        }
        .category-filter-btn.disabled {
          opacity: 0.4;
          cursor: not-allowed;
          background: #f5f5f5;
          color: #9ca3af;
        }
        .category-filter-btn.disabled:hover {
          background: #f5f5f5;
          border-color: #e5e7eb;
        }
        .category-count {
          font-size: 11px;
          opacity: 0.8;
        }
        
        /* Event Count Text */
        .event-count-text {
          margin: 12px 0 24px 0;
          color: #6b7280;
          font-size: 14px;
          font-weight: 500;
        }
        
        /* Results Page Title */
        .results-page-title {
          font-size: 28px;
          font-weight: 700;
          color: #111827;
          margin: 24px 0 0 0;
        }

        .results-filter-bar {
          display:flex; justify-content:space-between; align-items:center;
          gap:12px; padding:10px 0 18px;
        }
        .filter-chips-inline { display:flex; flex-wrap:wrap; gap:10px; }
        
        .venue-filter-sidebar {
          min-width: 250px;
          max-width: 300px;
          background: #fff;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.08);
          position: sticky;
          top: 80px;
          max-height: calc(100vh - 100px);
          overflow-y: auto;
        }
        
        .venue-filter-item input[type="checkbox"] {
          accent-color: #404040;
          width: 16px;
          height: 16px;
          cursor: pointer;
        }
        
        @media (max-width: 768px) {
          .venue-filter-sidebar {
            display: none;
          }
        }
        
        .filter-chip {
          display:flex; justify-content:space-between; align-items:center; gap:8px;
          font-size:13px; padding:10px 14px; border:1px solid #dcdfe3;
          background:transparent; border-radius:10px; cursor:pointer;
          transition:background .2s, border-color .2s, color .2s;
          color:#444; font-weight:500; text-align:left;
        }
        .filter-chip:hover { background:#f3f4f5; }
        .filter-chip-active { background:#404040; color:#fff; border-color:#404040; }
        .filter-chip-active:hover { background:#e5e7eb; color:#9aa0a6; }
        .filter-count { font-size:11px; background:rgba(0,0,0,0.06); padding:3px 8px; border-radius:999px; color:inherit; font-weight:500; }
        .filter-chip-active .filter-count { background:rgba(255,255,255,0.18); }

        .categories-section {
          margin-top: 20px;
          padding: 18px;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
        }
        .categories-label {
          display: block;
          font-weight: 600;
          font-size: 14px;
          margin-bottom: 12px;
          color: #374151;
        }
        .categories-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 10px;
          margin-bottom: 14px;
        }
        .category-checkbox {
          display:flex; align-items:center; gap:8px; padding:10px 12px;
          border:1.5px solid #d1d5db; background:#fff; border-radius:8px;
          font-size:13px; cursor:pointer; transition:all .2s ease;
          color:#374151; font-weight:500;
        }
        .category-checkbox:hover { background:#f3f4f6; border-color:#9ca3af; }
        .category-checkbox input { accent-color:#404040; width:16px; height:16px; cursor:pointer; margin:0; }
        .category-checkbox:has(input:checked) { background:#404040; color:#fff; border-color:#404040; box-shadow:0 1px 3px rgba(0,0,0,0.12); }
        .category-checkbox:has(input:checked):hover { background:#1f2937; border-color:#1f2937; }
        .category-checkbox:has(input:checked) input { accent-color:#ffffff; }
        .category-checkbox:has(input:disabled) { opacity: 0.5; cursor: not-allowed; }
        .categories-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        .cat-error {
          margin-top: 10px;
          padding: 10px 12px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 6px;
          color: #991b1b;
          font-size: 13px;
          font-weight: 500;
        }

        .btn-search {
          border:none; background:#404040; color:#fff; font-size:15px; padding:14px 20px; border-radius:10px;
          font-weight:500; letter-spacing:.4px; cursor:pointer; box-shadow:0 6px 18px rgba(0,0,0,0.08);
          transition:background .2s, box-shadow .2s, transform .2s, color .2s;
        }
        .btn-search:hover { background:#222; }

        @media (max-width: 600px) {
          .search-form .form-row { gap:12px; }
          .categories-section { gap:10px; }
          .results-filter-bar { flex-direction:column; align-items:flex-start; gap:8px; }
        }

        .src-badge {
          display:inline-block; margin-left:8px; font-size:11px; line-height:1; padding:3px 6px;
          border-radius:999px; border:1px solid rgba(0,0,0,0.18);
          background:#f7f7f7; color:#444; vertical-align:middle;
        }
        .src-badge.src-ai    { background:#1f2937; color:#fff; border-color:#1f2937; }
        .src-badge.src-rss   { background:#f59e0b; color:#111; border-color:#d97706; }
        .src-badge.src-ra    { background:#0ea5e9; color:#fff; border-color:#0284c7; }
        .src-badge.src-cache { background:#e5e7eb; color:#111; border-color:#d1d5db; }

        /* Calendar dropdown fix */
        .select-with-dropdown { position: relative; }
        .date-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          left: 0;
          z-index: 1000;
          background: var(--color-surface, #fff);
          color: var(--color-text, #111);
          border: 1px solid var(--color-border, #e5e7eb);
          border-radius: 10px;
          box-shadow: 0 12px 28px rgba(0,0,0,0.12);
          padding: 12px;
          min-width: 560px; /* two 7-col grids side by side */
        }
        @media (max-width: 640px) {
          .date-dropdown { position: fixed; left: 12px; right: 12px; top: 20%; min-width: unset; }
        }

        /* Kategorien-Dropdown Panel */
        .category-dropdown-panel {
          margin-top: 20px;
          margin-bottom: 20px;
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          box-shadow: 0 12px 28px rgba(0,0,0,0.12);
          padding: 16px;
          width: 100%;
          max-width: 920px;
        }
        @media (max-width: 640px) {
          .category-dropdown-panel { 
            margin-top: 16px;
            margin-bottom: 16px;
          }
        }

        .calendar { width: 100%; }
        .calendar-nav {
          display:flex; align-items:center; justify-content:space-between;
          gap:8px; margin-bottom:10px;
        }
        .cal-btn {
          width: 28px; height: 28px;
          display:inline-flex; align-items:center; justify-content:center;
          border:1px solid var(--color-border, #e5e7eb);
          background: var(--color-surface-alt, #fafbfc);
          color: inherit;
          border-radius: 8px;
          cursor: pointer;
        }
        .cal-btn:hover { background: rgba(0,0,0,0.04); }
        .cal-titles { display:flex; gap:16px; }
        .cal-title { font-weight: 600; }

        .calendar-grids {
          display:grid; grid-template-columns: 1fr 1fr; gap: 16px;
        }
        @media (max-width: 640px) {
          .calendar-grids { grid-template-columns: 1fr; }
        }

        .cal-grid {
          display:grid; grid-template-columns: repeat(7, 1fr); gap: 6px;
        }
        .cal-head {
          text-align:center; font-size:12px; color: var(--color-text-faint, #9aa0a6);
          padding: 4px 0;
        }
        .cal-day {
          display:inline-flex; align-items:center; justify-content:center;
          height: 32px;
          border:1px solid var(--color-border, #e5e7eb);
          background: var(--color-surface-alt, #fafbfc);
          color: inherit;
          border-radius: 8px;
          cursor: pointer;
          transition: background .15s, color .15s, border-color .15s, transform .05s;
        }
        .cal-day:hover { background: rgba(0,0,0,0.06); }
        .cal-day--muted { opacity: .5; }
        .cal-day--sel { background: #404040; color: #fff; border-color: #404040; font-weight: 600; }
        .cal-day--disabled { opacity: .4; cursor: not-allowed; background: rgba(0,0,0,0.03); }

        /* Spacing for meta rows */
        .event-meta-line { line-height: 1.5; }
      `}</style>
    </div>
  );
}

function TwoMonthCalendar({
  value,
  minISO,
  onSelect
}: {
  value: string;
  minISO: string;
  onSelect: (iso: string) => void;
}) {
  const [baseMonth, setBaseMonth] = useState(() => {
    const d = value ? new Date(value) : new Date();
    d.setDate(1);
    return d;
  });

  function monthLabel(d: Date) {
    return d.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
  }
  function addMonths(d: Date, n: number) {
    const nd = new Date(d);
    nd.setMonth(nd.getMonth() + n);
    return nd;
  }
  function startOfWeek(d: Date) {
    const nd = new Date(d);
    const day = (nd.getDay() + 6) % 7; // Montag=0
    nd.setDate(nd.getDate() - day);
    nd.setHours(0,0,0,0);
    return nd;
  }
  function daysMatrix(monthStart: Date) {
    const first = new Date(monthStart);
    first.setDate(1);
    const start = startOfWeek(first);
    const weeks: Date[][] = [];
    let cur = new Date(start);
    for (let w=0; w<6; w++) {
      const row: Date[] = [];
      for (let i=0; i<7; i++) {
        row.push(new Date(cur));
        cur.setDate(cur.getDate()+1);
      }
      weeks.push(row);
    }
    return weeks;
  }
  function isSameDay(a: Date, b: Date) {
    return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
  }
  const selected = value ? new Date(value) : null;
  const minDate = new Date(minISO);

  const months = [0,1].map(i => addMonths(baseMonth, i));
  const weeksArr = months.map(m => daysMatrix(m));

  return (
    <div className="calendar">
      <div className="calendar-nav">
        <button type="button" className="cal-btn" onClick={()=>setBaseMonth(addMonths(baseMonth,-1))} aria-label="Vorheriger Monat">‹</button>
        <div className="cal-titles">
          <div className="cal-title">{monthLabel(months[0])}</div>
          <div className="cal-title">{monthLabel(months[1])}</div>
        </div>
        <button type="button" className="cal-btn" onClick={()=>setBaseMonth(addMonths(baseMonth,1))} aria-label="Nächster Monat">›</button>
      </div>

      <div className="calendar-grids">
        {weeksArr.map((weeks, idx) => (
          <div key={idx} className="cal-grid">
            <div className="cal-head">Mo</div><div className="cal-head">Di</div><div className="cal-head">Mi</div><div className="cal-head">Do</div><div className="cal-head">Fr</div><div className="cal-head">Sa</div><div className="cal-head">So</div>
            {weeks.flat().map((d,i) => {
              const inMonth = d.getMonth()===months[idx].getMonth();
              const disabled = d < new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate());
              const isSel = selected && isSameDay(d, selected);
              return (
                <button
                  key={i}
                  type="button"
                  className={`cal-day ${inMonth ? '' : 'cal-day--muted'} ${isSel ? 'cal-day--sel' : ''} ${disabled ? 'cal-day--disabled' : ''}`}
                  onClick={()=>{
                    if (disabled) return;
                    onSelect(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`);
                  }}
                  disabled={disabled}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

/* Loader: calm orbit rings */
function W2GLoader5() {
  const [orbs] = useState(
    Array.from({length:5}).map((_,i)=>({
      id:i,
      angle: (360/5)*i,
      radius: 12 + i*4,
      speed: 0.7 + i*0.12
    }))
  );
  return (
    <div className="w2g-loader-wrapper">
      <div className="w2g-loader w2g-loader--v3" aria-label="Laden">
        <svg viewBox="-50 -50 100 100" aria-hidden="true">
          <g className="ring ring--1"><circle cx="0" cy="0" r="40" /></g>
          <g className="ring ring--2"><circle cx="0" cy="0" r="28" /></g>
          <g className="ring ring--3"><circle cx="0" cy="0" r="16" /></g>
        </svg>
        {orbs.map(o=>(
          <span
            key={o.id}
            className="orb5"
            style={
              {
                // @ts-ignore custom CSS vars
                '--angle': `${o.angle}deg`,
                '--radius': `${o.radius}px`,
                '--speed': `${o.speed}s`
              } as CSSProperties
            }
          />
        ))}
      </div>
    </div>
  );
}