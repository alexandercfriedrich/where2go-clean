import { NextRequest, NextResponse } from 'next/server';

interface RequestBody {
  city: string;
  date: string;
}

interface EventData {
  title: string;
  category: string;
  date: string;
  time: string;
  venue: string;
  price: string;
  website: string;
}

// Job status interface
interface JobStatus {
  id: string;
  status: 'pending' | 'done' | 'error';
  events?: EventData[];
  error?: string;
  createdAt: Date;
}

// Global map to store job statuses (shared with jobs API)
const globalForJobs = global as unknown as { jobMap?: Map<string, JobStatus> };
if (!globalForJobs.jobMap) {
  globalForJobs.jobMap = new Map();
}
const jobMap = globalForJobs.jobMap!;

export async function POST(request: NextRequest) {
  try {
    const { city, date }: RequestBody = await request.json();
    
    if (!city || !date) {
      return NextResponse.json(
        { error: 'Stadt und Datum sind erforderlich' },
        { status: 400 }
      );
    }
    
    // Generate unique job ID
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create job entry with pending status
    const job: JobStatus = {
      id: jobId,
      status: 'pending',
      createdAt: new Date()
    };
    
    jobMap.set(jobId, job);
    
    // Start background job (don't await)
    fetchPerplexityInBackground(jobId, city, date);
    
    // Return job ID immediately
    return NextResponse.json({ 
      jobId,
      status: 'pending'
    });
    
  } catch (error) {
    console.error('Events API Error:', error);
    return NextResponse.json(
      { error: 'Unerwarteter Fehler beim Verarbeiten der Anfrage' },
      { status: 500 }
    );
  }
}

// Background function to fetch from Perplexity
async function fetchPerplexityInBackground(jobId: string, city: string, date: string) {
  try {
    // Erstelle den dynamischen Prompt
    const prompt = `
Finde für die Stadt ${city} am ${date} ALLE tatsächlich existierenden Events in den kategorien:

1. Konzerte & Musik (Klassik, Rock, Pop, Jazz, Elektronik)
2. Theater & Kabarett & Comedy & Musicals
3. Museen & Ausstellungen & Galerien (auch Sonderausstellungen)
4. Clubs & DJ-Sets & Partys & Electronic Music Events
5. Bars & Rooftop Events & Afterwork Events
6. Open-Air Events & Festivals & Outdoor Events
7. LGBT+ Events & Queer Events & Pride Events
8. Kinder- & Familienveranstaltungen
9. Universitäts- & Studentenevents
10. Szene-Events & Underground Events & Alternative Events

Gib die gefundenen Events als reine Markdown-Tabelle mit den Spalten title, category, date, starttime, venue, price, website zurück.

Gib die Ausgabe ausschließlich als reine Markdown-Tabelle **Tabelle** mit folgenden Spalten zurück:
"title" | "category" | "date" | "time" | "venue" | "price" | "website" (Quellen-URL) 

Fülle jedes Feld so exakt wie möglich aus, lasse Preis/Website nur leer, wenn wirklich nicht verfügbar (dann „k.A.“).

WICHTIG:
- Gib KEINE Beispiele, Fließtexte oder Fantasie-Events aus. 
- Wenn du keine Events findest, schreibe "Keine passenden Events gefunden".
- Keine doppelten Events, keine Einleitungen, keine Werbung.
`;

    
    // Perplexity API Configuration
    const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
    
    if (!PERPLEXITY_API_KEY) {
      const job = jobMap.get(jobId);
      if (job) {
        job.status = 'error';
        job.error = 'Perplexity API Key ist nicht konfiguriert';
      }
      return;
    }
    
    console.log('Background job starting for:', jobId, city, date);
    
    // API Call zur Perplexity
    const perplexityResponse = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar-pro',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 20000,
        temperature: 0.3,
        stream: false
      })
    });
    
    const job = jobMap.get(jobId);
    if (!job) return; // Job might have been cleaned up
    
    if (!perplexityResponse.ok) {
      console.error('Perplexity API Error:', perplexityResponse.status, perplexityResponse.statusText);
      job.status = 'error';
      job.error = 'Fehler beim Abrufen der Veranstaltungsdaten';
      return;
    }
    
    const perplexityData = await perplexityResponse.json();
    console.log('Background job completed for:', jobId);
    
    // Parse die Antwort von Perplexity
    const events = parseEventsFromResponse(perplexityData.choices[0]?.message?.content || '');
    
    // Update job with results
    job.status = 'done';
    job.events = events;
    
  } catch (error) {
    console.error('Background job error for:', jobId, error);
    const job = jobMap.get(jobId);
    if (job) {
      job.status = 'error';
      job.error = 'Fehler beim Verarbeiten der Anfrage';
    }
  }
}

