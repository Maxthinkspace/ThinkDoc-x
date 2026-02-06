import { tavilyConfig } from '@/config/tavily';
import { logger } from '@/config/logger';

export interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
  published_date?: string;
}

export interface TavilySearchResponse {
  query: string;
  response_time: number;
  results: TavilySearchResult[];
}

export class TavilyService {
  private apiKey: string | undefined;
  private baseUrl: string;

  constructor() {
    this.apiKey = tavilyConfig.TAVILY_API_KEY;
    this.baseUrl = tavilyConfig.TAVILY_BASE_URL;
  }

  /**
   * Search the web using Tavily API
   * @param query Search query
   * @param maxResults Maximum number of results to return (default: 5)
   * @returns Array of search results
   */
  async search(query: string, maxResults: number = 5): Promise<TavilySearchResult[]> {
    if (!this.apiKey) {
      logger.warn('Tavily API key not configured, skipping web search');
      return [];
    }

    try {
      const response = await fetch(`${this.baseUrl}/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          api_key: this.apiKey,
          query,
          search_depth: 'advanced', // Better for legal/professional context
          include_answer: false, // We want raw results for citations
          include_raw_content: true, // Include full content for preview
          max_results: maxResults,
          include_domains: [],
          exclude_domains: [],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error({ status: response.status, error: errorText }, 'Tavily API error');
        throw new Error(`Tavily API error: ${response.status} ${errorText}`);
      }

      const data: TavilySearchResponse = await response.json();
      
      logger.info(
        { query, resultCount: data.results.length, responseTime: data.response_time },
        'Tavily search completed'
      );

      return data.results;
    } catch (error) {
      logger.error({ error, query }, 'Failed to search Tavily');
      // Return empty array on error rather than throwing - allows ask to continue without web search
      return [];
    }
  }

  /**
   * Check if Tavily is configured and available
   */
  isAvailable(): boolean {
    return !!this.apiKey;
  }
}

export const tavilyService = new TavilyService();

