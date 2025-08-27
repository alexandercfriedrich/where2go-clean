// Perplexity API integration with multi-query support and rate limiting

import { EventData, PerplexityResult, QueryOptions } from './types';

export class PerplexityService {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.perplexity.ai/chat/completions';
  private readonly batchSize = 3;
  private readonly delayBetweenBatches = 1000; // 1 second

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Builds a query prompt for a specific category
   */
  private buildCategoryPrompt(city: string, date: string, category: string): string {
    return `
Finde für die Stadt ${city} am ${date} ALLE tatsächlich existierenden Events in der Kategorie "${category}".

Gib die Ausgabe ausschließlich als reine Markdown-Tabelle mit folgenden Spalten zurück:
"title" | "category" | "date" | "time" | "venue" | "price" | "website"

Fülle jedes Feld so exakt wie möglich aus, lasse Preis/Website nur leer, wenn wirklich nicht verfügbar (dann „k.A.").
Antworte AUSSCHLIESSLICH mit dieser Tabelle (kein Fließtext, keine Fantasieevents, keine Beispiele, keine Werbung, keine weiteren Erklärungen).
Wenn keine Events gefunden wurden, schreibe "Keine passenden Events gefunden".
`;
  }

  /**
   * Builds a general query prompt (fallback to original behavior)
   */
  private buildGeneralPrompt(city: string, date: string): string {
    return `
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

Gib die Ausgabe ausschließlich eine reine Markdown-Tabelle **Tabelle** mit folgenden Spalten zurück:
"title" | "category" | "date" | "time" | "venue" | "price" | "website" (Quellen-URL)  
Fülle jedes Feld so exakt wie möglich aus, lasse Preis/Website nur leer, wenn wirklich nicht verfügbar (dann „k.A.").
Antworte AUSSCHLIESSLICH mit dieser Tabelle (kein Fließtext, keine Fantasieevents, keine Beispiele, keine Werbung, keine weiteren Erklärungen).
Wenn keine Events gefunden wurden, schreibe "Keine passenden Events gefunden".
`;
  }

  /**
   * Creates query prompts based on categories or uses general prompt
   */
  private createQueries(city: string, date: string, categories?: string[]): string[] {
    if (!categories || categories.length === 0) {
      // Use the original general query
      return [this.buildGeneralPrompt(city, date)];
    }

    // Create specific queries for each category
    const categoryMap: { [key: string]: string } = {
      'musik': 'Konzerte & Musik (Klassik, Rock, Pop, Jazz, Elektronik)',
      'theater': 'Theater & Kabarett & Comedy & Musicals',
      'museen': 'Museen & Ausstellungen & Galerien (auch Sonderausstellungen)',
      'clubs': 'Clubs & DJ-Sets & Partys & Electronic Music Events',
      'bars': 'Bars & Rooftop Events & Afterwork Events',
      'outdoor': 'Open-Air Events & Festivals & Outdoor Events',
      'lgbt': 'LGBT+ Events & Queer Events & Pride Events',
      'familie': 'Kinder- & Familienveranstaltungen',
      'studenten': 'Universitäts- & Studentenevents',
      'alternative': 'Szene-Events & Underground Events & Alternative Events'
    };

    const queries: string[] = [];
    for (const category of categories) {
      const categoryName = categoryMap[category.toLowerCase()] || category;
      queries.push(this.buildCategoryPrompt(city, date, categoryName));
    }

    return queries;
  }

  /**
   * Makes a single API call to Perplexity
   */
  private async callPerplexity(prompt: string, options?: QueryOptions, retries = 2): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const response = await fetch(this.baseUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
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
            max_tokens: options?.max_tokens || 20000,
            temperature: options?.temperature || 0.2,
            stream: false
          })
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        return data.choices[0]?.message?.content || '';
      } catch (error: any) {
        lastError = error;
        if (attempt === 0 && String(error).includes('not valid JSON')) {
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 500));
          continue;
        }
        throw error;
      }
    }

    throw lastError || new Error('Unknown error');
  }

  /**
   * Executes multiple queries with rate limiting
   */
  async executeMultiQuery(
    city: string, 
    date: string, 
    categories?: string[], 
    options?: QueryOptions
  ): Promise<PerplexityResult[]> {
    const queries = this.createQueries(city, date, categories);
    const results: PerplexityResult[] = [];

    // Process queries in batches with rate limiting
    for (let i = 0; i < queries.length; i += this.batchSize) {
      const batch = queries.slice(i, i + this.batchSize);
      
      // Execute batch in parallel
      const batchPromises = batch.map(async (query) => {
        const response = await this.callPerplexity(query, options);
        return {
          query,
          response,
          events: [], // Will be populated by aggregator
          timestamp: Date.now()
        };
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Delay between batches (except for the last batch)
      if (i + this.batchSize < queries.length) {
        await new Promise(resolve => setTimeout(resolve, this.delayBetweenBatches));
      }
    }

    return results;
  }

  /**
   * Executes a single query (for backward compatibility)
   */
  async executeSingleQuery(city: string, date: string, options?: QueryOptions): Promise<PerplexityResult> {
    const prompt = this.buildGeneralPrompt(city, date);
    const response = await this.callPerplexity(prompt, options);
    
    return {
      query: prompt,
      response,
      events: [], // Will be populated by aggregator
      timestamp: Date.now()
    };
  }
}

/**
 * Creates a Perplexity service instance
 */
export function createPerplexityService(apiKey?: string): PerplexityService | null {
  if (!apiKey) {
    return null;
  }
  return new PerplexityService(apiKey);
}