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
    const prompt = `Suche vollständig nach allen events, Konzerte, theater, museen, ausstellungen, dj sets, DJ, clubs, nightclubs, open air, gay, LGBT, Schwul, party, afterwork, livemusik, festivals usw...
Tabellarisch mit den Spalten: "title", "category", "date", "time", "venue", "price", "website".
City: ${city}
Date: ${date}
`;
    
    // Perplexity API Configuration
    const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
    
    if (!PERPLEXITY_API_KEY) {
      return NextResponse.json(
        { error: 'Perplexity API Key ist nicht konfiguriert' },
        { status: 500 }
      );
    }
    
    // Logging vor dem Perplexity API Call
    console.log('About to call Perplexity API for city:', city, 'date:', date);
    
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
        max_tokens: 2000,
        temperature: 0.2,
        stream: false
      })
    });
    
    if (!perplexityResponse.ok) {
      console.error('Perplexity API Error:', perplexityResponse.status, perplexityResponse.statusText);
      return NextResponse.json(
        { error: 'Fehler beim Abrufen der Veranstaltungsdaten' },
        { status: 500 }
      );
    }
    
    const perplexityData = await perplexityResponse.json();
    console.log('Perplexity Response:', JSON.stringify(perplexityData, null, 2));
    
    // Parse die Antwort von Perplexity
    const events = parseEventsFromResponse(perplexityData.choices[0]?.message?.content || '');
    
    return NextResponse.json({ events });
    
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Unerwarteter Fehler beim Verarbeiten der Anfrage' },
      { status: 500 }
    );
  }
}

function parseEventsFromResponse(responseText: string): EventData[] {
  const events: EventData[] = [];
  
  try {
    // Versuche JSON zu parsen
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