function parseEventsFromResponse(responseText: string): EventData[] {
  const events: EventData[] = [];
  
  try {
    // First try to parse markdown tables with pipe-separated content
    const markdownEvents = parseMarkdownTable(responseText);
    if (markdownEvents.length > 0) {
      events.push(...markdownEvents);
    }
    
    // If no markdown table found, try JSON parsing
    if (events.length === 0) {
      const lines = responseText.split('\n');
      
      for (const line of lines) {
        // Suche nach JSON-artigen Strukturen
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('{') && trimmedLine.endsWith('}')) {
          try {
            const event = JSON.parse(trimmedLine);
            if (event.title && event.category) {
              events.push({
                title: event.title || '',
                category: event.category || '',
                date: event.date || '',
                time: event.time || '',
                venue: event.venue || '',
                price: event.price || '',
                website: event.website || '',
              });
            }
          } catch (error) {
            console.error('JSON parsing error:', error);
          }
        }
      }
    }
    
    // Falls keine Events gefunden wurden, erstelle Fallback-Daten
    if (events.length === 0) {
      // Suche nach Keyword-basierten Events im Text
      const keywordEvents = extractKeywordBasedEvents(responseText);
      events.push(...keywordEvents);
    }
    
  } catch (error) {
    console.error('Event parsing error:', error);
  }
  
  return events;
}

function parseMarkdownTable(responseText: string): EventData[] {
  const events: EventData[] = [];
  const lines = responseText.split('\n');
  
  // Find table rows (lines containing pipe characters)
  const tableLines = lines.filter(line => 
    line.trim().includes('|') && 
    line.trim().split('|').length >= 3 // At least 3 columns (accounting for empty start/end)
  );
  
  if (tableLines.length < 2) {
    return events; // Not enough lines for a table
  }
  
  // Skip potential header line (first line) and separator line (second line if it contains dashes)
  let startIndex = 0;
  if (tableLines.length > 1 && tableLines[1].includes('-')) {
    startIndex = 2; // Skip header and separator
  } else {
    startIndex = 1; // Skip just the header
  }
  
  // Parse data rows
  for (let i = startIndex; i < tableLines.length; i++) {
    const line = tableLines[i].trim();
    if (!line || line.startsWith('|---') || line.includes('---')) {
      continue; // Skip separator lines
    }
    
    // Split by pipe and clean up
    const columns = line.split('|')
      .map(col => col.trim())
      .filter((col, index, arr) => {
        // Remove empty first and last elements if they exist (from leading/trailing pipes)
        return !(index === 0 && col === '') && !(index === arr.length - 1 && col === '');
      });
    
    if (columns.length >= 7) {
      const event: EventData = {
        title: columns[0] || '',
        category: columns[1] || '',
        date: columns[2] || '',
        time: columns[3] || '',
        venue: columns[4] || '',
        price: columns[5] || '',
        website: columns[6] || '',
      };
      
      // Only add if we have at least a title
      if (event.title.length > 0) {
        events.push(event);
      }
    }
  }
  
  return events;
}

function extractKeywordBasedEvents(responseText: string): EventData[] {
  const events: EventData[] = [];
  const eventKeywords = ['konzert', 'theater', 'museum', 'ausstellung', 'festival', 'party', 'club', 'dj'];
  
  const sentences = responseText.split('.').filter(s => s.trim().length > 10);
  
  for (const sentence of sentences) {
    const lowerSentence = sentence.toLowerCase();
    if (eventKeywords.some(keyword => lowerSentence.includes(keyword))) {
      events.push({
        title: sentence.trim(),
        category: 'Event',
        date: '',
        time: '',
        venue: '',
        price: '',
        website: '',
      });
    }
  }
  
  return events.slice(0, 10); // Maximal 10 Events
}
