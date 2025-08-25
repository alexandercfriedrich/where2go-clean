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
    const prompt = `Suche auf verschieden quellen (mindestens 5) nach allen events, Konzerte, theater, museen, ausstellungen, dj sets, DJ, clubs, nightclubs, open air, gay, LGBT, Schwul, party, afterwork, livemusik, festivals die stattfinden. 
gib die ausgabe Tabellarisch mit den Spalten: "title", "category", "date", "time", "venue", "price", "website".
City: ${city}
Date: ${date}
Gib rein die Tabelle aus, sonst nichts!
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
        max_tokens: 5000,
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
