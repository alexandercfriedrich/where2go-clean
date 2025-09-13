/**
 * Perplexity AI client stub for the new backend system.
 * This module provides a stubbed implementation for future AI integration.
 * 
 * @fileoverview Stubbed Perplexity client with timeout, retry, and error handling.
 */

import { createComponentLogger } from '../utils/log';
import { createError, ErrorCode, fromError, type AppError } from '../utils/errors';
import { type EventData } from '../types/events';
import { type MainCategory, MAIN_CATEGORIES } from '../categories/categoryMap';
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
  
  /** Batch size for multi-category queries */
  batchSize: number;
  
  /** Delay between batches in milliseconds */
  delayBetweenBatches: number;
}

/**
 * Default configuration.
 */
const DEFAULT_CONFIG: PerplexityConfig = {
  baseUrl: 'https://api.perplexity.ai/chat/completions',
  timeoutMs: 25000, // 25 seconds
  maxRetries: 2,
  retryDelayMs: 1000, // 1 second base delay
  model: 'llama-3.1-sonar-small-128k-online',
  batchSize: 3,
  delayBetweenBatches: 1000
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
 * Legacy compatibility: Result structure matching old PerplexityResult
 */
export interface PerplexityResult {
  query: string;
  response: string;
  events: EventData[];
  timestamp: number;
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

    logger.info('[PerplexityClient-NEW] Starting category search', { city, date, category });

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
          logger.info('[PerplexityClient-NEW] Category search completed successfully', {
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
          logger.warn('[PerplexityClient-NEW] Category search failed, retrying', {
            city,
            date,
            category,
            retryCount,
            error: response.error
          });
          
          // Exponential backoff with jitter
          const delay = this.config.retryDelayMs * Math.pow(2, retryCount) + Math.random() * 100;
          await this.delay(delay);
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
          logger.warn('[PerplexityClient-NEW] Category search error, retrying', {
            city,
            date,
            category,
            retryCount,
            error: appError.message
          });
          
          // Exponential backoff with jitter
          const delay = this.config.retryDelayMs * Math.pow(2, retryCount) + Math.random() * 100;
          await this.delay(delay);
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
   * Uses batching and rate limiting like the legacy implementation.
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
    logger.info('[PerplexityClient-NEW] Starting multi-category search', {
      city,
      date,
      categoryCount: categories.length,
      batchSize: this.config.batchSize
    });

    const results: CategorySearchResult[] = [];

    // Process categories in batches with rate limiting (like legacy implementation)
    for (let i = 0; i < categories.length; i += this.config.batchSize) {
      const batch = categories.slice(i, i + this.config.batchSize);
      
      logger.debug('[PerplexityClient-NEW] Processing batch', {
        batchIndex: Math.floor(i / this.config.batchSize) + 1,
        batchSize: batch.length,
        categories: batch
      });

      // Execute batch in parallel with category-level retry
      const batchPromises = batch.map(async (category) => {
        try {
          return await this.searchCategory(city, date, category);
        } catch (error) {
          const appError = fromError(error, ErrorCode.AI_SERVICE_ERROR);
          
          return {
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
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Delay between batches (except for the last batch)
      if (i + this.config.batchSize < categories.length) {
        logger.debug('[PerplexityClient-NEW] Waiting between batches', {
          delayMs: this.config.delayBetweenBatches
        });
        await this.delay(this.config.delayBetweenBatches);
      }
    }

    const successCount = results.filter(r => r.success).length;
    const totalEvents = results.reduce((sum, r) => sum + r.response.events.length, 0);

    logger.info('[PerplexityClient-NEW] Multi-category search completed', {
      city,
      date,
      totalCategories: categories.length,
      successfulCategories: successCount,
      totalEvents
    });

    return results;
  }

  /**
   * BACKWARD COMPATIBILITY: Execute a single general query.
   * Equivalent to the legacy executeSingleQuery method.
   * 
   * @param city - Target city
   * @param date - Event date (YYYY-MM-DD)
   * @returns Legacy-compatible result
   */
  async queryGeneral(city: string, date: string): Promise<PerplexityResult> {
    logger.info('[PerplexityClient-NEW] Executing general query (legacy compatibility)', { city, date });

    const prompt = createGeneralPrompt(city, date);
    
    try {
      const response = await this.makeRequest(prompt, 0);
      
      return {
        query: prompt,
        response: response.content,
        events: response.events,
        timestamp: Date.now()
      };
    } catch (error) {
      const appError = fromError(error, ErrorCode.AI_SERVICE_ERROR);
      
      logger.error('[PerplexityClient-NEW] General query failed', {
        city,
        date,
        error: appError.message
      });

      return {
        query: prompt,
        response: `Error: ${appError.message}`,
        events: [],
        timestamp: Date.now()
      };
    }
  }

  /**
   * BACKWARD COMPATIBILITY: Execute multiple queries with batching.
   * Equivalent to the legacy executeMultiQuery method.
   * 
   * @param city - Target city
   * @param date - Event date (YYYY-MM-DD)
   * @param categories - Optional categories to search (if empty, uses general query)
   * @returns Array of legacy-compatible results
   */
  async queryMultipleCategories(
    city: string,
    date: string,
    categories?: string[]
  ): Promise<PerplexityResult[]> {
    logger.info('[PerplexityClient-NEW] Executing multi-query (legacy compatibility)', {
      city,
      date,
      categoryCount: categories?.length || 0
    });

    // If no categories provided, execute general query (legacy behavior)
    if (!categories || categories.length === 0) {
      const result = await this.queryGeneral(city, date);
      return [result];
    }

    // Convert string categories to MainCategory (best effort)
    const mainCategories: MainCategory[] = [];
    for (const category of categories) {
      // Try to find a matching main category
      const found = MAIN_CATEGORIES.find(mc => 
        mc.toLowerCase() === category.toLowerCase() ||
        mc.includes(category) ||
        category.includes(mc)
      );
      if (found) {
        mainCategories.push(found);
      }
    }

    if (mainCategories.length === 0) {
      logger.warn('[PerplexityClient-NEW] No valid categories found, falling back to general query', {
        providedCategories: categories
      });
      const result = await this.queryGeneral(city, date);
      return [result];
    }

    // Execute multi-category search
    const results = await this.searchMultipleCategories(city, date, mainCategories);
    
    // Convert to legacy format
    return results.map((result, index) => ({
      query: `Category search for ${result.category}`,
      response: result.response.content,
      events: result.response.events,
      timestamp: Date.now()
    }));
  }

  /**
   * Make a request to Perplexity API.
   * Replaces the stub with real HTTP implementation.
   * 
   * @param prompt - The prompt to send
   * @param retryCount - Current retry attempt
   * @returns API response
   */
  private async makeRequest(prompt: string, retryCount: number): Promise<PerplexityResponse> {
    const startTime = Date.now();

    logger.debug('[PerplexityClient-NEW] Making API request', {
      promptLength: prompt.length,
      retryCount,
      model: this.config.model,
      timeout: this.config.timeoutMs
    });

    if (!this.config.apiKey) {
      throw createError(
        ErrorCode.CONFIG_ERROR,
        'Perplexity API key is not configured'
      );
    }

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      logger.warn('[PerplexityClient-NEW] Request timeout', { timeoutMs: this.config.timeoutMs });
      controller.abort();
    }, this.config.timeoutMs);

    try {
      const requestBody = {
        model: this.config.model,
        messages: [
          {
            role: 'user' as const,
            content: prompt
          }
        ],
        max_tokens: 20000,
        temperature: 0.2,
        stream: false
      };

      logger.debug('[PerplexityClient-NEW] Request details', {
        model: requestBody.model,
        maxTokens: requestBody.max_tokens,
        temperature: requestBody.temperature,
        attempt: retryCount + 1
      });

      const response = await fetch(this.config.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      logger.debug('[PerplexityClient-NEW] HTTP response received', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('[PerplexityClient-NEW] API error response', {
          status: response.status,
          statusText: response.statusText,
          errorText: errorText.substring(0, 500)
        });
        
        throw createError(
          ErrorCode.AI_SERVICE_ERROR,
          `HTTP ${response.status}: ${response.statusText} - ${errorText}`,
          {
            httpStatus: response.status,
            httpStatusText: response.statusText
          }
        );
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
      
      if (!content) {
        throw createError(
          ErrorCode.AI_INVALID_RESPONSE,
          'No content received from Perplexity API'
        );
      }

      // Parse events from the content
      const events = this.parseEventsFromResponse(content);
      const responseTime = Date.now() - startTime;

      const result: PerplexityResponse = {
        content,
        events,
        success: true,
        metadata: {
          model: this.config.model,
          tokensUsed: data.usage?.total_tokens,
          responseTime,
          retryCount
        }
      };

      logger.info('[PerplexityClient-NEW] Request completed successfully', {
        eventCount: events.length,
        responseTime,
        retryCount,
        tokensUsed: data.usage?.total_tokens
      });

      return result;

    } catch (error) {
      clearTimeout(timeoutId);

      if (controller.signal.aborted) {
        throw createError(
          ErrorCode.TIMEOUT_ERROR,
          `Request timed out after ${this.config.timeoutMs}ms`
        );
      }

      // Re-throw if it's already an AppError
      if (fromError(error, ErrorCode.AI_SERVICE_ERROR)) {
        throw error;
      }

      logger.error('[PerplexityClient-NEW] Request failed', {
        error: error instanceof Error ? error.message : String(error),
        retryCount
      });

      throw fromError(error, ErrorCode.AI_SERVICE_ERROR);
    }
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
      logger.error('[PerplexityClient-NEW] Failed to parse events from AI response', {
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