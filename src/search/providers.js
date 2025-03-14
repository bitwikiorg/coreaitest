import axios from 'axios';
import { output } from '../output-manager.js';
import { RateLimiter } from '../utils.js';
/**
 * Custom error for search operations
 */
export class SearchError extends Error {
    code;
    provider;
    constructor(code, message, provider) {
        super(message);
        this.code = code;
        this.provider = provider;
        this.name = 'SearchError';
    }
}
/**
 * Privacy-focused search provider using Brave Search API
 */
class BraveSearchProvider {
    type = 'web';
    apiKey;
    baseUrl = 'https://api.search.brave.com/res/v1';
    rateLimiter;
    maxRetries = 3;
    retryDelay = 2000;
    constructor() {
        const apiKey = process.env.BRAVE_API_KEY;
        if (!apiKey) {
            throw new Error('BRAVE_API_KEY environment variable is required');
        }
        this.apiKey = apiKey;
        this.rateLimiter = new RateLimiter(5000); // 5 seconds between requests for free plan
    }
    async makeRequest(query) {
        output.log('Starting Brave search...');
        await this.rateLimiter.waitForNextSlot();
        const response = await axios.get(`${this.baseUrl}/web/search`, {
            headers: {
                Accept: 'application/json',
                'X-Subscription-Token': this.apiKey,
            },
            params: {
                q: query,
                count: 10,
                offset: 0,
                language: 'en',
                country: 'US',
                safesearch: 'moderate',
                format: 'json',
            },
        });
        const results = response.data.web?.results || [];
        return results.map((result) => ({
            title: result.title || 'Untitled',
            content: result.description || 'No description available',
            source: result.url,
            type: this.type,
        }));
    }
    async search(query) {
        let retryCount = 0;
        while (retryCount <= this.maxRetries) {
            try {
                return await this.makeRequest(query);
            }
            catch (error) {
                if (axios.isAxiosError(error)) {
                    const status = error.response?.status;
                    const errorResponse = error.response?.data;
                    if (status === 429) {
                        output.log('Rate limit response:', JSON.stringify(errorResponse, null, 2));
                        if (retryCount < this.maxRetries) {
                            const delay = this.retryDelay * Math.pow(2, retryCount);
                            output.log(`Rate limited. Attempt ${retryCount + 1}/${this.maxRetries}. Waiting ${delay / 1000} seconds...`);
                            await new Promise(resolve => setTimeout(resolve, delay));
                            retryCount++;
                            continue;
                        }
                        throw new SearchError('RATE_LIMIT', `Rate limit exceeded after ${this.maxRetries} retries`, this.type);
                    }
                    output.log('API Error Response:', errorResponse || 'No error details available');
                    throw new SearchError('API_ERROR', `Brave search failed: ${error.message}`, this.type);
                }
                output.log(`Brave search error: ${error instanceof Error ? error.message : 'Unknown error'}`);
                throw new SearchError('UNKNOWN_ERROR', `Brave search failed: ${error instanceof Error ? error.message : 'Unknown error'}`, this.type);
            }
        }
        throw new SearchError('RATE_LIMIT', 'Exceeded maximum retries due to rate limiting', this.type);
    }
}
export function suggestSearchProvider(options) {
    if (options.type !== 'web') {
        throw new Error('Only web search is supported');
    }
    return new BraveSearchProvider();
}
