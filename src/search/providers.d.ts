/**
 * A search result from any provider
 */
export interface SearchResult {
    title: string;
    content: string;
    source: string;
    type: string;
}
/**
 * Interface for search providers
 */
export interface SearchProvider {
    type: string;
    search(query: string): Promise<SearchResult[]>;
}
/**
 * Custom error for search operations
 */
export declare class SearchError extends Error {
    code: string;
    provider: string;
    constructor(code: string, message: string, provider: string);
}
export declare function suggestSearchProvider(options: {
    type: string;
}): SearchProvider;
//# sourceMappingURL=providers.d.ts.map