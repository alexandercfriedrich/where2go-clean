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
Date: ${date}`;

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
        model: 'llama-3.1-sonar-small-128k-online',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 4000,
        temperature: 0.2,
        top_p: 0.9,
        return_citations: true,
        search_domain_filter: ['perplexity.ai'],
        return_images: false,
        return_related_questions: false,
        search_recency_filter: 'month',
        top_k: 0,
        stream: false,
        presence_penalty: 0,
        frequency_penalty: 1
      }),
    });

    // Logging nach dem Perplexity API Call
    console.log('Perplexity API Response Status:', perplexityResponse.status);
    console.log('Perplexity API Response StatusText:', perplexityResponse.statusText);
    
    // Get response body as text for logging
    const responseText = await perplexityResponse.text();
    console.log('Perplexity API Response Body (full):', responseText);
    
    // Parse the response text back to JSON
    let perplexityData;
    try {
      perplexityData = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse Perplexity response as JSON:', parseError);
      return NextResponse.json(
        { error: 'Invalid response from Perplexity API' },
        { status: 500 }
      );
    }

    if (!perplexityResponse.ok) {
      console.error('Perplexity API error:', perplexityResponse.statusText);
      return NextResponse.json(
        { error: 'Fehler beim Abrufen der Event-Daten' },
        { status: 500 }
      );
    }

    console.log('Perplexity Response:', JSON.stringify(perplexityData, null, 2));

    // Parse Events aus der Antwort
    const events = parseEventsFromResponse(perplexityData);

    return NextResponse.json({ events });
  } catch (error) {
    console.error('API Route Error:', error);
    return NextResponse.json(
      { error: 'Interner Server-Fehler' },
      { status: 500 }
    );
  }
}

function parseEventsFromResponse(perplexityData: any): EventData[] {
  const events: EventData[] = [];
  
  try {
    const responseText = perplexityData?.choices?.[0]?.message?.content || '';
    
    // Try to find table-like structures
    const lines = responseText.split('\n');
    
    for (const line of lines) {
      // Look for lines that might contain event data
      if (line.includes('|') && line.split('|').length >= 6) {
        const parts = line.split('|').map(part => part.trim());
        
        // Skip header rows
        if (parts[0].toLowerCase().includes('title') || parts[0].includes('---')) {
          continue;
        }
        
        if (parts.length >= 7 && parts[1].length > 0) {
          events.push({
            title: parts[1] || '',
            category: parts[2] || '',
            date: parts[3] || '',
            time: parts[4] || '',
            venue: parts[5] || '',
            price: parts[6] || '',
            website: parts[7] || '',
          });
        }
      }
    }

    // Alternative parsing for JSON-like structures
    const jsonMatch = responseText.match(/\[\s*{[\s\S]*}\s*\]/);
    if (jsonMatch && events.length === 0) {
      try {
        const parsedEvents = JSON.parse(jsonMatch[0]);
        for (const event of parsedEvents) {
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
