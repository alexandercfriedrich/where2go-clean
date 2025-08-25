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

export async function POST(request: NextRequest) {
  try {
    const { city, date }: RequestBody = await request.json();
    
    if (!city || !date) {
      return NextResponse.json(
        { error: 'Stadt und Datum sind erforderlich' },
        { status: 400 }
      );
    }

    // Erstelle den dynamischen Prompt
    const prompt = `Suche vollständig nach allen events, Konzerte, theater, museen, ausstellungen, dj sets, DJ, clubs, nightclubs, open air, gay, LGBT, Schwul, party, afterwork, livemusik, festivals usw...\nTabellarisch mit den Spalten: "title", "category", "date", "time", "venue", "price", "website".\nCity: ${city}\nDate: ${date}`;

    // Perplexity API Configuration
    const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
    
    if (!PERPLEXITY_API_KEY) {
      return NextResponse.json(
        { error: 'Perplexity API Key ist nicht konfiguriert' },
        { status: 500 }
      );
    }

    // API Call zur Perplexity
    const perplexityResponse = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-small-128k-online',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 2000,
        temperature: 0.2,
      }),
    });

    if (!perplexityResponse.ok) {
      throw new Error(`Perplexity API Error: ${perplexityResponse.status}`);
    }

    const perplexityData = await perplexityResponse.json();
    const responseText = perplexityData.choices[0]?.message?.content || '';

    // Versuche strukturierte Daten zu extrahieren
    const events: EventData[] = parseEventsFromResponse(responseText);

    return NextResponse.json({
      success: true,
      events,
      rawResponse: responseText,
      city,
      date,
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { 
        error: 'Fehler beim Abrufen der Event-Daten',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler'
      },
      { status: 500 }
    );
  }
}

// Hilfsfunktion zum Parsen der Events aus der Perplexity-Antwort
function parseEventsFromResponse(responseText: string): EventData[] {
  const events: EventData[] = [];
  
  try {
    // Suche nach Tabellen-ähnlichen Strukturen oder Listen
    const lines = responseText.split('\n').filter(line => line.trim().length > 0);
    
    for (const line of lines) {
      // Verschiedene Parsing-Strategien versuchen
      let event: Partial<EventData> = {};
      
      // Strategie 1: Pipe-separated values
      if (line.includes('|')) {
        const parts = line.split('|').map(part => part.trim());
        if (parts.length >= 7) {
          event = {
            title: parts[0] || '',
            category: parts[1] || '',
            date: parts[2] || '',
            time: parts[3] || '',
            venue: parts[4] || '',
            price: parts[5] || '',
            website: parts[6] || '',
          };
        }
      }
      // Strategie 2: JSON-ähnliche Struktur erkennen
      else if (line.includes('{') && line.includes('}')) {
        try {
          const jsonMatch = line.match(/{.*}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            event = parsed;
          }
        } catch {
          // JSON parsing fehlgeschlagen, ignorieren
        }
      }
      // Strategie 3: Strukturierte Text-Erkennung
      else if (line.toLowerCase().includes('titel:') || line.toLowerCase().includes('event:')) {
        // Einfache Textextraktion für strukturierten Text
        event.title = extractValueAfterKeyword(line, ['titel:', 'event:', 'name:']);
      }
      
      // Event hinzufügen, wenn mindestens Titel vorhanden
      if (event.title && event.title.length > 0 && !event.title.includes('---')) {
        events.push({
          title: event.title || 'Unbekannt',
          category: event.category || 'Event',
          date: event.date || '',
          time: event.time || '',
          venue: event.venue || '',
          price: event.price || '',
          website: event.website || '',
        });
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

function extractValueAfterKeyword(text: string, keywords: string[]): string {
  for (const keyword of keywords) {
    const index = text.toLowerCase().indexOf(keyword.toLowerCase());
    if (index !== -1) {
      return text.substring(index + keyword.length).trim();
    }
  }
  return '';
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
