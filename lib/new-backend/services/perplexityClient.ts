/**
 * Perplexity AI client stub for the new backend system.
 * This module provides a stubbed implementation for future AI integration.
 * 
 * @fileoverview Stubbed Perplexity client with timeout, retry, and error handling.
 */

import { createComponentLogger } from '../utils/log';
import { createError, ErrorCode, fromError, type AppError } from '../utils/errors';
import { type EventData } from '../types/events';
import { type MainCategory } from '../categories/categoryMap';
import { 
  createCategoryPrompt, 
  createRetryPrompt, 
  createGeneralPrompt 
} from '../prompts/eventPrompt';

const logger = createComponentLogger('PerplexityClient');

/**
 * Configuration for Perplexity AI client.
 */
export interface PerplexityConfig {
  /** API key for Perplexity */
  apiKey?: string;
  
  /** Base URL for Perplexity API */
  baseUrl: string;
  
  /** Request timeout in milliseconds */
  timeoutMs: number;
  
  /** Maximum retry attempts */
  maxRetries: number;
  
  /** Retry delay in milliseconds */
  retryDelayMs: number;
  
  /** Model to use for requests */
  model: string;
}

/**
 * Default configuration.
 */
const DEFAULT_CONFIG: PerplexityConfig = {
  baseUrl: 'https://api.perplexity.ai/chat/completions',
  timeoutMs: 25000, // 25 seconds
  maxRetries: 2,
  retryDelayMs: 1000, // 1 second base delay
  model: 'llama-3.1-sonar-small-128k-online'
};

/**
 * Response from Perplexity API.
 */
export interface PerplexityResponse {
  /** Generated response text */
  content: string;
  
  /** Parsed events (if successful) */
  events: EventData[];
  
  /** Whether parsing was successful */
  success: boolean;
  
  /** Error message if parsing failed */
  error?: string;
  
  /** Response metadata */
  metadata: {
    model: string;
    tokensUsed?: number;
    responseTime: number;
    retryCount: number;
  };
}

/**
 * Search result for a category.
 */
export interface CategorySearchResult {
  /** The category that was searched */
  category: MainCategory;
  
  /** Search response */
  response: PerplexityResponse;
  
  /** Whether the search was successful */
  success: boolean;
  
  /** Error if search failed */
  error?: AppError;
}

/**
 * Perplexity AI client for event searches.
 * Currently stubbed for future implementation.
 */
export class PerplexityClient {
  private config: PerplexityConfig;

  constructor(config: Partial<PerplexityConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // Use API key from environment if not provided
    if (!this.config.apiKey) {
      this.config.apiKey = process.env.PERPLEXITY_API_KEY;
    }

    logger.info('Perplexity client initialized', {
      hasApiKey: !!this.config.apiKey,
      model: this.config.model,
      timeoutMs: this.config.timeoutMs
    });
  }

  /**
   * Search for events in a specific category.
   * 
   * @param city - Target city
   * @param date - Event date (YYYY-MM-DD)
   * @param category - Category to search
   * @returns Search result with events
   */
  async searchCategory(
    city: string,
    date: string,
    category: MainCategory
  ): Promise<CategorySearchResult> {
    const startTime = Date.now();
    let retryCount = 0;

    logger.info('Starting category search', { city, date, category });

    while (retryCount <= this.config.maxRetries) {
      try {
        const prompt = retryCount === 0 
          ? createCategoryPrompt(city, date, category)
          : createRetryPrompt(city, date, category, retryCount);

        const response = await this.makeRequest(prompt, retryCount);
        
        const result: CategorySearchResult = {
          category,
          response,
          success: response.success
        };

        if (response.success) {
          logger.info('Category search completed successfully', {
            city,
            date,
            category,
            eventCount: response.events.length,
            retryCount,
            responseTime: Date.now() - startTime
          });
          return result;
        }

        // If this wasn't the last retry, continue to next attempt
        if (retryCount < this.config.maxRetries) {
          logger.warn('Category search failed, retrying', {
            city,
            date,
            category,
            retryCount,
            error: response.error
          });
          
          await this.delay(this.config.retryDelayMs * Math.pow(2, retryCount));
          retryCount++;
          continue;
        }

        // All retries exhausted
        result.error = createError(
          ErrorCode.AI_SERVICE_ERROR,
          `Category search failed after ${this.config.maxRetries + 1} attempts`,
          { lastError: response.error }
        );

        return result;

      } catch (error) {
        const appError = fromError(error, ErrorCode.AI_SERVICE_ERROR);
        
        if (retryCount < this.config.maxRetries) {
          logger.warn('Category search error, retrying', {
            city,
            date,
            category,
            retryCount,
            error: appError
          });
          
          await this.delay(this.config.retryDelayMs * Math.pow(2, retryCount));
          retryCount++;
          continue;
        }

        // Return error result
        return {
          category,
          response: {
            content: '',
            events: [],
            success: false,
            error: appError.message,
            metadata: {
              model: this.config.model,
              responseTime: Date.now() - startTime,
              retryCount
            }
          },
          success: false,
          error: appError
        };
      }
    }

    // Should never reach here, but TypeScript needs this
    throw createError(ErrorCode.INTERNAL_ERROR, 'Unexpected search flow end');
  }

  /**
   * Search for events across multiple categories.
   * 
   * @param city - Target city
   * @param date - Event date (YYYY-MM-DD)
   * @param categories - Categories to search
   * @returns Array of search results
   */
  async searchMultipleCategories(
    city: string,
    date: string,
    categories: MainCategory[]
  ): Promise<CategorySearchResult[]> {
    logger.info('Starting multi-category search', {
      city,
      date,
      categoryCount: categories.length
    });

    const results: CategorySearchResult[] = [];

    // Process categories sequentially to avoid rate limits
    for (const category of categories) {
      try {
        const result = await this.searchCategory(city, date, category);
        results.push(result);

        // Small delay between category searches
        if (category !== categories[categories.length - 1]) {
          await this.delay(500);
        }

      } catch (error) {
        const appError = fromError(error, ErrorCode.AI_SERVICE_ERROR);
        
        results.push({
          category,
          response: {
            content: '',
            events: [],
            success: false,
            error: appError.message,
            metadata: {
              model: this.config.model,
              responseTime: 0,
              retryCount: 0
            }
          },
          success: false,
          error: appError
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const totalEvents = results.reduce((sum, r) => sum + r.response.events.length, 0);

    logger.info('Multi-category search completed', {
      city,
      date,
      totalCategories: categories.length,
      successfulCategories: successCount,
      totalEvents
    });

    return results;
  }

  /**
   * Make a request to Perplexity API.
   * Currently stubbed to return mock data.
   * 
   * @param prompt - The prompt to send
   * @param retryCount - Current retry attempt
   * @returns API response
   */
  private async makeRequest(prompt: string, retryCount: number): Promise<PerplexityResponse> {
    const startTime = Date.now();

    logger.debug('Making Perplexity API request', {
      promptLength: prompt.length,
      retryCount,
      stubbed: true
    });

    // STUB: In a real implementation, this would make an HTTP request
    // For now, return mock data to enable testing
    await this.delay(1000 + Math.random() * 2000); // Simulate API latency

    // STUB: Mock response with sample events
    const mockEvents: EventData[] = this.generateMockEvents();

    const response: PerplexityResponse = {
      content: JSON.stringify(mockEvents),
      events: mockEvents,
      success: true,
      metadata: {
        model: this.config.model,
        tokensUsed: 150,
        responseTime: Date.now() - startTime,
        retryCount
      }
    };

    logger.debug('Perplexity API request completed (stubbed)', {
      eventCount: mockEvents.length,
      responseTime: response.metadata.responseTime,
      retryCount
    });

    return response;
  }

  /**
   * Generate mock events for testing.
   * STUB: Remove this when implementing real API calls.
   */
  private generateMockEvents(): EventData[] {
    return [
      {
        title: 'Sample Event 1',
        category: 'Live-Konzerte',
        date: '2024-01-15',
        time: '20:00',
        venue: 'Test Venue',
        price: '15€',
        website: 'https://example.com',
        description: 'A sample event for testing'
      },
      {
        title: 'Sample Event 2',
        category: 'DJ Sets/Electronic',
        date: '2024-01-15',
        time: '22:00',
        venue: 'Another Venue',
        price: 'Free',
        website: 'https://example.org',
        endTime: '02:00'
      }
    ];
  }

  /**
   * Parse JSON response from AI.
   * Validates and cleans the response.
   * 
   * @param content - Raw response content
   * @returns Parsed events array
   */
  private parseEventsFromResponse(content: string): EventData[] {
    try {
      // Clean up the response (remove markdown, comments, etc.)
      const cleanContent = this.cleanJsonResponse(content);
      
      const parsed = JSON.parse(cleanContent);
      
      if (!Array.isArray(parsed)) {
        throw new Error('Response is not an array');
      }

      // Validate each event object
      return parsed.filter(this.isValidEvent);

    } catch (error) {
      logger.error('Failed to parse events from AI response', {
        contentLength: content.length,
        error: error instanceof Error ? error.message : String(error)
      });
      return [];
    }
  }

  /**
   * Clean JSON response by removing markdown and comments.
   */
  private cleanJsonResponse(content: string): string {
    return content
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '')
      .trim();
  }

  /**
   * Validate that an object is a valid event.
   */
  private isValidEvent(obj: any): obj is EventData {
    return (
      typeof obj === 'object' &&
      obj !== null &&
      typeof obj.title === 'string' &&
      typeof obj.category === 'string' &&
      typeof obj.date === 'string' &&
      typeof obj.time === 'string' &&
      typeof obj.venue === 'string' &&
      typeof obj.price === 'string' &&
      typeof obj.website === 'string'
    );
  }

  /**
   * Delay execution for specified milliseconds.
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if client is properly configured.
   */
  isConfigured(): boolean {
    return !!this.config.apiKey;
  }

  /**
   * Get client configuration (safe for logging).
   */
  getConfig(): Omit<PerplexityConfig, 'apiKey'> & { hasApiKey: boolean } {
    const { apiKey, ...safeConfig } = this.config;
    return {
      ...safeConfig,
      hasApiKey: !!apiKey
    };
  }
}

/**
 * Global Perplexity client instance.
 */
let perplexityClient: PerplexityClient | null = null;

/**
 * Get the global Perplexity client instance.
 */
export function getPerplexityClient(config?: Partial<PerplexityConfig>): PerplexityClient {
  if (!perplexityClient) {
    perplexityClient = new PerplexityClient(config);
  }
  return perplexityClient;
}